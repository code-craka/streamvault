import { getEnvConfig, getClientEnvConfig, type EnvConfig } from './env'

// Configuration class for centralized config management
export class Config {
  private static instance: Config
  private envConfig: EnvConfig | null = null

  private constructor() {}

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config()
    }
    return Config.instance
  }

  // Server-side configuration getter
  public getServerConfig(): EnvConfig {
    if (typeof window !== 'undefined') {
      throw new Error(
        'getServerConfig() should only be called on the server side'
      )
    }

    if (!this.envConfig) {
      this.envConfig = getEnvConfig()
    }

    return this.envConfig
  }

  // Client-side configuration getter
  public getClientConfig() {
    return getClientEnvConfig()
  }

  // Environment-specific utilities
  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  public isStaging(): boolean {
    return process.env.APP_ENV === 'staging'
  }

  // Feature flag utilities
  public isFeatureEnabled(
    feature: keyof Pick<
      EnvConfig,
      | 'ENABLE_AI_FEATURES'
      | 'ENABLE_WHITE_LABEL'
      | 'ENABLE_ANALYTICS'
      | 'ENABLE_PWA'
      | 'ENABLE_OFFLINE_DOWNLOADS'
    >
  ): boolean {
    if (typeof window !== 'undefined') {
      // Client-side feature flags should be handled differently
      // For now, return false for security
      return false
    }

    const config = this.getServerConfig()
    return config[feature] as boolean
  }

  // Database configuration
  public getDatabaseConfig() {
    const config = this.getServerConfig()
    return {
      url: config.DATABASE_URL,
      redis: config.REDIS_URL,
    }
  }

  // Storage configuration
  public getStorageConfig() {
    const config = this.getServerConfig()
    return {
      gcp: {
        projectId: config.GCP_PROJECT_ID,
        bucketName: config.GCS_BUCKET_NAME,
        serviceAccountEmail: config.GCS_SERVICE_ACCOUNT_EMAIL,
        credentialsPath: config.GOOGLE_APPLICATION_CREDENTIALS,
      },
      limits: {
        maxFileSize: config.MAX_FILE_SIZE,
        allowedTypes: config.ALLOWED_FILE_TYPES.split(','),
        thumbnailSizes: config.THUMBNAIL_SIZES.split(','),
      },
    }
  }

  // Streaming configuration
  public getStreamingConfig() {
    const config = this.getServerConfig()
    return {
      domain: config.STREAMING_DOMAIN,
      rtmpIngestUrl: config.RTMP_INGEST_URL,
      hlsDeliveryUrl: config.HLS_DELIVERY_URL,
      cdnBaseUrl: config.CDN_BASE_URL,
    }
  }

  // Authentication configuration
  public getAuthConfig() {
    const config = this.getServerConfig()
    return {
      clerk: {
        secretKey: config.CLERK_SECRET_KEY,
      },
      jwt: {
        secret: config.JWT_SECRET,
      },
      security: {
        encryptionKey: config.ENCRYPTION_KEY,
        webhookSecret: config.WEBHOOK_SECRET,
      },
    }
  }

  // Payment configuration
  public getPaymentConfig() {
    const config = this.getServerConfig()
    return {
      stripe: {
        secretKey: config.STRIPE_SECRET_KEY,
        webhookSecret: config.STRIPE_WEBHOOK_SECRET,
        prices: {
          basic: config.STRIPE_BASIC_PRICE_ID,
          premium: config.STRIPE_PREMIUM_PRICE_ID,
          pro: config.STRIPE_PRO_PRICE_ID,
        },
      },
    }
  }

  // Firebase configuration
  public getFirebaseConfig() {
    const config = this.getServerConfig()
    return {
      projectId: config.FIREBASE_PROJECT_ID,
      privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
    }
  }

  // Rate limiting configuration
  public getRateLimitConfig() {
    const config = this.getServerConfig()
    return {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
    }
  }

  // Monitoring configuration
  public getMonitoringConfig() {
    const config = this.getServerConfig()
    return {
      sentry: {
        dsn: config.SENTRY_DSN,
      },
      analytics: {
        id: config.ANALYTICS_ID,
      },
      performance: {
        enabled: config.ENABLE_PERFORMANCE_MONITORING,
      },
      logging: {
        level: config.LOG_LEVEL,
      },
    }
  }

  // AI services configuration
  public getAIConfig() {
    const config = this.getServerConfig()
    return {
      openai: {
        apiKey: config.OPENAI_API_KEY,
      },
      google: {
        apiKey: config.GOOGLE_AI_API_KEY,
      },
      contentModeration: {
        apiKey: config.CONTENT_MODERATION_API_KEY,
      },
      enabled: config.ENABLE_AI_FEATURES,
    }
  }

  // Email configuration
  public getEmailConfig() {
    const config = this.getServerConfig()
    return {
      smtp: {
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    }
  }

  // Cloudflare configuration
  public getCloudflareConfig() {
    const config = this.getServerConfig()
    return {
      apiToken: config.CLOUDFLARE_API_TOKEN,
      zoneId: config.CLOUDFLARE_ZONE_ID,
      accountId: config.CLOUDFLARE_ACCOUNT_ID,
    }
  }
}

// Export singleton instance
export const config = Config.getInstance()

// Export types
export type { EnvConfig } from './env'

// Convenience exports for common configurations
export const getServerConfig = () => config.getServerConfig()
export const getClientConfig = () => config.getClientConfig()
export const isDevelopment = () => config.isDevelopment()
export const isProduction = () => config.isProduction()
export const isStaging = () => config.isStaging()
