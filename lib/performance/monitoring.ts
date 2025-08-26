/**
 * Performance monitoring dashboard with real-time alerts
 * Aggregates metrics from various performance systems
 */

import { WebVitalsMetric } from './web-vitals'
import { CircuitBreakerStats, circuitBreakerRegistry } from './circuit-breaker'
import { queryOptimizer } from './query-optimizer'

export interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'critical'
  category: 'web-vitals' | 'api' | 'database' | 'circuit-breaker' | 'system'
  message: string
  details: any
  timestamp: number
  resolved: boolean
  resolvedAt?: number
}

export interface SystemMetrics {
  timestamp: number
  webVitals: {
    lcp: number
    fid: number
    cls: number
    fcp: number
    ttfb: number
    rating: 'good' | 'needs-improvement' | 'poor'
  }
  api: {
    averageResponseTime: number
    requestsPerSecond: number
    errorRate: number
    activeConnections: number
  }
  database: {
    averageQueryTime: number
    cacheHitRate: number
    slowQueries: number
    totalQueries: number
  }
  circuitBreakers: Record<string, CircuitBreakerStats>
  system: {
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
    networkLatency: number
  }
}

export interface PerformanceThresholds {
  webVitals: {
    lcp: { warning: number; critical: number }
    fid: { warning: number; critical: number }
    cls: { warning: number; critical: number }
  }
  api: {
    responseTime: { warning: number; critical: number }
    errorRate: { warning: number; critical: number }
  }
  database: {
    queryTime: { warning: number; critical: number }
    cacheHitRate: { warning: number; critical: number }
  }
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  webVitals: {
    lcp: { warning: 2500, critical: 4000 },
    fid: { warning: 100, critical: 300 },
    cls: { warning: 0.1, critical: 0.25 },
  },
  api: {
    responseTime: { warning: 100, critical: 500 },
    errorRate: { warning: 0.05, critical: 0.1 }, // 5% warning, 10% critical
  },
  database: {
    queryTime: { warning: 100, critical: 500 },
    cacheHitRate: { warning: 0.8, critical: 0.6 }, // 80% warning, 60% critical
  },
}

