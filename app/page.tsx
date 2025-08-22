import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
          <div className="flex flex-col justify-center gap-4 sm:flex-row items-center">
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
                    avatarBox: 'w-10 h-10'
                  }
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
    </main>
  )
}
