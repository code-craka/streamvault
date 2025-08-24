'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VODCard } from '@/components/vod/vod-card'
import { TrendingUp, Sparkles, Clock, Eye, RefreshCw } from 'lucide-react'
import type { VOD } from '@/types/streaming'

interface RecommendationSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  vods: VOD[]
  loading: boolean
  error?: string
}

interface ContentRecommendationsProps {
  limit?: number
  showRefresh?: boolean
}

export function ContentRecommendations({ 
  limit = 8, 
  showRefresh = true 
}: ContentRecommendationsProps) {
  const { user } = useUser()
  const [sections, setSections] = useState<RecommendationSection[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const initializeSections = (): RecommendationSection[] => [
    {
      id: 'trending',
      title: 'Trending Now',
      description: 'Popular videos gaining momentum',
      icon: <TrendingUp className="w-5 h-5" />,
      vods: [],
      loading: true,
    },
    {
      id: 'recommended',
      title: 'Recommended for You',
      description: 'Personalized picks based on your interests',
      icon: <Sparkles className="w-5 h-5" />,
      vods: [],
      loading: true,
    },
    {
      id: 'recent',
      title: 'Recently Added',
      description: 'Fresh content from creators',
      icon: <Clock className="w-5 h-5" />,
      vods: [],
      loading: true,
    },
    {
      id: 'popular',
      title: 'Most Watched',
      description: 'All-time favorites from the community',
      icon: <Eye className="w-5 h-5" />,
      vods: [],
      loading: true,
    },
  ]

  useEffect(() => {
    setSections(initializeSections())
    loadRecommendations()
  }, [user])

  const loadRecommendations = async () => {
    try {
      const promises = [
        loadTrendingContent(),
        loadRecommendedContent(),
        loadRecentContent(),
        loadPopularContent(),
      ]

      const results = await Promise.allSettled(promises)

      setSections(prev => prev.map((section, index) => ({
        ...section,
        loading: false,
        vods: results[index].status === 'fulfilled' ? results[index].value : [],
        error: results[index].status === 'rejected' ? 'Failed to load content' : undefined,
      })))

    } catch (error) {
      console.error('Failed to load recommendations:', error)
      setSections(prev => prev.map(section => ({
        ...section,
        loading: false,
        error: 'Failed to load content',
      })))
    }
  }

  const loadTrendingContent = async (): Promise<VOD[]> => {
    // Load trending content based on recent view growth
    const response = await fetch('/api/vods/trending?' + new URLSearchParams({
      limit: limit.toString(),
      timeframe: '7d', // Last 7 days
    }))

    if (!response.ok) {
      throw new Error('Failed to load trending content')
    }

    const data = await response.json()
    return data.vods || []
  }

  const loadRecommendedContent = async (): Promise<VOD[]> => {
    if (!user) {
      // For non-authenticated users, show popular content
      return loadPopularContent()
    }

    // Load personalized recommendations
    const response = await fetch('/api/vods/recommendations?' + new URLSearchParams({
      limit: limit.toString(),
      userId: user.id,
    }))

    if (!response.ok) {
      // Fallback to popular content
      return loadPopularContent()
    }

    const data = await response.json()
    return data.vods || []
  }

  const loadRecentContent = async (): Promise<VOD[]> => {
    const response = await fetch('/api/vods/public?' + new URLSearchParams({
      limit: limit.toString(),
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }))

    if (!response.ok) {
      throw new Error('Failed to load recent content')
    }

    const data = await response.json()
    return data.vods || []
  }

  const loadPopularContent = async (): Promise<VOD[]> => {
    const response = await fetch('/api/vods/popular?' + new URLSearchParams({
      limit: limit.toString(),
    }))

    if (!response.ok) {
      throw new Error('Failed to load popular content')
    }

    const data = await response.json()
    return data.vods || []
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setSections(prev => prev.map(section => ({ ...section, loading: true, error: undefined })))
    await loadRecommendations()
    setRefreshing(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discover Content</h2>
          <p className="text-gray-600">Find your next favorite video</p>
        </div>
        {showRefresh && (
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Recommendation Sections */}
      {sections.map((section) => (
        <div key={section.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {section.icon}
              <div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <p className="text-sm text-gray-600">{section.description}</p>
              </div>
            </div>
            {section.vods.length > 0 && (
              <Button variant="ghost" size="sm">
                View All
              </Button>
            )}
          </div>

          {section.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : section.error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-red-500 mb-4">{section.error}</p>
                <Button onClick={loadRecommendations} variant="outline" size="sm">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : section.vods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {section.vods.slice(0, 4).map((vod) => (
                <VODCard key={vod.id} vod={vod} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-2">
                  <div className="text-4xl">📹</div>
                  <p className="text-gray-500">No content available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  )
}