// Staging-specific configuration

// Staging-specific configuration
export const stagingConfig = {
  // Staging security (production-like but with some relaxations)
  security: {
    requireHttps: true,
    allowInsecureConnections: false,
    corsOrigins: ['https://staging.streamvault.app'],
  },

  // Staging database settings
  database: {
    connectionPoolSize: 10,
    queryTimeout: 15000,
    enableLogging: true, // Keep logging enabled for debugging
  },

  // Staging streaming settings
  streaming: {
    enableTestStreams: true,
    mockTranscoding: false, // Use real transcoding
    lowLatencyMode: true,
  },

  // Staging feature flags
  features: {
    enableDebugMode: false,
    enableMockPayments: true, // Still use test payments
    enableTestData: false,
    skipEmailVerification: false,
  },

  // Staging monitoring
  monitoring: {
    enableDetailedLogging: true,
    logSensitiveData: false,
    enablePerformanceMetrics: true,
  },

  // Staging AI settings
  ai: {
    useMockResponses: false,
    enableTestModeration: false,
    skipExpensiveOperations: false,
  },

  // Staging rate limiting (production-like)
  rateLimiting: {
    windowMs: 60000, // 1 minute
    maxRequests: 200, // Moderate limits
    skipSuccessfulRequests: false,
  },

  // Staging-specific CDN settings
  cdn: {
    enableCaching: true,
    cacheTimeout: 300, // 5 minutes (shorter than production)
    enableCompression: true,
  },
} as const

export type StagingConfig = typeof stagingConfig
