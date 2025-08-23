import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  DocumentData,
  QueryConstraint,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore'
import { db } from './config'

// Generic Firestore service class
export class FirestoreService {
  private collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  // Get collection reference
  getCollection(): CollectionReference {
    return collection(db, this.collectionName)
  }

  // Get document reference
  getDocRef(id: string): DocumentReference {
    return doc(db, this.collectionName, id)
  }

  // Create a new document
  async create(data: DocumentData): Promise<string> {
    try {
      const docRef = await addDoc(this.getCollection(), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      return docRef.id
    } catch (error) {
      console.error(`Error creating document in ${this.collectionName}:`, error)
      throw error
    }
  }

  // Get a single document by ID
  async getById(id: string): Promise<DocumentData | null> {
    try {
      const docSnap = await getDoc(this.getDocRef(id))
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        }
      }
      return null
    } catch (error) {
      console.error(
        `Error getting document ${id} from ${this.collectionName}:`,
        error
      )
      throw error
    }
  }

  // Update a document
  async update(id: string, data: Partial<DocumentData>): Promise<void> {
    try {
      await updateDoc(this.getDocRef(id), {
        ...data,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error(
        `Error updating document ${id} in ${this.collectionName}:`,
        error
      )
      throw error
    }
  }

  // Delete a document
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(this.getDocRef(id))
    } catch (error) {
      console.error(
        `Error deleting document ${id} from ${this.collectionName}:`,
        error
      )
      throw error
    }
  }

  // Get multiple documents with optional query constraints
  async getMany(constraints: QueryConstraint[] = []): Promise<DocumentData[]> {
    try {
      const q = query(this.getCollection(), ...constraints)
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error(
        `Error getting documents from ${this.collectionName}:`,
        error
      )
      throw error
    }
  }

  // Real-time listener for documents
  onSnapshot(
    callback: (data: DocumentData[]) => void,
    constraints: QueryConstraint[] = []
  ): () => void {
    const q = query(this.getCollection(), ...constraints)
    return onSnapshot(q, querySnapshot => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(data)
    })
  }

  // Real-time listener for a single document
  onDocSnapshot(
    id: string,
    callback: (data: DocumentData | null) => void
  ): () => void {
    return onSnapshot(this.getDocRef(id), docSnap => {
      if (docSnap.exists()) {
        callback({
          id: docSnap.id,
          ...docSnap.data(),
        })
      } else {
        callback(null)
      }
    })
  }
}

// Specific service instances for different collections
export const usersService = new FirestoreService('users')
export const streamsService = new FirestoreService('streams')
export const videosService = new FirestoreService('videos')
export const analyticsService = new FirestoreService('analytics')
export const subscriptionsService = new FirestoreService('subscriptions')
export const notificationsService = new FirestoreService('notifications')

// Helper functions for common queries
export const firestoreHelpers = {
  // Get user's streams
  getUserStreams: (userId: string) =>
    streamsService.getMany([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    ]),

  // Get active streams
  getActiveStreams: () =>
    streamsService.getMany([
      where('status', '==', 'active'),
      orderBy('viewerCount', 'desc'),
      limit(50),
    ]),

  // Get user's videos
  getUserVideos: (userId: string) =>
    videosService.getMany([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    ]),

  // Get recent chat messages for a stream
  getStreamMessages: (streamId: string) => {
    const messagesService = new FirestoreService(`streams/${streamId}/messages`)
    return messagesService.getMany([orderBy('timestamp', 'desc'), limit(100)])
  },

  // Real-time chat listener
  listenToChat: (
    streamId: string,
    callback: (messages: DocumentData[]) => void
  ) => {
    const messagesService = new FirestoreService(`streams/${streamId}/messages`)
    return messagesService.onSnapshot(callback, [
      orderBy('timestamp', 'desc'),
      limit(100),
    ])
  },
}

export default FirestoreService
