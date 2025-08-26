# StreamVault Subscription Features

This document outlines the comprehensive subscription management system implemented in StreamVault, including feature gating, billing integration, and analytics.

## Overview

The subscription system provides:

- **Tiered Access Control**: Basic, Premium, and Pro subscription tiers
- **Feature Gating**: Automatic enforcement of subscription limits
- **Billing Integration**: Stripe-powered subscription management
- **Usage Tracking**: Real-time monitoring of user consumption
- **Analytics Dashboard**: Comprehensive subscription metrics
- **Self-Service Portal**: Customer billing management

## Subscription Tiers

### Basic ($9.99/month)

- Access to live streams
- Limited VOD history (30 days)
- Standard quality streaming (720p)
- Basic chat participation (1 message/second)
- Mobile app access
- 5GB storage quota
- 50GB monthly bandwidth
- Email support

### Premium ($19.99/month)

- All Basic features
- Full VOD library access
- HD streaming quality (1080p)
- Chat privileges (3 messages/second)
- 5 custom emotes
- Offline downloads (10 videos)
- Priority support
- AI-generated highlights
- Advanced analytics
- 50GB storage quota
- 200GB monthly bandwidth

### Pro ($29.99/month)

- All Premium features
- Ultra HD streaming (4K)
- Unlimited offline downloads
- Unlimited custom emotes
- Chat rate limit (5 messages/second)
- API access (1000 requests/minute)
- White-label customization
- Custom domain support
- Unlimited storage and bandwidth
- Dedicated account manager

## Architecture

### Core Components

#### 1. Subscription Validation (`lib/auth/subscription-validation.ts`)

- Feature access validation
- Usage limit enforcement
- Upgrade suggestions
- Subscription status validation

#### 2. Feature Gating Middleware (`lib/middleware/feature-gate.ts`)

- API route protection
- Automatic tier checking
- Usage limit enforcement
- Error handling with upgrade prompts

#### 3. Billing Portal (`components/subscription/billing-portal.tsx`)

- Current subscription display
- Usage metrics visualization
- Invoice management
- Payment method updates

#### 4. Analytics Dashboard (`components/subscription/subscription-analytics.tsx`)

- Revenue tracking
- Subscriber metrics
- Churn analysis
- Cohort retention

### API Routes

#### Subscription Management

- `GET /api/subscriptions/status` - Get current subscription status
- `POST /api/subscriptions/checkout` - Create Stripe checkout session
- `POST /api/subscriptions/portal` - Access billing portal
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/reactivate` - Reactivate subscription

#### Billing and Usage

- `GET /api/subscriptions/billing-info` - Get billing information
- `GET /api/subscriptions/usage` - Get current usage metrics
- `GET /api/subscriptions/analytics` - Get subscription analytics (admin only)

#### Feature-Gated Endpoints

- `POST /api/streams/create` - Create stream (with concurrent limit check)
- `POST /api/videos/upload` - Upload video (with storage limit check)
- `POST /api/chat/message` - Send chat message (with rate limit check)
- `POST /api/emotes/create` - Create custom emote (with emote limit check)

## Feature Gating Implementation

### Basic Usage

```typescript
import { withFeatureGate } from '@/lib/middleware/feature-gate'

// Require premium subscription for advanced analytics
const handler = withFeatureGate(
  'premium',
  'Advanced analytics'
)(async function (request: NextRequest) {
  // Handler implementation
})

export { handler as GET }
```

### Usage Limits

```typescript
import { withUsageGate } from '@/lib/middleware/feature-gate'

// Check concurrent streams limit
const handler = withUsageGate('concurrentStreams', async user =>
  getCurrentActiveStreams(user)
)(async function (request: NextRequest) {
  // Handler implementation
})
```

### Combined Gates

```typescript
import { withFeatureAndUsageGate } from '@/lib/middleware/feature-gate'

// Require premium tier AND check storage limits
const handler = withFeatureAndUsageGate(
  'premium',
  'storageQuota',
  async user => getCurrentStorageUsage(user),
  'Video upload'
)(async function (request: NextRequest) {
  // Handler implementation
})
```

## Client-Side Integration

### Subscription Manager Component

```tsx
import { SubscriptionManager } from '@/components/auth/subscription-manager'

