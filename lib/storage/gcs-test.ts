import {
  validateBucketAccess,
  getBucketInfo,
  initializeBucket,
} from './gcs-client'
import { fileUploadService } from './file-upload'

/**
 * Test Google Cloud Storage configuration and functionality
 */
export async function testGCSConfiguration(): Promise<void> {
  console.log('🧪 Testing Google Cloud Storage Configuration...\n')

  try {
    // Test 1: Validate environment variables
    console.log('1️⃣ Testing environment variables...')
    const requiredEnvVars = [
      'GCP_PROJECT_ID',
      'GCS_BUCKET_NAME',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GCS_SERVICE_ACCOUNT_EMAIL',
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
      console.log(`   ✅ ${envVar}: ${process.env[envVar]}`)
    }

    // Test 2: Validate bucket access
    console.log('\n2️⃣ Testing bucket access...')
    const hasAccess = await validateBucketAccess()
    if (!hasAccess) {
      throw new Error('Bucket access validation failed')
    }

    // Test 3: Get bucket information
    console.log('\n3️⃣ Getting bucket information...')
    const bucketInfo = await getBucketInfo()
    console.log('   📊 Bucket Info:')
    console.log(`      Name: ${bucketInfo.name}`)
    console.log(`      Location: ${bucketInfo.location}`)
    console.log(`      Storage Class: ${bucketInfo.storageClass}`)
    console.log(`      Created: ${bucketInfo.created}`)
    console.log(
      `      Versioning: ${bucketInfo.versioning?.enabled ? 'Enabled' : 'Disabled'}`
    )

    // Test 4: Test file upload
    console.log('\n4️⃣ Testing file upload...')
    const testContent = Buffer.from(
      'This is a test file for StreamVault GCS integration'
    )
    const uploadResult = await fileUploadService.uploadFile(testContent, {
      folder: 'test',
      filename: `test-${Date.now()}.txt`,
      contentType: 'text/plain',
      metadata: {
        purpose: 'integration-test',
        timestamp: new Date().toISOString(),
      },
    })
    console.log('   ✅ File uploaded successfully:')
    console.log(`      Filename: ${uploadResult.filename}`)
    console.log(`      Size: ${uploadResult.size} bytes`)
    console.log(`      Content Type: ${uploadResult.contentType}`)

    // Test 5: Test file existence check
    console.log('\n5️⃣ Testing file existence check...')
    const exists = await fileUploadService.fileExists(uploadResult.filename)
    console.log(`   ✅ File exists: ${exists}`)

    // Test 6: Test file metadata retrieval
    console.log('\n6️⃣ Testing file metadata retrieval...')
    const metadata = await fileUploadService.getFileMetadata(
      uploadResult.filename
    )
    console.log('   ✅ File metadata retrieved:')
    console.log(`      Size: ${metadata.size}`)
    console.log(`      Content Type: ${metadata.contentType}`)
    console.log(`      Created: ${metadata.timeCreated}`)

    // Test 7: Test file listing
    console.log('\n7️⃣ Testing file listing...')
    const files = await fileUploadService.listFiles('test', 5)
    console.log(`   ✅ Found ${files.length} files in test folder`)
    files.forEach((file, index) => {
      console.log(`      ${index + 1}. ${file.name} (${file.size} bytes)`)
    })

    // Test 8: Clean up test file
    console.log('\n8️⃣ Cleaning up test file...')
    await fileUploadService.deleteFile(uploadResult.filename)
    console.log('   ✅ Test file deleted successfully')

    console.log('\n🎉 All GCS tests passed successfully!')
  } catch (error) {
    console.error('\n❌ GCS test failed:', error)
    throw error
  }
}

/**
 * Test video-specific upload functionality
 */
export async function testVideoUpload(): Promise<void> {
  console.log('\n🎬 Testing video upload functionality...\n')

  try {
    // Create a mock video buffer (small test data)
    const mockVideoBuffer = Buffer.alloc(1024 * 1024) // 1MB of zeros
    const videoId = `test-video-${Date.now()}`

    console.log('1️⃣ Testing video upload...')
    const uploadResult = await fileUploadService.uploadVideo(
      mockVideoBuffer,
      videoId,
      {
        title: 'Test Video',
        duration: '60',
        resolution: '1920x1080',
      }
    )

    console.log('   ✅ Video uploaded successfully:')
    console.log(`      Filename: ${uploadResult.filename}`)
    console.log(`      Size: ${uploadResult.size} bytes`)
    console.log(`      URL: ${uploadResult.url}`)

    // Test thumbnail upload
    console.log('\n2️⃣ Testing thumbnail upload...')
    const mockThumbnailBuffer = Buffer.alloc(50 * 1024) // 50KB thumbnail
    const thumbnailResult = await fileUploadService.uploadThumbnail(
      mockThumbnailBuffer,
      videoId,
      0
    )

    console.log('   ✅ Thumbnail uploaded successfully:')
    console.log(`      Filename: ${thumbnailResult.filename}`)
    console.log(`      Size: ${thumbnailResult.size} bytes`)
    console.log(`      URL: ${thumbnailResult.url}`)

    // Clean up
    console.log('\n3️⃣ Cleaning up test files...')
    await fileUploadService.deleteFile(uploadResult.filename)
    await fileUploadService.deleteFile(thumbnailResult.filename)
    console.log('   ✅ Test files cleaned up')

    console.log('\n🎉 Video upload tests passed successfully!')
  } catch (error) {
    console.error('\n❌ Video upload test failed:', error)
    throw error
  }
}

/**
 * Run all GCS tests
 */
export async function runAllGCSTests(): Promise<void> {
  try {
    await testGCSConfiguration()
    await testVideoUpload()
    console.log('\n🚀 All Google Cloud Storage tests completed successfully!')
  } catch (error) {
    console.error('\n💥 GCS tests failed:', error)
    process.exit(1)
  }
}
