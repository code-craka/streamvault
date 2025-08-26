'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import {
  formatSubscriptionTier,
  getUserSubscriptionTier,
} from '@/lib/auth/permissions'
import { SUBSCRIPTION_TIERS } from '@/types/subscription'
import type { BillingInfo, UsageMetrics } from '@/types/subscription'

interface BillingPortalProps {
  className?: string
}

export function BillingPortal({ className }: BillingPortalProps) {
  const { user } = useUser()
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (user) {
      fetchBillingData()
      fetchUsageMetrics()
    }
  }, [user])

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/subscriptions/billing-info')
      if (response.ok) {
        const data = await response.json()
        setBillingInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch billing info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsageMetrics = async () => {
    try {
      const response = await fetch('/api/subscriptions/usage')
      if (response.ok) {
        const data = await response.json()
        setUsageMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage metrics:', error)
    }
  }

  const handleManageBilling = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      if (response.ok) {
        const { portalUrl } = await response.json()
        window.location.href = portalUrl
      } else {
        throw new Error('Failed to create billing portal session')
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.'
      )
    ) {
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      })

      if (response.ok) {
        await fetchBillingData()
        alert(
          'Your subscription has been scheduled for cancellation at the end of your billing period.'
        )
      } else {
        throw new Error('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
      })

      if (response.ok) {
        await fetchBillingData()
        alert('Your subscription has been reactivated!')
      } else {
        throw new Error('Failed to reactivate subscription')
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      alert('Failed to reactivate subscription. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Please sign in to view your billing information.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentTier = getUserSubscriptionTier(user)
  const tierConfig = currentTier ? SUBSCRIPTION_TIERS[currentTier] : null

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading billing information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {formatSubscriptionTier(currentTier)}
              </h3>
              <p className="text-muted-foreground text-sm">
                {tierConfig?.description || 'Basic access to StreamVault'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${tierConfig?.price || 0}
                <span className="text-muted-foreground text-sm font-normal">
                  /month
                </span>
              </div>
              <Badge
                variant={
                  user.subscriptionStatus === 'active'
                    ? 'default'
                    : user.subscriptionStatus === 'canceled'
                      ? 'destructive'
                      : user.subscriptionStatus === 'past_due'
                        ? 'secondary'
                        : 'outline'
                }
              >
                {user.subscriptionStatus === 'active' ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </>
                ) : user.subscriptionStatus === 'canceled' ? (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Canceled
                  </>
                ) : user.subscriptionStatus === 'past_due' ? (
                  <>
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Past Due
                  </>
                ) : (
                  'Inactive'
                )}
              </Badge>
            </div>
          </div>

          {billingInfo && (
            <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-muted-foreground text-sm">
                  Next Billing
                </div>
                <div className="font-semibold">
                  {new Date(billingInfo.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-sm">
                  Payment Method
                </div>
                <div className="font-semibold">
                  {billingInfo.paymentMethod
                    ? `•••• ${billingInfo.paymentMethod.last4}`
                    : 'Not set'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-sm">
                  Customer Since
                </div>
                <div className="font-semibold">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleManageBilling}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {isUpdating ? 'Opening...' : 'Manage Billing'}
            </Button>

            {user.subscriptionStatus === 'active' &&
              !billingInfo?.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={isUpdating}
                >
                  Cancel Subscription
                </Button>
              )}

            {billingInfo?.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={handleReactivateSubscription}
                disabled={isUpdating}
              >
                Reactivate Subscription
              </Button>
            )}
          </div>

          {billingInfo?.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Subscription Ending
                </span>
              </div>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Your subscription will end on{' '}
                {new Date(billingInfo.currentPeriodEnd).toLocaleDateString()}.
                You'll lose access to premium features after this date.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      {usageMetrics && tierConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              Track your usage against subscription limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storage Usage */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Storage Used</span>
                <span className="text-muted-foreground text-sm">
                  {usageMetrics.metrics.storageUsed.toFixed(1)} GB
                  {tierConfig.limits.storageQuota !== -1 &&
                    ` / ${tierConfig.limits.storageQuota} GB`}
                </span>
              </div>
              <Progress
                value={
                  tierConfig.limits.storageQuota === -1
                    ? 0
                    : (usageMetrics.metrics.storageUsed /
                        tierConfig.limits.storageQuota) *
                      100
                }
                className="h-2"
              />
            </div>

            {/* Bandwidth Usage */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Bandwidth Used</span>
                <span className="text-muted-foreground text-sm">
                  {usageMetrics.metrics.bandwidthUsed.toFixed(1)} GB
                  {tierConfig.limits.bandwidthQuota !== -1 &&
                    ` / ${tierConfig.limits.bandwidthQuota} GB`}
                </span>
              </div>
              <Progress
                value={
                  tierConfig.limits.bandwidthQuota === -1
                    ? 0
                    : (usageMetrics.metrics.bandwidthUsed /
                        tierConfig.limits.bandwidthQuota) *
                      100
                }
                className="h-2"
              />
            </div>

            {/* Streaming Minutes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Streaming Minutes</span>
                <span className="text-muted-foreground text-sm">
                  {usageMetrics.metrics.streamingMinutes.toLocaleString()}{' '}
                  minutes
                </span>
              </div>
            </div>

            {/* API Calls (if applicable) */}
            {tierConfig.limits.apiAccess && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">API Calls</span>
                  <span className="text-muted-foreground text-sm">
                    {usageMetrics.metrics.apiCalls.toLocaleString()}
                    {tierConfig.limits.apiRateLimit > 0 &&
                      ` / ${tierConfig.limits.apiRateLimit * 30 * 24 * 60} per month`}
                  </span>
                </div>
                <Progress
                  value={
                    tierConfig.limits.apiRateLimit === 0
                      ? 0
                      : (usageMetrics.metrics.apiCalls /
                          (tierConfig.limits.apiRateLimit * 30 * 24 * 60)) *
                        100
                  }
                  className="h-2"
                />
              </div>
            )}

            {/* Overage Charges */}
            {usageMetrics.overages.storage > 0 ||
              usageMetrics.overages.bandwidth > 0 ||
              (usageMetrics.overages.apiCalls > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <h4 className="mb-2 font-medium text-red-800 dark:text-red-200">
                    Overage Charges
                  </h4>
                  <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                    {usageMetrics.overages.storage > 0 && (
                      <div>
                        Storage overage: $
                        {usageMetrics.overages.storage.toFixed(2)}
                      </div>
                    )}
                    {usageMetrics.overages.bandwidth > 0 && (
                      <div>
                        Bandwidth overage: $
                        {usageMetrics.overages.bandwidth.toFixed(2)}
                      </div>
                    )}
                    {usageMetrics.overages.apiCalls > 0 && (
                      <div>
                        API overage: $
                        {usageMetrics.overages.apiCalls.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {billingInfo?.invoices && billingInfo.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>
              View and download your recent invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {billingInfo.invoices.slice(0, 5).map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">Invoice #{invoice.number}</div>
                    <div className="text-muted-foreground text-sm">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">
                        ${(invoice.amount / 100).toFixed(2)}
                      </div>
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'default'
                            : invoice.status === 'open'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    {invoice.hostedInvoiceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(invoice.hostedInvoiceUrl, '_blank')
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
