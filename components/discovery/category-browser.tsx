'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Gamepad2,
  GraduationCap,
  Music,
  Dumbbell,
  Utensils,
  Plane,
  Palette,
  Laptop,
  Trophy,
  Newspaper,
  Laugh,
  Microscope,
  Briefcase,
  Heart,
  Grid3X3,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  videoCount: number
  trending: boolean
  color: string
}

interface CategoryBrowserProps {
  showAll?: boolean
  limit?: number
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Gaming: <Gamepad2 className="h-6 w-6" />,
  Education: <GraduationCap className="h-6 w-6" />,
  Music: <Music className="h-6 w-6" />,
  Fitness: <Dumbbell className="h-6 w-6" />,
  Cooking: <Utensils className="h-6 w-6" />,
  Travel: <Plane className="h-6 w-6" />,
  Art: <Palette className="h-6 w-6" />,
  Technology: <Laptop className="h-6 w-6" />,
  Sports: <Trophy className="h-6 w-6" />,
  News: <Newspaper className="h-6 w-6" />,
  Comedy: <Laugh className="h-6 w-6" />,
  Science: <Microscope className="h-6 w-6" />,
  Business: <Briefcase className="h-6 w-6" />,
  Health: <Heart className="h-6 w-6" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  Gaming: 'from-purple-500 to-pink-500',
  Education: 'from-blue-500 to-cyan-500',
  Music: 'from-green-500 to-teal-500',
  Fitness: 'from-orange-500 to-red-500',
  Cooking: 'from-yellow-500 to-orange-500',
  Travel: 'from-indigo-500 to-purple-500',
  Art: 'from-pink-500 to-rose-500',
  Technology: 'from-gray-500 to-slate-500',
  Sports: 'from-emerald-500 to-green-500',
  News: 'from-red-500 to-pink-500',
  Comedy: 'from-amber-500 to-yellow-500',
  Science: 'from-cyan-500 to-blue-500',
  Business: 'from-slate-500 to-gray-500',
  Health: 'from-rose-500 to-pink-500',
}

export function CategoryBrowser({
  showAll = false,
  limit = 8,
}: CategoryBrowserProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('Failed to load categories')
      }

      const data = await response.json()
      const categoriesWithMetadata = data.categories.map((cat: any) => ({
        ...cat,
        icon: CATEGORY_ICONS[cat.name] || <Grid3X3 className="h-6 w-6" />,
        color: CATEGORY_COLORS[cat.name] || 'from-gray-500 to-slate-500',
      }))

      setCategories(categoriesWithMetadata)
    } catch (error) {
      console.error('Failed to load categories:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to load categories'
      )
    } finally {
      setLoading(false)
    }
  }

  const displayedCategories = showAll ? categories : categories.slice(0, limit)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Button onClick={loadCategories} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Browse Categories</h2>
          <p className="text-gray-600">Explore content by topic</p>
        </div>
        {!showAll && categories.length > limit && (
          <Button variant="outline" asChild>
            <Link href="/categories">View All</Link>
          </Button>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {displayedCategories.map(category => (
          <Link key={category.id} href={`/library?category=${category.name}`}>
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg">
              <CardContent className="p-0">
                <div
                  className={`bg-gradient-to-br ${category.color} relative overflow-hidden p-6 text-white`}
                >
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center justify-between">
                      {category.icon}
                      {category.trending && (
                        <Badge
                          variant="secondary"
                          className="border-white/30 bg-white/20 text-xs text-white"
                        >
                          Trending
                        </Badge>
                      )}
                    </div>
                    <h3 className="mb-1 text-lg font-semibold">
                      {category.name}
                    </h3>
                    <p className="mb-3 line-clamp-2 text-sm text-white/80">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/90">
                        {category.videoCount.toLocaleString()} videos
                      </span>
                    </div>
                  </div>

                  {/* Background decoration */}
                  <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/10 transition-transform duration-200 group-hover:scale-110" />
                  <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-white/5 transition-transform duration-200 group-hover:scale-110" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📂</div>
              <h3 className="text-xl font-semibold">No categories found</h3>
              <p className="text-gray-500">
                Categories will appear here as content is added to the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
