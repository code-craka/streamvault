import { db } from '@/lib/firebase'
import { collection, doc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { createHash } from 'crypto'

interface AuditEvent {
  id: string
  userId: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  metadata: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'auth' | 'data' | 'system' | 'security' | 'payment' | 'content'
  outcome: 'success' | 'failure' | 'partial'
  complianceFlags: string[]
}

interface AuditQuery {
  userId?: string
  action?: string
  resource?: string
  category?: string
  severity?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}

interface ComplianceReport {
  reportId: string
  type: 'gdpr' | 'ccpa' | 'sox' | 'pci' | 'custom'
  startDate: Date
  endDate: Date
  events: AuditEvent[]
  summary: {
    totalEvents: number
    criticalEvents: number
    failedEvents: number
    userCount: number
    resourcesAccessed: string[]
  }
  generatedAt: Date
  generatedBy: string
}

export class AuditTrailService {
  /**
   * Log an audit event with comprehensive details
   */
  async logEvent(
    userId: string,
    action: string,
    resource: string,
    details: {
      resourceId?: string
      outcome?: 'success' | 'failure' | 'partial'
      metadata?: Record<string, any>
      ipAddress?: string
      userAgent?: string
      sessionId?: string
      userEmail?: string
      severity?: 'low' | 'medium' | 'high' | 'critical'
      category?: 'auth' | 'data' | 'system' | 'security' | 'payment' | 'content'
    } = {}
  ): Promise<string> {
    const eventId = this.generateEventId()
    
    const auditEvent: AuditEvent = {
      id: eventId,
      userId,
      userEmail: details.userEmail,
      action,
      resource,
      resourceId: details.resourceId,
      timestamp: new Date(),
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
      metadata: details.metadata || {},
      severity: details.severity || this.determineSeverity(action, resource),
      category: details.category || this.determineCategory(resource),
      outcome: details.outcome || 'success',
      complianceFlags: this.determineComplianceFlags(action, resource)
    }

    // Store in Firestore with partitioning by date for performance
    const datePartition = this.getDatePartition(auditEvent.timestamp)
    await setDoc(
      doc(db, 'audit_events', datePartition, 'events', eventId),
      auditEvent
    )

    // Create indexes for common queries
    await this.createAuditIndexes(auditEvent)

    // Check for compliance violations
    await this.checkComplianceViolations(auditEvent)

    return eventId
  }

  /**
   * Query audit events with filtering and pagination
   */
  async queryEvents(queryParams: AuditQuery): Promise<AuditEvent[]> {
    const events: AuditEvent[] = []
    
    // Determine date partitions to query
    const partitions = this.getDatePartitionsForRange(
      queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      queryParams.endDate || new Date()
    )

    for (const partition of partitions) {
      const eventsRef = collection(db, 'audit_events', partition, 'events')
      let q = query(eventsRef, orderBy('timestamp', 'desc'))

      // Apply filters
      if (queryParams.userId) {
        q = query(q, where('userId', '==', queryParams.userId))
      }
      if (queryParams.action) {
        q = query(q, where('action', '==', queryParams.action))
      }
      if (queryParams.resource) {
        q = query(q, where('resource', '==', queryParams.resource))
      }
      if (queryParams.category) {
        q = query(q, where('category', '==', queryParams.category))
      }
      if (queryParams.severity) {
        q = query(q, where('severity', '==', queryParams.severity))
      }

      if (queryParams.limit) {
        q = query(q, limit(queryParams.limit))
      }

      const snapshot = await getDocs(q)
      const partitionEvents = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as AuditEvent[]

      events.push(...partitionEvents)
    }

    // Sort and limit results
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    if (queryParams.limit) {
      return events.slice(0, queryParams.limit)
    }

    return events
  }

  /**
   * Generate compliance report for regulatory requirements
   */
  async generateComplianceReport(
    type: 'gdpr' | 'ccpa' | 'sox' | 'pci' | 'custom',
    startDate: Date,
    endDate: Date,
    generatedBy: string,
    filters?: Partial<AuditQuery>
  ): Promise<ComplianceReport> {
    const reportId = this.generateReportId()

    // Query relevant events
    const events = await this.queryEvents({
      startDate,
      endDate,
      ...filters
    })

    // Filter events based on compliance type
    const relevantEvents = this.filterEventsForCompliance(events, type)

    // Generate summary
    const summary = {
      totalEvents: relevantEvents.length,
      criticalEvents: relevantEvents.filter(e => e.severity === 'critical').length,
      failedEvents: relevantEvents.filter(e => e.outcome === 'failure').length,
      userCount: new Set(relevantEvents.map(e => e.userId)).size,
      resourcesAccessed: [...new Set(relevantEvents.map(e => e.resource))]
    }

    const report: ComplianceReport = {
      reportId,
      type,
      startDate,
      endDate,
      events: relevantEvents,
      summary,
      generatedAt: new Date(),
      generatedBy
    }

    // Store report
    await setDoc(doc(db, 'compliance_reports', reportId), report)

    return report
  }

  /**
   * Track user data access for GDPR compliance
   */
  async trackDataAccess(
    userId: string,
    dataType: string,
    purpose: string,
    details: {
      ipAddress?: string
      userAgent?: string
      sessionId?: string
      dataFields?: string[]
      legalBasis?: string
    } = {}
  ): Promise<void> {
    await this.logEvent(userId, 'data_access', dataType, {
      metadata: {
        purpose,
        dataFields: details.dataFields || [],
        legalBasis: details.legalBasis || 'legitimate_interest'
      },
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
      category: 'data',
      severity: 'medium',
      complianceFlags: ['gdpr', 'ccpa']
    })
  }

  /**
   * Track data modifications for audit purposes
   */
  async trackDataModification(
    userId: string,
    resource: string,
    resourceId: string,
    changes: {
      before: Record<string, any>
      after: Record<string, any>
      fields: string[]
    },
    details: {
      ipAddress?: string
      userAgent?: string
      sessionId?: string
      reason?: string
    } = {}
  ): Promise<void> {
    await this.logEvent(userId, 'data_modify', resource, {
      resourceId,
      metadata: {
        changes,
        reason: details.reason || 'user_initiated',
        fieldsModified: changes.fields
      },
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
      category: 'data',
      severity: 'high'
    })
  }

  /**
   * Track security events for monitoring
   */
  async trackSecurityEvent(
    userId: string,
    eventType: string,
    details: {
      threat?: string
      blocked?: boolean
      ipAddress?: string
      userAgent?: string
      metadata?: Record<string, any>
    } = {}
  ): Promise<void> {
    await this.logEvent(userId, eventType, 'security', {
      metadata: {
        threat: details.threat,
        blocked: details.blocked || false,
        ...details.metadata
      },
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      category: 'security',
      severity: 'critical',
      outcome: details.blocked ? 'success' : 'failure'
    })
  }

  /**
   * Export user data for GDPR data portability
   */
  async exportUserData(userId: string): Promise<{
    auditEvents: AuditEvent[]
    summary: Record<string, any>
  }> {
    // Get all audit events for user
    const events = await this.queryEvents({ userId })

    // Create summary of user's activity
    const summary = {
      totalEvents: events.length,
      firstActivity: events[events.length - 1]?.timestamp,
      lastActivity: events[0]?.timestamp,
      actionsPerformed: [...new Set(events.map(e => e.action))],
      resourcesAccessed: [...new Set(events.map(e => e.resource))],
      dataAccessEvents: events.filter(e => e.action === 'data_access').length,
      securityEvents: events.filter(e => e.category === 'security').length
    }

    // Log the data export
    await this.logEvent(userId, 'data_export', 'user_data', {
      metadata: { exportedEvents: events.length },
      category: 'data',
      severity: 'medium'
    })

    return { auditEvents: events, summary }
  }

  /**
   * Delete user audit data for GDPR right to be forgotten
   */
  async deleteUserAuditData(
    userId: string,
    retentionExceptions: string[] = []
  ): Promise<void> {
    const events = await this.queryEvents({ userId })

    for (const event of events) {
      // Check if event should be retained for legal/compliance reasons
      const shouldRetain = retentionExceptions.some(exception =>
        event.complianceFlags.includes(exception) ||
        event.category === 'security' ||
        event.severity === 'critical'
      )

      if (!shouldRetain) {
        // Anonymize instead of delete to maintain audit integrity
        await this.anonymizeAuditEvent(event.id)
      }
    }

    // Log the deletion request
    await this.logEvent(userId, 'data_deletion', 'audit_data', {
      metadata: {
        eventsProcessed: events.length,
        retentionExceptions
      },
      category: 'data',
      severity: 'high'
    })
  }

  private async anonymizeAuditEvent(eventId: string): Promise<void> {
    // Implementation would anonymize the event while preserving audit integrity
    // For now, just mark as anonymized
    const datePartition = this.getDatePartition(new Date())
    await setDoc(
      doc(db, 'audit_events', datePartition, 'events', eventId),
      {
        userId: 'anonymized',
        userEmail: 'anonymized',
        ipAddress: 'anonymized',
        userAgent: 'anonymized',
        anonymizedAt: new Date()
      },
      { merge: true }
    )
  }

  private determineSeverity(action: string, resource: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = ['delete', 'admin_access', 'security_breach', 'payment_failure']
    const highActions = ['create', 'update', 'login_failure', 'permission_change']
    const mediumActions = ['read', 'login_success', 'logout']

    if (criticalActions.some(a => action.includes(a))) return 'critical'
    if (highActions.some(a => action.includes(a))) return 'high'
    if (mediumActions.some(a => action.includes(a))) return 'medium'
    
    return 'low'
  }

  private determineCategory(resource: string): 'auth' | 'data' | 'system' | 'security' | 'payment' | 'content' {
    if (resource.includes('auth') || resource.includes('login')) return 'auth'
    if (resource.includes('payment') || resource.includes('billing')) return 'payment'
    if (resource.includes('security') || resource.includes('fraud')) return 'security'
    if (resource.includes('video') || resource.includes('stream')) return 'content'
    if (resource.includes('system') || resource.includes('admin')) return 'system'
    
    return 'data'
  }

  private determineComplianceFlags(action: string, resource: string): string[] {
    const flags: string[] = []

    // GDPR flags
    if (action.includes('data_') || resource.includes('user')) {
      flags.push('gdpr')
    }

    // CCPA flags
    if (action.includes('data_access') || action.includes('data_delete')) {
      flags.push('ccpa')
    }

    // PCI flags
    if (resource.includes('payment') || resource.includes('card')) {
      flags.push('pci')
    }

    // SOX flags
    if (resource.includes('financial') || action.includes('admin')) {
      flags.push('sox')
    }

    return flags
  }

  private filterEventsForCompliance(events: AuditEvent[], type: string): AuditEvent[] {
    return events.filter(event => event.complianceFlags.includes(type))
  }

  private async createAuditIndexes(event: AuditEvent): Promise<void> {
    // Create additional indexes for fast querying
    const indexes = [
      `user_${event.userId}`,
      `action_${event.action}`,
      `resource_${event.resource}`,
      `category_${event.category}`,
      `severity_${event.severity}`
    ]

    for (const index of indexes) {
      await setDoc(
        doc(db, 'audit_indexes', index, 'events', event.id),
        { eventId: event.id, timestamp: event.timestamp }
      )
    }
  }

  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    // Check for potential compliance violations
    if (event.severity === 'critical' && event.outcome === 'failure') {
      await setDoc(doc(db, 'compliance_violations', event.id), {
        eventId: event.id,
        type: 'critical_failure',
        description: `Critical event failed: ${event.action} on ${event.resource}`,
        timestamp: event.timestamp,
        status: 'open'
      })
    }
  }

  private getDatePartition(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  private getDatePartitionsForRange(startDate: Date, endDate: Date): string[] {
    const partitions: string[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      partitions.push(this.getDatePartition(current))
      current.setMonth(current.getMonth() + 1)
    }

    return partitions
  }

  private generateEventId(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 16)
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

export const auditTrailService = new AuditTrailService()