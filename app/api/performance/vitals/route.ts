/**
 * API endpoint for Web Vitals reporting
 * Receives and stores performance metrics from client-side
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { auth } from '@clerk/nextjs/server'

const WebVitalsSchema = z.object({
  sessionId: z.string(),
  metrics: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      rating: z.enum(['good', 'needs-improvement', 'poor']),
      delta: z.number(),
      id: z.string(),
      navigationType: z.string(),
      timestamp: z.number(),
      url: z.string(),
      userId: z.string().optional(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const body = await request.json()

    // Validate request body
    const validatedData = WebVitalsSchema.parse(body)

    // Store metrics in Firestore
    const metricsCollection = collection(db, 'performance_metrics')

    const metricsDoc = {
      sessionId: validatedData.sessionId,
      userId: userId || null,
      metrics: validatedData.metrics,
      userAgent: request.headers.get('user-agent') || '',
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        '',
      timestamp: serverTimestamp(),
      createdAt: new Date(),
    }

    await addDoc(metricsCollection, metricsDoc)

    // Log critical performance issues
    const criticalMetrics = validatedData.metrics.filter(
      metric => metric.rating === 'poor'
    )
    if (criticalMetrics.length > 0) {
      console.warn('Critical performance metrics detected:', {
        sessionId: validatedData.sessionId,
        userId,
        criticalMetrics: criticalMetrics.map(m => ({
          name: m.name,
          value: m.value,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Metrics recorded successfully',
      metricsCount: validatedData.metrics.length,
    })
  } catch (error) {
    console.error('Failed to record performance metrics:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid metrics data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to record metrics' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Return basic performance statistics
    // In a real implementation, this would query aggregated metrics
    const stats = {
      timestamp: Date.now(),
      webVitals: {
        lcp: { average: 2100, p95: 3200, samples: 1250 },
        fid: { average: 45, p95: 120, samples: 1250 },
        cls: { average: 0.08, p95: 0.15, samples: 1250 },
        fcp: { average: 1800, p95: 2800, samples: 1250 },
        ttfb: { average: 650, p95: 1200, samples: 1250 },
      },
      healthScore: {
        overall: 87,
        lcp: 92,
        fid: 88,
        cls: 85,
        fcp: 90,
        ttfb: 82,
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get performance stats:', error)
    return NextResponse.json(
      { error: 'Failed to get performance stats' },
      { status: 500 }
    )
  }
}
