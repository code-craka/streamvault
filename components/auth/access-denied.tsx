'use client'

// Access denied component for unauthorized access attempts

import { AlertTriangle, Lock, CreditCard, UserX } from 'lucide-react'
import Link from 'next/link'
import type { UserRole, SubscriptionTier } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AccessDeniedProps {
  message: string
  requiredRole?: UserRole
  requiredSubscription?: SubscriptionTier
  showUpgradeButton?: boolean
  showContactSupport?: boolean
}

export function AccessDenied({
  message,
  requiredRole,
  requiredSubscription,
  showUpgradeButton = true,
  showContactSupport = true
}: AccessDeniedProps) {
  const getIcon = () => {
    if (requiredSubscription) {
      return <CreditCard className="h-12 w-12 text-orange-500" />
    }
    if (requiredRole) {
      return <UserX className="h-12 w-12 text-red-500" />
    }
    return <Lock className="h-12 w-12 text-gray-500" />
  }

  const getTitle = () => {
    if (requiredSubscription) {
      return 'Subscription Required'
    }
    if (requiredRole) {
      return 'Insufficient Permissions'
    }
    return 'Access Denied'
  }

  const getDescription = () => {
    if (requiredSubscription) {
      return `This feature requires a ${requiredSubscription} subscription or higher.`
    }
    if (requiredRole) {
      return `This page requires ${requiredRole} role or higher.`
    }
    return 'You do not have permission to access this resource.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error message */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{message}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {requiredSubscription && showUpgradeButton && (
              <Button asChild className="w-full">
                <Link href="/dashboard/billing">
                  Upgrade Subscription
                </Link>
              </Button>
            )}

            {requiredRole && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Return Home
              </Link>
            </Button>

            {showContactSupport && (
              <Button asChild variant="ghost" className="w-full">
                <Link href="/support">
                  Contact Support
                </Link>
              </Button>
            )}
          </div>

          {/* Additional information */}
          {requiredSubscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                What you get with {requiredSubscription}:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {getSubscriptionFeatures(requiredSubscription).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requiredRole && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Need {requiredRole} access?
              </h4>
              <p className="text-sm text-yellow-700">
                Contact your administrator or upgrade your account to get the required permissions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Get features for subscription tier
function getSubscriptionFeatures(tier: SubscriptionTier): string[] {
  switch (tier) {
    case 'basic':
      return [
        'Access to live streams',
        'Limited VOD history (30 days)',
        'Standard quality streaming (720p)',
        'Basic chat participation',
        'Mobile app access'
      ]
    case 'premium':
      return [
        'All Basic features',
        'Full VOD library access',
        'HD streaming quality (1080p)',
        'Chat privileges and custom emotes',
        'Offline downloads',
        'Priority support'
      ]
    case 'pro':
      return [
        'All Premium features',
        'Ultra HD streaming (4K)',
        'Unlimited offline downloads',
        'Advanced analytics dashboard',
        'API access for integrations',
        'White-label customization'
      ]
  }
}

// Compact version for inline use
export function AccessDeniedInline({
  message,
  requiredSubscription,
  className = ''
}: {
  message: string
  requiredSubscription?: SubscriptionTier
  className?: string
}) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex items-start">
        <Lock className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-700 mb-2">{message}</p>
          {requiredSubscription && (
            <Button asChild size="sm">
              <Link href="/dashboard/billing">
                Upgrade to {requiredSubscription}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Feature gate component for conditional rendering
export function FeatureGate({
  children,
  fallback,
  requiredSubscription,
  requiredRole,
  user
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredSubscription?: SubscriptionTier
  requiredRole?: UserRole
  user: any // StreamVaultUser or null
}) {
  if (!user) {
    return fallback || (
      <AccessDeniedInline message="Please sign in to access this feature" />
    )
  }

  // Check role requirement
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return fallback || (
      <AccessDeniedInline 
        message={`This feature requires ${requiredRole} role or higher`}
      />
    )
  }

  // Check subscription requirement
  if (requiredSubscription) {
    const hasSubscription = user.subscriptionTier && 
      ['basic', 'premium', 'pro'].indexOf(user.subscriptionTier) >= 
      ['basic', 'premium', 'pro'].indexOf(requiredSubscription)
    
    if (!hasSubscription) {
      return fallback || (
        <AccessDeniedInline 
          message={`This feature requires ${requiredSubscription} subscription or higher`}
          requiredSubscription={requiredSubscription}
        />
      )
    }
  }

  return <>{children}</>
}