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
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  FirestoreError,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type {
  DatabaseResult,
  PaginatedResult,
  QueryOptions,
} from '@/types/database'

export abstract class BaseService<T> {
  protected collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<DatabaseResult<T>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        }
      }

      const data = this.transformFromFirestore(docSnap.data(), docSnap.id)
      return {
        success: true,
        data,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Create a new document
   */
  async create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DatabaseResult<T>> {
    try {
      const now = Timestamp.now()
      const docData = {
        ...data,
        createdAt: now,
        updatedAt: now,
      }

      const docRef = await addDoc(collection(db, this.collectionName), docData)
      const createdDoc = await getDoc(docRef)

      if (!createdDoc.exists()) {
        return {
          success: false,
          error: 'Failed to create document',
          code: 'CREATE_FAILED',
        }
      }

      const result = this.transformFromFirestore(
        createdDoc.data(),
        createdDoc.id
      )
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Update a document by ID
   */
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<DatabaseResult<T>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(docRef, updateData)

      // Fetch the updated document
      const updatedDoc = await getDoc(docRef)
      if (!updatedDoc.exists()) {
        return {
          success: false,
          error: 'Document not found after update',
          code: 'NOT_FOUND',
        }
      }

      const result = this.transformFromFirestore(
        updatedDoc.data(),
        updatedDoc.id
      )
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<DatabaseResult<boolean>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)

      return {
        success: true,
        data: true,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Query documents with pagination
   */
  async query(
    options: QueryOptions = {}
  ): Promise<DatabaseResult<PaginatedResult<T>>> {
    try {
      const constraints: QueryConstraint[] = []

      // Add where clauses
      if (options.where) {
        options.where.forEach(condition => {
          constraints.push(
            where(condition.field, condition.operator, condition.value)
          )
        })
      }

      // Add order by clauses
      if (options.orderBy) {
        options.orderBy.forEach(order => {
          constraints.push(orderBy(order.field, order.direction))
        })
      }

      // Add limit
      if (options.limit) {
        constraints.push(limit(options.limit + 1)) // +1 to check if there are more items
      }

      const q = query(collection(db, this.collectionName), ...constraints)
      const querySnapshot = await getDocs(q)

      const items: T[] = []
      const docs = querySnapshot.docs

      // Process documents (excluding the extra one for pagination check)
      const itemsToProcess = options.limit ? docs.slice(0, options.limit) : docs
      itemsToProcess.forEach(doc => {
        const item = this.transformFromFirestore(doc.data(), doc.id)
        items.push(item)
      })

      const hasMore = options.limit ? docs.length > options.limit : false
      const total = items.length // Note: This is not the total count, just current page count

      return {
        success: true,
        data: {
          items,
          total,
          hasMore,
          nextCursor: hasMore ? docs[docs.length - 2].id : undefined,
        },
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Get documents by field value
   */
  async getByField(
    field: string,
    value: any,
    options: QueryOptions = {}
  ): Promise<DatabaseResult<T[]>> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [...(options.where || []), { field, operator: '==', value }],
    }

    const result = await this.query(queryOptions)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    }

    return {
      success: true,
      data: result.data!.items,
    }
  }

  /**
   * Check if a document exists
   */
  async exists(id: string): Promise<DatabaseResult<boolean>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      return {
        success: true,
        data: docSnap.exists(),
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Count documents matching criteria
   */
  async count(options: QueryOptions = {}): Promise<DatabaseResult<number>> {
    try {
      const result = await this.query({ ...options, limit: undefined })
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        }
      }

      return {
        success: true,
        data: result.data!.items.length,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Transform Firestore data to application model
   * Override this method in subclasses for custom transformations
   */
  protected transformFromFirestore(data: any, id: string): T {
    return {
      ...data,
      id,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as T
  }

  /**
   * Transform application model to Firestore data
   * Override this method in subclasses for custom transformations
   */
  protected transformToFirestore(data: any): any {
    const { id, createdAt, updatedAt, ...firestoreData } = data

    // Convert Date objects to Timestamps
    Object.keys(firestoreData).forEach(key => {
      if (firestoreData[key] instanceof Date) {
        firestoreData[key] = Timestamp.fromDate(firestoreData[key])
      }
    })

    return firestoreData
  }

  /**
   * Handle Firestore errors
   */
  protected handleError(error: any): DatabaseResult<any> {
    console.error(`${this.collectionName} service error:`, error)

    if (error instanceof FirestoreError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      }
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    }
  }

  /**
   * Batch operations helper
   */
  protected async batchOperation<R>(
    operations: (() => Promise<R>)[],
    maxConcurrency = 5
  ): Promise<R[]> {
    const results: R[] = []

    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency)
      const batchResults = await Promise.all(batch.map(op => op()))
      results.push(...batchResults)
    }

    return results
  }
}
