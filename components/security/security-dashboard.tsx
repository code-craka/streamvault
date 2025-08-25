'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Shield, Eye, Activity, Users, Lock } from 'lucide-react'

interface SecurityEvent {
  id: string
  eventType: string
  userId?: string
  ipAddress: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, any>
}

interface AuditLogEntry {
  id: string
  action: string
  userId: string
  resourceType: string
  resourceId: string
  timestamp: number
  success: boolean
  ipAddress: string
}

interface SecurityStats {
  totalEvents: number
  criticalEvents: number
  blockedRequests: number
  moderatedContent: number
  activeUsers: number
  suspiciousIPs: number
}

export function SecurityDashboard() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    criticalEvents: 0,
    blockedRequests: 0,
    moderatedContent: 0,
    activeUsers: 0,
    suspiciousIPs: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSecurityData()
  }, [])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      
      // Fetch security events
      const eventsResponse = await fetch('/api/security/events?limit=50')
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setSecurityEvents(eventsData.data || [])
      }

      // Fetch audit logs
      const auditResponse = await fetch('/api/security/audit?limit=50')
      if (auditResponse.ok) {
        const auditData = await auditResponse.json()
        setAuditLogs(auditData.data || [])
      }

      // Calculate stats from the data
      const events = securityEvents
      setStats({
        totalEvents: events.length,
        criticalEvents: events.filter(e => e.severity === 'critical').length,
        blockedRequests: events.filter(e => e.eventType === 'rate_limit_exceeded').length,
        moderatedContent: events.filter(e => e.eventType === 'content_violation').length,
        activeUsers: new Set(auditLogs.map(log => log.userId)).size,
        suspiciousIPs: new Set(events.filter(e => e.severity === 'high').map(e => e.ipAddress)).size
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security data')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>Error loading security dashboard: {error}</p>
        <Button onClick={fetchSecurityData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Security Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Requests</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blockedRequests}</div>
            <p className="text-xs text-muted-foreground">Rate limited or blocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderated Content</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.moderatedContent}</div>
            <p className="text-xs text-muted-foreground">Content violations detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Unique users today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious IPs</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.suspiciousIPs}</div>
            <p className="text-xs text-muted-foreground">High-risk IP addresses</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Security Information */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Latest security events and incidents detected by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No security events found
                  </p>
                ) : (
                  securityEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium">{event.eventType.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            IP: {event.ipAddress} | {formatTimestamp(event.timestamp)}
                          </p>
                          {event.userId && (
                            <p className="text-sm text-muted-foreground">
                              User: {event.userId}
                            </p>
                          )}
                        </div>
                      </div>
                      {event.details && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {JSON.stringify(event.details, null, 2).substring(0, 100)}...
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Comprehensive log of all user actions and system changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'SUCCESS' : 'FAILED'}
                        </Badge>
                        <div>
                          <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.resourceType}: {log.resourceId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            User: {log.userId} | IP: {log.ipAddress}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={fetchSecurityData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  )
}