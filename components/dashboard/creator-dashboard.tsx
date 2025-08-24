// Comprehensive creator dashboard component
'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCreatorAnalytics } from '@/hooks/use-analytics'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { StreamManager } from '@/components/dashboard/stream-manager'
import { EarningsOverview } from './earnings-overview'
import { ContentManager } from './content-manager'
import { AdvancedAnalytics } from './advanced-analytics'
import { PayoutManagement } from './payout-management'
import {
    Users,
    MessageCircle,
    DollarSign,
    TrendingUp,
    Clock,
    Settings,
    BarChart3,
    Video,
    Wallet,
    Brain,
    CreditCard
} from 'lucide-react'

interface CreatorDashboardProps {
    className?: string
}

export function CreatorDashboard({ className }: CreatorDashboardProps) {
    const { user } = useUser()
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week')
    const [activeTab, setActiveTab] = useState('overview')

    const { analytics, loading, error, refetch } = useCreatorAnalytics(
        user?.id || null,
        selectedPeriod
    )

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Please sign in to access the creator dashboard.</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <p className="text-destructive">Error loading analytics: {error}</p>
                <Button onClick={refetch} variant="outline">
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Creator Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user.firstName || user.username}! Here's your content performance.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Last Day</SelectItem>
                            <SelectItem value="week">Last Week</SelectItem>
                            <SelectItem value="month">Last Month</SelectItem>
                            <SelectItem value="year">Last Year</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={refetch} variant="outline" size="sm">
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.totalViewers.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics?.uniqueViewers || 0} unique viewers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${analytics?.totalRevenue.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {analytics?.subscriptionConversions || 0} new subscribers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stream Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.floor((analytics?.totalStreamTime || 0) / 3600)}h
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {analytics?.totalStreams || 0} streams
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.chatMessages.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics?.chatParticipants || 0} participants
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Dashboard Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="streams" className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Streams
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Insights
                    </TabsTrigger>
                    <TabsTrigger value="earnings" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Earnings
                    </TabsTrigger>
                    <TabsTrigger value="payouts" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payouts
                    </TabsTrigger>
                    <TabsTrigger value="content" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Content
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Streams */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Performing Streams</CardTitle>
                                <CardDescription>Your most successful streams this {selectedPeriod}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analytics?.topStreams.slice(0, 5).map((stream, index) => (
                                        <div key={stream.streamId} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                                                    {index + 1}
                                                </Badge>
                                                <div>
                                                    <p className="font-medium truncate max-w-48">{stream.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {stream.date.toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{stream.viewers.toLocaleString()}</p>
                                                <p className="text-sm text-muted-foreground">${stream.revenue.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )) || (
                                            <p className="text-muted-foreground text-center py-4">
                                                No streams found for this period
                                            </p>
                                        )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Peak Hours */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Peak Viewing Hours</CardTitle>
                                <CardDescription>When your audience is most active</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics?.peakHours.slice(0, 5).map((hour, index) => (
                                        <div key={hour.hour} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="w-8 h-6 text-xs">
                                                    {hour.hour}:00
                                                </Badge>
                                                <div className="flex-1 bg-secondary rounded-full h-2">
                                                    <div
                                                        className="bg-primary h-2 rounded-full transition-all"
                                                        style={{
                                                            width: `${(hour.averageViewers / (analytics.peakHours[0]?.averageViewers || 1)) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium">
                                                {Math.round(hour.averageViewers)}
                                            </span>
                                        </div>
                                    )) || (
                                            <p className="text-muted-foreground text-center py-4">
                                                No data available
                                            </p>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Geographic Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Audience Geography</CardTitle>
                            <CardDescription>Where your viewers are located</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(analytics?.geographicDistribution || {})
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 8)
                                    .map(([country, count]) => (
                                        <div key={country} className="text-center">
                                            <div className="text-2xl font-bold">{count}</div>
                                            <div className="text-sm text-muted-foreground">{country}</div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="streams">
                    <StreamManager />
                </TabsContent>

                <TabsContent value="analytics">
                    <AnalyticsCharts analytics={analytics} period={selectedPeriod} />
                </TabsContent>

                <TabsContent value="advanced">
                    <AdvancedAnalytics creatorId={user.id} />
                </TabsContent>

                <TabsContent value="earnings">
                    <EarningsOverview analytics={analytics} period={selectedPeriod} />
                </TabsContent>

                <TabsContent value="payouts">
                    <PayoutManagement />
                </TabsContent>

                <TabsContent value="content">
                    <ContentManager />
                </TabsContent>
            </Tabs>
        </div>
    )
}