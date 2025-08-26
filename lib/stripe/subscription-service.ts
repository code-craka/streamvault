import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'
import {
  SUBSCRIPTION_TIERS,
  getSubscriptionTier,
  type SubscriptionTier,
} from './subscription-tiers'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export class SubscriptionService {
  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    tier: SubscriptionTier,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const tierConfig = SUBSCRIPTION_TIERS[tier]

      if (!tierConfig) {
        throw new Error(`Invalid subscription tier: ${tier}`)
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: user.emailAddresses[0]?.emailAddress,
        line_items: [
          {
            price: tierConfig.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          tier,
        },
        subscription_data: {
          metadata: {
            userId,
            tier,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_creation: 'always',
      })

      if (!session.url) {
        throw new Error('Failed to create checkout session')
      }

      return session.url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw new Error('Failed to create checkout session')
    }
  }

  /**
   * Create a billing portal session for subscription management
   */
  async createBillingPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<string> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const subscriptionId = user.publicMetadata.subscriptionId as string

      if (!subscriptionId) {
        throw new Error('No active subscription found')
      }

      // Get the subscription to find the customer ID
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.customer as string,
        return_url: returnUrl,
      })

      return session.url
    } catch (error) {
      console.error('Error creating billing portal session:', error)
      throw new Error('Failed to create billing portal session')
    }
  }

  /**
   * Get subscription details for a user
   */
  async getSubscriptionDetails(userId: string): Promise<{
    subscription: Stripe.Subscription | null
    tier: SubscriptionTier | null
    status: string | null
  }> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const subscriptionId = user.publicMetadata.subscriptionId as string

      if (!subscriptionId) {
        return {
          subscription: null,
          tier: null,
          status: null,
        }
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const tier = getSubscriptionTier(subscription.items.data[0].price.id)

      return {
        subscription,
        tier,
        status: subscription.status,
      }
    } catch (error) {
      console.error('Error getting subscription details:', error)
      return {
        subscription: null,
        tier: null,
        status: null,
      }
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const subscriptionId = user.publicMetadata.subscriptionId as string

      if (!subscriptionId) {
        throw new Error('No active subscription found')
      }

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })

      // Update user metadata
      await (
        await clerkClient()
      ).users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: 'canceled',
        },
      })
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw new Error('Failed to cancel subscription')
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const subscriptionId = user.publicMetadata.subscriptionId as string

      if (!subscriptionId) {
        throw new Error('No subscription found')
      }

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      })

      // Update user metadata
      await (
        await clerkClient()
      ).users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: 'active',
        },
      })
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw new Error('Failed to reactivate subscription')
    }
  }

  /**
   * Update user metadata based on subscription
   */
  async updateUserSubscription(
    subscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const userId = subscription.metadata.userId
      if (!userId) {
        console.error('No userId found in subscription metadata')
        return
      }

      const tier = getSubscriptionTier(subscription.items.data[0].price.id)
      if (!tier) {
        console.error('Unknown price ID:', subscription.items.data[0].price.id)
        return
      }

      await (
        await clerkClient()
      ).users.updateUserMetadata(userId, {
        publicMetadata: {
          subscriptionTier: tier,
          subscriptionStatus: subscription.status,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      })

      console.log(
        `Updated user ${userId} subscription to ${tier} (${subscription.status})`
      )
    } catch (error) {
      console.error('Error updating user subscription:', error)
      throw error
    }
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCancellation(
    subscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const userId = subscription.metadata.userId
      if (!userId) {
        console.error('No userId found in subscription metadata')
        return
      }

      await (
        await clerkClient()
      ).users.updateUserMetadata(userId, {
        publicMetadata: {
          subscriptionTier: null,
          subscriptionStatus: 'canceled',
          subscriptionId: null,
          customerId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: null,
        },
      })

      console.log(`Canceled subscription for user ${userId}`)
    } catch (error) {
      console.error('Error handling subscription cancellation:', error)
      throw error
    }
  }

  /**
   * Get all subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<{
    totalRevenue: number
    activeSubscriptions: number
    subscriptionsByTier: Record<SubscriptionTier, number>
    monthlyRecurringRevenue: number
  }> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
      })

      let totalRevenue = 0
      const subscriptionsByTier: Record<SubscriptionTier, number> = {
        basic: 0,
        premium: 0,
        pro: 0,
      }

      for (const subscription of subscriptions.data) {
        const tier = getSubscriptionTier(subscription.items.data[0].price.id)
        if (tier) {
          subscriptionsByTier[tier]++
          const tierConfig = SUBSCRIPTION_TIERS[tier]
          totalRevenue += tierConfig.price
        }
      }

      return {
        totalRevenue,
        activeSubscriptions: subscriptions.data.length,
        subscriptionsByTier,
        monthlyRecurringRevenue: totalRevenue,
      }
    } catch (error) {
      console.error('Error getting subscription analytics:', error)
      throw new Error('Failed to get subscription analytics')
    }
  }
}

export const subscriptionService = new SubscriptionService()
