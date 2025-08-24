// Creator dashboard page
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CreatorDashboard } from '@/components/dashboard/creator-dashboard'

export default async function CreatorDashboardPage() {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="container mx-auto py-6">
      <CreatorDashboard />
    </div>
  )
}

export const metadata = {
  title: 'Creator Dashboard - StreamVault',
  description: 'Manage your streams, analytics, and earnings on StreamVault',
}