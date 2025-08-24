import { bucket } from './gcs-client'
import { v4 as uuidv4 } from 'uuid'

export interface UploadOptions {
  folder?: string
  filename?: string
  contentType?: string
  metadata?: Record<string, string>
  makePublic?: boolean
}

export interface UploadResult {
  filename: string
  url: string
  size: number
  contentType: string
  metadata?: Record<string, string>
}

// Allowed file types for video uploads
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
]

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

// Maximum file sizes (in bytes)
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export class FileUploadService {
  /**
   * Upload a file to Google Cloud Storage
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      folder = 'uploads',
      filename = `${uuidv4()}.bin`,
      contentType = 'application/octet-stream',
      metadata = {},
      makePublic = false,
    } = options

    // Validate file size
    this.validateFileSize(file, contentType)

    // Validate file type
    this.validateFileType(contentType)

    // Generate file path
    const filePath = folder ? `${folder}/${filename}` : filename

    try {
      const gcsFile = bucket.file(filePath)

      // Upload file with metadata
      await gcsFile.save(file, {
        metadata: {
          contentType,
          metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
            originalName: filename,
          },
        },
        resumable: file.length > 5 * 1024 * 1024, // Use resumable upload for files > 5MB
      })

      // Make public if requested
      if (makePublic) {
        await gcsFile.makePublic()
      }

      // Get file metadata
      const [fileMetadata] = await gcsFile.getMetadata()

      return {
        filename: filePath,
        url: makePublic 
          ? `https://storage.googleapis.com/${bucket.name}/${filePath}`
          : `gs://${bucket.name}/${filePath}`,
        size: parseInt(String(fileMetadata.size || '0')),
        contentType: fileMetadata.contentType || contentType,
        metadata: fileMetadata.metadata as Record<string, string> | undefined,
      }
    } catch (error) {
      console.error('❌ File upload failed:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload video file with specific handling
   */
  async uploadVideo(
    videoBuffer: Buffer,
    videoId: string,
    metadata: Record<string, string> = {}
  ): Promise<UploadResult> {
    return this.uploadFile(videoBuffer, {
      folder: 'videos',
      filename: `${videoId}.mp4`,
      contentType: 'video/mp4',
      metadata: {
        ...metadata,
        type: 'video',
        videoId,
      },
    })
  }

  /**
   * Upload thumbnail image
   */
  async uploadThumbnail(
    imageBuffer: Buffer,
    videoId: string,
    thumbnailIndex: number = 0
  ): Promise<UploadResult> {
    return this.uploadFile(imageBuffer, {
      folder: 'thumbnails',
      filename: `${videoId}_${thumbnailIndex}.jpg`,
      contentType: 'image/jpeg',
      metadata: {
        type: 'thumbnail',
        videoId,
        thumbnailIndex: thumbnailIndex.toString(),
      },
      makePublic: true, // Thumbnails can be public
    })
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = bucket.file(filePath)
      await file.delete()
      console.log(`✅ File deleted: ${filePath}`)
    } catch (error) {
      console.error(`❌ Failed to delete file ${filePath}:`, error)
      throw error
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const [exists] = await bucket.file(filePath).exists()
      return exists
    } catch (error) {
      console.error(`❌ Failed to check file existence ${filePath}:`, error)
      return false
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string) {
    try {
      const [metadata] = await bucket.file(filePath).getMetadata()
      return metadata
    } catch (error) {
      console.error(`❌ Failed to get file metadata ${filePath}:`, error)
      throw error
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string, maxResults: number = 100) {
    try {
      const [files] = await bucket.getFiles({
        prefix: folder,
        maxResults,
      })

      return files.map(file => ({
        name: file.name,
        size: parseInt(String(file.metadata.size || '0')),
        contentType: file.metadata.contentType,
        created: file.metadata.timeCreated,
        updated: file.metadata.updated,
      }))
    } catch (error) {
      console.error(`❌ Failed to list files in ${folder}:`, error)
      throw error
    }
  }

  /**
   * Validate file size based on type
   */
  private validateFileSize(file: Buffer | Uint8Array, contentType: string): void {
    const fileSize = file.length

    if (ALLOWED_VIDEO_TYPES.includes(contentType)) {
      if (fileSize > MAX_VIDEO_SIZE) {
        throw new Error(`Video file too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024 * 1024)}GB`)
      }
    } else if (ALLOWED_IMAGE_TYPES.includes(contentType)) {
      if (fileSize > MAX_IMAGE_SIZE) {
        throw new Error(`Image file too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`)
      }
    }
  }

  /**
   * Validate file type
   */
  private validateFileType(contentType: string): void {
    const allowedTypes = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES]
    
    if (!allowedTypes.includes(contentType)) {
      throw new Error(`File type ${contentType} is not allowed`)
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService()