import { UserButton } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserProfile } from '@/components/auth/user-profile'
import { SubscriptionManager } from '@/components/auth/subscription-manager'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default async function SettingsPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <ProtectedRoute config={{ requireAuth: true }}>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="border-b border-gray-700 bg-gray-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
              <div className="flex items-center space-x-4">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* User Profile Section */}
            <div className="lg:col-span-1">
              <UserProfile />
            </div>

            {/* Subscription Management Section */}
            <div className="lg:col-span-2">
              <SubscriptionManager />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <a
              href="/dashboard"
              className="rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:bg-gray-700"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">
                Dashboard
              </h3>
              <p className="text-sm text-gray-400">
                Return to your main dashboard
              </p>
            </a>

            <a
              href="/stream"
              className="rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:bg-gray-700"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">
                Streaming
              </h3>
              <p className="text-sm text-gray-400">Manage your live streams</p>
            </a>

            <a
              href="/library"
              className="rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:bg-gray-700"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">Library</h3>
              <p className="text-sm text-gray-400">Browse your video library</p>
            </a>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
