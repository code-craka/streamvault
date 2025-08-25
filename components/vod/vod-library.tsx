'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VODCard } from './vod-card'
import { VODFilters } from './vod-filters'
import type { VOD } from '@/types/streaming'

interface VODLibraryProps {
  userId?: string // If provided, shows user's VODs, otherwise shows public VODs
  showFilters?: boolean
  showSearch?: boolean
  showCategories?: boolean
  limit?: number
}

interface VODFilters {
  search: string
  category: string
  requiredTier: string
  sortBy: 'newest' | 'oldest' | 'popular' | 'duration'
  status: 'all' | 'ready' | 'processing'
}

export function VODLibrary({
  userId,
  showFilters = true,
  showSearch = true,
  showCategories = true,
  limit = 20,
}: VODLibraryProps) {
  const { user } = useUser()
  const [vods, setVods] = useState<VOD[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState<VODFilters>({
    search: '',
    category: '',
    requiredTier: '',
    sortBy: 'newest',
    status: 'all',
  })

  const categories = [
    'Gaming',
    'Education',
    'Entertainment',
    'Technology',
    'Music',
    'Sports',
    'Art',
    'Cooking',
    'Travel',
    'Fitness',
  ]

  const subscriptionTiers = [
    { value: 'basic', label: 'Basic' },
    { value: 'premium', label: 'Premium' },
    { value: 'pro', label: 'Pro' },
  ]

  useEffect(() => {
    loadVODs(true)
  }, [filters, userId])

  const loadVODs = async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: reset ? '0' : ((page - 1) * limit).toString(),
        orderBy: getOrderByField(filters.sortBy),
        orderDirection: filters.sortBy === 'oldest' ? 'asc' : 'desc',
      })

      if (userId) {
        params.append('userId', userId)
      }

      if (filters.search) {
        params.append('search', filters.search)
      }

      if (filters.category) {
        params.append('category', filters.category)
      }

      if (filters.requiredTier) {
        params.append('requiredTier', filters.requiredTier)
      }

      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }

      const endpoint = userId ? '/api/vods/user' : '/api/vods/public'
      const response = await fetch(`${endpoint}?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load VODs')
      }

      const data = await response.json()
      const newVods = data.vods || []

      if (reset) {
        setVods(newVods)
        setPage(1)
      } else {
        setVods(prev => [...prev, ...newVods])
      }

      setHasMore(newVods.length === limit)

    } catch (error) {
      console.error('Failed to load VODs:', error)
      setError(error instanceof Error ? error.message : 'Failed to load VODs')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
      loadVODs(false)
    }
  }

  const handleFilterChange = (key: keyof VODFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getOrderByField = (sortBy: string): string => {
    switch (sortBy) {
      case 'popular':
        return 'viewCount'
      case 'duration':
        return 'duration'
      case 'oldest':
        return 'createdAt'
      default:
        return 'createdAt'
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => loadVODs(true)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {userId ? 'My Videos' : 'Video Library'}
        </h2>
        {userId && user?.id === userId && (
          <Button onClick={() => window.location.href = '/upload'}>
            Upload Video
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              {showSearch && (
                <div>
                  <Input
                    placeholder="Search videos..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              )}

              {/* Category */}
              {showCategories && (
                <div>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => handleFilterChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subscription Tier */}
              <div>
                <Select
                  value={filters.requiredTier}
                  onValueChange={(value) => handleFilterChange('requiredTier', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Tiers</SelectItem>
                    {subscriptionTiers.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange('sortBy', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="duration">By Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Filter (for user's own VODs) */}
            {userId && user?.id === userId && (
              <div className="mt-4">
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value as any)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Videos</SelectItem>
                    <SelectItem value="ready">Published</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VOD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {vods.map((vod) => (
          <VODCard
            key={vod.id}
            vod={vod}
            showOwnerActions={userId === user?.id}
          />
        ))}

        {/* Loading skeletons */}
        {loading && vods.length === 0 && (
          Array.from({ length: 8 }).map((_, i) => (
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
          ))
        )}
      </div>

      {/* Empty State */}
      {!loading && vods.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📹</div>
              <h3 className="text-xl font-semibold">No videos found</h3>
              <p className="text-gray-500">
                {userId 
                  ? "You haven't uploaded any videos yet."
                  : "No videos match your current filters."
                }
              </p>
              {userId && user?.id === userId && (
                <Button onClick={() => window.location.href = '/upload'}>
                  Upload Your First Video
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {!loading && hasMore && vods.length > 0 && (
        <div className="text-center">
          <Button onClick={loadMore} variant="outline">
            Load More Videos
          </Button>
        </div>
      )}

      {/* Loading indicator for load more */}
      {loading && vods.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span>Loading more videos...</span>
          </div>
        </div>
      )}
    </div>
  )
}