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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
              <div className="flex items-center space-x-4">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8'
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 border border-gray-700 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Dashboard</h3>
              <p className="text-gray-400 text-sm">
                Return to your main dashboard
              </p>
            </a>

            <a
              href="/stream"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 border border-gray-700 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Streaming</h3>
              <p className="text-gray-400 text-sm">
                Manage your live streams
              </p>
            </a>

            <a
              href="/library"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 border border-gray-700 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Library</h3>
              <p className="text-gray-400 text-sm">
                Browse your video library
              </p>
            </a>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}