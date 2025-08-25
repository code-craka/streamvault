import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const subscriptionDetails = await subscriptionService.getSubscriptionDetails(userId)
    
    if (!subscriptionDetails.subscription) {
      return NextResponse.json({
        customerId: null,
        subscriptionId: null,
        tier: null,
        status: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        paymentMethod: null,
        billingAddress: null,
        invoices: [],
        upcomingInvoice: null,
      })
    }

    const subscription = subscriptionDetails.subscription
    const customerId = subscription.customer as string

    // Get customer details
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    // Get recent invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    })

    // Get upcoming invoice
    let upcomingInvoice = null
    try {
      upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      })
    } catch (error) {
      // No upcoming invoice
    }

    // Format payment method
    const defaultPaymentMethod = paymentMethods.data.find(pm => 
      pm.id === customer.invoice_settings.default_payment_method
    ) || paymentMethods.data[0]

    const billingInfo = {
      customerId,
      subscriptionId: subscription.id,
      tier: subscriptionDetails.tier,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      paymentMethod: defaultPaymentMethod ? {
        id: defaultPaymentMethod.id,
        type: defaultPaymentMethod.type,
        last4: defaultPaymentMethod.card?.last4,
        brand: defaultPaymentMethod.card?.brand,
        expiryMonth: defaultPaymentMethod.card?.exp_month,
        expiryYear: defaultPaymentMethod.card?.exp_year,
        isDefault: true,
      } : null,
      billingAddress: customer.address ? {
        line1: customer.address.line1 || '',
        line2: customer.address.line2 || undefined,
        city: customer.address.city || '',
        state: customer.address.state || undefined,
        postalCode: customer.address.postal_code || '',
        country: customer.address.country || '',
      } : null,
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number || '',
        status: invoice.status || 'draft',
        amount: invoice.amount_paid || 0,
        currency: invoice.currency,
        dueDate: new Date((invoice.due_date || invoice.created) * 1000),
        paidAt: invoice.status_transitions.paid_at ? 
          new Date(invoice.status_transitions.paid_at * 1000) : undefined,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        lineItems: invoice.lines.data.map(line => ({
          id: line.id,
          description: line.description || '',
          amount: line.amount,
          quantity: line.quantity || 1,
          period: {
            start: new Date((line.period?.start || invoice.created) * 1000),
            end: new Date((line.period?.end || invoice.created) * 1000),
          },
        })),
      })),
      upcomingInvoice: upcomingInvoice ? {
        id: 'upcoming',
        number: upcomingInvoice.number || '',
        status: upcomingInvoice.status || 'draft',
        amount: upcomingInvoice.amount_due || 0,
        currency: upcomingInvoice.currency,
        dueDate: new Date((upcomingInvoice.due_date || upcomingInvoice.created) * 1000),
        hostedInvoiceUrl: upcomingInvoice.hosted_invoice_url,
        lineItems: upcomingInvoice.lines.data.map(line => ({
          id: line.id,
          description: line.description || '',
          amount: line.amount,
          quantity: line.quantity || 1,
          period: {
            start: new Date((line.period?.start || upcomingInvoice.created) * 1000),
            end: new Date((line.period?.end || upcomingInvoice.created) * 1000),
          },
        })),
      } : null,
    }

    return NextResponse.json(billingInfo)
  } catch (error) {
    console.error('Billing info error:', error)
    
    return NextResponse.json(
      { error: 'Failed to get billing information' },
      { status: 500 }
    )
  }
}