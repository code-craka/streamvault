'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Sparkles, 
  Image, 
  FileText, 
  Tags, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Lightbulb,
  TrendingUp,
  Eye,
  Accessibility
} from 'lucide-react'

interface ContentEnhancementPanelProps {
  videoId: string
  videoPath?: string
  onEnhancementComplete?: (data: any) => void
}

interface EnhancementResult {
  metadata: {
    title: string
    description: string
    tags: string[]
    category: string
    confidence: number
  }
  thumbnails: Array<{
    url: string
    confidence: number
    timestamp: number
  }>
  qualityAnalysis: {
    overall: number
    grade: string
    breakdown: {
      technical: number
      engagement: number
      accessibility: number
      seo: number
    }
    suggestions: Array<{
      category: string
      priority: string
      issue: string
      suggestion: string
      impact: number
    }>
  }
}

export function ContentEnhancementPanel({ 
  videoId, 
  videoPath, 
  onEnhancementComplete 
}: ContentEnhancementPanelProps) {
  const { user } = useUser()
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState('')
  const [result, setResult] = useState<EnhancementResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startEnhancement = async () => {
    if (!videoPath) {
      setError('Video path is required for enhancement')
      return
    }

    try {
      setIsProcessing(true)
      setProgress(0)
      setError(null)
      setCurrentStage('Initializing AI processing...')

      const response = await fetch('/api/ai/content-enhancement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getToken()}`
        },
        body: JSON.stringify({
          videoId,
          videoPath,
          options: {
            generateThumbnails: true,
            generateMetadata: true,
            analyzeQuality: true,
            generateRecommendations: false
          }
        })
      })

      if (!response.ok) {
        throw new Error('Enhancement request failed')
      }

      // Simulate progress updates
      const stages = [
        'Analyzing video content...',
        'Generating thumbnails...',
        'Creating metadata...',
        'Analyzing quality...',
        'Finalizing results...'
      ]

      for (let i = 0; i < stages.length; i++) {
        setCurrentStage(stages[i])
        setProgress((i + 1) * 20)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const data = await response.json()
      
      if (data.success) {
        setResult(data.data)
        setProgress(100)
        setCurrentStage('Enhancement complete!')
        onEnhancementComplete?.(data.data)
      } else {
        throw new Error(data.error || 'Enhancement failed')
      }

    } catch (error) {
      console.error('Enhancement failed:', error)
      setError(error instanceof Error ? error.message : 'Enhancement failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-600 bg-green-100'
      case 'B+':
      case 'B': return 'text-blue-600 bg-blue-100'
      case 'C+':
      case 'C': return 'text-yellow-600 bg-yellow-100'
      case 'D': return 'text-orange-600 bg-orange-100'
      case 'F': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Content Enhancement</CardTitle>
        </div>
        <CardDescription>
          Automatically improve your video with AI-powered analysis and optimization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!result && !isProcessing && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Enhance</h3>
            <p className="text-gray-600 mb-4">
              AI will analyze your video and generate optimized thumbnails, metadata, and quality insights
            </p>
            <Button onClick={startEnhancement} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Start AI Enhancement
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
              <p className="font-medium">{currentStage}</p>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600 text-center">{progress}% complete</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={startEnhancement} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {result && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Quality Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Badge className={getGradeColor(result.qualityAnalysis.grade)}>
                        {result.qualityAnalysis.grade}
                      </Badge>
                      <span className="text-2xl font-bold">
                        {Math.round(result.qualityAnalysis.overall * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      AI Confidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Progress value={result.metadata.confidence * 100} className="flex-1" />
                      <span className="text-sm font-medium">
                        {Math.round(result.metadata.confidence * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Top Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.qualityAnalysis.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Badge variant={getPriorityColor(suggestion.priority)} className="mt-0.5">
                          {suggestion.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{suggestion.issue}</p>
                          <p className="text-xs text-gray-600">{suggestion.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="thumbnails" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.thumbnails.map((thumbnail, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="relative">
                      <img
                        src={thumbnail.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-black/80 text-white">
                        {Math.round(thumbnail.confidence * 100)}%
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-600">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {Math.floor(thumbnail.timestamp / 60)}:{(thumbnail.timestamp % 60).toString().padStart(2, '0')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Generated Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">{result.metadata.title}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">{result.metadata.description}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Badge variant="secondary" className="mt-1">{result.metadata.category}</Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Technical
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.qualityAnalysis.breakdown.technical}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.qualityAnalysis.breakdown.engagement}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center">
                      <Accessibility className="h-3 w-3 mr-1" />
                      Accessibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.qualityAnalysis.breakdown.accessibility}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      SEO
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.qualityAnalysis.breakdown.seo}%</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Improvement Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.qualityAnalysis.suggestions.map((suggestion, index) => (
                      <div key={index} className="border-l-4 border-gray-200 pl-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={getPriorityColor(suggestion.priority)}>
                            {suggestion.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{suggestion.issue}</p>
                        <p className="text-xs text-gray-600 mt-1">{suggestion.suggestion}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Impact: {Math.round(suggestion.impact * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export default ContentEnhancementPanel