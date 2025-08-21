// Utility functions for configuration access throughout the application

import { config } from '@/lib/config'
import type { 
  DatabaseConfig, 
  StorageConfig, 
  StreamingConfig, 
  AuthConfig, 
  PaymentConfig,
  ClientConfig 
} from '@/types/config'

// Server-side configuration utilities
export function getServerConfig() {
  return config.getServerConfig()
}

// Client-side configuration utilities
export function getClientConfig(): ClientConfig {
  return config.getClientConfig()
}

// Environment utilities
export function isDev(): boolean {
  return config.isDevelopment()
}

export function isProd(): boolean {
  return config.isProduction()
}

export function isStaging(): boolean {
  return config.isStaging()
}

// Feature flag utilities
export function isFeatureEnabled(feature: 
  'ENABLE_AI_FEATURES' | 
  'ENABLE_WHITE_LABEL' | 
  'ENABLE_ANALYTICS' | 
  'ENABLE_PWA' | 
  'ENABLE_OFFLINE_DOWNLOADS'
): boolean {
  return config.isFeatureEnabled(feature)
}

// Service configuration getters
export function getDatabaseConfig(): DatabaseConfig {
  return config.getDatabaseConfig()
}

export function getStorageConfig(): StorageConfig {
  return config.getStorageConfig()
}

export function getStreamingConfig(): StreamingConfig {
  return config.getStreamingConfig()
}

export function getAuthConfig(): AuthConfig {
  return config.getAuthConfig()
}

export function getPaymentConfig(): PaymentConfig {
  return config.getPaymentConfig()
}

// Environment-specific configuration helpers
export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return getClientConfig().APP_URL
  }
  return getServerConfig().NEXT_PUBLIC_APP_URL
}

export function isDebugMode(): boolean {
  if (typeof window !== 'undefined') {
    return getClientConfig().DEBUG_MODE
  }
  return getServerConfig().NEXT_PUBLIC_DEBUG_MODE
}

// Configuration validation helpers
export function requireEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

export function getEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue
}

export function getBooleanEnvVar(name: string, defaultValue = false): boolean {
  const value = process.env[name]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

export function getNumberEnvVar(name: string, defaultValue?: number): number | undefined {
  const value = process.env[name]
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} is not a valid number: ${value}`)
  }
  return parsed
}

// Configuration constants for easy access
export const CONFIG_CONSTANTS = {
  // Subscription tiers
  SUBSCRIPTION_TIERS: {
    BASIC: 'basic',
    PREMIUM: 'premium',
    PRO: 'pro',
  } as const,
  
  // User roles
  USER_ROLES: {
    VIEWER: 'viewer',
    STREAMER: 'streamer',
    ADMIN: 'admin',
  } as const,
  
  // Stream statuses
  STREAM_STATUSES: {
    INACTIVE: 'inactive',
    ACTIVE: 'active',
    ENDED: 'ended',
  } as const,
  
  // File types
  ALLOWED_VIDEO_TYPES: ['mp4', 'mov', 'avi', 'mkv', 'webm'] as const,
  
  // Video qualities
  VIDEO_QUALITIES: {
    '480p': '480p',
    '720p': '720p',
    '1080p': '1080p',
    '4K': '4K',
  } as const,
} as const

// Type exports for convenience
export type SubscriptionTier = typeof CONFIG_CONSTANTS.SUBSCRIPTION_TIERS[keyof typeof CONFIG_CONSTANTS.SUBSCRIPTION_TIERS]
export type UserRole = typeof CONFIG_CONSTANTS.USER_ROLES[keyof typeof CONFIG_CONSTANTS.USER_ROLES]
export type StreamStatus = typeof CONFIG_CONSTANTS.STREAM_STATUSES[keyof typeof CONFIG_CONSTANTS.STREAM_STATUSES]
export type VideoQuality = typeof CONFIG_CONSTANTS.VIDEO_QUALITIES[keyof typeof CONFIG_CONSTANTS.VIDEO_QUALITIES]