function Dashboard() {
  return (
    <div>
      <SubscriptionManager />
    </div>
  )
}
```

### Feature Access Checking

```tsx
import { useUser } from '@/hooks/use-user'
import { canAccessAdvancedAnalytics } from '@/lib/auth/subscription-validation'

function AnalyticsPage() {
  const { user } = useUser()
  const access = canAccessAdvancedAnalytics(user)

  if (!access.hasAccess) {
    return (
      <div>
        <p>{access.reason}</p>
        <button>Upgrade to {access.upgradeRequired}</button>
      </div>
    )
  }

  return <AdvancedAnalytics />
}
```

## Usage Tracking

### Automatic Tracking

The system automatically tracks:

- Streaming minutes
- Storage usage (video files)
- Bandwidth consumption
- API calls
- Chat messages
- Download counts

### Manual Tracking

For custom features, implement usage tracking:

```typescript
import { db } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'

async function trackCustomUsage(
  userId: string,
  feature: string,
  amount: number
) {
  await addDoc(collection(db, 'usageTracking'), {
    userId,
    feature,
    amount,
    timestamp: new Date(),
  })
}
```

## Billing Integration

### Stripe Configuration

Required environment variables:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

### Webhook Handling

The system handles these Stripe events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

## Analytics and Reporting

### Subscription Metrics

- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer Lifetime Value (CLV)
- Churn rate
- Conversion rate
- Revenue by tier

### Usage Analytics

- Storage consumption trends
- Bandwidth usage patterns
- Feature adoption rates
- API usage statistics

### Cohort Analysis

- Retention rates by signup month
- Revenue cohorts
- Feature usage cohorts

## Testing

### Unit Tests

Run subscription validation tests:

```bash
npm test subscription-validation.test.ts
```

### Integration Tests

Test API endpoints with feature gating:

```bash
npm test -- --testPathPattern=integration/subscription
```

### E2E Tests

Test complete subscription flows:

```bash
npm run test:e2e -- subscription.spec.ts
```

## Security Considerations

### Access Control

- All subscription checks are server-side
- Feature gates prevent unauthorized access
- Usage limits are enforced in real-time

### Data Protection

- Billing data is encrypted
- PCI compliance through Stripe
- GDPR-compliant data handling

### Rate Limiting

- API endpoints have subscription-based rate limits
- Chat messages are rate-limited by tier
- Abuse prevention mechanisms

## Monitoring and Alerts

### Key Metrics to Monitor

- Subscription churn rate
- Failed payment attempts
- Usage limit violations
- API error rates

### Alerting Setup

Configure alerts for:

- High churn rates (>5% monthly)
- Payment failures
- Usage spikes
- Feature gate errors

## Troubleshooting

### Common Issues

#### Feature Access Denied

1. Check user's subscription status
2. Verify subscription tier requirements
3. Check usage limits
4. Validate subscription status (active/canceled)

#### Billing Portal Issues

1. Verify Stripe customer ID
2. Check subscription ID in user metadata
3. Validate webhook processing

#### Usage Tracking Problems

1. Check Firebase connection
2. Verify usage collection queries
3. Validate date ranges

### Debug Commands

```bash
# Check user subscription status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/subscriptions/status

# Get usage metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/subscriptions/usage

# Test feature access
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/streams/create
```

## Future Enhancements

### Planned Features

- Usage-based billing
- Custom subscription tiers
- Team/organization accounts
- Advanced analytics ML models
- Multi-currency support

### API Improvements

- GraphQL subscription endpoints
- Real-time usage updates
- Webhook retry mechanisms
- Advanced rate limiting

## Support

For subscription-related issues:

1. Check the troubleshooting guide
2. Review server logs for errors
3. Contact support with user ID and error details
4. Use Stripe dashboard for billing issues

## Contributing

When adding new subscription features:

1. Update subscription tier configurations
2. Add feature validation functions
3. Implement usage tracking
4. Add comprehensive tests
5. Update documentation
