'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { SubscriptionTier } from '@/types/auth'
import { SUBSCRIPTION_PLANS } from '@/types/subscription'
import { SubscriptionBadge } from './role-badge'
import {
  getUserSubscriptionTier,
  isActiveSubscriber,
  canAccessPremiumFeatures,
  canAccessProFeatures
} from '@/lib/auth/permissions'

interface SubscriptionFeature {
  name: string
  basic: boolean | string
  premium: boolean | string
  pro: boolean | string
}

const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  {
    name: 'Live Streaming Access',
    basic: 'View Only',
    premium: 'View Only',
    pro: 'View Only'
  },
  {
    name: 'VOD Library Access',
    basic: '30 days',
    premium: 'Unlimited',
    pro: 'Unlimited'
  },
  {
    name: 'Video Quality',
    basic: '720p',
    premium: '1080p',
    pro: '4K'
  },
  {
    name: 'Chat Features',
    basic: 'Basic',
    premium: '5 Custom Emotes',
    pro: 'Unlimited Emotes'
  },
  {
    name: 'Offline Downloads',
    basic: false,
    premium: '10 videos',
    pro: 'Unlimited'
  },
  {
    name: 'Concurrent Streams',
    basic: '1',
    premium: '2',
    pro: '5'
  },
  {
    name: 'API Access',
    basic: false,
    premium: false,
    pro: true
  },
  {
    name: 'White-label Features',
    basic: false,
    premium: false,
    pro: true
  },
  {
    name: 'Priority Support',
    basic: false,
    premium: true,
    pro: true
  }
]

export function SubscriptionManager() {
  const { user } = useUser()
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('premium')

  if (!user) {
    return (
      <div className="text-center text-gray-400">
        Please sign in to manage your subscription
      </div>
    )
  }

  const currentTier = getUserSubscriptionTier(user)
  const isSubscribed = isActiveSubscriber(user)
  const hasPremium = canAccessPremiumFeatures(user)
  const hasPro = canAccessProFeatures(user)

  const handleUpgrade = async (tier: SubscriptionTier) => {
    // This would integrate with Stripe checkout
    console.log(`Upgrading to ${tier}`)
    // Redirect to Stripe checkout or open modal
  }

  const handleManageBilling = () => {
    // This would redirect to Stripe customer portal
    console.log('Opening billing portal')
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Current Subscription</h3>
          <SubscriptionBadge
            tier={currentTier}
            status={user.subscriptionStatus || undefined}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              ${currentTier ? SUBSCRIPTION_PLANS[currentTier].price : SUBSCRIPTION_PLANS.basic.price}
            </div>
            <div className="text-gray-400 text-sm">per month</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {isSubscribed ? 'Active' : 'Inactive'}
            </div>
            <div className="text-gray-400 text-sm">Status</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </div>
            <div className="text-gray-400 text-sm">Member since</div>
          </div>
        </div>

        {isSubscribed && (
          <button
            onClick={handleManageBilling}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Manage Billing
          </button>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-6">Subscription Plans</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionTier, typeof SUBSCRIPTION_PLANS.basic][]).map(([tier, plan]) => (
            <div
              key={tier}
              className={`relative rounded-lg border p-6 cursor-pointer transition-all ${selectedPlan === tier
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-600 hover:border-gray-500'
                } ${plan.popular ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setSelectedPlan(tier)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-2">{plan.name}</h4>
                <div className="text-3xl font-bold text-white mb-2">
                  ${plan.price}
                  <span className="text-lg text-gray-400">/mo</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                {currentTier === tier ? (
                  <div className="bg-green-600 text-white py-2 px-4 rounded-lg">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUpgrade(tier)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    {currentTier === 'basic' || !isSubscribed ? 'Upgrade' : 'Change Plan'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-6">Feature Comparison</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300">Feature</th>
                <th className="text-center py-3 px-4 text-gray-300">Basic</th>
                <th className="text-center py-3 px-4 text-gray-300">Premium</th>
                <th className="text-center py-3 px-4 text-gray-300">Pro</th>
              </tr>
            </thead>
            <tbody>
              {SUBSCRIPTION_FEATURES.map((feature, index) => (
                <tr key={index} className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white">{feature.name}</td>
                  <td className="py-3 px-4 text-center">
                    {typeof feature.basic === 'boolean' ? (
                      feature.basic ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )
                    ) : (
                      <span className="text-gray-300">{feature.basic}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {typeof feature.premium === 'boolean' ? (
                      feature.premium ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )
                    ) : (
                      <span className="text-gray-300">{feature.premium}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )
                    ) : (
                      <span className="text-gray-300">{feature.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}