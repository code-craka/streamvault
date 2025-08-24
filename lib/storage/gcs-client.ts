import { Storage } from '@google-cloud/storage'

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

// Get the configured bucket
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)

export { storage, bucket }

// Bucket configuration and lifecycle policies
export const BUCKET_CONFIG = {
  name: process.env.GCS_BUCKET_NAME!,
  location: 'us-central1',
  storageClass: 'STANDARD',
  uniformBucketLevelAccess: true,
  publicAccessPrevention: 'enforced',
  versioning: {
    enabled: true,
  },
  lifecycle: {
    rule: [
      {
        action: {
          type: 'Delete' as const,
        },
        condition: {
          age: 365, // Delete files older than 1 year
          isLive: false, // Only delete non-current versions
        },
      },
      {
        action: {
          type: 'SetStorageClass' as const,
          storageClass: 'NEARLINE',
        },
        condition: {
          age: 30, // Move to nearline after 30 days
        },
      },
      {
        action: {
          type: 'SetStorageClass' as const,
          storageClass: 'COLDLINE',
        },
        condition: {
          age: 90, // Move to coldline after 90 days
        },
      },
    ],
  },
  cors: [
    {
      origin: [process.env.NEXT_PUBLIC_APP_URL!, 'http://localhost:3000'],
      method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
      responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
      maxAgeSeconds: 3600,
    },
  ],
}

// Validate bucket configuration
export async function validateBucketAccess(): Promise<boolean> {
  try {
    const [exists] = await bucket.exists()
    if (!exists) {
      throw new Error(`Bucket ${process.env.GCS_BUCKET_NAME} does not exist`)
    }

    // Test bucket access by listing files (limited to 1)
    const [files] = await bucket.getFiles({ maxResults: 1 })
    console.log(`✅ Bucket access validated. Found ${files.length} files.`)

    return true
  } catch (error) {
    console.error('❌ Bucket access validation failed:', error)
    return false
  }
}

// Initialize bucket with proper configuration
export async function initializeBucket(): Promise<void> {
  try {
    const [exists] = await bucket.exists()

    if (!exists) {
      console.log(`Creating bucket: ${BUCKET_CONFIG.name}`)
      await storage.createBucket(BUCKET_CONFIG.name, {
        location: BUCKET_CONFIG.location,
        storageClass: BUCKET_CONFIG.storageClass,
        uniformBucketLevelAccess: BUCKET_CONFIG.uniformBucketLevelAccess,
        publicAccessPrevention: BUCKET_CONFIG.publicAccessPrevention,
        versioning: BUCKET_CONFIG.versioning,
      })
      console.log(`✅ Bucket ${BUCKET_CONFIG.name} created successfully`)
    }

    // Update bucket configuration
    await bucket.setMetadata({
      lifecycle: BUCKET_CONFIG.lifecycle,
      cors: BUCKET_CONFIG.cors,
    })

    console.log(`✅ Bucket ${BUCKET_CONFIG.name} configured successfully`)
  } catch (error) {
    console.error('❌ Failed to initialize bucket:', error)
    throw error
  }
}

// Get bucket information
export async function getBucketInfo() {
  try {
    const [metadata] = await bucket.getMetadata()
    return {
      name: metadata.name,
      location: metadata.location,
      storageClass: metadata.storageClass,
      created: metadata.timeCreated,
      updated: metadata.updated,
      versioning: metadata.versioning,
      lifecycle: metadata.lifecycle,
      cors: metadata.cors,
    }
  } catch (error) {
    console.error('❌ Failed to get bucket info:', error)
    throw error
  }
}
