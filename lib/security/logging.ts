import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore'
import { z } from 'zod'

export interface SecurityEvent {
  eventType:
    | 'login_attempt'
    | 'failed_login'
    | 'suspicious_activity'
    | 'rate_limit_exceeded'
    | 'unauthorized_access'
    | 'data_breach_attempt'
    | 'malicious_content'
    | 'content_violation'
    | 'payment_fraud'
    | 'account_takeover'
    | 'privilege_escalation'
  userId?: string
  ipAddress: string
  userAgent: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, any>
  resolved?: boolean
  resolvedBy?: string
  resolvedAt?: number
}

export interface AuditLogEntry {
  action: string
  userId: string
  resourceType: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: number
  success: boolean
  errorMessage?: string
}

export interface SecurityAlert {
  id: string
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  count: number
  firstOccurrence: number
  lastOccurrence: number
  ipAddresses: string[]
  userIds: string[]
  autoResolved: boolean
  manuallyResolved: boolean
  resolvedBy?: string
  resolvedAt?: number
}

class SecurityLogger {
  private readonly SECURITY_EVENTS_COLLECTION = 'security_events'
  private readonly AUDIT_LOGS_COLLECTION = 'audit_logs'
  private readonly SECURITY_ALERTS_COLLECTION = 'security_alerts'

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Validate event data
      const validatedEvent = this.validateSecurityEvent(event)

      // Store in Firestore
      await addDoc(
        collection(db, this.SECURITY_EVENTS_COLLECTION),
        validatedEvent
      )

      // Check if this should trigger an alert
      await this.checkForSecurityAlert(validatedEvent)

      // Log to console for immediate visibility
      console.log(
        `[SECURITY] ${validatedEvent.severity.toUpperCase()}: ${validatedEvent.eventType}`,
        {
          userId: validatedEvent.userId,
          ipAddress: validatedEvent.ipAddress,
          details: validatedEvent.details,
        }
      )

