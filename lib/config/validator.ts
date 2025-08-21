import { validateEnv, type EnvConfig } from './env'
import { developmentConfig } from './environments/development'
import { stagingConfig } from './environments/staging'
import { productionConfig } from './environments/production'

// Configuration validation results
export interface ValidationResult {
  success: boolean
  errors: string[]
  warnings: string[]
  config?: EnvConfig
}

// Environment-specific configuration getter
export function getEnvironmentConfig() {
  const env = process.env.APP_ENV || process.env.NODE_ENV

  switch (env) {
    case 'production':
      return productionConfig
    case 'staging':
      return stagingConfig
    case 'development':
    default:
      return developmentConfig
  }
}

// Comprehensive configuration validation
export function validateConfiguration(): ValidationResult {
  const result: ValidationResult = {
    success: false,
    errors: [],
    warnings: [],
  }

  try {
    // Validate environment variables
    const config = validateEnv()
    result.config = config

    // Environment-specific validations
    getEnvironmentConfig() // Call the function but don't assign to unused variable
    const env = process.env.APP_ENV || process.env.NODE_ENV

    // Check for common configuration issues
    validateCommonIssues(config, result)

    // Environment-specific validations
    if (env === 'production') {
      validateProductionConfig(config, result)
    } else if (env === 'staging') {
      validateStagingConfig(config, result)
    } else {
      validateDevelopmentConfig(config, result)
    }

    // Check for security issues
    validateSecurityConfig(config, result, env)

    // Check for performance considerations
    validatePerformanceConfig(config, result, env)

    result.success = result.errors.length === 0

    return result
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown validation error')
    return result
  }
}

function validateCommonIssues(config: EnvConfig, result: ValidationResult) {
  // Check for placeholder values
  const placeholderPatterns = [
    'your-',
    'sk_test_...',
    'pk_test_...',
    'whsec_...',
    'price_...',
    '...',
  ]

  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === 'string') {
      placeholderPatterns.forEach(pattern => {
        if (value.includes(pattern)) {
          result.warnings.push(`${key} appears to contain placeholder value: ${pattern}`)
        }
      })
    }
  })

  // Check URL formats
  const urlFields = [
    'NEXT_PUBLIC_APP_URL',
    'RTMP_INGEST_URL',
    'HLS_DELIVERY_URL',
    'CDN_BASE_URL',
  ]

  urlFields.forEach(field => {
    const value = config[field as keyof EnvConfig] as string
    if (value && !isValidUrl(value)) {
      result.errors.push(`${field} is not a valid URL: ${value}`)
    }
  })

  // Check email formats
  const emailFields = ['GCS_SERVICE_ACCOUNT_EMAIL', 'FIREBASE_CLIENT_EMAIL']
  emailFields.forEach(field => {
    const value = config[field as keyof EnvConfig] as string
    if (value && !isValidEmail(value)) {
      result.errors.push(`${field} is not a valid email: ${value}`)
    }
  })
}

function validateProductionConfig(config: EnvConfig, result: ValidationResult) {
  // Production-specific validations
  if (config.NEXT_PUBLIC_DEBUG_MODE) {
    result.errors.push('Debug mode should be disabled in production')
  }

  if (config.LOG_LEVEL === 'debug') {
    result.warnings.push('Debug logging is enabled in production, consider using "info" or "warn"')
  }

  // Check for test/development keys in production
  const testKeyPatterns = ['test', 'dev', 'development', 'staging']
  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === 'string' && key.includes('KEY')) {
      testKeyPatterns.forEach(pattern => {
        if (value.toLowerCase().includes(pattern)) {
          result.warnings.push(`${key} appears to contain test/development credentials`)
        }
      })
    }
  })

  // Required production services
  const requiredServices = [
    'DATABASE_URL',
    'REDIS_URL',
    'SENTRY_DSN',
    'CLOUDFLARE_API_TOKEN',
  ]

  requiredServices.forEach(service => {
    if (!config[service as keyof EnvConfig]) {
      result.errors.push(`${service} is required in production`)
    }
  })
}

