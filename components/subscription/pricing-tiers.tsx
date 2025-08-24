'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/subscription-tiers'

interface PricingTiersProps {
  currentTier?: SubscriptionTier | null
  onSubscribe?: (tier: SubscriptionTier) => void
}

export function PricingTiers({ currentTier, onSubscribe }: PricingTiersProps) {
  const { user } = useUser()
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null)

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) return

    setLoadingTier(tier)
    
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { checkoutUrl } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl
      
      onSubscribe?.(tier)
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription process. Please try again.')
    } finally {
      setLoadingTier(null)
    }
  }

  const isCurrentTier = (tier: SubscriptionTier) => currentTier === tier
  const isUpgrade = (tier: SubscriptionTier) => {
    if (!currentTier) return true
    const tierOrder = { basic: 0, premium: 1, pro: 2 }
    return tierOrder[tier] > tierOrder[currentTier]
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {Object.entries(SUBSCRIPTION_TIERS).map(([tierKey, config]) => {
        const tier = tierKey as SubscriptionTier
        const isCurrent = isCurrentTier(tier)
        const isLoading = loadingTier === tier
        
        return (
          <Card 
            key={tier} 
            className={`relative ${
              tier === 'premium' ? 'border-blue-500 shadow-lg scale-105' : ''
            } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
          >
            {tier === 'premium' && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
                Most Popular
              </Badge>
            )}
            
            {isCurrent && (
              <Badge className="absolute -top-2 right-4 bg-green-500">
                Current Plan
              </Badge>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{config.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">${config.price}</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {config.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Limits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    VOD Retention: {config.limits.vodRetentionDays === -1 ? 'Unlimited' : `${config.limits.vodRetentionDays} days`}
                  </li>
                  <li>Max Quality: {config.limits.maxQuality}</li>
                  <li>Chat Rate: {config.limits.chatRateLimit}/sec</li>
                  <li>Concurrent Streams: {config.limits.concurrentStreams}</li>
                  <li>
                    Offline Downloads: {config.limits.offlineDownloads === -1 ? 'Unlimited' : config.limits.offlineDownloads}
                  </li>
                  <li>
                    Custom Emotes: {config.limits.customEmotes === -1 ? 'Unlimited' : config.limits.customEmotes}
                  </li>
                  <li>API Access: {config.limits.apiAccess ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSubscribe(tier)}
                disabled={isCurrent || isLoading || !user}
                variant={isCurrent ? 'outline' : tier === 'premium' ? 'default' : 'outline'}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCurrent 
                  ? 'Current Plan' 
                  : isUpgrade(tier) 
                    ? `Upgrade to ${config.name}` 
                    : `Switch to ${config.name}`
                }
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}