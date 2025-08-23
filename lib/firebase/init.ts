import { validateFirebaseEnvironment } from './connection-test'

// Firebase initialization status
let isInitialized = false
let initializationError: Error | null = null

// Initialize Firebase with proper error handling
export async function initializeFirebase(): Promise<{
  success: boolean
  error?: string
}> {
  if (isInitialized) {
    return { success: true }
  }

  try {
    // Validate environment configuration
    const envValidation = validateFirebaseEnvironment()

    if (!envValidation.isValid) {
      const error = `Firebase configuration incomplete. Missing: ${envValidation.missing.join(', ')}`
      initializationError = new Error(error)
      return { success: false, error }
    }

    // Log warnings if any
    if (envValidation.warnings.length > 0) {
      console.warn('Firebase configuration warnings:', envValidation.warnings)
    }

    // Import Firebase configurations (this will initialize them)
    if (typeof window !== 'undefined') {
      // Client-side initialization
      await import('./config')
      console.log('✅ Firebase client initialized successfully')
    } else {
      // Server-side initialization
      await import('./admin')
      console.log('✅ Firebase admin initialized successfully')
    }

    isInitialized = true
    return { success: true }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown Firebase initialization error'
    initializationError =
      error instanceof Error ? error : new Error(errorMessage)
    console.error('❌ Firebase initialization failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

// Get initialization status
export function getFirebaseStatus(): {
  isInitialized: boolean
  error: Error | null
} {
  return {
    isInitialized,
    error: initializationError,
  }
}

// Ensure Firebase is initialized (throws if not)
export async function ensureFirebaseInitialized(): Promise<void> {
  const result = await initializeFirebase()
  if (!result.success) {
    throw new Error(`Firebase not initialized: ${result.error}`)
  }
}

// Auto-initialize Firebase when this module is imported
if (typeof window !== 'undefined') {
  // Client-side auto-initialization
  initializeFirebase().catch(error => {
    console.error('Auto-initialization failed:', error)
  })
} else {
  // Server-side auto-initialization
  initializeFirebase().catch(error => {
    console.error('Server-side auto-initialization failed:', error)
  })
}
