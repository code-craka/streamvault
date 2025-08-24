// Main storage module exports
export { storage, bucket, validateBucketAccess, getBucketInfo, initializeBucket } from './gcs-client'
export { fileUploadService, FileUploadService } from './file-upload'
export { validateGCSConfig, STORAGE_CONFIG, isValidFileType, isValidFileSize, generateFilePath } from './config'
export { testGCSConfiguration, testVideoUpload, runAllGCSTests } from './gcs-test'
export { testSignedURLService, testSignedURLGeneration, testSignedURLRefresh } from './signed-url-test'
export { signedURLService, SignedURLService, VideoAccessError } from './signed-url-service'

// Re-export types
export type { UploadOptions, UploadResult } from './file-upload'
export type { 
  VideoAccessRequest, 
  PlaybackSession, 
  VideoAccessLog, 
  SignedURLResult, 
  VideoAccessAnalytics 
} from './signed-url-service'