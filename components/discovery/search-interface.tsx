'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { VODCard } from '@/components/vod/vod-card'
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  TrendingUp, 
  Calendar,
  SlidersHorizontal
} from 'lucide-react'
import type { VOD } from '@/types/streaming'

interface SearchFilters {
  query: string
  category: string
  requiredTier: string
  sortBy: 'relevance' | 'newest' | 'oldest' | 'popular' | 'duration'
  minDuration: number
  maxDuration: number
  dateRange: string
}

interface SearchResult {
  vods: VOD[]
  total: number
  hasMore: boolean
  suggestions: string[]
  filters: {
    categories: Array<{ name: string; count: number }>
    tiers: Array<{ name: string; count: number }>
  }
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'newest', label: 'Newest First', icon: <Calendar className="w-4 h-4" /> },
  { value: 'oldest', label: 'Oldest First', icon: <Clock className="w-4 h-4" /> },
  { value: 'popular', label: 'Most Popular', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'duration', label: 'By Duration', icon: <Clock className="w-4 h-4" /> },
]

const DURATION_RANGES = [
  { value: '', label: 'Any Duration' },
  { value: '0-300', label: 'Under 5 minutes' },
  { value: '300-1200', label: '5-20 minutes' },
  { value: '1200-3600', label: '20-60 minutes' },
  { value: '3600-', label: 'Over 1 hour' },
]

const DATE_RANGES = [
  { value: '', label: 'Any Time' },
  { value: '1d', label: 'Last 24 hours' },
  { value: '7d', label: 'Last week' },
  { value: '30d', label: 'Last month' },
  { value: '365d', label: 'Last year' },
]

export function SearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    requiredTier: searchParams.get('tier') || '',
    sortBy: (searchParams.get('sort') as any) || 'relevance',
    minDuration: 0,
    maxDuration: 0,
    dateRange: searchParams.get('date') || '',
  })

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (filters.query) {
      performSearch()
    }
  }, [filters])

  const performSearch = useCallback(async () => {
    if (!filters.query.trim()) {
      setSearchResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: filters.query,
        ...(filters.category && { category: filters.category }),
        ...(filters.requiredTier && { tier: filters.requiredTier }),
        ...(filters.sortBy !== 'relevance' && { sort: filters.sortBy }),
        ...(filters.dateRange && { date: filters.dateRange }),
        limit: '20',
      })

      if (filters.minDuration > 0 || filters.maxDuration > 0) {
        params.append('minDuration', filters.minDuration.toString())
        params.append('maxDuration', filters.maxDuration.toString())
      }

      const response = await fetch(`/api/search/videos?${params}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data)

      // Save to recent searches
      if (filters.query.trim()) {
        const updated = [
          filters.query.trim(),
          ...recentSearches.filter(s => s !== filters.query.trim())
        ].slice(0, 5)
        setRecentSearches(updated)
        localStorage.setItem('recentSearches', JSON.stringify(updated))
      }

      // Update URL
      const newParams = new URLSearchParams()
      if (filters.query) newParams.set('q', filters.query)
      if (filters.category) newParams.set('category', filters.category)
      if (filters.requiredTier) newParams.set('tier', filters.requiredTier)
      if (filters.sortBy !== 'relevance') newParams.set('sort', filters.sortBy)
      if (filters.dateRange) newParams.set('date', filters.dateRange)

      const newUrl = `/search${newParams.toString() ? `?${newParams}` : ''}`
      router.replace(newUrl, { scroll: false })

    } catch (error) {
      console.error('Search failed:', error)
      setError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [filters, recentSearches, router])

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      query: filters.query, // Keep the search query
      category: '',
      requiredTier: '',
      sortBy: 'relevance',
      minDuration: 0,
      maxDuration: 0,
      dateRange: '',
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  const selectSuggestion = (suggestion: string) => {
    updateFilter('query', suggestion)
  }

  const selectRecentSearch = (search: string) => {
    updateFilter('query', search)
  }

  const hasActiveFilters = filters.category || filters.requiredTier || 
    filters.sortBy !== 'relevance' || filters.dateRange || 
    filters.minDuration > 0 || filters.maxDuration > 0

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {/* Main Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search videos..."
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                className="pl-10 pr-4 h-12 text-lg"
              />
              {filters.query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilter('query', '')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">
                      Active
                    </Badge>
                  )}
                </Button>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value as any)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => updateFilter('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Category</SelectItem>
                      {searchResults?.filters.categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name} ({cat.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Subscription Tier</label>
                  <Select
                    value={filters.requiredTier}
                    onValueChange={(value) => updateFilter('requiredTier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Tier</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Duration</label>
                  <Select
                    value={filters.minDuration && filters.maxDuration ? 
                      `${filters.minDuration}-${filters.maxDuration}` : ''}
                    onValueChange={(value) => {
                      if (!value) {
                        updateFilter('minDuration', 0)
                        updateFilter('maxDuration', 0)
                      } else {
                        const [min, max] = value.split('-').map(Number)
                        updateFilter('minDuration', min || 0)
                        updateFilter('maxDuration', max || 0)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Upload Date</label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value) => updateFilter('dateRange', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Recent Searches & Suggestions */}
      {!filters.query && recentSearches.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search) => (
                <Badge
                  key={search}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => selectRecentSearch(search)}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {search}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Suggestions */}
      {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Did you mean?</h3>
            <div className="flex flex-wrap gap-2">
              {searchResults.suggestions.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
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
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={performSearch} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : searchResults ? (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {searchResults.total.toLocaleString()} results for "{filters.query}"
            </p>
          </div>

          {/* Results Grid */}
          {searchResults.vods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.vods.map((vod) => (
                <VODCard key={vod.id} vod={vod} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="space-y-4">
                  <div className="text-6xl">🔍</div>
                  <h3 className="text-xl font-semibold">No results found</h3>
                  <p className="text-gray-500">
                    Try adjusting your search terms or filters
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Load More */}
          {searchResults.hasMore && (
            <div className="text-center">
              <Button variant="outline">
                Load More Results
              </Button>
            </div>
          )}
        </div>
      ) : filters.query ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="text-6xl">🔍</div>
              <h3 className="text-xl font-semibold">Start searching</h3>
              <p className="text-gray-500">
                Enter a search term to find videos
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}