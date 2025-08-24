import { z } from 'zod'

// Environment validation schema for GCS
export const GCSConfigSchema = z.object({
  GCP_PROJECT_ID: z.string().min(1, 'GCP Project ID is required'),
  GCS_BUCKET_NAME: z.string().min(1, 'GCS Bucket name is required'),
  GOOGLE_APPLICATION_CREDENTIALS: z
    .string()
    .min(1, 'Google Application Credentials path is required'),
  GCS_SERVICE_ACCOUNT_EMAIL: z.string().email('Invalid service account email'),
})

// Validate GCS configuration
export function validateGCSConfig() {
  try {
    return GCSConfigSchema.parse({
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
      GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      GCS_SERVICE_ACCOUNT_EMAIL: process.env.GCS_SERVICE_ACCOUNT_EMAIL,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors
        .map(err => err.path.join('.'))
        .join(', ')
      throw new Error(
        `Invalid GCS configuration. Missing or invalid fields: ${missingFields}`
      )
    }
    throw error
  }
}

// Storage configuration constants
export const STORAGE_CONFIG = {
  // File size limits
  MAX_VIDEO_SIZE: 5 * 1024 * 1024 * 1024, // 5GB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT_SIZE: 100 * 1024 * 1024, // 100MB

  // Allowed file types
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ],

  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],

  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/json'],

  // Folder structure
  FOLDERS: {
    VIDEOS: 'videos',
    THUMBNAILS: 'thumbnails',
    LIVE_STREAMS: 'live-streams',
    TEMP: 'temp',
    UPLOADS: 'uploads',
    EXPORTS: 'exports',
  },

  // Bucket lifecycle rules
  LIFECYCLE_RULES: {
    DELETE_TEMP_FILES_DAYS: 7,
    MOVE_TO_NEARLINE_DAYS: 30,
    MOVE_TO_COLDLINE_DAYS: 90,
    DELETE_OLD_VERSIONS_DAYS: 365,
  },

  // CORS configuration
  CORS_ORIGINS: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://streamvault.app',
    'https://*.streamvault.app',
  ],
} as const

// File type validation
export function isValidFileType(
  contentType: string,
  category: 'video' | 'image' | 'document'
): boolean {
  switch (category) {
    case 'video':
      return STORAGE_CONFIG.ALLOWED_VIDEO_TYPES.includes(contentType as any)
    case 'image':
      return STORAGE_CONFIG.ALLOWED_IMAGE_TYPES.includes(contentType as any)
    case 'document':
      return STORAGE_CONFIG.ALLOWED_DOCUMENT_TYPES.includes(contentType as any)
    default:
      return false
  }
}

// File size validation
export function isValidFileSize(
  size: number,
  category: 'video' | 'image' | 'document'
): boolean {
  switch (category) {
    case 'video':
      return size <= STORAGE_CONFIG.MAX_VIDEO_SIZE
    case 'image':
      return size <= STORAGE_CONFIG.MAX_IMAGE_SIZE
    case 'document':
      return size <= STORAGE_CONFIG.MAX_DOCUMENT_SIZE
    default:
      return false
  }
}

// Generate file path based on type and metadata
export function generateFilePath(
  type: 'video' | 'thumbnail' | 'live-stream' | 'temp' | 'upload',
  filename: string,
  metadata?: Record<string, string>
): string {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  switch (type) {
    case 'video':
      return `${STORAGE_CONFIG.FOLDERS.VIDEOS}/${timestamp}/${filename}`
    case 'thumbnail':
      return `${STORAGE_CONFIG.FOLDERS.THUMBNAILS}/${timestamp}/${filename}`
    case 'live-stream':
      return `${STORAGE_CONFIG.FOLDERS.LIVE_STREAMS}/${timestamp}/${filename}`
    case 'temp':
      return `${STORAGE_CONFIG.FOLDERS.TEMP}/${filename}`
    case 'upload':
      return `${STORAGE_CONFIG.FOLDERS.UPLOADS}/${timestamp}/${filename}`
    default:
      return `${STORAGE_CONFIG.FOLDERS.UPLOADS}/${filename}`
  }
}
