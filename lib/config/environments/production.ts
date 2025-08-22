// Production-specific configuration

// Production-specific configuration
export const productionConfig = {
  // Production security (strict)
  security: {
    requireHttps: true,
    allowInsecureConnections: false,
    corsOrigins: ['https://streamvault.app', 'https://www.streamvault.app'],
  },

  // Production database settings
  database: {
    connectionPoolSize: 20,
    queryTimeout: 10000,
    enableLogging: false, // Disable query logging for performance
  },

  // Production streaming settings
  streaming: {
    enableTestStreams: false,
    mockTranscoding: false,
    lowLatencyMode: true,
  },

  // Production feature flags
  features: {
    enableDebugMode: false,
    enableMockPayments: false, // Use real payments
    enableTestData: false,
    skipEmailVerification: false,
  },

  // Production monitoring
  monitoring: {
    enableDetailedLogging: false, // Reduce log verbosity
    logSensitiveData: false,
    enablePerformanceMetrics: true,
  },

  // Production AI settings
  ai: {
    useMockResponses: false,
    enableTestModeration: false,
    skipExpensiveOperations: false,
  },

  // Production rate limiting (strict)
  rateLimiting: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // Conservative limits
    skipSuccessfulRequests: false,
  },

  // Production CDN settings
  cdn: {
    enableCaching: true,
    cacheTimeout: 3600, // 1 hour
    enableCompression: true,
    enableBrotli: true,
  },

  // Production performance settings
  performance: {
    enableGzip: true,
    enableBrotli: true,
    maxConcurrentConnections: 1000,
    connectionTimeout: 30000,
  },

  // Production backup settings
  backup: {
    enableAutomaticBackups: true,
    backupInterval: 21600, // 6 hours
    retentionDays: 30,
  },
} as const

export type ProductionConfig = typeof productionConfig