function validateStagingConfig(config: EnvConfig, result: ValidationResult) {
  // Staging-specific validations
  if (!config.DATABASE_URL) {
    result.errors.push('DATABASE_URL is required in staging')
  }

  if (!config.REDIS_URL) {
    result.errors.push('REDIS_URL is required in staging')
  }

  // Warn about production-like settings
  if (config.NEXT_PUBLIC_DEBUG_MODE) {
    result.warnings.push('Debug mode is enabled in staging, consider disabling for production-like testing')
  }
}

function validateDevelopmentConfig(config: EnvConfig, result: ValidationResult) {
  // Development-specific validations
  if (config.NEXT_PUBLIC_APP_URL && !config.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    result.warnings.push('APP_URL should typically point to localhost in development')
  }

  // Check for missing optional services (warnings only)
  const optionalServices = [
    'DATABASE_URL',
    'REDIS_URL',
    'OPENAI_API_KEY',
  ]

  optionalServices.forEach(service => {
    if (!config[service as keyof EnvConfig]) {
      result.warnings.push(`${service} is not set - some features may not work in development`)
    }
  })
}

function validateSecurityConfig(config: EnvConfig, result: ValidationResult, env: string) {
  // JWT secret strength
  if (config.JWT_SECRET.length < 32) {
    result.errors.push('JWT_SECRET must be at least 32 characters long')
  }

  // Encryption key validation
  if (config.ENCRYPTION_KEY.length !== 32) {
    result.errors.push('ENCRYPTION_KEY must be exactly 32 characters long')
  }

  // Webhook secret strength
  if (config.WEBHOOK_SECRET.length < 16) {
    result.errors.push('WEBHOOK_SECRET must be at least 16 characters long')
  }

  // Check for weak secrets in production
  if (env === 'production') {
    const weakPatterns = ['password', '123456', 'secret', 'admin']
    const secretFields = ['JWT_SECRET', 'ENCRYPTION_KEY', 'WEBHOOK_SECRET']

    secretFields.forEach(field => {
      const value = config[field as keyof EnvConfig] as string
      weakPatterns.forEach(pattern => {
        if (value.toLowerCase().includes(pattern)) {
          result.errors.push(`${field} appears to contain weak/common patterns`)
        }
      })
    })
  }
}

function validatePerformanceConfig(config: EnvConfig, result: ValidationResult, env: string) {
  // File size limits
  const maxFileSize = config.MAX_FILE_SIZE
  if (maxFileSize > 10 * 1024 * 1024 * 1024) { // 10GB
    result.warnings.push('MAX_FILE_SIZE is very large, consider storage and bandwidth costs')
  }

  // Rate limiting
  const rateLimit = config.RATE_LIMIT_MAX_REQUESTS
  if (env === 'production' && rateLimit > 1000) {
    result.warnings.push('RATE_LIMIT_MAX_REQUESTS is very high for production')
  }

  // Thumbnail sizes
  const thumbnailSizes = config.THUMBNAIL_SIZES.split(',')
  if (thumbnailSizes.length > 5) {
    result.warnings.push('Many thumbnail sizes configured, consider performance impact')
  }
}

// Utility functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Configuration startup validator
export function validateConfigurationOnStartup(): void {
  console.log('🔍 Validating configuration...')
  
  const result = validateConfiguration()
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:')
    result.warnings.forEach(warning => console.warn(`   - ${warning}`))
  }
  
  if (result.errors.length > 0) {
    console.error('❌ Configuration errors:')
    result.errors.forEach(error => console.error(`   - ${error}`))
    
    console.error('\n💡 Please fix the configuration errors above before starting the application.')
    process.exit(1)
  }
  
  console.log('✅ Configuration validation passed')
  
  // Log environment info
  const env = process.env.APP_ENV || process.env.NODE_ENV
  const envConfig = getEnvironmentConfig()
  console.log(`🚀 Starting in ${env} mode`)
  
  if (env === 'development' && envConfig.features.enableDebugMode) {
    console.log('🐛 Debug mode enabled')
  }
}