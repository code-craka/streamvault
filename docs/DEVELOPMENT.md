# StreamVault Development Guide

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (package manager)
- Git
- VS Code (recommended IDE)

### Initial Setup

1. **Clone the repository**

```bash
git clone https://github.com/code-craka/streamvault.git
cd streamvault
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
# Edit .env.local with your development credentials
```

4. **Start development server**

```bash
pnpm dev
```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Architecture

### Technology Stack

#### Frontend

- **Next.js 15.0.1**: React framework with App Router
- **React 19**: UI library with Server Components
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS v4**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **Framer Motion**: Animation library

#### Backend

- **Next.js API Routes**: Serverless functions
- **Clerk**: Authentication and user management
- **Firebase Firestore**: Real-time database
- **Google Cloud Storage**: File storage with signed URLs
- **Stripe**: Payment processing

#### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Jest**: Unit testing
- **Playwright**: E2E testing
- **TypeScript**: Static type checking

### Directory Structure

```
streamvault/
├── .kiro/                     # Kiro IDE configuration
│   ├── specs/                 # Feature specifications
│   └── steering/              # Development guidelines
├── app/                       # Next.js App Router
│   ├── (auth)/               # Authentication routes
│   ├── (dashboard)/          # Protected dashboard routes
│   ├── api/                  # API endpoints
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/               # React components
│   ├── ui/                   # Base UI components (shadcn/ui)
│   ├── auth/                 # Authentication components
│   ├── player/               # Video player components
│   ├── chat/                 # Chat components
│   ├── dashboard/            # Dashboard components
│   └── layout/               # Layout components
├── lib/                      # Utility libraries
│   ├── auth/                 # Authentication utilities
│   ├── streaming/            # Streaming services
│   ├── storage/              # File storage utilities
│   ├── stripe/               # Payment utilities
│   ├── firebase/             # Firebase configuration
│   ├── utils/                # General utilities
│   └── validations/          # Zod schemas
├── types/                    # TypeScript type definitions
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
├── tests/                    # Test files
└── docs/                     # Documentation
```

## Development Workflow

### 1. Feature Development

#### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/user-authentication
git checkout -b fix/video-playback-issue
git checkout -b docs/api-documentation
```

#### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature commits
git commit -m "feat: add user role management system"
git commit -m "feat(auth): implement subscription tier validation"

# Bug fixes
git commit -m "fix: resolve video playback stuttering issue"
git commit -m "fix(api): handle edge case in stream creation"

# Documentation
git commit -m "docs: add API endpoint documentation"
git commit -m "docs(deployment): update production setup guide"

# Other types
git commit -m "style: format code with prettier"
git commit -m "refactor: optimize database queries"
git commit -m "test: add unit tests for auth utilities"
git commit -m "chore: update dependencies"
```

### 2. Code Quality

#### Linting and Formatting

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm type-check
```

#### Pre-commit Hooks

Husky automatically runs these checks before commits:

- ESLint validation
- TypeScript type checking
- Prettier formatting
- Commit message validation

### 3. Testing

#### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test auth.test.ts
```

#### E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests in headed mode
pnpm test:e2e:headed

# Run specific E2E test
pnpm test:e2e tests/e2e/auth.spec.ts
```

#### Writing Tests

**Unit Test Example:**

```typescript
// tests/unit/lib/auth/permissions.test.ts
import { hasRole, hasSubscriptionTier } from '@/lib/auth/permissions'

describe('Permission Utilities', () => {
  describe('hasRole', () => {
    it('should return true for exact role match', () => {
      expect(hasRole('streamer', 'streamer')).toBe(true)
    })

    it('should return true for higher role', () => {
      expect(hasRole('admin', 'streamer')).toBe(true)
    })

    it('should return false for lower role', () => {
      expect(hasRole('viewer', 'streamer')).toBe(false)
    })
  })

  describe('hasSubscriptionTier', () => {
    it('should validate subscription tiers correctly', () => {
      expect(hasSubscriptionTier('premium', 'basic')).toBe(true)
      expect(hasSubscriptionTier('basic', 'premium')).toBe(false)
    })
  })
})
```

**E2E Test Example:**

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user to sign in and access dashboard', async ({
    page,
  }) => {
    await page.goto('/sign-in')

    await page.fill('[name="identifier"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
})
```

## Component Development

### 1. Component Structure

```typescript
// components/example/ExampleComponent.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExampleComponentProps {
  title: string
  onAction?: () => void
  className?: string
}

export function ExampleComponent({
  title,
  onAction,
  className
}: ExampleComponentProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async () => {
    setIsLoading(true)
    try {
      await onAction?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleAction}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Action'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 2. Component Guidelines

- Use TypeScript interfaces for props
- Include JSDoc comments for complex components
- Use `'use client'` directive for client components
- Implement proper loading and error states
- Follow accessibility best practices
- Use semantic HTML elements

### 3. Styling Guidelines

#### Tailwind CSS Classes

```typescript
// Preferred: Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">

