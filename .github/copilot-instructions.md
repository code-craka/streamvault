# StreamVault Development Environment
StreamVault is a Next.js-based live streaming platform with TypeScript, Firebase, Google Cloud Storage, Clerk authentication, and Stripe integration. The codebase is currently in a partially working state with several known issues that must be addressed carefully.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## ⚠️ CRITICAL KNOWN ISSUES

### Current Repository Status: PARTIALLY BROKEN
- **Node.js Compatibility**: Requires Node.js 22+ but commonly deployed on Node.js 20 environments
- **Build System**: Production builds fail due to Firebase admin SDK edge runtime incompatibility  
- **TypeScript**: 343 compilation errors throughout codebase
- **Runtime**: Development server starts but returns 500 errors due to middleware issues
- **Next.js Config**: Configuration file is corrupted (contains ESLint config instead of Next.js config)
- **Tests**: 14 of 21 test suites fail, but 179 of 234 individual tests pass

## Environment Setup

### Prerequisites and Installation
**NEVER CANCEL any installation or build commands - they may take longer than expected.**

1. **Install Node.js 22+ (REQUIRED)**
   ```bash
   # Check current version
   node --version
   
   # If not 22+, install Node.js 22:
   curl -fsSL https://nodejs.org/dist/v22.17.1/node-v22.17.1-linux-x64.tar.xz | tar -xJ
   export PATH="$PWD/node-v22.17.1-linux-x64/bin:$PATH"
   ```

2. **Install pnpm 10.15.0+ (REQUIRED)**
   ```bash
   npm install -g pnpm@10.15.0
   pnpm --version  # Should show 10.15.0
   ```

3. **Install dependencies** - Takes ~40 seconds, NEVER CANCEL
   ```bash
   pnpm install --frozen-lockfile
   # Expected time: 30-60 seconds
   # WARNING: Will show "Unsupported engine" warning on Node.js < 22 but will still work
   ```

## Working Operations

### Environment Configuration
```bash
# Copy environment template for local development
cp .env.example .env.local
# Edit .env.local with minimal fake values for testing:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fake
# CLERK_SECRET_KEY=sk_test_fake
# NEXT_PUBLIC_FIREBASE_API_KEY=fake
# etc.
```

### Development Server - Works but Returns 500 Errors
```bash
# Start development server - Takes ~2 seconds
pnpm dev
# EXPECTED: Server starts on http://localhost:3000
# KNOWN ISSUE: Returns 500 Internal Server Error due to middleware Firebase issues
# This is NORMAL for the current codebase state
```

### Code Quality Checks - Work but Show Many Issues
```bash
# Type checking - Takes ~13 seconds - NEVER CANCEL
pnpm type-check
# EXPECTED: Shows 100+ TypeScript errors (this is normal)

# Linting - Takes ~5 seconds  
pnpm lint:check
# EXPECTED: Shows hundreds of warnings/errors (this is normal)

# Code formatting
pnpm format
```

### Testing - Partially Works
```bash
# Unit tests - Takes ~3-5 seconds
pnpm test
# EXPECTED: 14 failed suites, 7 passed suites (179 individual tests pass)

# Test with coverage
pnpm test:coverage
# EXPECTED: Generates coverage report with failures
```

## NON-WORKING Operations

### ❌ Production Build - FAILS
```bash
# DO NOT attempt production build - it will fail
# pnpm build  
# KNOWN ISSUE: Fails due to Firebase admin SDK edge runtime incompatibility
# Error: "node:process not handled by plugins" and Firebase dynamic code evaluation
```

### ❌ E2E Tests - CANNOT INSTALL
```bash
# DO NOT attempt E2E tests
# pnpm test:e2e
# KNOWN ISSUE: Playwright installation fails with download errors
```

### ❌ Firebase Operations - BROKEN  
```bash
# DO NOT run Firebase-related scripts
# Firebase admin SDK incompatible with Next.js edge runtime middleware
```

## Validation Scenarios

### What You CAN Validate
1. **Dependency Installation**: Verify pnpm install completes in ~40 seconds
2. **Development Server Startup**: Verify server starts and shows Ready message
3. **Type Checking**: Verify tsc runs and reports expected TypeScript errors  
4. **Linting**: Verify ESLint runs and reports expected warnings
5. **Unit Tests**: Verify Jest runs and shows partial test results

