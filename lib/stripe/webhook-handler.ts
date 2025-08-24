import Stripe from 'stripe'
import { subscriptionService } from './subscription-service'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export class StripeWebhookHandler {
  /**
   * Verify webhook signature and construct event
   */
  constructEvent(body: string, signature: string): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      throw new Error('Invalid webhook signature')
    }
  }

  /**
   * Handle incoming webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    console.log(`Processing webhook event: ${event.type}`)

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription)
          break

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break

        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }

      console.log(`Successfully processed webhook event: ${event.type}`)
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error)
      throw error
    }
  }

  /**
   * Handle subscription creation
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Subscription created: ${subscription.id}`)
    await subscriptionService.updateUserSubscription(subscription)
    
    // Log subscription creation for analytics
    await this.logSubscriptionEvent('created', subscription)
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Subscription updated: ${subscription.id}`)
    await subscriptionService.updateUserSubscription(subscription)
    
    // Log subscription update for analytics
    await this.logSubscriptionEvent('updated', subscription)
  }

  /**
   * Handle subscription deletion/cancellation
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Subscription deleted: ${subscription.id}`)
    await subscriptionService.handleSubscriptionCancellation(subscription)
    
    // Log subscription cancellation for analytics
    await this.logSubscriptionEvent('deleted', subscription)
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Payment succeeded for invoice: ${invoice.id}`)
    
    if (invoice.subscription) {
      // Retrieve the subscription to get updated information
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      )
      
      // Update user subscription status
      await subscriptionService.updateUserSubscription(subscription)
      
      // Log successful payment for analytics
      await this.logPaymentEvent('succeeded', invoice)
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Payment failed for invoice: ${invoice.id}`)
    
    if (invoice.subscription) {
      // Retrieve the subscription to get updated information
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      )
      
      // Update user subscription status (will be 'past_due')
      await subscriptionService.updateUserSubscription(subscription)
      
      // Log failed payment for analytics
      await this.logPaymentEvent('failed', invoice)
      
      // TODO: Send notification to user about failed payment
      await this.notifyUserPaymentFailed(subscription)
    }
  }

  /**
   * Handle trial ending soon
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Trial will end for subscription: ${subscription.id}`)
    
    // TODO: Send notification to user about trial ending
    await this.notifyUserTrialEnding(subscription)
  }

  /**
   * Handle completed checkout session
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log(`Checkout completed: ${session.id}`)
    
    if (session.subscription) {
      // Retrieve the subscription to get full information
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      )
      
      // Update user subscription
      await subscriptionService.updateUserSubscription(subscription)
      
      // Log checkout completion for analytics
      await this.logCheckoutEvent('completed', session)
    }
  }

  /**
   * Log subscription events for analytics
   */
  private async logSubscriptionEvent(
    eventType: 'created' | 'updated' | 'deleted',
    subscription: Stripe.Subscription
  ): Promise<void> {
    try {
      // TODO: Implement analytics logging to Firebase or your analytics service
      const eventData = {
        type: `subscription_${eventType}`,
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        userId: subscription.metadata.userId,
        tier: subscription.metadata.tier,
        status: subscription.status,
        timestamp: new Date(),
        amount: subscription.items.data[0]?.price?.unit_amount || 0,
        currency: subscription.items.data[0]?.price?.currency || 'usd',
      }
      
      console.log('Subscription event logged:', eventData)
      // await analyticsService.logEvent(eventData)
    } catch (error) {
      console.error('Failed to log subscription event:', error)
    }
  }

  /**
   * Log payment events for analytics
   */
  private async logPaymentEvent(
    eventType: 'succeeded' | 'failed',
    invoice: Stripe.Invoice
  ): Promise<void> {
    try {
      // TODO: Implement analytics logging
      const eventData = {
        type: `payment_${eventType}`,
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        timestamp: new Date(),
      }
      
      console.log('Payment event logged:', eventData)
      // await analyticsService.logEvent(eventData)
    } catch (error) {
      console.error('Failed to log payment event:', error)
    }
  }

  /**
   * Log checkout events for analytics
   */
  private async logCheckoutEvent(
    eventType: 'completed',
    session: Stripe.Checkout.Session
  ): Promise<void> {
    try {
      // TODO: Implement analytics logging
      const eventData = {
        type: `checkout_${eventType}`,
        sessionId: session.id,
        subscriptionId: session.subscription,
        customerId: session.customer,
        amount: session.amount_total,
        currency: session.currency,
        timestamp: new Date(),
      }
      
      console.log('Checkout event logged:', eventData)
      // await analyticsService.logEvent(eventData)
    } catch (error) {
      console.error('Failed to log checkout event:', error)
    }
  }

  /**
   * Notify user about failed payment
   */
  private async notifyUserPaymentFailed(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.userId
      if (!userId) return

      // TODO: Implement notification system (email, in-app notification, etc.)
      console.log(`Should notify user ${userId} about failed payment for subscription ${subscription.id}`)
      
      // Example: Send email notification
      // await emailService.sendPaymentFailedNotification(userId, subscription)
      
      // Example: Create in-app notification
      // await notificationService.createNotification(userId, {
      //   type: 'payment_failed',
      //   title: 'Payment Failed',
      //   message: 'Your subscription payment failed. Please update your payment method.',
      //   actionUrl: '/dashboard/settings/billing'
      // })
    } catch (error) {
      console.error('Failed to notify user about payment failure:', error)
    }
  }

  /**
   * Notify user about trial ending
   */
  private async notifyUserTrialEnding(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.userId
      if (!userId) return

      // TODO: Implement notification system
      console.log(`Should notify user ${userId} about trial ending for subscription ${subscription.id}`)
      
      // Example: Send email notification
      // await emailService.sendTrialEndingNotification(userId, subscription)
    } catch (error) {
      console.error('Failed to notify user about trial ending:', error)
    }
  }
}

export const stripeWebhookHandler = new StripeWebhookHandler()