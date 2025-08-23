import { getApps } from 'firebase/app'
import { getApps as getAdminApps } from 'firebase-admin/app'

// Test Firebase configuration without making API calls
export function testFirebaseConfig(): {
  client: boolean
  admin: boolean
  clientApp: any
  adminApp: any
  error?: string
} {
  let clientApp = null
  let adminApp = null
  let clientInitialized = false
  let adminInitialized = false
  let error = ''

  try {
    // Test client configuration
    const clientApps = getApps()
    if (clientApps.length > 0) {
      clientApp = clientApps[0]
      clientInitialized = true
    }
  } catch (err) {
    error += `Client config error: ${err instanceof Error ? err.message : 'Unknown error'}. `
  }

  try {
    // Test admin configuration
    const adminApps = getAdminApps()
    if (adminApps.length > 0) {
      adminApp = adminApps[0]
      adminInitialized = true
    }
  } catch (err) {
    error += `Admin config error: ${err instanceof Error ? err.message : 'Unknown error'}. `
  }

  return {
    client: clientInitialized,
    admin: adminInitialized,
    clientApp: clientApp
      ? {
          name: clientApp.name,
          options: {
            projectId: clientApp.options.projectId,
            apiKey: clientApp.options.apiKey ? '***' : undefined,
          },
        }
      : null,
    adminApp: adminApp
      ? {
          name: adminApp.name,
          projectId: adminApp.options.projectId,
        }
      : null,
    error: error || undefined,
  }
}

// Test environment configuration
export function testEnvironmentConfig(): {
  isValid: boolean
  clientConfig: any
  adminConfig: any
  missing: string[]
} {
  const clientRequired = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ]

  const missing: string[] = []

  clientRequired.forEach(key => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  // Check service account file
  const fs = require('fs')
  const path = require('path')
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), '.gcp', 'service-account.json')

  let serviceAccountExists = false
  try {
    serviceAccountExists = fs.existsSync(serviceAccountPath)
  } catch (err) {
    // File system error
  }

  if (!serviceAccountExists) {
    missing.push('Service account file')
  }

  return {
    isValid: missing.length === 0,
    clientConfig: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '***' : undefined,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '***' : undefined,
    },
    adminConfig: {
      projectId: process.env.GCP_PROJECT_ID,
      serviceAccountPath,
      serviceAccountExists,
    },
    missing,
  }
}
