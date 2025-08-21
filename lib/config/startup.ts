import { validateConfigurationOnStartup } from './validator'
import { config } from './index'

// Configuration initialization flag
let isInitialized = false

// Initialize configuration system
export function initializeConfiguration(): void {
  if (isInitialized) {
    return
  }

  try {
    // Validate configuration on startup
    validateConfigurationOnStartup()

    // Initialize configuration singleton
    const serverConfig = config.getServerConfig()

    // Log configuration summary (without sensitive data)
    logConfigurationSummary(serverConfig)

    // Set initialization flag
    isInitialized = true

    console.log('✅ Configuration system initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize configuration system:', error)
    process.exit(1)
  }
}

// Log configuration summary (safe for logging)
function logConfigurationSummary(serverConfig: Record<string, unknown>): void {
  const env = process.env.APP_ENV || process.env.NODE_ENV

  console.log('\n📋 Configuration Summary:')
  console.log(`   Environment: ${env}`)
  console.log(`   App URL: ${serverConfig.NEXT_PUBLIC_APP_URL}`)
  console.log(`   GCP Project: ${serverConfig.GCP_PROJECT_ID}`)
  console.log(`   GCS Bucket: ${serverConfig.GCS_BUCKET_NAME}`)
  console.log(`   Streaming Domain: ${serverConfig.STREAMING_DOMAIN}`)
  console.log(`   Log Level: ${serverConfig.LOG_LEVEL}`)

  // Feature flags
  const features = []
  if (serverConfig.ENABLE_AI_FEATURES) features.push('AI')
  if (serverConfig.ENABLE_WHITE_LABEL) features.push('White-Label')
  if (serverConfig.ENABLE_ANALYTICS) features.push('Analytics')
  if (serverConfig.ENABLE_PWA) features.push('PWA')
  if (serverConfig.ENABLE_OFFLINE_DOWNLOADS) features.push('Offline Downloads')

  if (features.length > 0) {
    console.log(`   Enabled Features: ${features.join(', ')}`)
  }

  // Optional services status
  const services = []
  if (serverConfig.DATABASE_URL) services.push('Database')
  if (serverConfig.REDIS_URL) services.push('Redis')
  if (serverConfig.SENTRY_DSN) services.push('Sentry')
  if (serverConfig.OPENAI_API_KEY) services.push('OpenAI')
  if (serverConfig.CLOUDFLARE_API_TOKEN) services.push('Cloudflare')

  if (services.length > 0) {
    console.log(`   Connected Services: ${services.join(', ')}`)
  }

  console.log('')
}

// Check if configuration is initialized
export function isConfigurationInitialized(): boolean {
  return isInitialized
}

// Force re-initialization (useful for testing)
export function resetConfiguration(): void {
  isInitialized = false
}
