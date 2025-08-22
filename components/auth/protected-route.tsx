'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { UserRole, SubscriptionTier } from '@/types/auth'
import { checkUserRole, checkSubscriptionAccess } from '@/lib/auth/permissions'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  requiredSubscription?: SubscriptionTier
  fallbackUrl?: string
  loadingComponent?: ReactNode
  unauthorizedComponent?: ReactNode
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredSubscription,
  fallbackUrl = '/sign-in',
  loadingComponent,
  unauthorizedComponent
}: ProtectedRouteProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !user) {
      router.push(fallbackUrl)
    }
  }, [isLoaded, user, router, fallbackUrl])

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      )
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  // Check role requirements
  if (requiredRole && !checkUserRole(user, requiredRole)) {
    return (
      unauthorizedComponent || (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-400 mb-6">
              You don&apos;t have permission to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    )
  }

  // Check subscription requirements
  if (requiredSubscription && !checkSubscriptionAccess(user, requiredSubscription)) {
    return (
      unauthorizedComponent || (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Subscription Required</h1>
            <p className="text-gray-400 mb-6">
              You need a {requiredSubscription} subscription or higher to access this feature.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/pricing')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function ViewerRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="viewer" {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function StreamerRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="streamer" {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="admin" {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function PremiumRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredSubscription'>) {
  return (
    <ProtectedRoute requiredSubscription="premium" {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function ProRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredSubscription'>) {
  return (
    <ProtectedRoute requiredSubscription="pro" {...props}>
      {children}
    </ProtectedRoute>
  )
}