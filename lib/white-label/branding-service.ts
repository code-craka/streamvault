import { z } from 'zod'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'

// Validation schemas
export const CustomBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  customDomain: z.string().optional(),
  companyName: z.string().min(1).max(100),
  customCSS: z.string().optional(),
  footerText: z.string().max(500).optional(),
})

export const InstanceConfigSchema = z.object({
  instanceId: z.string(),
  branding: CustomBrandingSchema,
  cssVariables: z.record(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type CustomBranding = z.infer<typeof CustomBrandingSchema>
export type InstanceConfig = z.infer<typeof InstanceConfigSchema>

export class BrandingService {
  private readonly COLLECTION = 'white_label_instances'

  /**
   * Apply custom branding to a white-label instance
   */
  async applyCustomBranding(
    instanceId: string,
    branding: CustomBranding
  ): Promise<void> {
    // Validate branding configuration
    const validatedBranding = CustomBrandingSchema.parse(branding)

    const config: Omit<InstanceConfig, 'createdAt' | 'updatedAt'> = {
      instanceId,
      branding: validatedBranding,
      cssVariables: this.generateCSSVariables(validatedBranding),
      isActive: true,
    }

    const instanceRef = doc(db, this.COLLECTION, instanceId)
    const existingDoc = await getDoc(instanceRef)

    if (existingDoc.exists()) {
      await updateDoc(instanceRef, {
        ...config,
        updatedAt: new Date(),
      })
    } else {
      await setDoc(instanceRef, {
        ...config,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Invalidate CDN cache if custom domain is configured
    if (validatedBranding.customDomain) {
      await this.invalidateCDNCache(validatedBranding.customDomain)
    }
  }

  /**
   * Get branding configuration for an instance
   */
  async getBrandingConfig(instanceId: string): Promise<InstanceConfig | null> {
    const instanceRef = doc(db, this.COLLECTION, instanceId)
    const docSnap = await getDoc(instanceRef)

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as InstanceConfig
  }

  /**
   * Setup custom domain with SSL certificate
   */
  async setupCustomDomain(instanceId: string, domain: string): Promise<void> {
    try {
      // Validate domain ownership
      await this.validateDomainOwnership(domain)

      // Configure SSL certificate
      await this.setupSSLCertificate(domain)

      // Update DNS configuration
      await this.updateDNSConfiguration(domain, instanceId)

      // Update instance routing
      await this.updateInstanceRouting(instanceId, domain)

      // Update instance config with custom domain
      const instanceRef = doc(db, this.COLLECTION, instanceId)
      await updateDoc(instanceRef, {
        'branding.customDomain': domain,
        updatedAt: new Date(),
      })
    } catch (error) {
      throw new Error(`Failed to setup custom domain: ${error}`)
    }
  }

  /**
   * Generate CSS variables from branding configuration
   */
  private generateCSSVariables(branding: CustomBranding): Record<string, string> {
    const variables: Record<string, string> = {
      '--primary-color': branding.primaryColor,
      '--secondary-color': branding.secondaryColor,
    }

    // Generate color variations
    variables['--primary-hover'] = this.adjustColorBrightness(branding.primaryColor, -10)
    variables['--primary-light'] = this.adjustColorBrightness(branding.primaryColor, 20)
    variables['--secondary-hover'] = this.adjustColorBrightness(branding.secondaryColor, -10)
    variables['--secondary-light'] = this.adjustColorBrightness(branding.secondaryColor, 20)

    return variables
  }

  /**
   * Adjust color brightness for hover states
   */
  private adjustColorBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt

    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16)
      .slice(1)
  }

  /**
   * Validate domain ownership via DNS TXT record
   */
  private async validateDomainOwnership(domain: string): Promise<void> {
    // In production, this would check for a specific TXT record
    // For now, we'll simulate the validation
    const validationToken = `streamvault-verification-${Date.now()}`
    
    // Store validation token for later verification
    const validationRef = doc(db, 'domain_validations', domain)
    await setDoc(validationRef, {
      domain,
      token: validationToken,
      status: 'pending',
      createdAt: new Date(),
    })

    // In a real implementation, you would:
    // 1. Generate a unique verification token
    // 2. Instruct the user to add a TXT record with the token
    // 3. Use DNS lookup to verify the record exists
    console.log(`Domain validation token for ${domain}: ${validationToken}`)
  }

  /**
   * Setup SSL certificate for custom domain
   */
  private async setupSSLCertificate(domain: string): Promise<void> {
    // In production, this would integrate with Let's Encrypt or similar
    // For now, we'll simulate the SSL setup
    const certificateRef = doc(db, 'ssl_certificates', domain)
    await setDoc(certificateRef, {
      domain,
      status: 'active',
      issuer: 'StreamVault CA',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      createdAt: new Date(),
    })

    console.log(`SSL certificate configured for ${domain}`)
  }

  /**
   * Update DNS configuration for custom domain
   */
  private async updateDNSConfiguration(domain: string, instanceId: string): Promise<void> {
    // In production, this would update DNS records via provider API
    const dnsRef = doc(db, 'dns_configurations', domain)
    await setDoc(dnsRef, {
      domain,
      instanceId,
      recordType: 'CNAME',
      target: `${instanceId}.streamvault.app`,
      status: 'active',
      createdAt: new Date(),
    })

    console.log(`DNS configuration updated for ${domain} -> ${instanceId}.streamvault.app`)
  }

  /**
   * Update instance routing configuration
   */
  private async updateInstanceRouting(instanceId: string, domain: string): Promise<void> {
    const routingRef = doc(db, 'instance_routing', instanceId)
    await setDoc(routingRef, {
      instanceId,
      customDomain: domain,
      defaultDomain: `${instanceId}.streamvault.app`,
      isActive: true,
      updatedAt: new Date(),
    })
  }

  /**
   * Invalidate CDN cache for custom domain
   */
  private async invalidateCDNCache(domain: string): Promise<void> {
    // In production, this would call Cloudflare API to purge cache
    console.log(`CDN cache invalidated for ${domain}`)
    
    // Store cache invalidation record
    const cacheRef = doc(db, 'cache_invalidations', `${domain}-${Date.now()}`)
    await setDoc(cacheRef, {
      domain,
      status: 'completed',
      timestamp: new Date(),
    })
  }

  /**
   * Get all white-label instances for management
   */
  async getAllInstances(): Promise<InstanceConfig[]> {
    // This would typically include pagination and filtering
    // For now, return a basic implementation
    return []
  }

  /**
   * Deactivate a white-label instance
   */
  async deactivateInstance(instanceId: string): Promise<void> {
    const instanceRef = doc(db, this.COLLECTION, instanceId)
    await updateDoc(instanceRef, {
      isActive: false,
      updatedAt: new Date(),
    })
  }
}

// Export singleton instance
export const brandingService = new BrandingService()