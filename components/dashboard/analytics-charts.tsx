// Analytics visualization and reporting component
'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { CreatorAnalytics } from '@/types/analytics'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  MessageCircle,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react'

interface AnalyticsChartsProps {
  analytics: CreatorAnalytics | null
  period: 'day' | 'week' | 'month' | 'year'
}

export function AnalyticsCharts({ analytics, period }: AnalyticsChartsProps) {
  if (!analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    )
  }

  const deviceIcons = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getGrowthIndicator = (current: number, previous: number) => {
    if (previous === 0) return null
    const growth = ((current - previous) / previous) * 100
    return {
      percentage: Math.abs(growth).toFixed(1),
      isPositive: growth > 0,
      icon: growth > 0 ? TrendingUp : TrendingDown,
    }
  }

  return (
    <div className="space-y-6">
      {/* Viewer Retention Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Viewer Retention</CardTitle>
          <CardDescription>
            How long viewers stay during your streams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.viewerRetention.map((point, index) => (
              <div key={point.timepoint} className="flex items-center gap-4">
                <div className="text-muted-foreground w-16 text-sm">
                  {formatDuration(point.timepoint)}
                </div>
                <div className="flex-1">
                  <Progress value={point.retentionRate} className="h-2" />
                </div>
                <div className="w-12 text-right text-sm font-medium">
                  {point.retentionRate.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {analytics.viewerRetention.length === 0 && (
            <p className="text-muted-foreground py-8 text-center">
              No retention data available for this period
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>How viewers access your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.deviceDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([device, count]) => {
                  const total = Object.values(
                    analytics.deviceDistribution
                  ).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  const Icon =
                    deviceIcons[device as keyof typeof deviceIcons] || Monitor

                  return (
                    <div key={device} className="flex items-center gap-4">
                      <Icon className="text-muted-foreground h-5 w-5" />
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {device}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {count.toLocaleString()} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
            <CardDescription>Audience interaction statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Messages per Stream</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {analytics.totalStreams > 0
                      ? Math.round(
                          analytics.chatMessages / analytics.totalStreams
                        )
                      : 0}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {analytics.chatMessages.toLocaleString()} total
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Chat Participation</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {analytics.uniqueViewers > 0
                      ? (
                          (analytics.chatParticipants /
                            analytics.uniqueViewers) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {analytics.chatParticipants} participants
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Avg. View Duration</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDuration(
                      analytics.totalStreams > 0
                        ? analytics.totalStreamTime / analytics.totalStreams
                        : 0
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    per stream
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key metrics for this {period}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-primary text-2xl font-bold">
                {analytics.averageViewers.toFixed(0)}
              </div>
              <div className="text-muted-foreground text-sm">Avg. Viewers</div>
              <Badge variant="secondary" className="mt-1">
                Peak: {analytics.peakViewers}
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${analytics.totalRevenue.toFixed(2)}
              </div>
              <div className="text-muted-foreground text-sm">Total Revenue</div>
              <Badge variant="secondary" className="mt-1">
                {analytics.subscriptionConversions} subs
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(analytics.totalStreamTime)}
              </div>
              <div className="text-muted-foreground text-sm">Stream Time</div>
              <Badge variant="secondary" className="mt-1">
                {analytics.totalStreams} streams
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.followerGrowth > 0 ? '+' : ''}
                {analytics.followerGrowth}
              </div>
              <div className="text-muted-foreground text-sm">
                Follower Growth
              </div>
              <Badge
                variant={analytics.followerGrowth > 0 ? 'default' : 'secondary'}
                className="mt-1"
              >
                {analytics.followerGrowth > 0 ? 'Growing' : 'Stable'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geographic Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Top Countries</CardTitle>
          <CardDescription>Your global audience reach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(analytics.geographicDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([country, count], index) => {
                const total = Object.values(
                  analytics.geographicDistribution
                ).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total) * 100 : 0

                return (
                  <div
                    key={country}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{country}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {count.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
