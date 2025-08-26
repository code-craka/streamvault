import { Suspense } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ContentRecommendations } from '@/components/discovery/content-recommendations'
import { CategoryBrowser } from '@/components/discovery/category-browser'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="mb-6 text-6xl font-bold text-white">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                StreamVault
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
              Professional live streaming platform with subscription-based
              monetization and enterprise-grade features. Stream, engage, and
              monetize your content with cutting-edge technology.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
                    Get Started
                  </button>
                </SignInButton>
                <Link href="/sign-up">
                  <button className="rounded-lg border border-gray-300 px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-100 hover:text-gray-900">
                    Sign Up
                  </button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <button className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
                    Go to Dashboard
                  </button>
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-10 h-10',
                    },
                  }}
                />
              </SignedIn>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-500">
                <span className="font-bold text-white">LIVE</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Live Streaming
              </h3>
              <p className="text-gray-300">
                Professional quality broadcasting with RTMP ingest and HLS
                delivery
              </p>
            </div>

            <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500">
                <span className="font-bold text-white">VOD</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Video on Demand
              </h3>
              <p className="text-gray-300">
                Secure video-on-demand with signed URLs and content protection
              </p>
            </div>

            <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500">
                <span className="font-bold text-white">AI</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                AI Enhancement
              </h3>
              <p className="text-gray-300">
                Automated content processing, thumbnails, and recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Discovery Section */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<ContentRecommendationsSkeleton />}>
            <ContentRecommendations limit={8} showRefresh={false} />
          </Suspense>
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<CategoryBrowserSkeleton />}>
            <CategoryBrowser showAll={false} limit={8} />
          </Suspense>
        </div>
      </section>
    </main>
  )
}

function ContentRecommendationsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="mb-1 h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
      ))}
    </div>
  )
}

function CategoryBrowserSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-gray-200 to-gray-300 p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-6 bg-white/20" />
                  <Skeleton className="h-5 w-20 bg-white/20" />
                  <Skeleton className="h-3 w-16 bg-white/20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
