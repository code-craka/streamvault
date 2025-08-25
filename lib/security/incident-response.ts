import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore'
import { securityLogger } from './logging'
import { auditTrail } from './audit-trail'
import { keyRotationManager } from './key-rotation'

export interface SecurityIncident {
  id?: string
  type: 'data_breach' | 'account_takeover' | 'ddos_attack' | 'malware_detection' | 
        'unauthorized_access' | 'privilege_escalation' | 'fraud_detection' | 'system_compromise'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'false_positive'
  detectedAt: number
  resolvedAt?: number
  affectedUsers: string[]
  affectedSystems: string[]
  indicators: {
    type: string
    value: string
    confidence: number
  }[]
  automatedActions: {
    action: string
    timestamp: number
    success: boolean
    details?: any
  }[]
  manualActions: {
    action: string
    performedBy: string
    timestamp: number
    notes?: string
  }[]
  containmentMeasures: string[]
  rootCause?: string
  lessonsLearned?: string[]
  metadata: Record<string, any>
}

export interface IncidentResponseRule {
  id: string
  name: string
  description: string
  triggerConditions: {
    eventType: string
    severity: string
    threshold: number
    timeWindow: number
  }
  automatedActions: {
    action: string
    parameters: Record<string, any>
    delay?: number
  }[]
  enabled: boolean
  priority: number
}

export interface AutomatedAction {
  name: string
  description: string
  execute: (incident: SecurityIncident, parameters: Record<string, any>) => Promise<boolean>
}

class SecurityIncidentResponseSystem {
  private readonly INCIDENTS_COLLECTION = 'security_incidents'
  private readonly RESPONSE_RULES_COLLECTION = 'incident_response_rules'
  private readonly RESPONSE_LOG_COLLECTION = 'incident_response_logs'
  
  private automatedActions: Map<string, AutomatedAction> = new Map()

  constructor() {
    this.initializeAutomatedActions()
  }

  private initializeAutomatedActions(): void {
    // Block user account
    this.automatedActions.set('block_user', {
      name: 'Block User Account',
      description: 'Temporarily disable user account access',
      execute: async (incident, params) => {
        try {
          for (const userId of incident.affectedUsers) {
            // In production, this would call Clerk API to disable user
            console.log(`Blocking user account: ${userId}`)
            
            await auditTrail.logAction({
              userId: 'system',
              action: 'automated_user_block',
              resourceType: 'user',
              resourceId: userId,
              ipAddress: 'system',
              userAgent: 'incident-response-system',
              success: true,
              severity: 'high',
              category: 'security',
              complianceRelevant: true,
              retentionPeriod: 2555,
              metadata: { incidentId: incident.id, reason: 'security_incident' }
            })
          }
          return true
        } catch (error) {
          console.error('Failed to block user:', error)
          return false
        }
      }
    })

    // Rotate signing keys
    this.automatedActions.set('rotate_keys', {
      name: 'Emergency Key Rotation',
      description: 'Immediately rotate all signing keys',
      execute: async (incident, params) => {
        try {
          await keyRotationManager.emergencyKeyRotation()
          return true
        } catch (error) {
          console.error('Failed to rotate keys:', error)
          return false
        }
      }
    })

    // Block IP addresses
    this.automatedActions.set('block_ips', {
      name: 'Block IP Addresses',
      description: 'Add suspicious IP addresses to blocklist',
      execute: async (incident, params) => {
        try {
          const suspiciousIPs = params.ipAddresses || []
          
          for (const ip of suspiciousIPs) {
            // In production, this would update firewall rules or CDN settings
            console.log(`Blocking IP address: ${ip}`)
            
            await securityLogger.logSecurityEvent({
              eventType: 'system_configuration',
              ipAddress: 'system',
              userAgent: 'incident-response-system',
              timestamp: Date.now(),
              severity: 'medium',
              details: {
                action: 'ip_blocked',
                blockedIP: ip,
                incidentId: incident.id
              }
            })
          }
          return true
        } catch (error) {
          console.error('Failed to block IPs:', error)
          return false
        }
      }
    })

    // Invalidate sessions
    this.automatedActions.set('invalidate_sessions', {
      name: 'Invalidate User Sessions',
      description: 'Force logout all affected users',
      execute: async (incident, params) => {
        try {
          for (const userId of incident.affectedUsers) {
            // In production, this would invalidate JWT tokens or sessions
            console.log(`Invalidating sessions for user: ${userId}`)
            
            await auditTrail.logAction({
              userId: 'system',
              action: 'automated_session_invalidation',
              resourceType: 'user_session',
              resourceId: userId,
              ipAddress: 'system',
              userAgent: 'incident-response-system',
              success: true,
              severity: 'medium',
              category: 'security',
              complianceRelevant: true,
              retentionPeriod: 2190,
              metadata: { incidentId: incident.id }
            })
          }
          return true
        } catch (error) {
          console.error('Failed to invalidate sessions:', error)
          return false
        }
      }
    })

    // Enable enhanced monitoring
    this.automatedActions.set('enhance_monitoring', {
      name: 'Enable Enhanced Monitoring',
      description: 'Increase logging and monitoring sensitivity',
      execute: async (incident, params) => {
        try {
          // In production, this would adjust monitoring thresholds
          console.log('Enhanced monitoring enabled')
          
          await securityLogger.logSecurityEvent({
            eventType: 'system_configuration',
            ipAddress: 'system',
            userAgent: 'incident-response-system',
            timestamp: Date.now(),
            severity: 'low',
            details: {
              action: 'enhanced_monitoring_enabled',
              incidentId: incident.id,
              duration: params.duration || '24h'
            }
          })
          return true
        } catch (error) {
          console.error('Failed to enable enhanced monitoring:', error)
          return false
        }
      }
    })

    // Send alerts
    this.automatedActions.set('send_alerts', {
      name: 'Send Security Alerts',
      description: 'Notify security team and stakeholders',
      execute: async (incident, params) => {
        try {
          // In production, this would send emails, Slack messages, PagerDuty alerts, etc.
          console.log(`Sending security alert for incident: ${incident.id}`)
          
          const alertChannels = params.channels || ['email', 'slack']
          
          for (const channel of alertChannels) {
            console.log(`Alert sent via ${channel}`)
          }
          
          return true
        } catch (error) {
          console.error('Failed to send alerts:', error)
          return false
        }
      }
    })

    // Quarantine files
    this.automatedActions.set('quarantine_files', {
      name: 'Quarantine Suspicious Files',
      description: 'Move suspicious files to quarantine storage',
      execute: async (incident, params) => {
        try {
          const suspiciousFiles = params.files || []
          
          for (const file of suspiciousFiles) {
            // In production, this would move files to quarantine bucket
            console.log(`Quarantining file: ${file}`)
          }
          
          return true
        } catch (error) {
          console.error('Failed to quarantine files:', error)
          return false
        }
      }
    })
  }

