#!/usr/bin/env node

/**
 * GCS Bucket Configuration Script
 * 
 * This script configures the GCS bucket with proper lifecycle policies,
 * security settings, and CORS configuration for StreamVault.
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

async function configureBucket() {
  console.log('⚙️  Configuring GCS bucket for StreamVault...\n')
  
  try {
    loadEnvFile()
    
    const { Storage } = require('@google-cloud/storage')
    
    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })
    
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME)
    
    // Verify bucket exists
    const [exists] = await bucket.exists()
    if (!exists) {
      throw new Error(`Bucket ${process.env.GCS_BUCKET_NAME} does not exist`)
    }
    
    console.log('1️⃣ Configuring lifecycle policies...')
    
    // Configure lifecycle rules
    const lifecycleRules = [
      {
        action: {
          type: 'Delete',
        },
        condition: {
          age: 7,
          matchesPrefix: ['temp/', 'uploads/temp/'],
        },
      },
      {
        action: {
          type: 'SetStorageClass',
          storageClass: 'NEARLINE',
        },
        condition: {
          age: 30,
          matchesPrefix: ['videos/', 'live-streams/'],
        },
      },
      {
        action: {
          type: 'SetStorageClass',
          storageClass: 'COLDLINE',
        },
        condition: {
          age: 90,
          matchesPrefix: ['videos/', 'live-streams/'],
        },
      },
      {
        action: {
          type: 'Delete',
        },
        condition: {
          age: 365,
          isLive: false, // Only delete non-current versions
        },
      },
    ]
    
    console.log('2️⃣ Configuring CORS policies...')
    
    // Configure CORS
    const corsConfiguration = [
      {
        origin: [
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'http://localhost:3000',
          'https://streamvault.app',
          'https://*.streamvault.app',
        ],
        method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
        responseHeader: [
          'Content-Type',
          'Access-Control-Allow-Origin',
          'Access-Control-Allow-Methods',
          'Access-Control-Allow-Headers',
        ],
        maxAgeSeconds: 3600,
      },
    ]
    
    console.log('3️⃣ Applying bucket configuration...')
    
    // Apply configuration
    await bucket.setMetadata({
      lifecycle: {
        rule: lifecycleRules,
      },
      cors: corsConfiguration,
      versioning: {
        enabled: true,
      },
    })
    
    console.log('4️⃣ Configuring uniform bucket-level access...')
    
    // Enable uniform bucket-level access for better security
    await bucket.setMetadata({
      uniformBucketLevelAccess: {
        enabled: true,
      },
    })
    
    console.log('5️⃣ Configuring public access prevention...')
    
    // Prevent public access
    await bucket.setMetadata({
      publicAccessPrevention: 'enforced',
    })
    
    console.log('6️⃣ Verifying configuration...')
    
    // Get and display current configuration
    const [metadata] = await bucket.getMetadata()
    
    console.log('\n📊 Bucket Configuration Summary:')
    console.log(`   Name: ${metadata.name}`)
    console.log(`   Location: ${metadata.location}`)
    console.log(`   Storage Class: ${metadata.storageClass}`)
    console.log(`   Versioning: ${metadata.versioning?.enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`   Uniform Bucket Access: ${metadata.uniformBucketLevelAccess?.enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`   Public Access Prevention: ${metadata.publicAccessPrevention || 'Not set'}`)
    console.log(`   Lifecycle Rules: ${metadata.lifecycle?.rule?.length || 0} rules configured`)
    console.log(`   CORS Rules: ${metadata.cors?.length || 0} rules configured`)
    
    if (metadata.lifecycle?.rule) {
      console.log('\n📋 Lifecycle Rules:')
      metadata.lifecycle.rule.forEach((rule, index) => {
        console.log(`   ${index + 1}. ${rule.action.type} after ${rule.condition.age || 'N/A'} days`)
        if (rule.condition.matchesPrefix) {
          console.log(`      Applies to: ${rule.condition.matchesPrefix.join(', ')}`)
        }
      })
    }
    
    if (metadata.cors) {
      console.log('\n🌐 CORS Configuration:')
      metadata.cors.forEach((cors, index) => {
        console.log(`   ${index + 1}. Origins: ${cors.origin?.join(', ') || 'Any'}`)
        console.log(`      Methods: ${cors.method?.join(', ') || 'Any'}`)
        console.log(`      Max Age: ${cors.maxAgeSeconds || 'Not set'} seconds`)
      })
    }
    
    console.log('\n🎉 Bucket configuration completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Bucket configuration failed:', error.message)
    process.exit(1)
  }
}

// Run configuration
configureBucket()