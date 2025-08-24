'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Calendar, AlertCircle } from 'lucide-react'
import { type SubscriptionTier } from '@/lib/stripe/subscription-tiers'

interface BillingPortalProps {
  subscription?: {
    tier: SubscriptionTier | null
    status: string | null
    currentPeriodEnd?: number
    cancelAtPeriodEnd?: boolean
  }
  onSubscriptionChange?: () => void
}

export function BillingPortal({ subscription, onSubscriptionChange }: BillingPortalProps) {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenPortal = async () => {
    if (!user) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to create billing portal session')
      }

      const { portalUrl } = await response.json()
      
      // Redirect to Stripe Customer Portal
      window.location.href = portalUrl
    } catch (error) {
      console.error('Billing portal error:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!user || !confirm('Are you sure you want to cancel your subscription?')) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      alert('Subscription canceled successfully. You will retain access until the end of your billing period.')
      onSubscriptionChange?.()
    } catch (error) {
      console.error('Cancellation error:', error)
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!user) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription')
      }

      alert('Subscription reactivated successfully!')
      onSubscriptionChange?.()
    } catch (error) {
      console.error('Reactivation error:', error)
      alert('Failed to reactivate subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      case 'incomplete':
        return <Badge variant="secondary">Incomplete</Badge>
      default:
        return <Badge variant="outline">No Subscription</Badge>
    }
  }

  if (!subscription?.tier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Billing Information</span>
          </CardTitle>
          <CardDescription>
            You don&apos;t have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Subscribe to a plan to access premium features and support StreamVault.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>
            View Pricing Plans
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Current Subscription</span>
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize">{subscription.tier} Plan</p>
              <p className="text-sm text-muted-foreground">
                Status: {getStatusBadge(subscription.status)}
              </p>
            </div>
          </div>

          {subscription.currentPeriodEnd && (
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                {subscription.cancelAtPeriodEnd 
                  ? `Access ends on ${formatDate(subscription.currentPeriodEnd)}`
                  : `Next billing date: ${formatDate(subscription.currentPeriodEnd)}`
                }
              </span>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Your subscription is set to cancel at the end of the billing period.
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleOpenPortal}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Billing
            </Button>

            {subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={handleReactivateSubscription}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reactivate
              </Button>
            ) : (
              <Button
                onClick={handleCancelSubscription}
                disabled={isLoading}
                variant="destructive"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}