#!/usr/bin/env node

/**
 * Direct GCS Test Script
 * 
 * This script tests GCS functionality directly without needing the Next.js server
 */

const fs = require('fs')
const path = require('path')

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      }
    })
  }
}

async function testGCSDirectly() {
  console.log('🧪 Testing GCS functionality directly...\n')
  
  try {
    // Load environment
    loadEnvFile()
    
    // Import GCS library
    const { Storage } = require('@google-cloud/storage')
    
    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })
    
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME)
    
    // Test 1: Bucket access
    console.log('1️⃣ Testing bucket access...')
    const [exists] = await bucket.exists()
    if (!exists) {
      throw new Error(`Bucket ${process.env.GCS_BUCKET_NAME} does not exist`)
    }
    console.log('   ✅ Bucket exists and is accessible')
    
    // Test 2: Upload a test file
    console.log('\n2️⃣ Testing file upload...')
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`)
    const testFileName = `test/direct-test-${Date.now()}.txt`
    
    const file = bucket.file(testFileName)
    await file.save(testContent, {
      metadata: {
        contentType: 'text/plain',
        metadata: {
          purpose: 'direct-test',
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log(`   ✅ File uploaded: ${testFileName}`)
    
    // Test 3: Check file exists
    console.log('\n3️⃣ Testing file existence...')
    const [fileExists] = await file.exists()
    console.log(`   ✅ File exists: ${fileExists}`)
    
    // Test 4: Get file metadata
    console.log('\n4️⃣ Testing file metadata...')
    const [metadata] = await file.getMetadata()
    console.log(`   ✅ File size: ${metadata.size} bytes`)
    console.log(`   ✅ Content type: ${metadata.contentType}`)
    console.log(`   ✅ Created: ${metadata.timeCreated}`)
    
    // Test 5: Download file
    console.log('\n5️⃣ Testing file download...')
    const [downloadedContent] = await file.download()
    const downloadedText = downloadedContent.toString()
    console.log(`   ✅ Downloaded content: ${downloadedText.substring(0, 50)}...`)
    
    // Test 6: List files
    console.log('\n6️⃣ Testing file listing...')
    const [files] = await bucket.getFiles({ prefix: 'test/', maxResults: 5 })
    console.log(`   ✅ Found ${files.length} test files`)
    files.forEach((f, index) => {
      console.log(`      ${index + 1}. ${f.name}`)
    })
    
    // Test 7: Clean up
    console.log('\n7️⃣ Cleaning up test file...')
    await file.delete()
    console.log('   ✅ Test file deleted')
    
    console.log('\n🎉 All GCS tests passed successfully!')
    
  } catch (error) {
    console.error('\n❌ GCS test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testGCSDirectly()