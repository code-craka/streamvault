// Earnings and revenue tracking component
'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { CreatorAnalytics } from '@/types/analytics'
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Download,
  Calendar,
  Target,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface EarningsOverviewProps {
  analytics: CreatorAnalytics | null
  period: 'day' | 'week' | 'month' | 'year'
}

interface PayoutInfo {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  date: Date
  method: string
}

export function EarningsOverview({ analytics, period }: EarningsOverviewProps) {
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'payouts' | 'taxes'
  >('overview')

  // Mock payout data - in real implementation, this would come from API
  const mockPayouts: PayoutInfo[] = [
    {
      id: '1',
      amount: 1250.0,
      status: 'completed',
      date: new Date('2024-01-15'),
      method: 'Bank Transfer',
    },
    {
      id: '2',
      amount: 890.5,
      status: 'processing',
      date: new Date('2024-01-01'),
      method: 'PayPal',
    },
    {
      id: '3',
      amount: 2100.75,
      status: 'pending',
      date: new Date('2023-12-15'),
      method: 'Bank Transfer',
    },
  ]

  if (!analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No earnings data available</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const revenueGrowth = 15.2 // Mock growth percentage
  const projectedEarnings = analytics.totalRevenue * 1.2 // Mock projection

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalRevenue)}
            </div>
            <div className="text-muted-foreground flex items-center text-xs">
              <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />+
              {revenueGrowth}% from last {period}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subscription Revenue
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.subscriptionRevenue)}
            </div>
            <div className="text-muted-foreground text-xs">
              {analytics.subscriptionConversions} new subscribers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Donation Revenue
            </CardTitle>
            <Wallet className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.donationRevenue)}
            </div>
            <div className="text-muted-foreground text-xs">
              From super chat & tips
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projected Earnings
            </CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(projectedEarnings)}
            </div>
            <div className="text-muted-foreground text-xs">
              Next {period} estimate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>How your earnings are distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm">Subscription Revenue</span>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(analytics.subscriptionRevenue)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {(
                    (analytics.subscriptionRevenue / analytics.totalRevenue) *
                    100
                  ).toFixed(1)}
                  %
                </div>
              </div>
            </div>
            <Progress
              value={
                (analytics.subscriptionRevenue / analytics.totalRevenue) * 100
              }
              className="h-2"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">Donation Revenue</span>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(analytics.donationRevenue)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {(
                    (analytics.donationRevenue / analytics.totalRevenue) *
                    100
                  ).toFixed(1)}
                  %
                </div>
              </div>
            </div>
            <Progress
              value={(analytics.donationRevenue / analytics.totalRevenue) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Earning Streams */}
        <Card>
          <CardHeader>
            <CardTitle>Top Earning Streams</CardTitle>
            <CardDescription>
              Your most profitable content this {period}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topStreams.slice(0, 5).map((stream, index) => (
                <div
                  key={stream.streamId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
                    >
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="max-w-48 truncate font-medium">
                        {stream.title}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {stream.viewers.toLocaleString()} viewers
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(stream.revenue)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {stream.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Payouts</CardTitle>
                <CardDescription>Your payment history</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPayouts.map(payout => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="font-medium">
                        {formatCurrency(payout.amount)}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {payout.method}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(payout.status)}>
                      {payout.status}
                    </Badge>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {payout.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Goals</CardTitle>
          <CardDescription>
            Track your progress towards earnings targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Goal</span>
                <span className="text-muted-foreground text-sm">
                  {formatCurrency(analytics.totalRevenue)} /{' '}
                  {formatCurrency(5000)}
                </span>
              </div>
              <Progress
                value={(analytics.totalRevenue / 5000) * 100}
                className="h-2"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {formatCurrency(5000 - analytics.totalRevenue)} remaining
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Subscriber Goal</span>
                <span className="text-muted-foreground text-sm">
                  {analytics.subscriptionConversions} / 100 subscribers
                </span>
              </div>
              <Progress
                value={(analytics.subscriptionConversions / 100) * 100}
                className="h-2"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {100 - analytics.subscriptionConversions} subscribers to go
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
          <CardDescription>
            Important tax-related information for your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted flex items-center justify-between rounded-lg p-4">
              <div>
                <p className="font-medium">Year-to-Date Earnings</p>
                <p className="text-muted-foreground text-sm">
                  Total taxable income
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics.totalRevenue * 4)}
                </p>
                <p className="text-muted-foreground text-sm">2024</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Button variant="outline" className="justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download 1099 Form
              </Button>
              <Button variant="outline" className="justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Tax Calendar
              </Button>
            </div>

            <div className="text-muted-foreground text-sm">
              <p>• Tax documents will be available by January 31st</p>
              <p>• Consult with a tax professional for advice</p>
              <p>• Keep records of all business expenses</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
