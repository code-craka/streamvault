'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Check, 
  Crown, 
  Zap, 
  Star,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/types/subscription'
import { getUserSubscriptionTier } from '@/lib/auth/permissions'
import type { SubscriptionTier } from '@/types/auth'

interface PricingTiersProps {
  className?: string
  showCurrentPlan?: boolean
}

export function PricingTiers({ className, showCurrentPlan = true }: PricingTiersProps) {
  const { user } = useUser()
  const [isAnnual, setIsAnnual] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const currentTier = user ? getUserSubscriptionTier(user) : null

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      // Redirect to sign up
      window.location.href = '/sign-up'
      return
    }

    setIsLoading(tier)
    
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          interval: isAnnual ? 'year' : 'month',
          successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/subscription?canceled=true`,
        }),
      })

      if (response.ok) {
        const { checkoutUrl } = await response.json()
        window.location.href = checkoutUrl
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription process. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const getPrice = (tier: SubscriptionTier) => {
    const basePrice = SUBSCRIPTION_TIERS[tier].price
    return isAnnual ? basePrice * 10 : basePrice // 2 months free on annual
  }

  const getSavings = (tier: SubscriptionTier) => {
    if (!isAnnual) return 0
    const monthlyPrice = SUBSCRIPTION_TIERS[tier].price
    const annualPrice = getPrice(tier)
    return (monthlyPrice * 12) - annualPrice
  }

  const tiers = [
    {
      key: 'basic' as SubscriptionTier,
      name: 'Basic',
      description: 'Perfect for getting started with streaming',
      icon: <Zap className="h-6 w-6" />,
      popular: false,
      features: [
        'Access to live streams',
        'Limited VOD history (30 days)',
        'Standard quality streaming (720p)',
        'Basic chat participation',
        'Mobile app access',
        'Email support',
      ],
    },
    {
      key: 'premium' as SubscriptionTier,
      name: 'Premium',
      description: 'Advanced features for serious streamers',
      icon: <Star className="h-6 w-6" />,
      popular: true,
      features: [
        'All Basic features',
        'Full VOD library access',
        'HD streaming quality (1080p)',
        'Chat privileges and 5 custom emotes',
        'Offline downloads (10 videos)',
        'Priority support',
        'AI-generated highlights',
        'Advanced analytics',
      ],
    },
    {
      key: 'pro' as SubscriptionTier,
      name: 'Pro',
      description: 'Professional streaming with all features',
      icon: <Crown className="h-6 w-6" />,
      popular: false,
      features: [
        'All Premium features',
        'Ultra HD streaming (4K)',
        'Unlimited offline downloads',
        'Early access to exclusive content',
        'Advanced analytics dashboard',
        'API access for integrations',
        'White-label customization',
        'Unlimited custom emotes',
        'Priority chat highlighting',
        'Custom domain support',
        'Dedicated account manager',
      ],
    },
  ]

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Unlock powerful features and grow your streaming presence with our flexible subscription plans
        </p>
        
        {/* Annual/Monthly Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm ${!isAnnual ? 'font-medium' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-green-600"
          />
          <span className={`text-sm ${isAnnual ? 'font-medium' : 'text-muted-foreground'}`}>
            Annual
          </span>
          {isAnnual && (
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Save up to 17%
            </Badge>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {tiers.map((tier) => {
          const price = getPrice(tier.key)
          const savings = getSavings(tier.key)
          const isCurrentPlan = currentTier === tier.key
          const isLoadingTier = isLoading === tier.key

          return (
            <Card 
              key={tier.key}
              className={`relative transition-all duration-200 ${
                tier.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'hover:shadow-md hover:scale-102'
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    tier.key === 'basic' ? 'bg-blue-100 text-blue-600' :
                    tier.key === 'premium' ? 'bg-purple-100 text-purple-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {tier.icon}
                  </div>
                </div>
                
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-base">
                  {tier.description}
                </CardDescription>
                
                <div className="pt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ${price}
                    </span>
                    <span className="text-muted-foreground">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  
                  {isAnnual && savings > 0 && (
                    <div className="text-sm text-green-600 font-medium mt-1">
                      Save ${savings}/year
                    </div>
                  )}
                  
                  {!isAnnual && (
                    <div className="text-sm text-muted-foreground mt-1">
                      ${(price * 10)}/year (save ${price * 2})
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features List */}
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(tier.key)}
                      disabled={isLoadingTier}
                      className={`w-full ${
                        tier.popular 
                          ? 'bg-primary hover:bg-primary/90' 
                          : ''
                      }`}
                      variant={tier.popular ? 'default' : 'outline'}
                    >
                      {isLoadingTier ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {currentTier ? 'Switch to' : 'Get Started'}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Additional Info */}
                {tier.key === 'pro' && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      Need custom features? 
                      <button className="text-primary hover:underline ml-1">
                        Contact sales
                      </button>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* FAQ or Additional Info */}
      <div className="text-center space-y-4 pt-8">
        <h3 className="text-xl font-semibold">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          <div>
            <h4 className="font-medium mb-2">Can I change plans anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards, PayPal, and bank transfers for annual plans.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Is there a free trial?</h4>
            <p className="text-sm text-muted-foreground">
              New users get a 14-day free trial of Premium features. No credit card required to start.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}