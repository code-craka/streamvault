import type { DevelopmentEnvConfig } from '../env'

// Development-specific configuration overrides
export const developmentConfig = {
  // Relaxed security for development
  security: {
    requireHttps: false,
    allowInsecureConnections: true,
    corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  },

  // Development database settings
  database: {
    connectionPoolSize: 5,
    queryTimeout: 30000,
    enableLogging: true,
  },

  // Development streaming settings
  streaming: {
    enableTestStreams: true,
    mockTranscoding: true,
    lowLatencyMode: false,
  },

  // Development feature flags
  features: {
    enableDebugMode: true,
    enableMockPayments: true,
    enableTestData: true,
    skipEmailVerification: true,
  },

  // Development monitoring
  monitoring: {
    enableDetailedLogging: true,
    logSensitiveData: false, // Still keep this false for security
    enablePerformanceMetrics: false,
  },

  // Development AI settings
  ai: {
    useMockResponses: true,
    enableTestModeration: true,
    skipExpensiveOperations: true,
  },

  // Development rate limiting (more permissive)
  rateLimiting: {
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // Much higher for development
    skipSuccessfulRequests: true,
  },
} as const

export type DevelopmentConfig = typeof developmentConfig