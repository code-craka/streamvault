import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { auditTrail } from '@/lib/security/audit-trail'
import { validateRequest } from '@/lib/security/validation'
import { logUserAction } from '@/lib/security/audit-trail'
import { z } from 'zod'

const getAuditLogsSchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(1000)).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role or is requesting their own audit logs
    const url = new URL(req.url)
    const requestedUserId = url.searchParams.get('userId')
    
    const user = await fetch(`${process.env.CLERK_API_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }).then(res => res.json())

    const isAdmin = user.public_metadata?.role === 'admin'
    const isOwnData = !requestedUserId || requestedUserId === userId

    if (!isAdmin && !isOwnData) {
      await logUserAction(
        'unauthorized_audit_access',
        userId,
        'audit_logs',
        requestedUserId || 'system',
        req,
        false,
        undefined,
        undefined,
        'User attempted to access audit logs for another user'
      )
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validatedParams = validateRequest(getAuditLogsSchema, queryParams)

    // Convert date strings to timestamps
    const filters: any = {}
    if (validatedParams.action) filters.action = validatedParams.action
    if (validatedParams.userId) filters.userId = validatedParams.userId
    if (validatedParams.resourceType) filters.resourceType = validatedParams.resourceType
    if (validatedParams.startTime) filters.startTime = new Date(validatedParams.startTime).getTime()
    if (validatedParams.endTime) filters.endTime = new Date(validatedParams.endTime).getTime()

    // If not admin, restrict to own data
    if (!isAdmin) {
      filters.userId = userId
    }

    const limit = validatedParams.limit || 100

    // Get audit logs
    const logs = await auditTrailService.queryEvents(filters, limit)

    // Log the access
    await logUserAction(
      'view_audit_logs',
      userId,
      'audit_logs',
      filters.userId || 'system',
      req,
      true,
      undefined,
      { filters, limit, resultCount: logs.length }
    )

    return NextResponse.json({
      success: true,
      data: logs,
      total: logs.length,
      filters,
      limit
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    const auditEntrySchema = z.object({
      action: z.string().min(1),
      resourceType: z.string().min(1),
      resourceId: z.string().min(1),
      resourceName: z.string().optional(),
      oldValues: z.record(z.any()).optional(),
      newValues: z.record(z.any()).optional(),
      success: z.boolean().default(true),
      errorMessage: z.string().optional(),
    })

    const validatedEntry = validateRequest(auditEntrySchema, body)

    // Create audit log entry
    const auditId = await auditTrailService.logEvent({
      userId,
      action: validatedEntry.action,
      resourceType: validatedEntry.resourceType,
      resourceId: validatedEntry.resourceId,
      resourceName: validatedEntry.resourceName,
      oldValues: validatedEntry.oldValues,
      newValues: validatedEntry.newValues,
      changes: validatedEntry.oldValues && validatedEntry.newValues ? 
        generateChanges(validatedEntry.oldValues, validatedEntry.newValues) : undefined,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || '',
      success: validatedEntry.success,
      errorMessage: validatedEntry.errorMessage,
      severity: validatedEntry.success ? 'low' : 'medium',
      category: determineCategory(validatedEntry.action, validatedEntry.resourceType),
      complianceRelevant: isComplianceRelevant(validatedEntry.action, validatedEntry.resourceType),
      retentionPeriod: getRetentionPeriod(validatedEntry.action, validatedEntry.resourceType)
    })

    return NextResponse.json({
      success: true,
      auditId,
      message: 'Audit log entry created successfully'
    })

  } catch (error) {
    console.error('Error creating audit log:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown' || 'unknown'
}

function generateChanges(
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Array<{ field: string; oldValue: any; newValue: any }> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
  const allFields = new Set([...Object.keys(oldValues), ...Object.keys(newValues)])

  allFields.forEach(field => {
    const oldValue = oldValues[field]
    const newValue = newValues[field]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue, newValue })
    }
  })

  return changes
}

function determineCategory(action: string, resourceType: string): string {
  if (action.includes('login') || action.includes('auth')) return 'authentication'
  if (action.includes('permission') || action.includes('role')) return 'authorization'
  if (action.includes('payment') || action.includes('subscription')) return 'financial'
  if (action.includes('security') || action.includes('breach')) return 'security'
  if (resourceType === 'user') return 'user_management'
  if (resourceType === 'stream' || resourceType === 'video') return 'content_management'
  if (action.includes('read') || action.includes('view')) return 'data_access'
  if (action.includes('create') || action.includes('update') || action.includes('delete')) return 'data_modification'
  
  return 'system_configuration'
}

function isComplianceRelevant(action: string, resourceType: string): boolean {
  const complianceActions = [
    'delete', 'export', 'access_personal_data', 'change_consent',
    'payment', 'subscription', 'role_change', 'security'
  ]
  
  const complianceResources = ['user', 'payment', 'subscription', 'personal_data']
  
  return complianceActions.some(a => action.includes(a)) ||
         complianceResources.includes(resourceType)
}

function getRetentionPeriod(action: string, resourceType: string): number {
  // Security and financial data: 7 years
  if (action.includes('security') || action.includes('payment') || action.includes('financial')) {
    return 2555 // 7 years
  }
  
  // Personal data access: 6 years (GDPR requirement)
  if (action.includes('personal_data') || resourceType === 'user') {
    return 2190 // 6 years
  }
  
  // General audit data: 3 years
  return 1095 // 3 years
}