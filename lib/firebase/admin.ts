import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import path from 'path'

// Firebase Admin configuration using service account file
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), '.gcp', 'service-account.json')

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccountPath),
      projectId: process.env.GCP_PROJECT_ID || 'shining-courage-465501-i8',
    })
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    throw error
  }
}

// Export admin services
export const adminDb = getFirestore()
export const adminAuth = getAuth()

// Helper function to verify Firebase Admin is properly configured
export const verifyAdminConfig = (): boolean => {
  try {
    const serviceAccountPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(process.cwd(), '.gcp', 'service-account.json')

    // Check if service account file exists
    const fs = require('fs')
    return fs.existsSync(serviceAccountPath) && !!process.env.GCP_PROJECT_ID
  } catch (error) {
    console.error('Firebase Admin configuration error:', error)
    return false
  }
}

const firebaseAdmin = { adminDb, adminAuth }
export default firebaseAdmin
