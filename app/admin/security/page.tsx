import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SecurityDashboard } from '@/components/security/security-dashboard'

export default async function SecurityPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user has admin role
  // In a real application, you would fetch this from your user service
  // For now, we'll assume the check is done in the component

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor security events, audit logs, and system security status
        </p>
      </div>

      <SecurityDashboard />
    </div>
  )
}
