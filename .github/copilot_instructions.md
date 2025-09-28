# StreamVault - GitHub Copilot Instructions

## Project Overview

StreamVault is a Next.js-based streaming platform that provides live video streaming, video-on-demand (VOD), and content management capabilities. This project combines modern web technologies with AI-powered content enhancement and comprehensive analytics.

## Architecture & Technology Stack

### Core Technologies
- **Framework**: Next.js 15.5.0 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Package Manager**: pnpm (required, not npm or yarn)
- **Runtime**: Node.js 22+

### Authentication & User Management
- **Primary**: Clerk authentication with JWT validation
- **Patterns**: Use `auth()` from `@clerk/nextjs/server` for server components
- **Middleware**: Clerk middleware in `middleware.ts` handles auth routing
- **Best Practices**: Always validate user roles and permissions

### Database & Storage  
- **Primary Database**: Firebase Firestore
- **File Storage**: Google Cloud Storage (GCS)
- **Caching**: Upstash Redis for session and performance caching
- **Connection**: Use Firebase Admin SDK for server-side operations

### Payments & Subscriptions
- **Payment Processor**: Stripe
- **Webhook Validation**: Always verify Stripe webhook signatures
- **PCI Compliance**: Never store card data, use Stripe's secure vaults
- **Subscription Logic**: Implement proper trial periods and proration

### Video Streaming & Processing
- **Live Streaming**: HLS (HTTP Live Streaming) protocol
- **CDN**: Cloudflare Stream for video delivery
- **Player**: HLS.js for browser playback
- **Transcoding**: Automatic quality adaptation
- **Security**: Signed URLs for premium content

### AI & Machine Learning
- **Content Enhancement**: Automated thumbnails, tags, descriptions  
- **Content Moderation**: Real-time chat and video content screening
- **Analytics**: AI-powered insights and recommendations
- **Copyright Detection**: Automated content matching and action

## Development Guidelines

### Code Quality Standards
- **TypeScript**: Use strict mode, avoid `any` types
- **ESLint**: Follow the configured rules, fix warnings before commits
- **Prettier**: Auto-formatting is enforced via husky hooks
- **Testing**: Maintain 80%+ coverage for new code

### File Organization
```
/app                   # Next.js App Router pages and API routes
  /(dashboard)         # Protected dashboard routes  
  /api                 # API route handlers
/components           # React components (organized by feature)
/lib                  # Utility functions and services
  /ai                # AI/ML services
  /analytics         # Analytics and reporting  
  /auth              # Authentication utilities
  /database          # Database operations
  /streaming         # Video streaming logic
/types               # TypeScript type definitions
/hooks               # Custom React hooks
/tests               # Test files (unit, integration, e2e)
```

### API Development Best Practices
- **Validation**: Use Zod schemas for input validation
- **Error Handling**: Return consistent error responses
- **Authentication**: Verify user auth on protected endpoints  
- **Rate Limiting**: Implement for public-facing endpoints
- **Logging**: Use structured logging for monitoring

### Security Requirements
- **Input Validation**: Sanitize all user inputs with Zod
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Protection**: Sanitize HTML content with DOMPurify
- **CSRF Protection**: Built into Next.js App Router
- **Secure Headers**: Configured in `next.config.js`
- **Secrets Management**: Use environment variables, never hardcode

### Performance Best Practices
- **Core Web Vitals**: Monitor and optimize LCP, CLS, FID
- **Bundle Size**: Keep JavaScript bundles under budget
- **Image Optimization**: Use Next.js Image component
- **Lazy Loading**: Implement for non-critical components
- **Database Queries**: Use Firebase query optimization

### Streaming-Specific Guidelines
- **HLS Implementation**: Follow Apple's HLS specification
- **Quality Adaptation**: Implement adaptive bitrate streaming
- **Latency**: Minimize for live streaming scenarios
- **CDN**: Leverage Cloudflare for global content delivery
- **Monitoring**: Track stream health and performance metrics

## Common Patterns & Examples

### Authentication Check
```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... authenticated logic
}
```

### Database Operations
```typescript
import { db } from '@/lib/firebase-admin'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional()
})

export async function POST(request: Request) {
  const data = schema.parse(await request.json())
  const docRef = await db.collection('videos').add(data)
  return Response.json({ id: docRef.id })
}
```

