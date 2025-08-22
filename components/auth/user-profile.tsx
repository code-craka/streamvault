'use client'

import { useUser } from '@clerk/nextjs'
import { useState } from 'react'
import { UserRole, SubscriptionTier } from '@/types/auth'
import { 
  getUserDisplayName, 
  formatUserRole, 
  formatSubscriptionTier,
  isActiveSubscriber,
  canAccessPremiumFeatures,
  canAccessProFeatures
} from '@/lib/auth/permissions'

interface UserProfileProps {
  showSubscriptionInfo?: boolean
  showRoleInfo?: boolean
  compact?: boolean
}

export function UserProfile({ 
  showSubscriptionInfo = true, 
  showRoleInfo = true,
  compact = false 
}: UserProfileProps) {
  const { user, isLoaded } = useUser()
  const [isEditing, setIsEditing] = useState(false)

  if (!isLoaded) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-24"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-gray-400">
        Not authenticated
      </div>
    )
  }

  const displayName = getUserDisplayName(user)
  const role = (user.publicMetadata?.role as UserRole) || 'viewer'
  const subscriptionTier = (user.publicMetadata?.subscriptionTier as SubscriptionTier) || null
  const subscriptionStatus = user.publicMetadata?.subscriptionStatus as string
  const isSubscribed = isActiveSubscriber(user)
  const hasPremium = canAccessPremiumFeatures(user)
  const hasPro = canAccessProFeatures(user)

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-white font-medium text-sm">{displayName}</p>
          <p className="text-gray-400 text-xs">
            {formatUserRole(role)}
            {subscriptionTier && ` • ${formatSubscriptionTier(subscriptionTier)}`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{displayName}</h3>
            <p className="text-gray-400">{user.emailAddresses[0]?.emailAddress}</p>
            {user.username && (
              <p className="text-gray-500 text-sm">@{user.username}</p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="space-y-4">
        {showRoleInfo && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role
            </label>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                role === 'admin' ? 'bg-red-900 text-red-200' :
                role === 'streamer' ? 'bg-purple-900 text-purple-200' :
                'bg-gray-700 text-gray-300'
              }`}>
                {formatUserRole(role)}
              </span>
            </div>
          </div>
        )}

        {showSubscriptionInfo && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Subscription
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  hasPro ? 'bg-yellow-900 text-yellow-200' :
                  hasPremium ? 'bg-blue-900 text-blue-200' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {formatSubscriptionTier(subscriptionTier)}
                </span>
                
                {isSubscribed && (
                  <span className="flex items-center text-green-400 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Active
                  </span>
                )}
              </div>
              
              {subscriptionStatus && subscriptionStatus !== 'active' && (
                <p className="text-yellow-400 text-xs">
                  Status: {subscriptionStatus}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Account Details
          </label>
          <div className="text-sm text-gray-400 space-y-1">
            <p>User ID: {user.id}</p>
            <p>Created: {new Date(user.createdAt!).toLocaleDateString()}</p>
            <p>Last Updated: {new Date(user.updatedAt!).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Feature Access Indicators */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Feature Access
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                role === 'streamer' || role === 'admin' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-300">Live Streaming</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                hasPremium ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-300">HD Quality</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                hasPremium ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-300">Offline Downloads</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                hasPro ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-300">4K Streaming</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                role === 'admin' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-300">Admin Access</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                hasPro ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-300">API Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}