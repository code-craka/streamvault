'use client'

import { UserRole, SubscriptionTier } from '@/types/auth'
import { formatUserRole, formatSubscriptionTier } from '@/lib/auth/permissions'

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

interface SubscriptionBadgeProps {
  tier: SubscriptionTier | null
  status?: string
  className?: string
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  const roleStyles = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    streamer:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }

  return (
    <span className={`${baseClasses} ${roleStyles[role]} ${className}`}>
      {formatUserRole(role)}
    </span>
  )
}

export function SubscriptionBadge({
  tier,
  status,
  className = '',
}: SubscriptionBadgeProps) {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  const tierStyles = {
    pro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    basic: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }

  const statusStyles = {
    active: 'ring-2 ring-green-500',
    canceled: 'ring-2 ring-red-500',
    past_due: 'ring-2 ring-yellow-500',
    incomplete: 'ring-2 ring-orange-500',
    trialing: 'ring-2 ring-blue-500',
  }

  const tierStyle = tier ? tierStyles[tier] : tierStyles.basic
  const statusStyle = status
    ? statusStyles[status as keyof typeof statusStyles] || ''
    : ''

  return (
    <span className={`${baseClasses} ${tierStyle} ${statusStyle} ${className}`}>
      {formatSubscriptionTier(tier)}
      {status && status !== 'active' && (
        <span className="ml-1 text-xs opacity-75">({status})</span>
      )}
    </span>
  )
}

interface CombinedUserBadgeProps {
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus?: string
  showBoth?: boolean
  className?: string
}

export function CombinedUserBadge({
  role,
  subscriptionTier,
  subscriptionStatus,
  showBoth = true,
  className = '',
}: CombinedUserBadgeProps) {
  if (!showBoth) {
    // Show subscription tier if available, otherwise show role
    if (subscriptionTier) {
      return (
        <SubscriptionBadge
          tier={subscriptionTier}
          status={subscriptionStatus}
          className={className}
        />
      )
    }
    return <RoleBadge role={role} className={className} />
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <RoleBadge role={role} />
      <SubscriptionBadge tier={subscriptionTier} status={subscriptionStatus} />
    </div>
  )
}
