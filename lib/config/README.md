# StreamVault Configuration System

This directory contains the comprehensive configuration management system for StreamVault, providing type-safe environment variable validation, environment-specific settings, and centralized configuration access.

## Overview

The configuration system provides:

- **Type-safe environment validation** using Zod schemas
- **Environment-specific configurations** (development, staging, production)
- **Centralized configuration management** with singleton pattern
- **Startup validation** to catch configuration errors early
- **Feature flag management** for conditional functionality
- **Security validation** for sensitive configuration values

## Architecture

```
lib/config/
├── env.ts                    # Zod schemas and environment validation
├── index.ts                  # Main configuration class and exports
├── startup.ts                # Application startup configuration
├── validator.ts              # Configuration validation logic
├── environments/             # Environment-specific configurations
│   ├── development.ts
│   ├── staging.ts
│   └── production.ts
└── __tests__/               # Configuration tests
    └── config.test.ts
```

## Usage

### Basic Configuration Access

```typescript
import { config, getServerConfig, getClientConfig } from '@/lib/config'

// Server-side configuration (includes all environment variables)
const serverConfig = getServerConfig()
console.log(serverConfig.GCP_PROJECT_ID)

// Client-side configuration (only NEXT_PUBLIC_ variables)
const clientConfig = getClientConfig()
console.log(clientConfig.APP_URL)
```

### Service-Specific Configuration

```typescript
import { config } from '@/lib/config'

// Get storage configuration
const storageConfig = config.getStorageConfig()
console.log(storageConfig.gcp.bucketName)

// Get authentication configuration
const authConfig = config.getAuthConfig()
console.log(authConfig.clerk.secretKey)

// Get payment configuration
const paymentConfig = config.getPaymentConfig()
console.log(paymentConfig.stripe.prices.premium)
```

### Feature Flags

```typescript
import { config } from '@/lib/config'

// Check if AI features are enabled
if (config.isFeatureEnabled('ENABLE_AI_FEATURES')) {
  // Initialize AI services
}

// Check environment
if (config.isDevelopment()) {
  // Development-specific logic
}
```

### Utility Functions

```typescript
import { 
  isDev, 
  isProd, 
  isFeatureEnabled, 
  getAppUrl,
  CONFIG_CONSTANTS 
} from '@/lib/utils/config'

// Environment checks
if (isDev()) {
  console.log('Running in development mode')
}

// Feature flags
if (isFeatureEnabled('ENABLE_AI_FEATURES')) {
  // AI functionality
}

// Constants
const tier = CONFIG_CONSTANTS.SUBSCRIPTION_TIERS.PREMIUM
```

## Environment Variables

### Required Variables

All environments require these variables:

```bash
# Core Application
NEXT_PUBLIC_APP_URL=https://streamvault.app
NEXT_PUBLIC_APP_NAME=StreamVault

# Google Cloud Platform
GCP_PROJECT_ID=shining-courage-465501-i8
GCS_BUCKET_NAME=streamvault-videos
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCS_SERVICE_ACCOUNT_EMAIL=ghstreamvault@...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Firebase
FIREBASE_PROJECT_ID=streamvault-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...

# Stripe
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# Streaming
STREAMING_DOMAIN=stream.streamvault.app
RTMP_INGEST_URL=rtmp://ingest.streamvault.app/live
HLS_DELIVERY_URL=https://cdn.streamvault.app/hls
CDN_BASE_URL=https://cdn.streamvault.app

# Security
JWT_SECRET=your-32-character-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key
WEBHOOK_SECRET=your-webhook-secret
```

### Environment-Specific Requirements

**Production Additional Requirements:**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SENTRY_DSN=https://...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_ACCOUNT_ID=...
ANALYTICS_ID=G-...
```

**Staging Additional Requirements:**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Optional Variables

```bash
# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
CONTENT_MODERATION_API_KEY=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@streamvault.app
SMTP_PASS=...

# Monitoring
DATADOG_API_KEY=...
NEW_RELIC_LICENSE_KEY=...
PROMETHEUS_ENDPOINT=http://localhost:9090
```

## Environment-Specific Configurations

### Development

- Relaxed security settings
- Mock services enabled
- Detailed logging
- Higher rate limits
- Debug mode enabled

### Staging

- Production-like security
- Real services (except payments)
- Detailed logging for debugging
- Moderate rate limits
- Debug mode disabled

### Production

- Strict security settings
- All real services
- Minimal logging
- Conservative rate limits
- All debugging disabled

## Validation

The configuration system validates:

- **Required variables** are present
- **URL formats** are valid
- **Email formats** are valid
- **Secret strength** meets requirements
- **Environment-specific** requirements
- **Security best practices**

### Validation Errors

The system will exit with an error if:

- Required environment variables are missing
- Variables have invalid formats
- Security requirements are not met
- Environment-specific requirements are not satisfied

### Validation Warnings

The system will warn about:

- Placeholder values in configuration
- Weak security settings
- Performance considerations
- Development settings in production

## Security Considerations

### Secret Management

- **JWT_SECRET**: Must be at least 32 characters
- **ENCRYPTION_KEY**: Must be exactly 32 characters
- **WEBHOOK_SECRET**: Must be at least 16 characters

### Production Security

- No debug mode in production
- Strong secrets required
- HTTPS enforcement
- Secure CORS origins

### Development Security

- Use strong secrets even in development
- Don't commit real credentials
- Use test/development API keys

## Testing

Run configuration tests:

```bash
pnpm test lib/config/__tests__/config.test.ts
```

The test suite covers:

- Environment validation
- Configuration access
- Feature flags
- Environment-specific settings
- Error handling

## Troubleshooting

### Common Issues

1. **"Required environment variable X is not set"**
   - Check your `.env.local` file
   - Ensure the variable is spelled correctly
   - Verify the variable is not commented out

2. **"Environment validation failed"**
   - Check the specific validation error message
   - Ensure URLs are properly formatted
   - Verify email addresses are valid

3. **"JWT_SECRET must be at least 32 characters"**
   - Generate a longer, more secure secret
   - Use a password generator for strong secrets

4. **Configuration not loading**
   - Ensure `initializeConfiguration()` is called on startup
   - Check for syntax errors in environment files
   - Verify file permissions on credential files

### Debug Mode

Enable debug logging to troubleshoot configuration issues:

```bash
LOG_LEVEL=debug pnpm dev
```

This will show detailed configuration loading and validation information.

## Best Practices

1. **Use environment-specific files** (`.env.development`, `.env.production`)
2. **Never commit real secrets** to version control
3. **Use strong, unique secrets** for each environment
4. **Validate configuration early** in the application lifecycle
5. **Use type-safe configuration access** throughout the application
6. **Document configuration changes** and requirements
7. **Test configuration** in all environments before deployment

## Migration Guide

When adding new configuration variables:

1. Add the variable to the Zod schema in `env.ts`
2. Update environment-specific requirements if needed
3. Add validation logic in `validator.ts` if required
4. Update the example environment files
5. Add tests for the new configuration
6. Update this documentation