import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import type { SubscriptionMetrics } from '@/types/subscription'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata.role as string

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get basic subscription analytics from Stripe
    const basicAnalytics = await subscriptionService.getSubscriptionAnalytics()

    // Get all users for conversion rate calculation
    const allUsersQuery = query(collection(db, 'users'))
    const allUsersSnapshot = await getDocs(allUsersQuery)
    const totalUsers = allUsersSnapshot.size

    // Get subscription changes for churn analysis
    const subscriptionChangesQuery = query(
      collection(db, 'subscriptionChanges'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    )
    const changesSnapshot = await getDocs(subscriptionChangesQuery)
    
    let canceledSubscribers = 0
    let newSubscribers = 0
    
    changesSnapshot.docs.forEach(doc => {
      const change = doc.data()
      if (change.changeType === 'cancel') {
        canceledSubscribers++
      } else if (change.changeType === 'upgrade' && change.fromTier === null) {
        newSubscribers++
      }
    })

    // Calculate metrics by tier
    const tierMetrics: Record<string, SubscriptionMetrics> = {
      basic: {
        tier: 'basic',
        revenue: 0,
        activeSubscribers: basicAnalytics.subscriptionsByTier.basic,
        newSubscribers: 0,
        canceledSubscribers: 0,
        churnRate: 0,
        averageLifetimeValue: 0,
        conversionRate: 0,
        monthlyRecurringRevenue: basicAnalytics.subscriptionsByTier.basic * 9.99,
        annualRecurringRevenue: basicAnalytics.subscriptionsByTier.basic * 9.99 * 12,
        customerAcquisitionCost: 0,
        monthlyGrowthRate: 0,
        retentionRate: 0,
      },
      premium: {
        tier: 'premium',
        revenue: 0,
        activeSubscribers: basicAnalytics.subscriptionsByTier.premium,
        newSubscribers: 0,
        canceledSubscribers: 0,
        churnRate: 0,
        averageLifetimeValue: 0,
        conversionRate: 0,
        monthlyRecurringRevenue: basicAnalytics.subscriptionsByTier.premium * 19.99,
        annualRecurringRevenue: basicAnalytics.subscriptionsByTier.premium * 19.99 * 12,
        customerAcquisitionCost: 0,
        monthlyGrowthRate: 0,
        retentionRate: 0,
      },
      pro: {
        tier: 'pro',
        revenue: 0,
        activeSubscribers: basicAnalytics.subscriptionsByTier.pro,
        newSubscribers: 0,
        canceledSubscribers: 0,
        churnRate: 0,
        averageLifetimeValue: 0,
        conversionRate: 0,
        monthlyRecurringRevenue: basicAnalytics.subscriptionsByTier.pro * 29.99,
        annualRecurringRevenue: basicAnalytics.subscriptionsByTier.pro * 29.99 * 12,
        customerAcquisitionCost: 0,
        monthlyGrowthRate: 0,
        retentionRate: 0,
      },
    }

    // Calculate revenue by tier
    tierMetrics.basic.revenue = tierMetrics.basic.monthlyRecurringRevenue
    tierMetrics.premium.revenue = tierMetrics.premium.monthlyRecurringRevenue
    tierMetrics.pro.revenue = tierMetrics.pro.monthlyRecurringRevenue

    // Generate trend data (simplified - in real implementation, you'd query historical data)
    const generateTrendData = (baseValue: number, months: number) => {
      const trends = []
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        const variation = (Math.random() - 0.5) * 0.2 // ±10% variation
        trends.push({
          month: monthName,
          amount: Math.round(baseValue * (1 + variation)),
          count: Math.round(baseValue * (1 + variation)),
          rate: Math.max(0.01, Math.min(0.15, 0.05 + variation * 0.05)), // 1-15% range
        })
      }
      return trends
    }

    const monthsToShow = period === '1y' ? 12 : period === '90d' ? 3 : 1
    const trendData = generateTrendData(basicAnalytics.monthlyRecurringRevenue, monthsToShow)

    // Generate cohort data (simplified)
    const cohortData = [
      { cohort: 'Jan 2024', month0: 100, month1: 85, month3: 72, month6: 65, month12: 58 },
      { cohort: 'Feb 2024', month0: 100, month1: 88, month3: 75, month6: 68, month12: 61 },
      { cohort: 'Mar 2024', month0: 100, month1: 82, month3: 70, month6: 62, month12: 55 },
      { cohort: 'Apr 2024', month0: 100, month1: 90, month3: 78, month6: 71, month12: 64 },
      { cohort: 'May 2024', month0: 100, month1: 87, month3: 74, month6: 67, month12: 0 },
    ]

    const analyticsData = {
      overview: {
        totalRevenue: basicAnalytics.totalRevenue,
        monthlyRecurringRevenue: basicAnalytics.monthlyRecurringRevenue,
        annualRecurringRevenue: basicAnalytics.monthlyRecurringRevenue * 12,
        activeSubscribers: basicAnalytics.activeSubscriptions,
        totalUsers,
        conversionRate: totalUsers > 0 ? basicAnalytics.activeSubscriptions / totalUsers : 0,
        churnRate: basicAnalytics.activeSubscriptions > 0 ? canceledSubscribers / basicAnalytics.activeSubscriptions : 0,
        averageLifetimeValue: 250, // Simplified calculation
      },
      byTier: tierMetrics,
      trends: {
        revenue: trendData.map(t => ({ month: t.month, amount: t.amount })),
        subscribers: trendData.map(t => ({ month: t.month, count: t.count })),
        churn: trendData.map(t => ({ month: t.month, rate: t.rate })),
      },
      cohorts: cohortData,
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Subscription analytics error:', error)
    
    return NextResponse.json(
      { error: 'Failed to get subscription analytics' },
      { status: 500 }
    )
  }
}