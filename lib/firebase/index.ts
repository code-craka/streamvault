// Client-side Firebase exports
export { db, auth, storage, app } from './config'

// Server-side Firebase exports
export { adminDb, adminAuth, verifyAdminConfig } from './admin'

// Firestore service utilities
export {
  FirestoreService,
  usersService,
  streamsService,
  videosService,
  analyticsService,
  subscriptionsService,
  notificationsService,
  firestoreHelpers,
} from './firestore'

// Connection testing utilities
export {
  testClientConnection,
  testAdminConnection,
  testCRUDOperations,
  runFirebaseTests,
  validateFirebaseEnvironment,
} from './connection-test'

// Initialization utilities
export {
  initializeFirebase,
  getFirebaseStatus,
  ensureFirebaseInitialized,
} from './init'

// Re-export Firebase types for convenience
export type {
  DocumentData,
  QueryConstraint,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from 'firebase/firestore'