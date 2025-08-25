/**
 * Core Web Vitals tracking and reporting system
 * Tracks LCP, FID, CLS and other performance metrics
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals'

export interface WebVitalsMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
  timestamp: number
  url: string
  userId?: string
}

export interface PerformanceThresholds {
  LCP: { good: number; poor: number }
  FID: { good: number; poor: number }
  CLS: { good: number; poor: number }
  FCP: { good: number; poor: number }
  TTFB: { good: number; poor: number }
}

// Performance thresholds based on Core Web Vitals standards
export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
}

class WebVitalsTracker {
  private metrics: WebVitalsMetric[] = []
  private userId?: string
  private sessionId: string
  private reportingEndpoint: string

  constructor(options: {
    reportingEndpoint?: string
    userId?: string
    sessionId?: string
  } = {}) {
    this.reportingEndpoint = options.reportingEndpoint || '/api/performance/vitals'
    this.userId = options.userId
    this.sessionId = options.sessionId || this.generateSessionId()
    
    this.initializeTracking()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeTracking(): void {
    // Track Core Web Vitals
    getCLS(this.handleMetric.bind(this))
    getFCP(this.handleMetric.bind(this))
    getFID(this.handleMetric.bind(this))
    getLCP(this.handleMetric.bind(this))
    getTTFB(this.handleMetric.bind(this))

    // Track custom performance metrics
    this.trackCustomMetrics()

    // Send metrics on page unload
    this.setupReporting()
  }

  private handleMetric(metric: any): void {
    const webVitalsMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
      timestamp: Date.now(),
      url: window.location.href,
      userId: this.userId,
    }

    this.metrics.push(webVitalsMetric)
    
    // Report critical metrics immediately
    if (webVitalsMetric.rating === 'poor') {
      this.reportMetric(webVitalsMetric)
    }
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = PERFORMANCE_THRESHOLDS[name as keyof PerformanceThresholds]
    if (!thresholds) return 'good'

    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.poor) return 'needs-improvement'
    return 'poor'
  }

  private trackCustomMetrics(): void {
    // Track Time to Interactive (TTI)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            
            // Track DNS lookup time
            this.trackCustomMetric('DNS', navEntry.domainLookupEnd - navEntry.domainLookupStart)
            
            // Track connection time
            this.trackCustomMetric('Connection', navEntry.connectEnd - navEntry.connectStart)
            
            // Track server response time
            this.trackCustomMetric('ServerResponse', navEntry.responseEnd - navEntry.requestStart)
          }
        }
      })

      observer.observe({ entryTypes: ['navigation'] })
    }

    // Track resource loading performance
    this.trackResourceMetrics()
  }

  private trackResourceMetrics(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming
          
          // Track slow resources (> 1 second)
          if (resourceEntry.duration > 1000) {
            this.trackCustomMetric('SlowResource', resourceEntry.duration, {
              url: resourceEntry.name,
              type: this.getResourceType(resourceEntry.name),
            })
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
    if (url.match(/\.(mp4|webm|ogg|m3u8)$/)) return 'video'
    return 'other'
  }

  private trackCustomMetric(name: string, value: number, metadata?: any): void {
    const metric: WebVitalsMetric = {
      name,
      value,
      rating: 'good', // Custom metrics don't have standard ratings
      delta: 0,
      id: `${name}-${Date.now()}`,
      navigationType: 'unknown',
      timestamp: Date.now(),
      url: window.location.href,
      userId: this.userId,
      ...metadata,
    }

    this.metrics.push(metric)
  }

  private setupReporting(): void {
    // Report metrics on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportAllMetrics()
      }
    })

    // Report metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.reportAllMetrics()
    })

    // Report metrics periodically (every 30 seconds)
    setInterval(() => {
      this.reportAllMetrics()
    }, 30000)
  }

  private async reportMetric(metric: WebVitalsMetric): Promise<void> {
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: [metric],
        }),
      })
    } catch (error) {
      console.error('Failed to report performance metric:', error)
    }
  }

  private async reportAllMetrics(): Promise<void> {
    if (this.metrics.length === 0) return

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: this.metrics,
        }),
      })

      // Clear reported metrics
      this.metrics = []
    } catch (error) {
      console.error('Failed to report performance metrics:', error)
    }
  }

  public getMetrics(): WebVitalsMetric[] {
    return [...this.metrics]
  }

  public getMetricsSummary(): {
    good: number
    needsImprovement: number
    poor: number
    total: number
  } {
    const summary = {
      good: 0,
      needsImprovement: 0,
      poor: 0,
      total: this.metrics.length,
    }

    this.metrics.forEach((metric) => {
      switch (metric.rating) {
        case 'good':
          summary.good++
          break
        case 'needs-improvement':
          summary.needsImprovement++
          break
        case 'poor':
          summary.poor++
          break
      }
    })

    return summary
  }
}

// Singleton instance
let webVitalsTracker: WebVitalsTracker | null = null

export function initializeWebVitalsTracking(options?: {
  reportingEndpoint?: string
  userId?: string
  sessionId?: string
}): WebVitalsTracker {
  if (!webVitalsTracker) {
    webVitalsTracker = new WebVitalsTracker(options)
  }
  return webVitalsTracker
}

export function getWebVitalsTracker(): WebVitalsTracker | null {
  return webVitalsTracker
}

// React hook for Web Vitals tracking
export function useWebVitals(userId?: string) {
  if (typeof window !== 'undefined' && !webVitalsTracker) {
    webVitalsTracker = new WebVitalsTracker({ userId })
  }

  return {
    tracker: webVitalsTracker,
    metrics: webVitalsTracker?.getMetrics() || [],
    summary: webVitalsTracker?.getMetricsSummary() || {
      good: 0,
      needsImprovement: 0,
      poor: 0,
      total: 0,
    },
  }
}