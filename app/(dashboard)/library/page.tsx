import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { VODLibrary } from '@/components/vod/vod-library'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default async function LibraryPage() {
  const { userId } = await auth()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Video Library</h1>
          <p className="text-gray-600">
            Browse and discover videos from creators around the world
          </p>
        </div>

        {/* VOD Library */}
        <Suspense fallback={<LibraryLoadingSkeleton />}>
          <VODLibrary
            showFilters={true}
            showSearch={true}
            showCategories={true}
            limit={24}
          />
        </Suspense>
      </div>
    </div>
  )
}

function LibraryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <Skeleton className="aspect-video w-full" />
              <div className="space-y-2 p-4">
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
    </div>
  )
}
