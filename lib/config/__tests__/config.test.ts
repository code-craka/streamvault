import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { validateConfiguration, getEnvironmentConfig } from '../validator'
import { Config } from '../index'

// Mock environment variables for testing
const mockEnv = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_NAME: 'StreamVault',
  GCP_PROJECT_ID: 'test-project',
  GCS_BUCKET_NAME: 'test-bucket',
  GOOGLE_APPLICATION_CREDENTIALS: '/path/to/credentials.json',
  GCS_SERVICE_ACCOUNT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
  CLERK_SECRET_KEY: 'sk_test_123',
  FIREBASE_PROJECT_ID: 'test-firebase',
  FIREBASE_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
  FIREBASE_CLIENT_EMAIL: 'firebase@test-firebase.iam.gserviceaccount.com',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-firebase.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-firebase',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-firebase.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:test',
  STRIPE_SECRET_KEY: 'sk_test_123',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
  STRIPE_BASIC_PRICE_ID: 'price_basic_123',
  STRIPE_PREMIUM_PRICE_ID: 'price_premium_123',
  STRIPE_PRO_PRICE_ID: 'price_pro_123',
  STREAMING_DOMAIN: 'stream.test.com',
  RTMP_INGEST_URL: 'rtmp://ingest.test.com/live',
  HLS_DELIVERY_URL: 'https://cdn.test.com/hls',
  CDN_BASE_URL: 'https://cdn.test.com',
  JWT_SECRET: 'this-is-a-very-long-jwt-secret-for-testing-purposes-123456789',
  ENCRYPTION_KEY: '12345678901234567890123456789012', // 32 characters
  WEBHOOK_SECRET: 'webhook-secret-123456',
}

describe('Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = process.env
    process.env = { ...mockEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Environment Validation', () => {
    it('should validate correct environment configuration', () => {
      const result = validateConfiguration()
      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.config).toBeDefined()
    })

    it('should fail validation with missing required variables', () => {
      delete process.env.NEXT_PUBLIC_APP_URL

      const result = validateConfiguration()
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should fail validation with invalid URL format', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'not-a-valid-url'

      const result = validateConfiguration()
      expect(result.success).toBe(false)
      expect(
        result.errors.some(error => error.includes('not a valid URL'))
      ).toBe(true)
    })

    it('should fail validation with short JWT secret', () => {
      process.env.JWT_SECRET = 'short'

      const result = validateConfiguration()
      expect(result.success).toBe(false)
      expect(result.errors.some(error => error.includes('JWT_SECRET'))).toBe(
        true
      )
    })

    it('should fail validation with wrong encryption key length', () => {
      process.env.ENCRYPTION_KEY = 'wrong-length'

      const result = validateConfiguration()
      expect(result.success).toBe(false)
      expect(
        result.errors.some(error => error.includes('ENCRYPTION_KEY'))
      ).toBe(true)
    })

    it('should warn about placeholder values', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_...'

      const result = validateConfiguration()
      expect(
        result.warnings.some(warning => warning.includes('placeholder'))
      ).toBe(true)
    })

    it('should fail validation with GITHUB_ prefix in variable names', () => {
      process.env.GITHUB_SECRET = 'some-secret-value'

      const result = validateConfiguration()
      expect(result.success).toBe(false)
      expect(
        result.errors.some(error => 
          error.includes('Secret names must not start with GITHUB_')
        )
      ).toBe(true)
    })
  })

  describe('Environment-Specific Configuration', () => {
    it('should return development config for development environment', () => {
      process.env.APP_ENV = 'development'
      const config = getEnvironmentConfig()
      expect(config.features.enableDebugMode).toBe(true)
      expect(config.features.enableMockPayments).toBe(true)
    })

    it('should return production config for production environment', () => {
      process.env.APP_ENV = 'production'
      const config = getEnvironmentConfig()
      expect(config.features.enableDebugMode).toBe(false)
      expect(config.features.enableMockPayments).toBe(false)
    })

    it('should return staging config for staging environment', () => {
      process.env.APP_ENV = 'staging'
      const config = getEnvironmentConfig()
      expect(config.features.enableMockPayments).toBe(true) // Still use test payments
      expect(config.monitoring.enableDetailedLogging).toBe(true)
    })
  })

  describe('Configuration Class', () => {
    it('should be a singleton', () => {
      const config1 = Config.getInstance()
      const config2 = Config.getInstance()
      expect(config1).toBe(config2)
    })

    it('should provide server configuration', () => {
      const config = Config.getInstance()
      const serverConfig = config.getServerConfig()
      expect(serverConfig.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
      expect(serverConfig.GCP_PROJECT_ID).toBe('test-project')
    })

    it('should provide client configuration', () => {
      const config = Config.getInstance()
      const clientConfig = config.getClientConfig()
      expect(clientConfig.APP_URL).toBe('http://localhost:3000')
      expect(clientConfig.CLERK.PUBLISHABLE_KEY).toBe('pk_test_123')
    })

    it('should detect environment correctly', () => {
      const config = Config.getInstance()
      expect(config.isDevelopment()).toBe(true)
      expect(config.isProduction()).toBe(false)
      expect(config.isStaging()).toBe(false)
    })

    it('should provide service-specific configurations', () => {
      const config = Config.getInstance()

      const storageConfig = config.getStorageConfig()
      expect(storageConfig.gcp.projectId).toBe('test-project')
      expect(storageConfig.gcp.bucketName).toBe('test-bucket')

      const authConfig = config.getAuthConfig()
      expect(authConfig.clerk.secretKey).toBe('sk_test_123')
      expect(authConfig.jwt.secret).toBeDefined()

      const paymentConfig = config.getPaymentConfig()
      expect(paymentConfig.stripe.secretKey).toBe('sk_test_123')
      expect(paymentConfig.stripe.prices.basic).toBe('price_basic_123')
    })
  })

  describe('Feature Flags', () => {
    it('should handle feature flags correctly', () => {
      process.env.ENABLE_AI_FEATURES = 'true'
      process.env.ENABLE_WHITE_LABEL = 'false'

      const config = Config.getInstance()
      expect(config.isFeatureEnabled('ENABLE_AI_FEATURES')).toBe(true)
      expect(config.isFeatureEnabled('ENABLE_WHITE_LABEL')).toBe(false)
    })
  })

  describe('Production Validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.APP_ENV = 'production'
      // Add required production variables
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
      process.env.REDIS_URL = 'redis://localhost:6379'
      process.env.SENTRY_DSN = 'https://test@sentry.io/123'
      process.env.CLOUDFLARE_API_TOKEN = 'test-token'
      process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
      process.env.ANALYTICS_ID = 'G-TEST123'
    })

    it('should require additional services in production', () => {
      delete process.env.DATABASE_URL

      const result = validateConfiguration()
      expect(result.success).toBe(false)
      expect(
        result.errors.some(error =>
          error.includes('DATABASE_URL is required in production')
        )
      ).toBe(true)
    })

    it('should warn about debug mode in production', () => {
      process.env.NEXT_PUBLIC_DEBUG_MODE = 'true'

      const result = validateConfiguration()
      expect(
        result.errors.some(error =>
          error.includes('Debug mode should be disabled in production')
        )
      ).toBe(true)
    })
  })
})
