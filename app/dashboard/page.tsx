import { UserButton } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserProfile } from '@/components/auth/user-profile'

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">StreamVault</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                Welcome, {user.firstName || user.username || 'User'}!
              </span>
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
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400">
            Welcome to your StreamVault dashboard. Authentication is working!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UserProfile />
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-2 text-xl font-semibold text-white">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                Start Streaming
              </button>
              <button className="w-full rounded-md bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600">
                Browse Library
              </button>
              <button className="w-full rounded-md bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600">
                Manage Settings
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-2 text-xl font-semibold text-white">
              Authentication Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-green-400">Authenticated</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-green-400">Session Active</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-blue-400">OAuth Ready</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