export class PerformanceMonitor {
  private alerts: PerformanceAlert[] = []
  private metrics: SystemMetrics[] = []
  private thresholds: PerformanceThresholds
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = []
  private metricsInterval?: NodeJS.Timeout

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
    this.startMonitoring()
  }

  private startMonitoring(): void {
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectMetrics()
    }, 30000)

    // Initial collection
    this.collectMetrics()
  }

  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now()

      const metrics: SystemMetrics = {
        timestamp,
        webVitals: await this.collectWebVitalsMetrics(),
        api: await this.collectAPIMetrics(),
        database: this.collectDatabaseMetrics(),
        circuitBreakers: this.collectCircuitBreakerMetrics(),
        system: await this.collectSystemMetrics(),
      }

      this.metrics.push(metrics)

      // Keep only last 1000 metrics (about 8 hours at 30s intervals)
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000)
      }

      // Check for alerts
      this.checkAlerts(metrics)
    } catch (error) {
      console.error('Failed to collect performance metrics:', error)
    }
  }

  private async collectWebVitalsMetrics(): Promise<SystemMetrics['webVitals']> {
    // This would typically be collected from the client-side
    // For server-side monitoring, we'll use placeholder values
    return {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
      rating: 'good',
    }
  }

  private async collectAPIMetrics(): Promise<SystemMetrics['api']> {
    // In a real implementation, this would collect from API monitoring service
    return {
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      activeConnections: 0,
    }
  }

  private collectDatabaseMetrics(): SystemMetrics['database'] {
    const queryMetrics = queryOptimizer.getMetrics()

    return {
      averageQueryTime: queryMetrics.averageExecutionTime,
      cacheHitRate: queryMetrics.cacheHitRate,
      slowQueries: queryMetrics.slowQueries.length,
      totalQueries: queryMetrics.totalQueries,
    }
  }

  private collectCircuitBreakerMetrics(): Record<string, CircuitBreakerStats> {
    return circuitBreakerRegistry.getStats()
  }

  private async collectSystemMetrics(): Promise<SystemMetrics['system']> {
    // In a real implementation, this would collect system metrics
    return {
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      networkLatency: 0,
    }
  }

  private checkAlerts(metrics: SystemMetrics): void {
    // Check Web Vitals alerts
    this.checkWebVitalsAlerts(metrics.webVitals)

    // Check API alerts
    this.checkAPIAlerts(metrics.api)

    // Check database alerts
    this.checkDatabaseAlerts(metrics.database)

    // Check circuit breaker alerts
    this.checkCircuitBreakerAlerts(metrics.circuitBreakers)
  }

  private checkWebVitalsAlerts(webVitals: SystemMetrics['webVitals']): void {
    const { lcp, fid, cls } = webVitals
    const thresholds = this.thresholds.webVitals

    if (lcp > thresholds.lcp.critical) {
      this.createAlert(
        'critical',
        'web-vitals',
        `LCP is critically slow: ${lcp}ms`,
        { lcp }
      )
    } else if (lcp > thresholds.lcp.warning) {
      this.createAlert('warning', 'web-vitals', `LCP is slow: ${lcp}ms`, {
        lcp,
      })
    }

    if (fid > thresholds.fid.critical) {
      this.createAlert(
        'critical',
        'web-vitals',
        `FID is critically slow: ${fid}ms`,
        { fid }
      )
    } else if (fid > thresholds.fid.warning) {
      this.createAlert('warning', 'web-vitals', `FID is slow: ${fid}ms`, {
        fid,
      })
    }

    if (cls > thresholds.cls.critical) {
      this.createAlert(
        'critical',
        'web-vitals',
        `CLS is critically high: ${cls}`,
        { cls }
      )
    } else if (cls > thresholds.cls.warning) {
      this.createAlert('warning', 'web-vitals', `CLS is high: ${cls}`, { cls })
    }
  }

  private checkAPIAlerts(api: SystemMetrics['api']): void {
    const { averageResponseTime, errorRate } = api
    const thresholds = this.thresholds.api

    if (averageResponseTime > thresholds.responseTime.critical) {
      this.createAlert(
        'critical',
        'api',
        `API response time is critically slow: ${averageResponseTime}ms`,
        { averageResponseTime }
      )
    } else if (averageResponseTime > thresholds.responseTime.warning) {
      this.createAlert(
        'warning',
        'api',
        `API response time is slow: ${averageResponseTime}ms`,
        { averageResponseTime }
      )
    }

    if (errorRate > thresholds.errorRate.critical) {
      this.createAlert(
        'critical',
        'api',
        `API error rate is critically high: ${(errorRate * 100).toFixed(2)}%`,
        { errorRate }
      )
    } else if (errorRate > thresholds.errorRate.warning) {
      this.createAlert(
        'warning',
        'api',
        `API error rate is high: ${(errorRate * 100).toFixed(2)}%`,
        { errorRate }
      )
    }
  }

  private checkDatabaseAlerts(database: SystemMetrics['database']): void {
    const { averageQueryTime, cacheHitRate } = database
    const thresholds = this.thresholds.database

    if (averageQueryTime > thresholds.queryTime.critical) {
      this.createAlert(
        'critical',
        'database',
        `Database queries are critically slow: ${averageQueryTime}ms`,
        { averageQueryTime }
      )
    } else if (averageQueryTime > thresholds.queryTime.warning) {
      this.createAlert(
        'warning',
        'database',
        `Database queries are slow: ${averageQueryTime}ms`,
        { averageQueryTime }
      )
    }

    if (cacheHitRate < thresholds.cacheHitRate.critical) {
      this.createAlert(
        'critical',
        'database',
        `Cache hit rate is critically low: ${(cacheHitRate * 100).toFixed(2)}%`,
        { cacheHitRate }
      )
    } else if (cacheHitRate < thresholds.cacheHitRate.warning) {
      this.createAlert(
        'warning',
        'database',
        `Cache hit rate is low: ${(cacheHitRate * 100).toFixed(2)}%`,
        { cacheHitRate }
      )
    }
  }

  private checkCircuitBreakerAlerts(
    circuitBreakers: Record<string, CircuitBreakerStats>
  ): void {
    for (const [name, stats] of Object.entries(circuitBreakers)) {
      if (stats.state === 'OPEN') {
        this.createAlert(
          'error',
          'circuit-breaker',
          `Circuit breaker ${name} is OPEN`,
          stats
        )
      } else if (stats.state === 'HALF_OPEN') {
        this.createAlert(
          'warning',
          'circuit-breaker',
          `Circuit breaker ${name} is HALF_OPEN`,
          stats
        )
      }
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    message: string,
    details: any
  ): void {
    const alert: PerformanceAlert = {
      id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      message,
      details,
      timestamp: Date.now(),
      resolved: false,
    }

    this.alerts.push(alert)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Alert callback failed:', error)
      }
    })
  }

  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  public getMetrics(limit?: number): SystemMetrics[] {
    return limit ? this.metrics.slice(-limit) : [...this.metrics]
  }

  public getAlerts(
    options: {
      resolved?: boolean
      category?: PerformanceAlert['category']
      type?: PerformanceAlert['type']
      limit?: number
    } = {}
  ): PerformanceAlert[] {
    let filteredAlerts = [...this.alerts]

    if (options.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(
        alert => alert.resolved === options.resolved
      )
    }

    if (options.category) {
      filteredAlerts = filteredAlerts.filter(
        alert => alert.category === options.category
      )
    }

    if (options.type) {
      filteredAlerts = filteredAlerts.filter(
        alert => alert.type === options.type
      )
    }

    if (options.limit) {
      filteredAlerts = filteredAlerts.slice(-options.limit)
    }

    return filteredAlerts.sort((a, b) => b.timestamp - a.timestamp)
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      return true
    }
    return false
  }

  public getHealthScore(): {
    overall: number
    webVitals: number
    api: number
    database: number
    circuitBreakers: number
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1]
    if (!latestMetrics) {
      return {
        overall: 100,
        webVitals: 100,
        api: 100,
        database: 100,
        circuitBreakers: 100,
      }
    }

    const webVitalsScore = this.calculateWebVitalsScore(latestMetrics.webVitals)
    const apiScore = this.calculateAPIScore(latestMetrics.api)
    const databaseScore = this.calculateDatabaseScore(latestMetrics.database)
    const circuitBreakerScore = this.calculateCircuitBreakerScore(
      latestMetrics.circuitBreakers
    )

    const overall = Math.round(
      (webVitalsScore + apiScore + databaseScore + circuitBreakerScore) / 4
    )

    return {
      overall,
      webVitals: webVitalsScore,
      api: apiScore,
      database: databaseScore,
      circuitBreakers: circuitBreakerScore,
    }
  }

  private calculateWebVitalsScore(
    webVitals: SystemMetrics['webVitals']
  ): number {
    // Simple scoring based on thresholds
    let score = 100
    const thresholds = this.thresholds.webVitals

    if (webVitals.lcp > thresholds.lcp.critical) score -= 30
    else if (webVitals.lcp > thresholds.lcp.warning) score -= 15

    if (webVitals.fid > thresholds.fid.critical) score -= 30
    else if (webVitals.fid > thresholds.fid.warning) score -= 15

    if (webVitals.cls > thresholds.cls.critical) score -= 30
    else if (webVitals.cls > thresholds.cls.warning) score -= 15

    return Math.max(0, score)
  }

  private calculateAPIScore(api: SystemMetrics['api']): number {
    let score = 100
    const thresholds = this.thresholds.api

    if (api.averageResponseTime > thresholds.responseTime.critical) score -= 40
    else if (api.averageResponseTime > thresholds.responseTime.warning)
      score -= 20

    if (api.errorRate > thresholds.errorRate.critical) score -= 40
    else if (api.errorRate > thresholds.errorRate.warning) score -= 20

    return Math.max(0, score)
  }

  private calculateDatabaseScore(database: SystemMetrics['database']): number {
    let score = 100
    const thresholds = this.thresholds.database

    if (database.averageQueryTime > thresholds.queryTime.critical) score -= 40
    else if (database.averageQueryTime > thresholds.queryTime.warning)
      score -= 20

    if (database.cacheHitRate < thresholds.cacheHitRate.critical) score -= 40
    else if (database.cacheHitRate < thresholds.cacheHitRate.warning)
      score -= 20

    return Math.max(0, score)
  }

  private calculateCircuitBreakerScore(
    circuitBreakers: Record<string, CircuitBreakerStats>
  ): number {
    const breakerCount = Object.keys(circuitBreakers).length
    if (breakerCount === 0) return 100

    let openCount = 0
    let halfOpenCount = 0

    for (const stats of Object.values(circuitBreakers)) {
      if (stats.state === 'OPEN') openCount++
      else if (stats.state === 'HALF_OPEN') halfOpenCount++
    }

    const score = 100 - (openCount * 40 + halfOpenCount * 20) / breakerCount
    return Math.max(0, Math.round(score))
  }

  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const metrics = performanceMonitor.getMetrics(10) // Last 10 metrics
  const alerts = performanceMonitor.getAlerts({ resolved: false, limit: 10 })
  const healthScore = performanceMonitor.getHealthScore()

  return {
    metrics,
    alerts,
    healthScore,
    resolveAlert: performanceMonitor.resolveAlert.bind(performanceMonitor),
    onAlert: performanceMonitor.onAlert.bind(performanceMonitor),
  }
}
