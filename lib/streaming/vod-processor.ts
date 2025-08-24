import { VODService } from '@/lib/database/vod-service'
import { StreamService } from '@/lib/database/stream-service'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { bucket } from '@/lib/storage/gcs-client'
import type { VOD, TranscodingJob, SubscriptionTier } from '@/types/streaming'
import type { DatabaseResult } from '@/types/database'

export interface VODCreationOptions {
  enableAIProcessing?: boolean
  generateThumbnails?: boolean
  generateTranscription?: boolean
  generateHighlights?: boolean
  autoPublish?: boolean
  retentionDays?: number
}

export interface VODProcessingResult {
  vod: VOD
  processingJob?: TranscodingJob
  aiResults?: any
  success: boolean
  error?: string
}

export interface StreamRecording {
  streamId: string
  recordingPath: string
  duration: number
  fileSize: number
  startTime: Date
  endTime: Date
  segments: RecordingSegment[]
}

export interface RecordingSegment {
  id: string
  path: string
  duration: number
  startTime: number
  endTime: number
  quality: string
}

export class VODProcessor {
  private vodService: VODService
  private streamService: StreamService

  constructor() {
    this.vodService = new VODService()
    this.streamService = new StreamService()
  }

  /**
   * Create VOD from completed stream
   */
  async createVODFromStream(
    streamId: string,
    options: VODCreationOptions = {}
  ): Promise<DatabaseResult<VODProcessingResult>> {
    const defaultOptions: VODCreationOptions = {
      enableAIProcessing: true,
      generateThumbnails: true,
      generateTranscription: true,
      generateHighlights: true,
      autoPublish: false,
      retentionDays: -1, // Unlimited by default
      ...options,
    }

    console.log(`Creating VOD from stream ${streamId}`)

    try {
      // Get stream data
      const streamResult = await this.streamService.getById(streamId)
      if (!streamResult.success || !streamResult.data) {
        return {
          success: false,
          error: 'Stream not found',
          code: 'STREAM_NOT_FOUND',
        }
      }

      const stream = streamResult.data

      // Validate stream is ended and has recording
      if (stream.status !== 'ended') {
        return {
          success: false,
          error: 'Stream must be ended to create VOD',
          code: 'STREAM_NOT_ENDED',
        }
      }

      if (!stream.settings.enableRecording) {
        return {
          success: false,
          error: 'Stream recording was not enabled',
          code: 'RECORDING_NOT_ENABLED',
        }
      }

      // Check if VOD already exists for this stream
      const existingVOD = await this.vodService.getVODByStreamId(streamId)
      if (existingVOD.success && existingVOD.data) {
        return {
          success: false,
          error: 'VOD already exists for this stream',
          code: 'VOD_ALREADY_EXISTS',
        }
      }

      // Get stream recording data
      const recording = await this.getStreamRecording(streamId)
      if (!recording) {
        return {
          success: false,
          error: 'Stream recording not found',
          code: 'RECORDING_NOT_FOUND',
        }
      }

      // Process recording into single video file
      const processedVideo = await this.processRecording(recording)

      // Create initial VOD entry
      const vodData = {
        streamId,
        title: stream.title,
        description: stream.description,
        category: stream.category,
        tags: stream.tags,
        duration: recording.duration,
        fileSize: processedVideo.fileSize,
        visibility: (stream.settings.isPrivate ? 'private' : 'public') as
          | 'public'
          | 'unlisted'
          | 'private',
        requiredTier: stream.settings.requiredTier || 'basic',
        gcsPath: processedVideo.gcsPath,
        metadata: {
          originalFileName: `stream_${streamId}_recording.mp4`,
          uploadedFileName: processedVideo.fileName,
          mimeType: 'video/mp4',
          resolution: '1920x1080', // Default, would be detected from video
          bitrate: processedVideo.bitrate,
          frameRate: 30, // Default, would be detected from video
          audioCodec: 'aac',
          videoCodec: 'h264',
          language: 'en',
          subtitles: [],
          chapters: [],
        },
      }

      const vodResult = await this.vodService.createVOD(stream.userId, vodData)
      if (!vodResult.success || !vodResult.data) {
        return {
          success: false,
          error: vodResult.error || 'Failed to create VOD',
          code: vodResult.code || 'VOD_CREATION_FAILED',
        }
      }

      const vod = vodResult.data

      // Start AI processing if enabled
      let aiResults
      if (defaultOptions.enableAIProcessing) {
        try {
          aiResults = await this.processWithAI(vod.id, processedVideo.gcsPath, {
            generateThumbnails: defaultOptions.generateThumbnails,
            generateTranscription: defaultOptions.generateTranscription,
            generateHighlights: defaultOptions.generateHighlights,
          })

          // Update VOD with AI results
          await this.updateVODWithAIResults(vod.id, aiResults)
        } catch (error) {
          console.error(`AI processing failed for VOD ${vod.id}:`, error)
          // Continue without AI results
        }
      }

      // Auto-publish if enabled
      if (defaultOptions.autoPublish) {
        await this.vodService.publishVOD(vod.id)
      }

      const result: VODProcessingResult = {
        vod,
        aiResults,
        success: true,
      }

      console.log(`VOD created successfully from stream ${streamId}: ${vod.id}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error(`VOD creation failed for stream ${streamId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'VOD creation failed',
        code: 'VOD_CREATION_ERROR',
      }
    }
  }

  /**
   * Process uploaded video file into VOD
   */
  async createVODFromUpload(
    userId: string,
    filePath: string,
    metadata: {
      title: string
      description?: string
      category?: string
      tags?: string[]
      visibility?: 'public' | 'unlisted' | 'private'
      requiredTier?: 'basic' | 'premium' | 'pro'
    },
    options: VODCreationOptions = {}
  ): Promise<DatabaseResult<VODProcessingResult>> {
    const defaultOptions: VODCreationOptions = {
      enableAIProcessing: true,
      generateThumbnails: true,
      generateTranscription: true,
      generateHighlights: true,
      autoPublish: false,
      ...options,
    }

    console.log(`Creating VOD from upload: ${filePath}`)

    try {
      // Validate file exists in GCS
      const file = bucket.file(filePath)
      const [exists] = await file.exists()
      if (!exists) {
        return {
          success: false,
          error: 'Uploaded file not found',
          code: 'FILE_NOT_FOUND',
        }
      }

      // Get file metadata
      const [fileMetadata] = await file.getMetadata()
      const fileSize = parseInt(String(fileMetadata.size || '0'))

      // Extract video metadata (duration, resolution, etc.)
      const videoMetadata = await this.extractVideoMetadata(filePath)

      // Create VOD entry
      const vodData = {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags || [],
        duration: videoMetadata.duration,
        fileSize,
        visibility: metadata.visibility || 'public',
        requiredTier: metadata.requiredTier || 'basic',
        gcsPath: filePath,
        metadata: {
          originalFileName: filePath.split('/').pop() || 'unknown',
          uploadedFileName: filePath.split('/').pop() || 'unknown',
          mimeType: fileMetadata.contentType || 'video/mp4',
          resolution: `${videoMetadata.width}x${videoMetadata.height}`,
          bitrate: videoMetadata.bitrate,
          frameRate: videoMetadata.frameRate,
          audioCodec: videoMetadata.audioCodec,
          videoCodec: videoMetadata.videoCodec,
          language: 'en',
          subtitles: [],
          chapters: [],
        },
      }

      const vodResult = await this.vodService.createVOD(userId, vodData)
      if (!vodResult.success || !vodResult.data) {
        return {
          success: false,
          error: vodResult.error || 'Failed to create VOD',
          code: vodResult.code || 'VOD_CREATION_FAILED',
        }
      }

      const vod = vodResult.data

      // Start AI processing if enabled
      let aiResults
      if (defaultOptions.enableAIProcessing) {
        try {
          aiResults = await this.processWithAI(vod.id, filePath, {
            generateThumbnails: defaultOptions.generateThumbnails,
            generateTranscription: defaultOptions.generateTranscription,
            generateHighlights: defaultOptions.generateHighlights,
          })

          // Update VOD with AI results
          await this.updateVODWithAIResults(vod.id, aiResults)
        } catch (error) {
          console.error(`AI processing failed for VOD ${vod.id}:`, error)
          // Continue without AI results
        }
      }

      // Auto-publish if enabled
      if (defaultOptions.autoPublish) {
        await this.vodService.publishVOD(vod.id)
      }

      const result: VODProcessingResult = {
        vod,
        aiResults,
        success: true,
      }

      console.log(`VOD created successfully from upload: ${vod.id}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error(`VOD creation failed for upload ${filePath}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'VOD creation failed',
        code: 'VOD_CREATION_ERROR',
      }
    }
  }

  /**
   * Update VOD metadata
   */
  async updateVODMetadata(
    vodId: string,
    userId: string,
    updates: {
      title?: string
      description?: string
      category?: string
      tags?: string[]
      visibility?: 'public' | 'unlisted' | 'private'
      requiredTier?: 'basic' | 'premium' | 'pro'
    }
  ): Promise<DatabaseResult<VOD>> {
    try {
      // Verify ownership
      const vodResult = await this.vodService.getById(vodId)
      if (!vodResult.success || !vodResult.data) {
        return {
          success: false,
          error: 'VOD not found',
          code: 'VOD_NOT_FOUND',
        }
      }

      if (vodResult.data.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to update this VOD',
          code: 'UNAUTHORIZED',
        }
      }

      // Update VOD
      return await this.vodService.updateVOD(vodId, {
        id: vodId,
        ...updates,
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update VOD',
        code: 'VOD_UPDATE_ERROR',
      }
    }
  }

  /**
   * Delete VOD
   */
  async deleteVOD(
    vodId: string,
    userId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      // Verify ownership
      const vodResult = await this.vodService.getById(vodId)
      if (!vodResult.success || !vodResult.data) {
        return {
          success: false,
          error: 'VOD not found',
          code: 'VOD_NOT_FOUND',
        }
      }

      if (vodResult.data.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to delete this VOD',
          code: 'UNAUTHORIZED',
        }
      }

      const vod = vodResult.data

      // Delete video file from GCS
      try {
        const file = bucket.file(vod.gcsPath)
        await file.delete()
      } catch (error) {
        console.error(`Failed to delete video file ${vod.gcsPath}:`, error)
        // Continue with database deletion even if file deletion fails
      }

      // Delete associated files (thumbnails, subtitles, etc.)
      await this.deleteAssociatedFiles(vodId)

      // Mark VOD as deleted in database
      const deleteResult = await this.vodService.update(vodId, {
        status: 'deleted',
      })

      return {
        success: deleteResult.success,
        data: deleteResult.success,
        error: deleteResult.error,
        code: deleteResult.code,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete VOD',
        code: 'VOD_DELETE_ERROR',
      }
    }
  }

  // Private helper methods

  private async getStreamRecording(
    streamId: string
  ): Promise<StreamRecording | null> {
    try {
      // In a real implementation, this would get recording data from the streaming service
      // For now, we'll simulate recording data

      const recordingPath = `recordings/${streamId}/stream.mp4`
      const file = bucket.file(recordingPath)
      const [exists] = await file.exists()

      if (!exists) {
        return null
      }

      const [metadata] = await file.getMetadata()

      return {
        streamId,
        recordingPath,
        duration: 300, // 5 minutes (simulated)
        fileSize: parseInt(String(metadata.size || '0')),
        startTime: new Date(Date.now() - 300000), // 5 minutes ago
        endTime: new Date(),
        segments: [], // Would contain HLS segments in real implementation
      }
    } catch (error) {
      console.error(`Failed to get stream recording for ${streamId}:`, error)
      return null
    }
  }

  private async processRecording(recording: StreamRecording): Promise<{
    gcsPath: string
    fileName: string
    fileSize: number
    bitrate: number
  }> {
    // In a real implementation, this would:
    // 1. Concatenate HLS segments into a single MP4 file
    // 2. Optimize the video for VOD playback
    // 3. Upload the processed file to GCS

    console.log(`Processing recording for stream ${recording.streamId}`)

    // For now, we'll assume the recording is already processed
    return {
      gcsPath: recording.recordingPath,
      fileName: `stream_${recording.streamId}_vod.mp4`,
      fileSize: recording.fileSize,
      bitrate: 2500000, // 2.5 Mbps (simulated)
    }
  }

  private async extractVideoMetadata(filePath: string): Promise<{
    duration: number
    width: number
    height: number
    bitrate: number
    frameRate: number
    audioCodec: string
    videoCodec: string
  }> {
    // In a real implementation, this would use FFprobe or similar to extract metadata
    // For now, we'll return simulated metadata

    console.log(`Extracting metadata for ${filePath}`)

    return {
      duration: 300, // 5 minutes
      width: 1920,
      height: 1080,
      bitrate: 2500000, // 2.5 Mbps
      frameRate: 30,
      audioCodec: 'aac',
      videoCodec: 'h264',
    }
  }

  private async processWithAI(vodId: string, videoPath: string, options: any) {
    console.log(`Starting AI processing for VOD ${vodId}`)

    return await aiContentEnhancement.processUploadedVideo(
      vodId,
      videoPath,
      options
    )
  }

  private async updateVODWithAIResults(
    vodId: string,
    aiResults: any
  ): Promise<void> {
    try {
      const updates: any = {}

      if (aiResults.thumbnails && aiResults.thumbnails.length > 0) {
        updates.thumbnailUrl = aiResults.thumbnails[0]
      }

      if (aiResults.title) {
        updates.title = aiResults.title
      }

      if (aiResults.description) {
        updates.description = aiResults.description
      }

      if (aiResults.tags && aiResults.tags.length > 0) {
        updates.tags = aiResults.tags
      }

      // Update metadata with AI results
      updates['metadata.aiGenerated'] = {
        thumbnails: aiResults.thumbnails || [],
        title: aiResults.title,
        description: aiResults.description,
        tags: aiResults.tags || [],
        transcription: aiResults.transcription,
        scenes: aiResults.scenes || [],
        highlights: aiResults.highlights || [],
        contentScore: aiResults.contentScore || 0,
        processedAt: aiResults.processedAt,
      }

      updates['metadata.subtitles'] = aiResults.subtitles || []
      updates['metadata.chapters'] = aiResults.chapters || []

      await this.vodService.update(vodId, updates)

      console.log(`Updated VOD ${vodId} with AI results`)
    } catch (error) {
      console.error(`Failed to update VOD ${vodId} with AI results:`, error)
      throw error
    }
  }

  private async deleteAssociatedFiles(vodId: string): Promise<void> {
    try {
      // Delete thumbnails
      const thumbnailPrefix = `thumbnails/${vodId}/`
      const [thumbnailFiles] = await bucket.getFiles({
        prefix: thumbnailPrefix,
      })

      for (const file of thumbnailFiles) {
        try {
          await file.delete()
        } catch (error) {
          console.error(`Failed to delete thumbnail ${file.name}:`, error)
        }
      }

      // Delete subtitles
      const subtitlePrefix = `subtitles/${vodId}/`
      const [subtitleFiles] = await bucket.getFiles({ prefix: subtitlePrefix })

      for (const file of subtitleFiles) {
        try {
          await file.delete()
        } catch (error) {
          console.error(`Failed to delete subtitle ${file.name}:`, error)
        }
      }

      // Delete clips/highlights
      const clipPrefix = `clips/${vodId}/`
      const [clipFiles] = await bucket.getFiles({ prefix: clipPrefix })

      for (const file of clipFiles) {
        try {
          await file.delete()
        } catch (error) {
          console.error(`Failed to delete clip ${file.name}:`, error)
        }
      }

      console.log(`Deleted associated files for VOD ${vodId}`)
    } catch (error) {
      console.error(
        `Failed to delete associated files for VOD ${vodId}:`,
        error
      )
    }
  }
}

// Export singleton instance
export const vodProcessor = new VODProcessor()
