/**
 * AI Thumbnail Generation Service
 * Automatically generates thumbnails from key video frames with AI selection
 */

import { Storage } from '@google-cloud/storage'
import sharp from 'sharp'

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  timestamps?: number[] // Specific timestamps to extract
  count?: number // Number of thumbnails to generate
}

export interface GeneratedThumbnail {
  url: string
  timestamp: number
  confidence: number
  filename: string
  size: number
}

export class ThumbnailGenerationService {
  private readonly defaultOptions: Required<ThumbnailOptions> = {
    width: 1280,
    height: 720,
    quality: 85,
    format: 'jpeg',
    timestamps: [],
    count: 5
  }

  /**
   * Generate AI-selected thumbnails from video
   */
  async generateThumbnails(
    videoId: string,
    videoPath: string,
    options: ThumbnailOptions = {}
  ): Promise<GeneratedThumbnail[]> {
    const opts = { ...this.defaultOptions, ...options }

    try {
      console.log(`Generating thumbnails for video ${videoId}`)

      // Get video duration and optimal timestamps
      const duration = await this.getVideoDuration(videoPath)
      const timestamps = opts.timestamps.length > 0 
        ? opts.timestamps 
        : this.calculateOptimalTimestamps(duration, opts.count)

      // Extract frames at specified timestamps
      const frames = await this.extractFrames(videoPath, timestamps)

      // Analyze frames with AI to select best thumbnails
      const analyzedFrames = await this.analyzeFrames(frames, timestamps)

      // Generate and upload thumbnails
      const thumbnails: GeneratedThumbnail[] = []

      for (let i = 0; i < analyzedFrames.length; i++) {
        const frame = analyzedFrames[i]
        const filename = `${videoId}_thumbnail_${i}.${opts.format}`
        
        // Process image with sharp
        const processedImage = await this.processImage(frame.buffer, opts)
        
        // Upload to GCS
        const url = await this.uploadThumbnail(processedImage, filename)
        
        thumbnails.push({
          url,
          timestamp: frame.timestamp,
          confidence: frame.confidence,
          filename,
          size: processedImage.length
        })
      }

      console.log(`Generated ${thumbnails.length} thumbnails for video ${videoId}`)
      return thumbnails

    } catch (error) {
      console.error(`Thumbnail generation failed for video ${videoId}:`, error)
      throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a single thumbnail at specific timestamp
   */
  async generateSingleThumbnail(
    videoId: string,
    videoPath: string,
    timestamp: number,
    options: ThumbnailOptions = {}
  ): Promise<GeneratedThumbnail> {
    const opts = { ...this.defaultOptions, ...options }

    try {
      // Extract frame at timestamp
      const frame = await this.extractSingleFrame(videoPath, timestamp)
      
      // Process image
      const processedImage = await this.processImage(frame, opts)
      
      // Upload thumbnail
      const filename = `${videoId}_thumbnail_${timestamp}.${opts.format}`
      const url = await this.uploadThumbnail(processedImage, filename)

      return {
        url,
        timestamp,
        confidence: 1.0, // Single frame, assume high confidence
        filename,
        size: processedImage.length
      }

    } catch (error) {
      console.error(`Single thumbnail generation failed:`, error)
      throw error
    }
  }

  /**
   * Analyze existing thumbnails and suggest improvements
   */
  async analyzeThumbnailQuality(thumbnailUrl: string): Promise<{
    score: number
    suggestions: string[]
    improvements: {
      brightness: number
      contrast: number
      sharpness: number
      composition: number
    }
  }> {
    try {
      // Download and analyze thumbnail
      const imageBuffer = await this.downloadImage(thumbnailUrl)
      const analysis = await this.performImageAnalysis(imageBuffer)

      return {
        score: analysis.overallScore,
        suggestions: analysis.suggestions,
        improvements: analysis.improvements
      }

    } catch (error) {
      console.error('Thumbnail analysis failed:', error)
      return {
        score: 0.5,
        suggestions: ['Unable to analyze thumbnail quality'],
        improvements: {
          brightness: 0,
          contrast: 0,
          sharpness: 0,
          composition: 0
        }
      }
    }
  }

  /**
   * Generate thumbnail variations for A/B testing
   */
  async generateThumbnailVariations(
    videoId: string,
    baseImageBuffer: Buffer,
    variationCount: number = 3
  ): Promise<GeneratedThumbnail[]> {
    const variations: GeneratedThumbnail[] = []

    try {
      for (let i = 0; i < variationCount; i++) {
        const variation = await this.createThumbnailVariation(baseImageBuffer, i)
        const filename = `${videoId}_variation_${i}.jpeg`
        const url = await this.uploadThumbnail(variation, filename)

        variations.push({
          url,
          timestamp: 0,
          confidence: 0.8,
          filename,
          size: variation.length
        })
      }

      return variations

    } catch (error) {
      console.error('Thumbnail variation generation failed:', error)
      return []
    }
  }

  // Private helper methods

  private async getVideoDuration(videoPath: string): Promise<number> {
    // Simulate getting video duration
    // In production, use FFmpeg or similar tool
    return 120 // 2 minutes
  }

  private calculateOptimalTimestamps(duration: number, count: number): number[] {
    const timestamps: number[] = []
    const interval = duration / (count + 1)

    for (let i = 1; i <= count; i++) {
      timestamps.push(Math.floor(interval * i))
    }

    return timestamps
  }

  private async extractFrames(videoPath: string, timestamps: number[]): Promise<{
    buffer: Buffer
    timestamp: number
  }[]> {
    // Simulate frame extraction
    // In production, use FFmpeg to extract frames at specific timestamps
    return timestamps.map(timestamp => ({
      buffer: Buffer.from(`frame_at_${timestamp}`),
      timestamp
    }))
  }

  private async extractSingleFrame(videoPath: string, timestamp: number): Promise<Buffer> {
    // Simulate single frame extraction
    return Buffer.from(`frame_at_${timestamp}`)
  }

  private async analyzeFrames(
    frames: { buffer: Buffer; timestamp: number }[],
    timestamps: number[]
  ): Promise<{
    buffer: Buffer
    timestamp: number
    confidence: number
  }[]> {
    // Simulate AI frame analysis
    // In production, use computer vision models to analyze:
    // - Face detection and positioning
    // - Color composition
    // - Visual interest/complexity
    // - Text readability
    // - Brand elements

    return frames.map((frame, index) => ({
      ...frame,
      confidence: 0.8 + (Math.random() * 0.2) // Simulate confidence score
    })).sort((a, b) => b.confidence - a.confidence)
  }

  private async processImage(
    imageBuffer: Buffer,
    options: Required<ThumbnailOptions>
  ): Promise<Buffer> {
    try {
      let image = sharp(imageBuffer)

      // Resize image
      image = image.resize(options.width, options.height, {
        fit: 'cover',
        position: 'center'
      })

      // Apply format and quality
      switch (options.format) {
        case 'jpeg':
          image = image.jpeg({ quality: options.quality })
          break
        case 'png':
          image = image.png({ quality: options.quality })
          break
        case 'webp':
          image = image.webp({ quality: options.quality })
          break
      }

      return await image.toBuffer()

    } catch (error) {
      console.error('Image processing failed:', error)
      throw error
    }
  }

  private async uploadThumbnail(imageBuffer: Buffer, filename: string): Promise<string> {
    try {
      const file = bucket.file(`thumbnails/${filename}`)
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: `image/${filename.split('.').pop()}`,
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
      })

      // Make file publicly readable
      await file.makePublic()

      return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/thumbnails/${filename}`

    } catch (error) {
      console.error('Thumbnail upload failed:', error)
      throw error
    }
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  private async performImageAnalysis(imageBuffer: Buffer): Promise<{
    overallScore: number
    suggestions: string[]
    improvements: {
      brightness: number
      contrast: number
      sharpness: number
      composition: number
    }
  }> {
    // Simulate image analysis
    // In production, use computer vision models
    const brightness = Math.random()
    const contrast = Math.random()
    const sharpness = Math.random()
    const composition = Math.random()

    const overallScore = (brightness + contrast + sharpness + composition) / 4

    const suggestions: string[] = []
    if (brightness < 0.5) suggestions.push('Increase brightness for better visibility')
    if (contrast < 0.5) suggestions.push('Improve contrast to make elements stand out')
    if (sharpness < 0.5) suggestions.push('Enhance sharpness for clearer details')
    if (composition < 0.5) suggestions.push('Consider better composition and framing')

    return {
      overallScore,
      suggestions,
      improvements: {
        brightness: brightness < 0.5 ? 0.2 : 0,
        contrast: contrast < 0.5 ? 0.3 : 0,
        sharpness: sharpness < 0.5 ? 0.25 : 0,
        composition: composition < 0.5 ? 0.4 : 0
      }
    }
  }

  private async createThumbnailVariation(baseImage: Buffer, variationIndex: number): Promise<Buffer> {
    try {
      let image = sharp(baseImage)

      // Apply different variations
      switch (variationIndex) {
        case 0:
          // Brighter version
          image = image.modulate({ brightness: 1.2 })
          break
        case 1:
          // Higher contrast version
          image = image.modulate({ brightness: 1.1, saturation: 1.2 })
          break
        case 2:
          // Warmer tone version
          image = image.modulate({ brightness: 1.05, saturation: 1.1 })
          break
        default:
          // Original
          break
      }

      return await image.jpeg({ quality: 85 }).toBuffer()

    } catch (error) {
      console.error('Thumbnail variation creation failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const thumbnailGenerator = new ThumbnailGenerationService()