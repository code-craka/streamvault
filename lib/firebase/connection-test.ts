import { db } from './config'
import { adminDb, verifyAdminConfig } from './admin'
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'

// Test Firebase client connection
export async function testClientConnection(): Promise<boolean> {
  try {
    // Try to read from a test collection
    const testCollection = collection(db, 'connection-test')
    await getDocs(testCollection)
    console.log('✅ Firebase client connection successful')
    return true
  } catch (error) {
    console.error('❌ Firebase client connection failed:', error)
    return false
  }
}

// Test Firebase Admin connection
export async function testAdminConnection(): Promise<boolean> {
  try {
    // Verify admin configuration
    if (!verifyAdminConfig()) {
      console.error('❌ Firebase Admin configuration incomplete')
      return false
    }

    // Try to read from a test collection using admin SDK
    const testCollection = adminDb.collection('connection-test')
    await testCollection.get()
    console.log('✅ Firebase Admin connection successful')
    return true
  } catch (error) {
    console.error('❌ Firebase Admin connection failed:', error)
    return false
  }
}

// Test basic CRUD operations
export async function testCRUDOperations(): Promise<boolean> {
  try {
    const testCollection = collection(db, 'crud-test')

    // Create
    const testData = {
      message: 'Test document',
      timestamp: new Date(),
      testId: Math.random().toString(36).substring(7),
    }

    const docRef = await addDoc(testCollection, testData)
    console.log('✅ Create operation successful, document ID:', docRef.id)

    // Read
    const snapshot = await getDocs(testCollection)
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log(
      '✅ Read operation successful, found',
      documents.length,
      'documents'
    )

    // Delete test document
    await deleteDoc(doc(db, 'crud-test', docRef.id))
    console.log('✅ Delete operation successful')

    return true
  } catch (error) {
    console.error('❌ CRUD operations test failed:', error)
    return false
  }
}

// Comprehensive Firebase connection test
export async function runFirebaseTests(): Promise<{
  client: boolean
  admin: boolean
  crud: boolean
  overall: boolean
}> {
  console.log('🔥 Starting Firebase connection tests...\n')

  const results = {
    client: await testClientConnection(),
    admin: await testAdminConnection(),
    crud: false,
    overall: false,
  }

  // Only test CRUD if client connection works
  if (results.client) {
    results.crud = await testCRUDOperations()
  }

  results.overall = results.client && results.admin && results.crud

  console.log('\n📊 Firebase Test Results:')
  console.log('Client Connection:', results.client ? '✅' : '❌')
  console.log('Admin Connection:', results.admin ? '✅' : '❌')
  console.log('CRUD Operations:', results.crud ? '✅' : '❌')
  console.log(
    'Overall Status:',
    results.overall ? '✅ All tests passed' : '❌ Some tests failed'
  )

  return results
}

// Environment validation
export function validateFirebaseEnvironment(): {
  isValid: boolean
  missing: string[]
  warnings: string[]
} {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'GCP_PROJECT_ID',
  ]

  const missing: string[] = []
  const warnings: string[] = []

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  // Check for service account file
  const fs = require('fs')
  const path = require('path')
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), '.gcp', 'service-account.json')

  if (!fs.existsSync(serviceAccountPath)) {
    missing.push('GOOGLE_APPLICATION_CREDENTIALS (service account file)')
  }

  // Check for common issues
  if (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== process.env.GCP_PROJECT_ID
  ) {
    warnings.push('Client Firebase project ID does not match GCP project ID')
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  }
}