      // Send critical events to external monitoring
      if (validatedEvent.severity === 'critical') {
        await this.sendCriticalAlert(validatedEvent)
      }
    } catch (error) {
      console.error('Failed to log security event:', error)
      // Fallback to console logging
      console.log('[SECURITY-FALLBACK]', event)
    }
  }

  async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      const validatedEntry = this.validateAuditEntry(entry)

      await addDoc(collection(db, this.AUDIT_LOGS_COLLECTION), validatedEntry)

      // Log sensitive actions with higher visibility
      const sensitiveActions = [
        'user_role_change',
        'subscription_change',
        'payment_method_update',
        'password_change',
        'email_change',
        'account_deletion',
        'admin_action',
      ]

      if (sensitiveActions.includes(entry.action)) {
        console.log(`[AUDIT] ${entry.action}`, {
          userId: entry.userId,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          success: entry.success,
        })
      }
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }

  async getSecurityEvents(
    filters: {
      eventType?: string
      severity?: string
      userId?: string
      ipAddress?: string
      startTime?: number
      endTime?: number
    },
    limitCount: number = 100
  ): Promise<SecurityEvent[]> {
    try {
      let q = query(
        collection(db, this.SECURITY_EVENTS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )

      // Apply filters
      if (filters.eventType) {
        q = query(q, where('eventType', '==', filters.eventType))
      }
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity))
      }
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId))
      }
      if (filters.ipAddress) {
        q = query(q, where('ipAddress', '==', filters.ipAddress))
      }
      if (filters.startTime) {
        q = query(q, where('timestamp', '>=', filters.startTime))
      }
      if (filters.endTime) {
        q = query(q, where('timestamp', '<=', filters.endTime))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ ...doc.data() }) as SecurityEvent)
    } catch (error) {
      console.error('Failed to get security events:', error)
      return []
    }
  }

  async getAuditLogs(
    filters: {
      action?: string
      userId?: string
      resourceType?: string
      startTime?: number
      endTime?: number
    },
    limitCount: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      let q = query(
        collection(db, this.AUDIT_LOGS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )

      // Apply filters
      if (filters.action) {
        q = query(q, where('action', '==', filters.action))
      }
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId))
      }
      if (filters.resourceType) {
        q = query(q, where('resourceType', '==', filters.resourceType))
      }
      if (filters.startTime) {
        q = query(q, where('timestamp', '>=', filters.startTime))
      }
      if (filters.endTime) {
        q = query(q, where('timestamp', '<=', filters.endTime))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ ...doc.data() }) as AuditLogEntry)
    } catch (error) {
      console.error('Failed to get audit logs:', error)
      return []
    }
  }

  private async checkForSecurityAlert(event: SecurityEvent): Promise<void> {
    // Define alert thresholds
    const alertThresholds = {
      failed_login: { count: 5, window: 15 * 60 * 1000 }, // 5 failed logins in 15 minutes
      rate_limit_exceeded: { count: 10, window: 5 * 60 * 1000 }, // 10 rate limits in 5 minutes
      suspicious_activity: { count: 3, window: 10 * 60 * 1000 }, // 3 suspicious activities in 10 minutes
      unauthorized_access: { count: 1, window: 0 }, // Immediate alert
      data_breach_attempt: { count: 1, window: 0 }, // Immediate alert
    }

    const threshold =
      alertThresholds[event.eventType as keyof typeof alertThresholds]
    if (!threshold) return

    const windowStart = event.timestamp - threshold.window

    // Count recent events of the same type
    const recentEvents = await this.getSecurityEvents({
      eventType: event.eventType,
      startTime: windowStart,
      endTime: event.timestamp,
    })

    if (recentEvents.length >= threshold.count) {
      await this.createSecurityAlert(event.eventType, recentEvents)
    }
  }

  private async createSecurityAlert(
    eventType: string,
    events: SecurityEvent[]
  ): Promise<void> {
    const alert: Omit<SecurityAlert, 'id'> = {
      eventType,
      severity: this.calculateAlertSeverity(events),
      count: events.length,
      firstOccurrence: Math.min(...events.map(e => e.timestamp)),
      lastOccurrence: Math.max(...events.map(e => e.timestamp)),
      ipAddresses: [...new Set(events.map(e => e.ipAddress))],
      userIds: [
        ...new Set(events.map(e => e.userId).filter(Boolean) as string[]),
      ],
      autoResolved: false,
      manuallyResolved: false,
    }

    await addDoc(collection(db, this.SECURITY_ALERTS_COLLECTION), alert)

    // Send notification to security team
    await this.notifySecurityTeam(alert)
  }

  private calculateAlertSeverity(
    events: SecurityEvent[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 }
    const maxSeverity = Math.max(...events.map(e => severityScores[e.severity]))

    if (maxSeverity >= 4 || events.length >= 20) return 'critical'
    if (maxSeverity >= 3 || events.length >= 10) return 'high'
    if (maxSeverity >= 2 || events.length >= 5) return 'medium'
    return 'low'
  }

  private async sendCriticalAlert(event: SecurityEvent): Promise<void> {
    // In production, this would send to external monitoring services
    // like PagerDuty, Slack, email, etc.
    console.error('[CRITICAL SECURITY ALERT]', {
      eventType: event.eventType,
      userId: event.userId,
      ipAddress: event.ipAddress,
      timestamp: new Date(event.timestamp).toISOString(),
      details: event.details,
    })

    // TODO: Integrate with external alerting services
    // await this.sendToSlack(event)
    // await this.sendToEmail(event)
    // await this.sendToPagerDuty(event)
  }

  private async notifySecurityTeam(
    alert: Omit<SecurityAlert, 'id'>
  ): Promise<void> {
    console.warn('[SECURITY ALERT]', {
      eventType: alert.eventType,
      severity: alert.severity,
      count: alert.count,
      ipAddresses: alert.ipAddresses,
      userIds: alert.userIds,
    })

    // TODO: Implement actual notification system
  }

  private validateSecurityEvent(event: SecurityEvent): SecurityEvent {
    const schema = z.object({
      eventType: z.enum([
        'login_attempt',
        'failed_login',
        'suspicious_activity',
        'rate_limit_exceeded',
        'unauthorized_access',
        'data_breach_attempt',
        'malicious_content',
        'content_violation',
        'payment_fraud',
        'account_takeover',
        'privilege_escalation',
      ]),
      userId: z.string().optional(),
      ipAddress: z.string().ip(),
      userAgent: z.string().max(500),
      timestamp: z.number().int().positive(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      details: z.record(z.any()).optional(),
      resolved: z.boolean().optional(),
      resolvedBy: z.string().optional(),
      resolvedAt: z.number().int().positive().optional(),
    })

    return schema.parse(event)
  }

  private validateAuditEntry(entry: AuditLogEntry): AuditLogEntry {
    const schema = z.object({
      action: z.string().min(1),
      userId: z.string().min(1),
      resourceType: z.string().min(1),
      resourceId: z.string().min(1),
      changes: z.record(z.any()).optional(),
      ipAddress: z.string().ip(),
      userAgent: z.string().max(500),
      timestamp: z.number().int().positive(),
      success: z.boolean(),
      errorMessage: z.string().optional(),
    })

    return schema.parse(entry)
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger()

// Helper functions for common security logging patterns
export async function logUserAction(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  request: Request,
  success: boolean = true,
  changes?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''

  await securityLogger.logAuditEvent({
    action,
    userId,
    resourceType,
    resourceId,
    changes,
    ipAddress,
    userAgent,
    timestamp: Date.now(),
    success,
    errorMessage,
  })
}

export async function logSecurityIncident(
  eventType: SecurityEvent['eventType'],
  severity: SecurityEvent['severity'],
  request: Request,
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''

  await securityLogger.logSecurityEvent({
    eventType,
    userId,
    ipAddress,
    userAgent,
    timestamp: Date.now(),
    severity,
    details,
  })
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}
