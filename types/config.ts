// Configuration type definitions

export type Environment = 'development' | 'staging' | 'production'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface DatabaseConfig {
  url?: string
  redis?: string
}

export interface StorageConfig {
  gcp: {
    projectId: string
    bucketName: string
    serviceAccountEmail: string
    credentialsPath: string
  }
  limits: {
    maxFileSize: number
    allowedTypes: string[]
    thumbnailSizes: string[]
  }
}

export interface StreamingConfig {
  domain: string
  rtmpIngestUrl: string
  hlsDeliveryUrl: string
  cdnBaseUrl: string
}

export interface AuthConfig {
  clerk: {
    secretKey: string
  }
  jwt: {
    secret: string
  }
  security: {
    encryptionKey: string
    webhookSecret: string
  }
}

export interface PaymentConfig {
  stripe: {
    secretKey: string
    webhookSecret: string
    prices: {
      basic: string
      premium: string
      pro: string
    }
  }
}

export interface FirebaseConfig {
  projectId: string
  privateKey: string
  clientEmail: string
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface MonitoringConfig {
  sentry: {
    dsn?: string
  }
  analytics: {
    id?: string
  }
  performance: {
    enabled: boolean
  }
  logging: {
    level: LogLevel
  }
}

export interface AIConfig {
  openai: {
    apiKey?: string
  }
  google: {
    apiKey?: string
  }
  contentModeration: {
    apiKey?: string
  }
  enabled: boolean
}

export interface EmailConfig {
  smtp: {
    host?: string
    port?: number
    user?: string
    pass?: string
  }
}

export interface CloudflareConfig {
  apiToken?: string
  zoneId?: string
  accountId?: string
}

export interface ClientConfig {
  APP_URL: string
  APP_NAME: string
  DEBUG_MODE: boolean
  CLERK: {
    PUBLISHABLE_KEY: string
    SIGN_IN_URL: string
    SIGN_UP_URL: string
    AFTER_SIGN_IN_URL: string
    AFTER_SIGN_UP_URL: string
  }
  FIREBASE: {
    API_KEY: string
    AUTH_DOMAIN: string
    PROJECT_ID: string
    STORAGE_BUCKET: string
    MESSAGING_SENDER_ID: string
    APP_ID: string
  }
  STRIPE: {
    PUBLISHABLE_KEY: string
  }
}

// Feature flags
export interface FeatureFlags {
  AI_FEATURES: boolean
  WHITE_LABEL: boolean
  ANALYTICS: boolean
  PWA: boolean
  OFFLINE_DOWNLOADS: boolean
}

// Environment-specific configurations
export interface EnvironmentConfig {
  security: {
    requireHttps: boolean
    allowInsecureConnections: boolean
    corsOrigins: string[]
  }
  database: {
    connectionPoolSize: number
    queryTimeout: number
    enableLogging: boolean
  }
  streaming: {
    enableTestStreams: boolean
    mockTranscoding: boolean
    lowLatencyMode: boolean
  }
  features: {
    enableDebugMode: boolean
    enableMockPayments: boolean
    enableTestData: boolean
    skipEmailVerification: boolean
  }
  monitoring: {
    enableDetailedLogging: boolean
    logSensitiveData: boolean
    enablePerformanceMetrics: boolean
  }
  ai: {
    useMockResponses: boolean
    enableTestModeration: boolean
    skipExpensiveOperations: boolean
  }
  rateLimiting: {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
  }
}

// Configuration validation types
export interface ConfigValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ConfigValidationResult {
  success: boolean
  errors: ConfigValidationError[]
  warnings: ConfigValidationError[]
}