  async detectIncident(
    type: SecurityIncident['type'],
    severity: SecurityIncident['severity'],
    indicators: SecurityIncident['indicators'],
    affectedUsers: string[] = [],
    affectedSystems: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<SecurityIncident> {
    try {
      const incident: Omit<SecurityIncident, 'id'> = {
        type,
        severity,
        status: 'detected',
        detectedAt: Date.now(),
        affectedUsers,
        affectedSystems,
        indicators,
        automatedActions: [],
        manualActions: [],
        containmentMeasures: [],
        metadata
      }

      // Store incident
      const docRef = await addDoc(collection(db, this.INCIDENTS_COLLECTION), incident)
      const incidentWithId = { ...incident, id: docRef.id }

      // Log security event
      await securityLogger.logSecurityEvent({
        eventType: 'data_breach_attempt',
        ipAddress: 'system',
        userAgent: 'incident-detection-system',
        timestamp: Date.now(),
        severity,
        details: {
          incidentId: docRef.id,
          incidentType: type,
          indicatorCount: indicators.length,
          affectedUserCount: affectedUsers.length,
          affectedSystemCount: affectedSystems.length
        }
      })

      // Trigger automated response
      await this.triggerAutomatedResponse(incidentWithId)

      return incidentWithId

    } catch (error) {
      console.error('Failed to detect incident:', error)
      throw error
    }
  }

  private async triggerAutomatedResponse(incident: SecurityIncident): Promise<void> {
    try {
      // Get applicable response rules
      const rules = await this.getApplicableRules(incident)
      
      for (const rule of rules) {
        console.log(`Executing automated response rule: ${rule.name}`)
        
        for (const actionConfig of rule.automatedActions) {
          // Add delay if specified
          if (actionConfig.delay) {
            await new Promise(resolve => setTimeout(resolve, actionConfig.delay))
          }
          
          const action = this.automatedActions.get(actionConfig.action)
          if (action) {
            try {
              const success = await action.execute(incident, actionConfig.parameters)
              
              const automatedAction = {
                action: actionConfig.action,
                timestamp: Date.now(),
                success,
                details: actionConfig.parameters
              }
              
              // Update incident with automated action
              if (incident.id) {
                await this.addAutomatedAction(incident.id, automatedAction)
              }
              
              console.log(`Automated action ${actionConfig.action}: ${success ? 'SUCCESS' : 'FAILED'}`)
              
            } catch (error) {
              console.error(`Automated action ${actionConfig.action} failed:`, error)
              
              if (incident.id) {
                await this.addAutomatedAction(incident.id, {
                  action: actionConfig.action,
                  timestamp: Date.now(),
                  success: false,
                  details: { error: error instanceof Error ? error.message : 'Unknown error' }
                })
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to trigger automated response:', error)
    }
  }

  private async getApplicableRules(incident: SecurityIncident): Promise<IncidentResponseRule[]> {
    try {
      const rulesRef = collection(db, this.RESPONSE_RULES_COLLECTION)
      const q = query(rulesRef, where('enabled', '==', true), orderBy('priority', 'desc'))
      
      const snapshot = await getDocs(q)
      const allRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncidentResponseRule))
      
      // Filter rules that match the incident
      return allRules.filter(rule => {
        return rule.triggerConditions.eventType === incident.type &&
               this.severityMatches(rule.triggerConditions.severity, incident.severity)
      })
      
    } catch (error) {
      console.error('Failed to get applicable rules:', error)
      return []
    }
  }

  private severityMatches(ruleSeverity: string, incidentSeverity: string): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const ruleLevel = severityLevels[ruleSeverity as keyof typeof severityLevels] || 0
    const incidentLevel = severityLevels[incidentSeverity as keyof typeof severityLevels] || 0
    
    return incidentLevel >= ruleLevel
  }

  private async addAutomatedAction(
    incidentId: string,
    action: SecurityIncident['automatedActions'][0]
  ): Promise<void> {
    try {
      const incidentRef = doc(db, this.INCIDENTS_COLLECTION, incidentId)
      
      // In a real implementation, you'd use arrayUnion to add to the automatedActions array
      // This is a simplified version
      console.log(`Adding automated action to incident ${incidentId}:`, action)
      
    } catch (error) {
      console.error('Failed to add automated action:', error)
    }
  }

  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    notes?: string,
    performedBy?: string
  ): Promise<void> {
    try {
      const incidentRef = doc(db, this.INCIDENTS_COLLECTION, incidentId)
      
      const updateData: any = {
        status,
        lastUpdated: Date.now()
      }
      
      if (status === 'resolved') {
        updateData.resolvedAt = Date.now()
      }
      
      await updateDoc(incidentRef, updateData)
      
      // Add manual action if provided
      if (notes && performedBy) {
        const manualAction = {
          action: `status_change_to_${status}`,
          performedBy,
          timestamp: Date.now(),
          notes
        }
        
        // In production, you'd add this to the manualActions array
        console.log(`Manual action added to incident ${incidentId}:`, manualAction)
      }
      
      // Log audit trail
      await auditTrail.logAction({
        userId: performedBy || 'system',
        action: 'update_incident_status',
        resourceType: 'security_incident',
        resourceId: incidentId,
        ipAddress: 'system',
        userAgent: 'incident-response-system',
        success: true,
        severity: 'medium',
        category: 'security',
        complianceRelevant: true,
        retentionPeriod: 2555,
        metadata: { newStatus: status, notes }
      })
      
    } catch (error) {
      console.error('Failed to update incident status:', error)
      throw error
    }
  }

  async getIncidents(
    filters: {
      type?: string
      severity?: string
      status?: string
      startTime?: number
      endTime?: number
    } = {},
    limitCount: number = 100
  ): Promise<SecurityIncident[]> {
    try {
      let q = query(
        collection(db, this.INCIDENTS_COLLECTION),
        orderBy('detectedAt', 'desc'),
        limit(limitCount)
      )

      // Apply filters
      if (filters.type) {
        q = query(q, where('type', '==', filters.type))
      }
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity))
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SecurityIncident))

    } catch (error) {
      console.error('Failed to get incidents:', error)
      return []
    }
  }

  async createResponseRule(rule: Omit<IncidentResponseRule, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.RESPONSE_RULES_COLLECTION), rule)
      
      await auditTrail.logAction({
        userId: 'system',
        action: 'create_incident_response_rule',
        resourceType: 'incident_response_rule',
        resourceId: docRef.id,
        ipAddress: 'system',
        userAgent: 'incident-response-system',
        success: true,
        severity: 'medium',
        category: 'system_configuration',
        complianceRelevant: true,
        retentionPeriod: 2555,
        metadata: { ruleName: rule.name }
      })
      
      return docRef.id
      
    } catch (error) {
      console.error('Failed to create response rule:', error)
      throw error
    }
  }
}

// Export singleton instance
export const incidentResponseSystem = new SecurityIncidentResponseSystem()

// Helper functions
export async function reportSecurityIncident(
  type: SecurityIncident['type'],
  severity: SecurityIncident['severity'],
  indicators: SecurityIncident['indicators'],
  affectedUsers: string[] = [],
  affectedSystems: string[] = [],
  metadata: Record<string, any> = {}
): Promise<SecurityIncident> {
  return incidentResponseSystem.detectIncident(
    type,
    severity,
    indicators,
    affectedUsers,
    affectedSystems,
    metadata
  )
}

export async function updateIncident(
  incidentId: string,
  status: SecurityIncident['status'],
  notes?: string,
  performedBy?: string
): Promise<void> {
  return incidentResponseSystem.updateIncidentStatus(incidentId, status, notes, performedBy)
}