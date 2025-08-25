// Advanced analytics and business intelligence dashboard
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { businessIntelligence } from '@/lib/analytics/business-intelligence'
import type { 
  GeographicHeatmap, 
  EngagementHeatmap, 
  ContentOptimization,
  ChurnPrediction,
  ABTestResult,
  MarketInsight
} from '@/lib/analytics/business-intelligence'
import { 
  Globe, 
  TrendingUp, 
  Users, 
  Target,
  Brain,
  BarChart3,
  MapPin,
  Clock,
  Lightbulb,
  AlertTriangle,
  Trophy,
  DollarSign
} from 'lucide-react'

interface AdvancedAnalyticsProps {
  creatorId: string
}

export function AdvancedAnalytics({ creatorId }: AdvancedAnalyticsProps) {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  
  // State for different analytics data
  const [geoHeatmap, setGeoHeatmap] = useState<GeographicHeatmap[]>([])
  const [engagementHeatmap, setEngagementHeatmap] = useState<EngagementHeatmap[]>([])
  const [contentOptimization, setContentOptimization] = useState<ContentOptimization[]>([])
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([])
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([])
  const [marketInsights, setMarketInsights] = useState<MarketInsight | null>(null)

  useEffect(() => {
    if (creatorId) {
      loadAdvancedAnalytics()
    }
  }, [creatorId, selectedPeriod])

  const loadAdvancedAnalytics = async () => {
    try {
      setLoading(true)
      
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - (selectedPeriod === 'week' ? 7 : 30))

      // Load all analytics data in parallel
      const [
        geoData,
        contentOpt,
        churnData,
        marketData
      ] = await Promise.all([
        businessIntelligence.generateGeographicHeatmap(creatorId, startDate, endDate),
        businessIntelligence.generateContentOptimization(creatorId),
        businessIntelligence.predictChurn(creatorId),
        businessIntelligence.getMarketInsights('gaming')
      ])

      setGeoHeatmap(geoData)
      setContentOptimization(contentOpt)
      setChurnPredictions(churnData)
      setMarketInsights(marketData)

      // Mock engagement heatmap for latest stream
      const engagementData = await businessIntelligence.generateEngagementHeatmap('latest_stream')
      setEngagementHeatmap(engagementData)

    } catch (error) {
      console.error('Error loading advanced analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            AI-powered insights and business intelligence
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="geographic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="optimization">AI Insights</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
        </TabsList>

        {/* Geographic Analytics */}
        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Geographic Distribution Heatmap
              </CardTitle>
              <CardDescription>
                Where your viewers are located worldwide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {geoHeatmap.slice(0, 10).map((location, index) => (
                  <div key={`${location.country}-${location.city}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-6 text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{location.city}, {location.country}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Avg. watch time: {Math.floor(location.averageViewTime / 60)}m
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{location.viewerCount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {location.engagementScore}% engagement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Heatmap */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Stream Engagement Heatmap
              </CardTitle>
              <CardDescription>
                Viewer engagement throughout your latest stream
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-1">
                  {engagementHeatmap.slice(0, 120).map((point, index) => (
                    <div
                      key={index}
                      className="h-4 rounded-sm"
                      style={{
                        backgroundColor: `hsl(${point.engagementLevel * 1.2}, 70%, ${50 + point.engagementLevel * 0.3}%)`
                      }}
                      title={`${Math.floor(point.timepoint / 60)}:${(point.timepoint % 60).toString().padStart(2, '0')} - ${point.engagementLevel}% engagement`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>30:00</span>
                  <span>1:00:00</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-sm" />
                    <span>Low Engagement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                    <span>Medium Engagement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-sm" />
                    <span>High Engagement</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Optimization */}
        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contentOptimization.map((optimization) => (
              <Card key={optimization.streamId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Content Optimization
                  </CardTitle>
                  <CardDescription>
                    Recommendations for "{optimization.title}"
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {optimization.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            rec.impact === 'high' ? 'default' :
                            rec.impact === 'medium' ? 'secondary' : 'outline'
                          }>
                            {rec.impact} impact
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(rec.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm">{rec.suggestion}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Predicted Improvements</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          +{optimization.predictedImprovement.viewers}
                        </div>
                        <div className="text-xs text-muted-foreground">Viewers</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          +{optimization.predictedImprovement.engagement}%
                        </div>
                        <div className="text-xs text-muted-foreground">Engagement</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          +${optimization.predictedImprovement.revenue}
                        </div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Retention Analytics */}
        <TabsContent value="retention" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Churn Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Churn Risk Analysis
                </CardTitle>
                <CardDescription>
                  Subscribers at risk of canceling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {churnPredictions.slice(0, 5).map((prediction) => (
                    <div key={prediction.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            prediction.churnProbability > 0.7 ? 'destructive' :
                            prediction.churnProbability > 0.4 ? 'secondary' : 'outline'
                          }>
                            {Math.round(prediction.churnProbability * 100)}% risk
                          </Badge>
                          <span className="text-sm">User {prediction.userId.slice(-6)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          LTV: ${prediction.lifetimeValue} • {prediction.daysUntilChurn} days
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Retention Strategies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Retention Strategies
                </CardTitle>
                <CardDescription>
                  AI-recommended actions to reduce churn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Personalized Content
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Send tailored recommendations based on viewing history
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      Exclusive Access
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Offer subscriber-only streams and content
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">
                      Direct Engagement
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Personal messages and shout-outs during streams
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Market Intelligence */}
        <TabsContent value="market" className="space-y-4">
          {marketInsights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Market Trends
                  </CardTitle>
                  <CardDescription>
                    {marketInsights.category} category insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Growth Rate</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">
                        +{(marketInsights.growthRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Competitors</span>
                    <span className="font-medium">
                      {marketInsights.competitorCount.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg. Revenue</span>
                    <span className="font-medium">
                      ${marketInsights.averageRevenue.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Top Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {marketInsights.topKeywords.map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Seasonal Patterns
                  </CardTitle>
                  <CardDescription>
                    Best months for your category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {marketInsights.seasonalPatterns
                      .sort((a, b) => b.multiplier - a.multiplier)
                      .slice(0, 6)
                      .map((pattern) => {
                        const monthNames = [
                          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                        ]
                        return (
                          <div key={pattern.month} className="flex items-center justify-between">
                            <span className="text-sm">
                              {monthNames[pattern.month - 1]}
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={pattern.multiplier * 50} 
                                className="w-20 h-2" 
                              />
                              <span className="text-sm font-medium w-12">
                                {pattern.multiplier.toFixed(1)}x
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}