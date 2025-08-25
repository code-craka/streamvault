'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Play, Clock, Eye, TrendingUp } from 'lucide-react'

interface VideoRecommendation {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  duration: number
  viewCount: number
  creatorName: string
  category: string
  tags: string[]
  confidence: number
  reason: string
}

interface RecommendationEngineProps {
  currentVideoId?: string
  limit?: number
  showReason?: boolean
}

export function RecommendationEngine({ 
  currentVideoId, 
  limit = 6, 
  showReason = false 
}: RecommendationEngineProps) {
  const { user } = useUser()
  const [recommendations, setRecommendations] = useState<VideoRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchRecommendations()
    }
  }, [user, currentVideoId, limit])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(currentVideoId && { videoId: currentVideoId })
      })

      const response = await fetch(`/api/ai/recommendations?${params}`, {
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])

    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
      setError('Unable to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Recommended for You</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchRecommendations} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">No recommendations available</p>
        <p className="text-sm text-gray-400 mt-2">
          Watch more videos to get personalized recommendations
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Recommended for You</h3>
        </div>
        <Button 
          onClick={fetchRecommendations} 
          variant="ghost" 
          size="sm"
          className="text-sm"
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((video) => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="relative">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDuration(video.duration)}
              </div>
              {showReason && (
                <div className="absolute top-2 left-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${getConfidenceColor(video.confidence)}`}
                    title={`Confidence: ${Math.round(video.confidence * 100)}%`}
                  />
                </div>
              )}
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                {video.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {video.creatorName}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{formatViewCount(video.viewCount)} views</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {video.category}
                </Badge>
              </div>

              {showReason && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {video.reason}
                </p>
              )}

              <div className="flex flex-wrap gap-1">
                {video.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {video.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{video.tags.length - 3}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recommendations.length >= limit && (
        <div className="text-center">
          <Button variant="outline" onClick={() => fetchRecommendations()}>
            Load More Recommendations
          </Button>
        </div>
      )}
    </div>
  )
}

export default RecommendationEngine