// Avoid: Custom CSS when Tailwind utilities exist
<div className="custom-card-style">
```

#### Component Variants

```typescript
// Use class-variance-authority for component variants
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
```

## API Development

### 1. Route Structure

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

// Request validation schema
const createExampleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Implementation here
    return NextResponse.json({ data: [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createExampleSchema.parse(body)

    // Implementation here
    return NextResponse.json({ data: validatedData }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

### 2. API Guidelines

- Always validate input with Zod schemas
- Use proper HTTP status codes
- Include error handling for all endpoints
- Implement authentication checks
- Add rate limiting for public endpoints
- Use TypeScript for type safety
- Include proper logging

### 3. Database Operations

```typescript
// lib/database/example.ts
import { db } from '@/lib/firebase/config'
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'

export interface Example {
  id: string
  name: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export async function createExample(
  data: Omit<Example, 'id' | 'createdAt' | 'updatedAt'>
) {
  const docRef = doc(collection(db, 'examples'))
  const now = new Date()

  const example: Example = {
    ...data,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  }

  await setDoc(docRef, example)
  return example
}

export async function getExampleById(id: string): Promise<Example | null> {
  const docRef = doc(db, 'examples', id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    return null
  }

  return docSnap.data() as Example
}

export async function getExamplesByUser(userId: string): Promise<Example[]> {
  const q = query(collection(db, 'examples'), where('userId', '==', userId))

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as Example)
}
```

## Environment Configuration

### Development Environment Variables

```env
# .env.local (development)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk (Development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Firebase (Development)
FIREBASE_PROJECT_ID=streamvault-dev
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Feature Flags
ENABLE_AI_FEATURES=false
ENABLE_DEBUG_MODE=true
```

### Environment Validation

```typescript
// lib/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  // ... other environment variables
})

export const env = envSchema.parse(process.env)
```

## Debugging

### 1. Development Tools

#### VS Code Extensions

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Rename Tag
- Bracket Pair Colorizer

#### Browser DevTools

- React Developer Tools
- Redux DevTools (if using Redux)
- Lighthouse for performance auditing

### 2. Debugging Techniques

#### Client-Side Debugging

```typescript
// Use React DevTools and browser console
console.log('Debug info:', { user, preferences })

// Use debugger statement
debugger

// Use React Error Boundaries
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

#### Server-Side Debugging

```typescript
// API route debugging
console.log('Request received:', {
  method: request.method,
  url: request.url,
  headers: Object.fromEntries(request.headers.entries()),
})

// Database operation debugging
console.log('Firestore query:', {
  collection: 'users',
  filters: { userId },
  timestamp: new Date().toISOString(),
})
```

### 3. Performance Monitoring

```typescript
// Performance measurement
const start = performance.now()
await someAsyncOperation()
const end = performance.now()
console.log(`Operation took ${end - start} milliseconds`)

// React Profiler
import { Profiler } from 'react'

function onRenderCallback(id, phase, actualDuration) {
  console.log('Render performance:', { id, phase, actualDuration })
}

<Profiler id="UserProfile" onRender={onRenderCallback}>
  <UserProfile />
</Profiler>
```

## Common Development Tasks

### 1. Adding a New Component

```bash
# Create component file
touch components/example/NewComponent.tsx

# Create test file
touch tests/unit/components/NewComponent.test.tsx

# Create story file (if using Storybook)
touch components/example/NewComponent.stories.tsx
```

### 2. Adding a New API Route

```bash
# Create API route
mkdir -p app/api/new-endpoint
touch app/api/new-endpoint/route.ts

# Create test file
touch tests/integration/api/new-endpoint.test.ts
```

### 3. Adding a New Database Model

```bash
# Create type definition
touch types/new-model.ts

# Create database utilities
touch lib/database/new-model.ts

# Create validation schema
touch lib/validations/new-model.ts
```

### 4. Adding a New Page

```bash
# Create page file
mkdir -p app/new-page
touch app/new-page/page.tsx
touch app/new-page/layout.tsx  # Optional
touch app/new-page/loading.tsx # Optional

# Create E2E test
touch tests/e2e/new-page.spec.ts
```

## Troubleshooting

### Common Issues

#### 1. TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf .next
pnpm type-check

# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

#### 2. Build Errors

```bash
# Clear all caches
rm -rf .next node_modules
pnpm install
pnpm build
```

#### 3. Environment Variable Issues

```bash
# Verify environment variables are loaded
pnpm env:check

# Check for missing variables
grep -r "process.env" --include="*.ts" --include="*.tsx" .
```

#### 4. Database Connection Issues

- Verify Firebase configuration
- Check Firestore security rules
- Validate service account permissions

### Getting Help

- **Documentation**: Check existing docs in `/docs` folder
- **Code Examples**: Look at similar implementations in the codebase
- **Community**: Ask questions in team chat or GitHub discussions
- **Debugging**: Use browser DevTools and VS Code debugger

## Contributing Guidelines

### Pull Request Process

1. **Create Feature Branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**

- Follow coding standards
- Add tests for new functionality
- Update documentation if needed

3. **Test Changes**

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm type-check
```

4. **Commit Changes**

```bash
git add .
git commit -m "feat: add your feature description"
```

5. **Push and Create PR**

```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] TypeScript types are properly defined
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed

## Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

### Tools

- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Firebase Console](https://console.firebase.google.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Clerk Dashboard](https://dashboard.clerk.com)

### Learning Resources

- [React Patterns](https://reactpatterns.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Next.js Learn](https://nextjs.org/learn)
- [Tailwind CSS Tutorials](https://tailwindcss.com/tutorials)