### What You CANNOT Validate
1. **Production Builds**: Will always fail due to Firebase edge runtime issues
2. **Application Functionality**: All pages and API endpoints return 500 errors
3. **E2E Tests**: Playwright installation broken
4. **Firebase Features**: Admin SDK incompatible with edge runtime
5. **Live Streaming Features**: Require working runtime environment

## Manual Validation Requirements

After making changes, ALWAYS run these validation steps:

```bash
# 1. Verify installation still works (40 seconds - NEVER CANCEL)
pnpm install --frozen-lockfile

# 2. Check if type errors increased (13 seconds - NEVER CANCEL) 
pnpm type-check 2>&1 | grep -c "error TS"
# Expected output: 343 (current baseline)

# 3. Verify dev server still starts (2 seconds)
timeout 10s pnpm dev || echo "Server startup test complete"

# 4. Run unit tests to check for regressions (5 seconds)
pnpm test 2>&1 | grep -E "(PASS|FAIL|Tests:|Suites:)"
# Expected: 14 failed suites, 7 passed suites, 179 passed tests
```

## TIMEOUT SPECIFICATIONS - NEVER CANCEL

- **pnpm install**: 60+ minutes timeout, typically takes 30-60 seconds
- **pnpm type-check**: 30+ minutes timeout, typically takes 10-15 seconds  
- **pnpm dev**: 10+ minutes timeout, typically takes 2-5 seconds
- **pnpm test**: 30+ minutes timeout, typically takes 3-5 seconds
- **pnpm build**: DO NOT ATTEMPT - will fail

## Repository Structure

### Key Directories
```
/app/                 # Next.js app router pages and API routes
/components/          # React components  
/lib/                 # Utility libraries and services
/hooks/               # React hooks
/types/               # TypeScript type definitions
/tests/               # Test files (unit, integration, e2e)
/docs/                # Documentation
/.github/workflows/   # CI/CD pipelines
```

### Important Files
- `package.json` - Dependencies and scripts
- `next.config.js` - CORRUPTED (contains ESLint config)
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration  
- `.env.example` - Environment variable template
- `middleware.ts` - BROKEN (Firebase edge runtime issues)

## Common Tasks

### Making Code Changes
1. ALWAYS run type checking before and after changes to measure impact
2. Focus on fixing existing TypeScript errors rather than adding features
3. Use `pnpm format` to maintain code style
4. Test changes with unit tests where possible

### Debugging Build Issues
1. Check Node.js version first (must be 22+)
2. Verify environment variables are set correctly  
3. Look for Firebase admin SDK usage in client-side code
4. Check for Next.js edge runtime compatibility issues

## CI/CD Pipeline

The `.github/workflows/ci.yml` includes:
- Code quality checks (linting, type checking)
- Unit tests with 80% coverage requirement
- Build validation (WILL FAIL)
- E2E tests (WILL FAIL)  
- Security scanning

**Expected CI Behavior**: Most jobs will fail due to known issues above.

## Dependencies

### Core Stack
- **Next.js 15.5.0** with App Router
- **React 19** with TypeScript
- **pnpm** package manager
- **Tailwind CSS** for styling
- **Clerk** for authentication
- **Firebase** for database/storage (BROKEN)
- **Stripe** for payments
- **Google Cloud Storage** for file storage

### Development Tools
- **ESLint** for linting
- **Prettier** for formatting  
- **Jest** for unit testing
- **Playwright** for E2E testing (BROKEN)
- **Husky** for git hooks

## Troubleshooting

### "Unsupported engine" Warning
- Normal when using Node.js < 22
- Installation will still work
- Upgrade to Node.js 22+ to resolve

### Build Failures
- Expected due to Firebase edge runtime incompatibility
- Do not attempt production builds
- Focus on development workflow only

### 500 Server Errors
- Normal for current codebase state
- Caused by middleware Firebase issues
- Server startup is still successful

### Test Failures
- Expected due to configuration issues
- Partial test execution is normal
- Focus on tests that do pass

Remember: This codebase is in active development with known issues. Follow these instructions exactly and expect certain operations to fail as documented above.