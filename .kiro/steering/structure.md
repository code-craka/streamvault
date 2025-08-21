# StreamVault Project Structure

## Root Directory Structure

```
streamvault/
├── app/                          # Next.js 15 App Router (no src folder)
│   ├── (auth)/                   # Route groups for auth pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/
│   │   ├── stream/
│   │   └── library/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── streams/
│   │   ├── videos/
│   │   ├── subscriptions/
│   │   └── webhooks/
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── loading.tsx               # Global loading UI
├── components/                   # Reusable React components
│   ├── ui/                       # shadcn/ui components
│   ├── auth/                     # Authentication components
│   ├── player/                   # Video player components
│   ├── chat/                     # Chat system components
│   ├── dashboard/                # Dashboard components
│   └── layout/                   # Layout components
├── lib/                          # Utility functions and services
│   ├── auth/                     # Authentication utilities
│   ├── streaming/                # Streaming services
│   ├── storage/                  # GCS and file management
│   ├── ai/                       # AI services
│   ├── stripe/                   # Payment processing
│   ├── firebase/                 # Firebase configuration
│   ├── utils/                    # General utilities
│   └── validations/              # Zod schemas
├── types/                        # TypeScript type definitions
├── hooks/                        # Custom React hooks
├── public/                       # Static assets
├── tests/                        # Test files
│   ├── __mocks__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .kiro/                        # Kiro configuration
│   ├── specs/
│   └── steering/
└── config files                  # Various config files
```

## App Router Organization

### Route Groups

- `(auth)` - Authentication pages (sign-in, sign-up)
- `(dashboard)` - Protected user dashboard areas
- `(admin)` - Admin-only routes
- `(api)` - API route organization

### Key App Routes

```
app/
├── page.tsx                      # Homepage with content discovery
├── (auth)/
│   ├── sign-in/page.tsx         # Clerk sign-in page
│   └── sign-up/page.tsx         # Clerk sign-up page
├── (dashboard)/
│   ├── dashboard/page.tsx       # User dashboard
│   ├── stream/
│   │   ├── page.tsx             # Stream management
│   │   ├── [streamId]/page.tsx  # Individual stream view
│   │   └── create/page.tsx      # Create new stream
│   ├── library/
│   │   ├── page.tsx             # VOD library
│   │   └── [videoId]/page.tsx   # Individual video view
│   └── settings/
│       ├── page.tsx             # User settings
│       ├── billing/page.tsx     # Subscription management
│       └── profile/page.tsx     # Profile settings
└── api/
    ├── auth/                    # Authentication endpoints
    ├── streams/                 # Stream management API
    ├── videos/                  # VOD management API
    ├── chat/                    # Chat API endpoints
    ├── subscriptions/           # Stripe integration
    └── webhooks/                # Webhook handlers
```

## Component Organization

### UI Components (shadcn/ui)

```
components/ui/
├── button.tsx
├── input.tsx
├── card.tsx
├── dialog.tsx
├── dropdown-menu.tsx
└── ...                          # Other shadcn/ui components
```

### Feature Components

```
components/
├── auth/
│   ├── sign-in-form.tsx
│   ├── sign-up-form.tsx
│   └── user-profile.tsx
├── player/
│   ├── hls-player.tsx           # Main HLS video player
│   ├── secure-vod-player.tsx    # VOD player with signed URLs
│   ├── player-controls.tsx      # Custom player controls
│   └── quality-selector.tsx     # Video quality selection
├── chat/
│   ├── live-chat.tsx            # Real-time chat component
│   ├── chat-message.tsx         # Individual message
│   ├── chat-input.tsx           # Message input
│   └── moderation-tools.tsx     # Chat moderation
├── dashboard/
│   ├── creator-dashboard.tsx    # Creator analytics dashboard
│   ├── stream-manager.tsx       # Stream management
│   ├── analytics-charts.tsx     # Analytics visualization
│   └── earnings-overview.tsx    # Revenue tracking
├── subscription/
│   ├── pricing-tiers.tsx        # Subscription plans
│   ├── checkout-form.tsx        # Stripe checkout
│   └── billing-portal.tsx       # Customer portal
└── layout/
    ├── header.tsx               # Site header
    ├── sidebar.tsx              # Navigation sidebar
    └── footer.tsx               # Site footer
```

## Service Layer Organization

### Core Services

```
lib/
├── auth/
│   ├── clerk-config.ts          # Clerk configuration
│   ├── middleware.ts            # Auth middleware
│   └── permissions.ts           # Role-based access
├── streaming/
│   ├── stream-manager.ts        # Stream lifecycle management
│   ├── hls-service.ts           # HLS streaming service
│   └── transcoding.ts           # Video transcoding
├── storage/
│   ├── gcs-client.ts            # Google Cloud Storage
│   ├── signed-url-service.ts    # Secure URL generation
│   └── file-upload.ts           # File upload handling
├── ai/
│   ├── content-moderation.ts    # AI content filtering
│   ├── thumbnail-generation.ts  # AI thumbnail creation
│   └── recommendations.ts       # Content recommendations
├── stripe/
│   ├── subscription-service.ts  # Subscription management
│   ├── webhook-handler.ts       # Stripe webhooks
│   └── billing-portal.ts        # Customer billing
├── firebase/
│   ├── config.ts                # Firebase configuration
│   ├── firestore.ts             # Firestore utilities
│   └── real-time.ts             # Real-time listeners
└── utils/
    ├── api-response.ts          # Standardized API responses
    ├── error-handling.ts        # Error management
    └── validation.ts            # Input validation helpers
```

## Type Definitions

### Core Types

```
types/
├── auth.ts                      # User and authentication types
├── streaming.ts                 # Stream and video types
├── subscription.ts              # Billing and subscription types
├── chat.ts                      # Chat and messaging types
├── api.ts                       # API request/response types
└── database.ts                  # Database schema types
```

## Testing Structure

### Test Organization

```
tests/
├── __mocks__/                   # Mock implementations
│   ├── firebase.ts
│   ├── stripe.ts
│   └── clerk.ts
├── unit/                        # Unit tests
│   ├── components/
│   ├── services/
│   └── utils/
├── integration/                 # Integration tests
│   ├── api/
│   ├── auth/
│   └── streaming/
└── e2e/                         # End-to-end tests
    ├── auth.spec.ts
    ├── streaming.spec.ts
    └── subscription.spec.ts
```

## Configuration Files

### Root Level Configs

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `next.config.js` - Next.js configuration
- `.env.local` - Environment variables
- `.env.example` - Environment template
- `middleware.ts` - Next.js middleware (auth)
- `jest.config.js` - Jest testing configuration
- `playwright.config.ts` - E2E testing configuration

## Development Conventions

### File Naming

- Components: PascalCase (`UserProfile.tsx`)
- Utilities: camelCase (`apiClient.ts`)
- Pages: lowercase (`page.tsx`, `layout.tsx`)
- Types: PascalCase with descriptive names

### Import Organization

1. React and Next.js imports
2. Third-party library imports
3. Internal component imports
4. Internal utility imports
5. Type imports (with `type` keyword)

### Folder Conventions

- Group related functionality together
- Keep components close to where they're used
- Separate concerns (UI, business logic, data)
- Use index files for clean imports
- Follow Next.js App Router conventions
