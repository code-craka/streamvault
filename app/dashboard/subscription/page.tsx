import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BillingPortal } from '@/components/subscription/billing-portal'
import { SubscriptionManager } from '@/components/auth/subscription-manager'
import { SubscriptionAnalytics } from '@/components/subscription/subscription-analytics'
import { PricingTiers } from '@/components/subscription/pricing-tiers'
import { 
  CreditCard, 
  TrendingUp, 
  Settings, 
  Crown,
  Shield,
  Zap
} from 'lucide-react'

export default async function SubscriptionPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription, billing, and access premium features
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secure Billing
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Instant Access
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  Your current plan and subscription status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }>
                  <SubscriptionManager />
                </Suspense>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common subscription tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Update Payment</div>
                      <div className="text-sm text-muted-foreground">Change payment method</div>
                    </div>
                  </button>
                  
                  <button className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Upgrade Plan</div>
                      <div className="text-sm text-muted-foreground">Get more features</div>
                    </div>
                  </button>
                  
                  <button className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">View Usage</div>
                      <div className="text-sm text-muted-foreground">Check your limits</div>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
              <CardDescription>
                See what's included in each subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Feature</th>
                      <th className="text-center p-3">Basic</th>
                      <th className="text-center p-3">Premium</th>
                      <th className="text-center p-3">Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Live Streaming</td>
                      <td className="text-center p-3">
                        <Badge variant="outline">720p</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="default">1080p</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="destructive">4K</Badge>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">VOD Storage</td>
                      <td className="text-center p-3">30 days</td>
                      <td className="text-center p-3">Unlimited</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Custom Emotes</td>
                      <td className="text-center p-3">0</td>
                      <td className="text-center p-3">5</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Offline Downloads</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">10 videos</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">API Access</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">White-label</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">❌</td>
                      <td className="text-center p-3">✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Suspense fallback={
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading billing information...</span>
                </div>
              </CardContent>
            </Card>
          }>
            <BillingPortal />
          </Suspense>
        </TabsContent>

        <TabsContent value="plans">
          <Suspense fallback={
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading subscription plans...</span>
                </div>
              </CardContent>
            </Card>
          }>
            <PricingTiers />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading analytics...</span>
                </div>
              </CardContent>
            </Card>
          }>
            <SubscriptionAnalytics />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}