#!/usr/bin/env node

/**
 * Google Cloud Storage Setup Script
 *
 * This script initializes and validates the GCS bucket configuration
 * for the StreamVault application.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key] = value
        }
      }
    })

    log('✅ Loaded environment variables from .env.local', 'green')
  } else {
    log('⚠️  .env.local file not found', 'yellow')
  }
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkEnvironmentVariables() {
  log('\n🔍 Checking environment variables...', 'blue')

  const requiredVars = [
    'GCP_PROJECT_ID',
    'GCS_BUCKET_NAME',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCS_SERVICE_ACCOUNT_EMAIL',
  ]

  const missing = []

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
      log(`   ❌ Missing: ${varName}`, 'red')
    } else {
      log(`   ✅ Found: ${varName}`, 'green')
    }
  }

  if (missing.length > 0) {
    log(
      `\n❌ Missing required environment variables: ${missing.join(', ')}`,
      'red'
    )
    log(
      'Please check your .env.local file and ensure all GCS variables are set.',
      'yellow'
    )
    process.exit(1)
  }

  log('✅ All required environment variables are set', 'green')
}

function checkServiceAccountFile() {
  log('\n🔑 Checking service account file...', 'blue')

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!credentialsPath) {
    log('❌ GOOGLE_APPLICATION_CREDENTIALS not set', 'red')
    return false
  }

  if (!fs.existsSync(credentialsPath)) {
    log(`❌ Service account file not found: ${credentialsPath}`, 'red')
    return false
  }

  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))

    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email']
    const missingFields = requiredFields.filter(field => !credentials[field])

    if (missingFields.length > 0) {
      log(
        `❌ Invalid service account file. Missing fields: ${missingFields.join(', ')}`,
        'red'
      )
      return false
    }

    if (credentials.client_email !== process.env.GCS_SERVICE_ACCOUNT_EMAIL) {
      log(`❌ Service account email mismatch`, 'red')
      log(`   Expected: ${process.env.GCS_SERVICE_ACCOUNT_EMAIL}`, 'yellow')
      log(`   Found: ${credentials.client_email}`, 'yellow')
      return false
    }

    log('✅ Service account file is valid', 'green')
    log(`   Project ID: ${credentials.project_id}`, 'cyan')
    log(`   Client Email: ${credentials.client_email}`, 'cyan')

    return true
  } catch (error) {
    log(`❌ Failed to parse service account file: ${error.message}`, 'red')
    return false
  }
}

function checkGCloudCLI() {
  log('\n☁️  Checking Google Cloud CLI...', 'blue')

  try {
    execSync('gcloud --version', { stdio: 'pipe' })
    log('✅ Google Cloud CLI is installed', 'green')

    // Check authentication
    try {
      const authList = execSync('gcloud auth list --format="value(account)"', {
        encoding: 'utf8',
      })
      if (authList.trim()) {
        log(`✅ Authenticated accounts found`, 'green')
        authList
          .trim()
          .split('\n')
          .forEach(account => {
            log(`   - ${account}`, 'cyan')
          })
      } else {
        log('⚠️  No authenticated accounts found', 'yellow')
        log('Run: gcloud auth login', 'yellow')
      }
    } catch (error) {
      log('⚠️  Could not check authentication status', 'yellow')
    }

    return true
  } catch (error) {
    log('⚠️  Google Cloud CLI not found or not in PATH', 'yellow')
    log('Install from: https://cloud.google.com/sdk/docs/install', 'yellow')
    return false
  }
}

async function testBucketAccess() {
  log('\n🪣 Testing bucket access...', 'blue')

  try {
    // Use Google Cloud Storage library directly
    const { Storage } = require('@google-cloud/storage')

    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME)

    // Test bucket existence
    const [exists] = await bucket.exists()
    if (!exists) {
      log(`❌ Bucket ${process.env.GCS_BUCKET_NAME} does not exist`, 'red')
      log('\n💡 Create the bucket with:', 'yellow')
      log(`   gsutil mb gs://${process.env.GCS_BUCKET_NAME}`, 'cyan')
      return false
    }

    // Test bucket access by listing files (limited to 1)
    const [files] = await bucket.getFiles({ maxResults: 1 })
    log(`✅ Bucket access validated successfully`, 'green')
    log(`   Bucket: gs://${process.env.GCS_BUCKET_NAME}`, 'cyan')
    log(`   Files found: ${files.length}`, 'cyan')

    return true
  } catch (error) {
    log(`❌ Bucket access test failed: ${error.message}`, 'red')

    // Provide helpful error messages
    if (error.message.includes('does not exist')) {
      log('\n💡 Troubleshooting:', 'yellow')
      log('1. Verify the bucket name in your environment variables', 'yellow')
      log("2. Create the bucket if it doesn't exist:", 'yellow')
      log(`   gsutil mb gs://${process.env.GCS_BUCKET_NAME}`, 'cyan')
    } else if (
      error.message.includes('permission') ||
      error.message.includes('access')
    ) {
      log('\n💡 Troubleshooting:', 'yellow')
      log('1. Verify service account permissions', 'yellow')
      log('2. Ensure the service account has Storage Admin role', 'yellow')
      log('3. Check if the service account key is valid', 'yellow')
    } else if (error.message.includes('ENOENT')) {
      log('\n💡 Troubleshooting:', 'yellow')
      log('1. Check if the service account file path is correct', 'yellow')
      log('2. Verify the file exists and is readable', 'yellow')
    }

    return false
  }
}

async function runSetup() {
  log('🚀 StreamVault GCS Setup', 'magenta')
  log('='.repeat(50), 'magenta')

  try {
    // Step 0: Load environment variables
    loadEnvFile()

    // Step 1: Check environment variables
    checkEnvironmentVariables()

    // Step 2: Check service account file
    const serviceAccountValid = checkServiceAccountFile()
    if (!serviceAccountValid) {
      log('\n❌ Setup failed: Invalid service account configuration', 'red')
      process.exit(1)
    }

    // Step 3: Check gcloud CLI (optional)
    checkGCloudCLI()

    // Step 4: Test bucket access
    const bucketAccessValid = await testBucketAccess()
    if (!bucketAccessValid) {
      log('\n❌ Setup failed: Cannot access GCS bucket', 'red')
      process.exit(1)
    }

    // Success
    log('\n🎉 GCS setup completed successfully!', 'green')
    log('='.repeat(50), 'green')
    log('Your Google Cloud Storage is ready for StreamVault.', 'green')
    log('\nNext steps:', 'blue')
    log('1. Run the application: pnpm dev', 'cyan')
    log(
      '2. Test the storage API: curl http://localhost:3000/api/storage/test',
      'cyan'
    )
  } catch (error) {
    log(`\n💥 Setup failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  runSetup()
}

module.exports = { runSetup }
