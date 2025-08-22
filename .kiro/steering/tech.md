# StreamVault Technology Stack

## Core Framework

- **Next.js 15.0.1** with App Router (no src folder structure)
- **React 19** with Server Components and Streaming
- **TypeScript** with 100% type coverage requirement
- **pnpm** for package management

## Frontend Stack

- **Tailwind CSS v4** for styling with white-label theming support
- **shadcn/ui** for component library
- **Framer Motion** for animations
- **Zustand** for client-side state management
- **React Query (TanStack Query)** for server state
- **HLS.js** for video streaming with adaptive bitrate

## Backend Services

- **Firebase Firestore** for real-time database
- **Firebase Cloud Functions** for serverless logic
- **Google Cloud Storage** (`gs://streamvault-videos`) with signed URLs
- **Cloudflare CDN** for global content delivery

## Authentication & Security

- **Clerk** for authentication with OAuth (Google, GitHub, Discord)
- **JWT** validation and session management
- **Zod** for input validation and type safety
- **Role-based access control** (viewer/streamer/admin)

## Streaming Infrastructure

- **RTMP** ingest endpoints for live streams
- **HLS** transcoding with multiple bitrates (480p-4K)
- **WebRTC** for low-latency streaming
- **Custom video player** with auto-quality adjustment

## Payment & Subscriptions

- **Stripe Checkout** for subscription management
- **Stripe Webhooks** for real-time updates
- **Tiered subscriptions**: Basic ($9.99), Premium ($19.99), Pro ($29.99)

## AI & Enhancement

- **AI content moderation** and copyright detection
- **Automatic thumbnail generation** from key frames
- **Multi-language transcription** and subtitle generation
- **Personalized recommendation engine**

## Development Tools

- **ESLint & Prettier** for code quality
- **Husky** for git hooks
- **Jest** for unit testing (>80% coverage required)
- **Playwright** for E2E testing
- **GitHub Actions** for CI/CD

## Environment Configuration

```bash
# Core
NEXT_PUBLIC_APP_URL=https://streamvault.app
GCP_PROJECT_ID=shining-courage-465501-i8
GCS_BUCKET_NAME=streamvault-videos

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Firebase
FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey": "...", ...}

# Stripe
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

### Database & Storage

```bash
# Firebase emulator
pnpm firebase:emulator

# Deploy Firebase functions
pnpm firebase:deploy

# GCS operations (via gcloud CLI)
gsutil ls gs://streamvault-videos
```

## Performance Requirements

- **Page Load**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **API Response**: < 100ms for authenticated requests
- **Video Start**: < 3 seconds for HLS initialization
- **Chat Delivery**: < 500ms end-to-end
- **Uptime**: 99.9% availability SLA

## Security Standards

- Input validation with Zod schemas
- Rate limiting and DDoS protection
- 15-minute signed URL expiration
- GDPR/CCPA compliance
- Automated security scanning
