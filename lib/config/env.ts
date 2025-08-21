import { z } from 'zod'

// Base environment schema
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Custom environment variable for staging detection
  APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
  
  // Core Application
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('StreamVault'),
  
  // Google Cloud Platform
  GCP_PROJECT_ID: z.string().min(1),
  GCS_BUCKET_NAME: z.string().min(1),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1),
  GCS_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  
  // Firebase Configuration
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  
  // Stripe Payment Configuration
  STRIPE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_BASIC_PRICE_ID: z.string().min(1),
  STRIPE_PREMIUM_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),
  
  // Streaming Infrastructure
  STREAMING_DOMAIN: z.string().min(1),
  RTMP_INGEST_URL: z.string().url(),
  HLS_DELIVERY_URL: z.string().url(),
  CDN_BASE_URL: z.string().url(),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().length(32, 'Encryption key must be exactly 32 characters'),
  WEBHOOK_SECRET: z.string().min(16, 'Webhook secret must be at least 16 characters'),
  
  // Feature Flags
  ENABLE_AI_FEATURES: z.string().transform(val => val === 'true').default('false'),
  ENABLE_WHITE_LABEL: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_PWA: z.string().transform(val => val === 'true').default('false'),
  ENABLE_OFFLINE_DOWNLOADS: z.string().transform(val => val === 'true').default('false'),
  
  // Development Configuration
  NEXT_PUBLIC_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_PERFORMANCE_MONITORING: z.string().transform(val => val === 'true').default('false'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),
  
  // Content Delivery
  MAX_FILE_SIZE: z.string().transform(val => parseInt(val, 10)).default('5368709120'),
  ALLOWED_FILE_TYPES: z.string().default('mp4,mov,avi,mkv,webm'),
  THUMBNAIL_SIZES: z.string().default('320x180,640x360,1280x720'),
})

// Optional environment variables for different environments
const optionalEnvSchema = z.object({
  // Cloudflare Configuration (optional for development)
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  
  // AI Services Configuration (optional)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  CONTENT_MODERATION_API_KEY: z.string().optional(),
  
  // Database Configuration (optional for development)
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  
  // Third-party Integrations (optional)
  SENTRY_DSN: z.string().url().optional(),
  ANALYTICS_ID: z.string().optional(),
  HOTJAR_ID: z.string().optional(),
  
  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Monitoring and Logging (optional)
  DATADOG_API_KEY: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  PROMETHEUS_ENDPOINT: z.string().url().optional(),
})

// Combined schema
export const envSchema = baseEnvSchema.merge(optionalEnvSchema)

// Environment-specific schemas
export const developmentEnvSchema = baseEnvSchema.merge(optionalEnvSchema.partial())

export const productionEnvSchema = baseEnvSchema.merge(
  optionalEnvSchema.required({
    CLOUDFLARE_API_TOKEN: true,
    CLOUDFLARE_ZONE_ID: true,
    CLOUDFLARE_ACCOUNT_ID: true,
    DATABASE_URL: true,
    REDIS_URL: true,
    SENTRY_DSN: true,
    ANALYTICS_ID: true,
  })
)

export const stagingEnvSchema = baseEnvSchema.merge(
  optionalEnvSchema.required({
    DATABASE_URL: true,
    REDIS_URL: true,
  })
)

// Type inference
export type EnvConfig = z.infer<typeof envSchema>
export type DevelopmentEnvConfig = z.infer<typeof developmentEnvSchema>
export type ProductionEnvConfig = z.infer<typeof productionEnvSchema>
export type StagingEnvConfig = z.infer<typeof stagingEnvSchema>

// Environment validation function
export function validateEnv(): EnvConfig {
  const env = process.env
  
  // Choose schema based on environment (use APP_ENV for staging detection)
  const appEnv = env.APP_ENV || env.NODE_ENV
  let schema: z.ZodSchema
  switch (appEnv) {
    case 'production':
      schema = productionEnvSchema
      break
    case 'staging':
      schema = stagingEnvSchema
      break
    case 'development':
    default:
      schema = developmentEnvSchema
      break
  }
  
  try {
    const validatedEnv = schema.parse(env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n')
      
      throw new Error(
        `Environment validation failed:\n${errorMessages}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

// Validate environment on module load (server-side only)
let validatedEnv: EnvConfig | null = null

export function getEnvConfig(): EnvConfig {
  if (typeof window !== 'undefined') {
    throw new Error('getEnvConfig() should only be called on the server side')
  }
  
  if (!validatedEnv) {
    validatedEnv = validateEnv()
  }
  
  return validatedEnv
}

// Client-safe environment variables
export function getClientEnvConfig() {
  return {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME!,
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    CLERK: {
      PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
      SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!,
      SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL!,
      AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL!,
      AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL!,
    },
    FIREBASE: {
      API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    },
    STRIPE: {
      PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    },
  }
}