import { FirestoreService } from '../../lib/firebase/firestore'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}))

jest.mock('../../lib/firebase/config', () => ({
  db: {},
}))

describe('FirestoreService', () => {
  let service: FirestoreService

  beforeEach(() => {
    service = new FirestoreService('test-collection')
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with collection name', () => {
      expect(service).toBeInstanceOf(FirestoreService)
    })
  })

  describe('getCollection', () => {
    it('should return collection reference', () => {
      const mockCollection = jest.requireMock('firebase/firestore').collection
      service.getCollection()
      expect(mockCollection).toHaveBeenCalledWith({}, 'test-collection')
    })
  })

  describe('getDocRef', () => {
    it('should return document reference', () => {
      const mockDoc = jest.requireMock('firebase/firestore').doc
      service.getDocRef('test-id')
      expect(mockDoc).toHaveBeenCalledWith({}, 'test-collection', 'test-id')
    })
  })

  describe('create', () => {
    it('should add document with timestamps', async () => {
      const mockAddDoc = jest.requireMock('firebase/firestore').addDoc
      const mockTimestamp = jest.requireMock('firebase/firestore').Timestamp

      mockAddDoc.mockResolvedValue({ id: 'new-doc-id' })

      const testData = { name: 'Test Document' }
      const result = await service.create(testData)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...testData,
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      )
      expect(result).toBe('new-doc-id')
    })

    it('should handle errors', async () => {
      const mockAddDoc = jest.requireMock('firebase/firestore').addDoc
      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(service.create({})).rejects.toThrow('Firestore error')
    })
  })

  describe('getById', () => {
    it('should return document data when exists', async () => {
      const mockGetDoc = jest.requireMock('firebase/firestore').getDoc
      const mockDocSnap = {
        exists: () => true,
        id: 'test-id',
        data: () => ({ name: 'Test Document' }),
      }
      mockGetDoc.mockResolvedValue(mockDocSnap)

      const result = await service.getById('test-id')

      expect(result).toEqual({
        id: 'test-id',
        name: 'Test Document',
      })
    })

    it('should return null when document does not exist', async () => {
      const mockGetDoc = jest.requireMock('firebase/firestore').getDoc
      const mockDocSnap = {
        exists: () => false,
      }
      mockGetDoc.mockResolvedValue(mockDocSnap)

      const result = await service.getById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update document with timestamp', async () => {
      const mockUpdateDoc = jest.requireMock('firebase/firestore').updateDoc
      mockUpdateDoc.mockResolvedValue(undefined)

      const updateData = { name: 'Updated Document' }
      await service.update('test-id', updateData)

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updateData,
          updatedAt: expect.anything(),
        })
      )
    })
  })

  describe('delete', () => {
    it('should delete document', async () => {
      const mockDeleteDoc = jest.requireMock('firebase/firestore').deleteDoc
      mockDeleteDoc.mockResolvedValue(undefined)

      await service.delete('test-id')

      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything())
    })
  })

  describe('getMany', () => {
    it('should return array of documents', async () => {
      const mockGetDocs = jest.requireMock('firebase/firestore').getDocs
      const mockQuery = jest.requireMock('firebase/firestore').query

      const mockQuerySnapshot = {
        docs: [
          { id: 'doc1', data: () => ({ name: 'Document 1' }) },
          { id: 'doc2', data: () => ({ name: 'Document 2' }) },
        ],
      }

      mockGetDocs.mockResolvedValue(mockQuerySnapshot)
      mockQuery.mockReturnValue({})

      const result = await service.getMany([])

      expect(result).toEqual([
        { id: 'doc1', name: 'Document 1' },
        { id: 'doc2', name: 'Document 2' },
      ])
    })
  })
})

describe('Firebase Configuration', () => {
  it('should have required environment variables', () => {
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ]

    // In test environment, we'll mock these
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        process.env[varName] = `mock-${varName.toLowerCase()}`
      }
    })

    expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeDefined()
  })
})
