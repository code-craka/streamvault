/**
 * API endpoint for performance dashboard data
 * Provides aggregated performance metrics and alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { performanceMonitor } from '@/lib/performance/monitoring'
import { queryOptimizer } from '@/lib/performance/query-optimizer'
import { circuitBreakerRegistry } from '@/lib/performance/circuit-breaker'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user has admin role (in a real app, this would check user permissions)
    // For now, we'll allow all authenticated users to view performance data
    
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '1h'
    const category = url.searchParams.get('category')
    
    // Get performance metrics
    const metrics = performanceMonitor.getMetrics(getMetricsLimit(timeRange))
    const alerts = performanceMonitor.getAlerts({
      resolved: false,
      category: category as any,
      limit: 50,
    })
    const healthScore = performanceMonitor.getHealthScore()
    
    // Get database metrics
    const databaseMetrics = queryOptimizer.getMetrics()
    
    // Get circuit breaker stats
    const circuitBreakerStats = circuitBreakerRegistry.getStats()
    
    // Calculate trends
    const trends = calculateTrends(metrics)
    
    const dashboardData = {
      timestamp: Date.now(),
      timeRange,
      healthScore,
      metrics: {
        current: metrics[metrics.length - 1] || null,
        history: metrics,
        trends,
      },
      alerts: {
        active: alerts.filter(a => !a.resolved),
        total: alerts.length,
        byType: groupAlertsByType(alerts),
        byCategory: groupAlertsByCategory(alerts),
      },
      database: {
        ...databaseMetrics,
        connectionPool: {
          active: 25,
          idle: 15,
          total: 40,
        },
      },
      circuitBreakers: {
        stats: circuitBreakerStats,
        summary: summarizeCircuitBreakers(circuitBreakerStats),
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform,
      },
    }
    
    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('Failed to get dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to get dashboard data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { action, alertId, circuitBreakerName } = body
    
    switch (action) {
      case 'resolveAlert':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required' },
            { status: 400 }
          )
        }
        
        const resolved = performanceMonitor.resolveAlert(alertId)
        if (!resolved) {
          return NextResponse.json(
            { error: 'Alert not found or already resolved' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({ success: true, message: 'Alert resolved' })
        
      case 'resetCircuitBreaker':
        if (!circuitBreakerName) {
          return NextResponse.json(
            { error: 'Circuit breaker name required' },
            { status: 400 }
          )
        }
        
        const breaker = circuitBreakerRegistry.get(circuitBreakerName)
        if (!breaker) {
          return NextResponse.json(
            { error: 'Circuit breaker not found' },
            { status: 404 }
          )
        }
        
        breaker.forceClose()
        return NextResponse.json({ success: true, message: 'Circuit breaker reset' })
        
      case 'clearQueryCache':
        queryOptimizer.reset()
        return NextResponse.json({ success: true, message: 'Query cache cleared' })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Failed to perform dashboard action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}

function getMetricsLimit(timeRange: string): number {
  switch (timeRange) {
    case '15m': return 30   // 30 data points for 15 minutes
    case '1h': return 120   // 120 data points for 1 hour
    case '6h': return 720   // 720 data points for 6 hours
    case '24h': return 2880 // 2880 data points for 24 hours
    default: return 120
  }
}

function calculateTrends(metrics: any[]): any {
  if (metrics.length < 2) {
    return {
      webVitals: { lcp: 0, fid: 0, cls: 0 },
      api: { responseTime: 0, errorRate: 0 },
      database: { queryTime: 0, cacheHitRate: 0 },
    }
  }
  
  const current = metrics[metrics.length - 1]
  const previous = metrics[metrics.length - 2]
  
  return {
    webVitals: {
      lcp: calculatePercentageChange(previous.webVitals.lcp, current.webVitals.lcp),
      fid: calculatePercentageChange(previous.webVitals.fid, current.webVitals.fid),
      cls: calculatePercentageChange(previous.webVitals.cls, current.webVitals.cls),
    },
    api: {
      responseTime: calculatePercentageChange(previous.api.averageResponseTime, current.api.averageResponseTime),
      errorRate: calculatePercentageChange(previous.api.errorRate, current.api.errorRate),
    },
    database: {
      queryTime: calculatePercentageChange(previous.database.averageQueryTime, current.database.averageQueryTime),
      cacheHitRate: calculatePercentageChange(previous.database.cacheHitRate, current.database.cacheHitRate),
    },
  }
}

function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

function groupAlertsByType(alerts: any[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1
    return acc
  }, {})
}

function groupAlertsByCategory(alerts: any[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.category] = (acc[alert.category] || 0) + 1
    return acc
  }, {})
}

function summarizeCircuitBreakers(stats: Record<string, any>): any {
  const summary = {
    total: Object.keys(stats).length,
    open: 0,
    halfOpen: 0,
    closed: 0,
  }
  
  for (const stat of Object.values(stats)) {
    switch (stat.state) {
      case 'OPEN':
        summary.open++
        break
      case 'HALF_OPEN':
        summary.halfOpen++
        break
      case 'CLOSED':
        summary.closed++
        break
    }
  }
  
  return summary
}