### Stripe Webhook Validation  
```typescript
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    return new Response('Invalid signature', { status: 400 })
  }
  // ... handle webhook
}
```

### Error Handling
```typescript
try {
  // risky operation
} catch (error) {
  console.error('Operation failed:', error)
  return Response.json(
    { error: 'Operation failed', message: error instanceof Error ? error.message : String(error) },
    { status: 500 }
  )
}
```

## Environment Configuration

### Required Environment Variables
```bash
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database  
FIREBASE_SERVICE_ACCOUNT={"type": "service_account"...}
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey": "..."}

# Storage
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=streamvault-videos

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Streaming
CLOUDFLARE_API_TOKEN=your-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

### Development Setup
1. Use `pnpm install` (not npm or yarn)
2. Copy `.env.example` to `.env.local`  
3. Configure Firebase, Clerk, and Stripe credentials
4. Run `pnpm dev` for development server
5. Run `pnpm test` to verify setup

## Testing Strategy

### Unit Tests (Jest)
- Test utility functions and business logic
- Mock external dependencies (Stripe, Firebase)
- Focus on edge cases and error handling

### Integration Tests  
- Test API endpoints with realistic data
- Verify database operations and queries
- Test authentication and authorization flows

### E2E Tests (Playwright)
- Test complete user journeys
- Verify streaming functionality works
- Test payment and subscription flows

### Performance Tests
- Monitor Core Web Vitals
- Test streaming latency and quality
- Verify database query performance

## Deployment & Infrastructure

### Staging Environment
- Vercel deployment with preview branches
- Test Firebase project for safe experimentation  
- Stripe test mode for payment testing
- Real but limited external service usage

### Production Environment  
- Vercel production deployment
- Production Firebase project with security rules
- Stripe live mode with webhook validation
- Full CDN and monitoring setup
- Performance monitoring and alerting

## Monitoring & Analytics

### Application Monitoring
- Error tracking and performance monitoring
- User analytics and streaming metrics
- Business intelligence and revenue tracking  
- Content performance and engagement analytics

### Security Monitoring
- Failed authentication attempts
- Suspicious payment activity
- Content moderation alerts
- API rate limiting and abuse detection

## AI Integration Guidelines

### Content Enhancement
- Automated thumbnail generation from video frames
- AI-generated titles and descriptions  
- Smart tagging and categorization
- Quality analysis and recommendations

### Content Moderation
- Real-time chat message filtering
- Video content scanning for inappropriate material
- Copyright detection and automated actions
- Community guideline enforcement

### Analytics & Insights
- Viewer behavior analysis and recommendations
- Performance optimization suggestions
- Revenue optimization insights
- Content strategy recommendations

## Common Issues & Solutions

### Authentication Problems
- Verify Clerk environment variables are set correctly
- Check middleware configuration in `middleware.ts`
- Ensure proper `await auth()` usage in server components

### Database Connection Issues
- Verify Firebase service account JSON is properly formatted
- Check Firestore security rules allow operations
- Ensure proper error handling for connection failures

### Streaming Issues  
- Verify HLS.js is properly initialized
- Check Cloudflare Stream API credentials
- Monitor CDN cache and purging behavior
- Verify video transcoding completion

### Payment Integration Issues
- Always verify Stripe webhook signatures
- Handle idempotency for webhook events
- Test subscription lifecycle thoroughly  
- Monitor failed payment handling

## Contributing Guidelines

### Pull Request Requirements
- All tests must pass (unit, integration, e2e)
- Code must pass ESLint and TypeScript checks
- New features require corresponding tests
- Documentation updates for API changes
- Security review for payment/auth changes

### Code Review Checklist  
- Verify proper error handling and logging
- Check for security vulnerabilities
- Ensure performance best practices
- Validate TypeScript usage and type safety
- Review test coverage for new code

### Release Process
- Staging deployment and testing
- Performance verification and monitoring
- Database migration validation  
- Third-party service configuration
- Rollback procedures and monitoring

---

This document should be kept up-to-date as the project evolves. When adding new features or changing architecture, update these instructions to help Copilot provide better assistance.