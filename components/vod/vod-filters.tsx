'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { X, Filter, RotateCcw } from 'lucide-react'

export interface VODFilterOptions {
  search: string
  categories: string[]
  requiredTiers: string[]
  minDuration: number
  maxDuration: number
  sortBy: 'newest' | 'oldest' | 'popular' | 'duration' | 'alphabetical'
  sortDirection: 'asc' | 'desc'
  dateRange: {
    start: string
    end: string
  }
  hasTranscription: boolean
  hasHighlights: boolean
  minViews: number
  tags: string[]
}

interface VODFiltersProps {
  filters: VODFilterOptions
  onFiltersChange: (filters: VODFilterOptions) => void
  onReset: () => void
  isOpen: boolean
  onToggle: () => void
}

const CATEGORIES = [
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
  'News',
  'Comedy',
  'Science',
  'Business',
  'Health',
]

const SUBSCRIPTION_TIERS = [
  { value: 'basic', label: 'Basic' },
  { value: 'premium', label: 'Premium' },
  { value: 'pro', label: 'Pro' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'duration', label: 'By Duration' },
  { value: 'alphabetical', label: 'Alphabetical' },
]

export function VODFilters({
  filters,
  onFiltersChange,
  onReset,
  isOpen,
  onToggle,
}: VODFiltersProps) {
  const [tagInput, setTagInput] = useState('')

  const updateFilter = <K extends keyof VODFilterOptions>(
    key: K,
    value: VODFilterOptions[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleCategory = (category: string) => {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]
    updateFilter('categories', categories)
  }

  const toggleTier = (tier: string) => {
    const tiers = filters.requiredTiers.includes(tier)
      ? filters.requiredTiers.filter(t => t !== tier)
      : [...filters.requiredTiers, tier]
    updateFilter('requiredTiers', tiers)
  }

  const addTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      updateFilter('tags', [...filters.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag))
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.categories.length > 0 ||
      filters.requiredTiers.length > 0 ||
      filters.minDuration > 0 ||
      filters.maxDuration < 480 ||
      filters.dateRange.start ||
      filters.dateRange.end ||
      filters.hasTranscription ||
      filters.hasHighlights ||
      filters.minViews > 0 ||
      filters.tags.length > 0
    )
  }

  return (
    <Card className={`transition-all duration-200 ${isOpen ? 'shadow-lg' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
            >
              {isOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-6">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search videos..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Categories */}
          <div>
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={filters.categories.includes(category) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-opacity-80"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Subscription Tiers */}
          <div>
            <Label>Subscription Tiers</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SUBSCRIPTION_TIERS.map((tier) => (
                <Badge
                  key={tier.value}
                  variant={filters.requiredTiers.includes(tier.value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-opacity-80"
                  onClick={() => toggleTier(tier.value)}
                >
                  {tier.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Duration Range */}
          <div>
            <Label>Duration Range</Label>
            <div className="mt-2 space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Min: {formatDuration(filters.minDuration)}</span>
                  <span>Max: {formatDuration(filters.maxDuration)}</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={[filters.minDuration, filters.maxDuration]}
                    onValueChange={([min, max]) => {
                      updateFilter('minDuration', min)
                      updateFilter('maxDuration', max)
                    }}
                    max={480}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label htmlFor="start-date" className="text-xs">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                />
              </div>
            </div>
          </div>

          {/* Minimum Views */}
          <div>
            <Label htmlFor="min-views">Minimum Views</Label>
            <Input
              id="min-views"
              type="number"
              min="0"
              placeholder="0"
              value={filters.minViews || ''}
              onChange={(e) => updateFilter('minViews', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Content Features */}
          <div>
            <Label>Content Features</Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="has-transcription" className="text-sm">
                  Has Transcription
                </Label>
                <Switch
                  id="has-transcription"
                  checked={filters.hasTranscription}
                  onCheckedChange={(checked) => updateFilter('hasTranscription', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="has-highlights" className="text-sm">
                  Has Highlights
                </Label>
                <Switch
                  id="has-highlights"
                  checked={filters.hasHighlights}
                  onCheckedChange={(checked) => updateFilter('hasHighlights', checked)}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="mt-2 space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} size="sm">
                  Add
                </Button>
              </div>
              {filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                      {tag}
                      <X
                        className="w-3 h-3 ml-1"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <Label>Sort By</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sortDirection}
                onValueChange={(value) => updateFilter('sortDirection', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}