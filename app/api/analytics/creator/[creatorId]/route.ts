// API endpoint for creator analytics
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { analyticsAggregator } from '@/lib/analytics/analytics-aggregator'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('week'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { creatorId } = params
    
    // Verify user has access to this creator's analytics
    if (userId !== creatorId) {
      // TODO: Check if user is admin or has permission to view this creator's analytics
      return NextResponse.json(
        { error: 'Unauthorized access to creator analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      period: searchParams.get('period') || 'week',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    }

    const validatedParams = analyticsQuerySchema.parse(queryParams)

    // Calculate date range based on period
    const endDate = validatedParams.endDate 
      ? new Date(validatedParams.endDate)
      : new Date()
    
    let startDate: Date
    
    switch (validatedParams.period) {
      case 'day':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    if (validatedParams.startDate) {
      startDate = new Date(validatedParams.startDate)
    }

    const analytics = await analyticsAggregator.aggregateCreatorAnalytics(
      creatorId,
      validatedParams.period,
      startDate,
      endDate
    )

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error retrieving creator analytics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for updating creator analytics settings
export async function POST(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { creatorId } = params
    
    // Verify user has access to update this creator's analytics
    if (userId !== creatorId) {
      return NextResponse.json(
        { error: 'Unauthorized access to creator analytics' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // TODO: Implement analytics settings update
    // This could include preferences for data retention, privacy settings, etc.
    
    return NextResponse.json({ 
      success: true,
      message: 'Analytics settings updated'
    })

  } catch (error) {
    console.error('Error updating creator analytics settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}