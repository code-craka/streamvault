'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PricingTiers } from './pricing-tiers'
import { BillingPortal } from './billing-portal'
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react'
import { type SubscriptionTier } from '@/lib/stripe/subscription-tiers'
import { 
  formatSubscriptionStatus,
  getSubscriptionStatusColor,
  subscriptionNeedsAttention,
  getSubscriptionAttentionMessage,
  getDaysUntilSubscriptionEnds,
  isSubscriptionExpiringSoon
} from '@/lib/stripe/subscription-helpers'

interface SubscriptionData {
  tier: SubscriptionTier | null
  status: string | null
  currentPeriodEnd?: number
  cancelAtPeriodEnd?: boolean
  hasActiveSubscription: boolean
}

export function SubscriptionDashboard() {
  const { user } = useUser()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus()
    }
  }, [user])

  const fetchSubscriptionStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/subscriptions/status')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }

      const data = await response.json()
      setSubscriptionData(data)
    } catch (error) {
      console.error('Error fetching subscription status:', error)
      setError('Failed to load subscription information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionChange = () => {
    // Refresh subscription data after changes
    fetchSubscriptionStatus()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading subscription information...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button 
            onClick={fetchSubscriptionStatus} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const needsAttention = subscriptionData && subscriptionNeedsAttention(
    subscriptionData.status,
    subscriptionData.cancelAtPeriodEnd ?? false
  )

  const attentionMessage = subscriptionData && getSubscriptionAttentionMessage(
    subscriptionData.status,
    subscriptionData.cancelAtPeriodEnd ?? false,
    subscriptionData.currentPeriodEnd ?? null
  )

  const daysUntilEnd = subscriptionData?.currentPeriodEnd 
    ? getDaysUntilSubscriptionEnds(subscriptionData.currentPeriodEnd)
    : null

  const isExpiringSoon = subscriptionData?.currentPeriodEnd 
    ? isSubscriptionExpiringSoon(subscriptionData.currentPeriodEnd)
    : false

  return (
    <div className="space-y-6">
      {/* Subscription Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Subscription Overview</span>
          </CardTitle>
          <CardDescription>
            Manage your StreamVault subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionData?.hasActiveSubscription ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <div className="flex items-center space-x-2">
                  <Badge 
                    className={`bg-${getSubscriptionStatusColor(subscriptionData.status)}-500`}
                  >
                    {subscriptionData.tier ? 
                      subscriptionData.tier.charAt(0).toUpperCase() + subscriptionData.tier.slice(1) : 
                      'Unknown'
                    }
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({formatSubscriptionStatus(subscriptionData.status)})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Next Billing</p>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {subscriptionData.currentPeriodEnd 
                      ? new Date(subscriptionData.currentPeriodEnd * 1000).toLocaleDateString()
                      : 'N/A'
                    }
                  </span>
                </div>
                {daysUntilEnd !== null && (
                  <p className="text-xs text-muted-foreground">
                    {daysUntilEnd > 0 ? `${daysUntilEnd} days remaining` : 'Expired'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center space-x-2">
                  {needsAttention ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    {needsAttention ? 'Needs Attention' : 'All Good'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-4">
                Subscribe to unlock premium features and support StreamVault
              </p>
            </div>
          )}

          {/* Attention Messages */}
          {needsAttention && attentionMessage && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Action Required</p>
                  <p className="text-sm text-yellow-700 mt-1">{attentionMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Expiring Soon Warning */}
          {isExpiringSoon && !(subscriptionData?.cancelAtPeriodEnd ?? false) && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Renewal Reminder</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your subscription will renew in {daysUntilEnd} days. 
                    Make sure your payment method is up to date.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Management Tabs */}
      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="billing">Billing & Settings</TabsTrigger>
          <TabsTrigger value="plans">Change Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4">
          <BillingPortal 
            subscription={subscriptionData ? {
              tier: subscriptionData.tier,
              status: subscriptionData.status,
              currentPeriodEnd: subscriptionData.currentPeriodEnd,
              cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd
            } : undefined}
            onSubscriptionChange={handleSubscriptionChange}
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <PricingTiers 
            currentTier={subscriptionData?.tier}
            onSubscribe={handleSubscriptionChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}