import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { thumbnailGenerator } from '@/lib/ai/thumbnail-generation'
import { contentQualityAnalyzer } from '@/lib/ai/content-quality-analyzer'
import { z } from 'zod'

const enhancementRequestSchema = z.object({
  videoId: z.string().min(1),
  videoPath: z.string().min(1),
  options: z.object({
    generateThumbnails: z.boolean().default(true),
    generateMetadata: z.boolean().default(true),
    analyzeQuality: z.boolean().default(true),
    generateRecommendations: z.boolean().default(false)
  }).default({})
})

const thumbnailRequestSchema = z.object({
  videoId: z.string().min(1),
  videoPath: z.string().min(1),
  options: z.object({
    count: z.number().min(1).max(10).default(5),
    width: z.number().min(100).max(1920).default(1280),
    height: z.number().min(100).max(1080).default(720),
    quality: z.number().min(1).max(100).default(85),
    timestamps: z.array(z.number()).optional()
  }).default({})
})

const qualityAnalysisSchema = z.object({
  videoId: z.string().min(1),
  videoPath: z.string().min(1),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    thumbnails: z.array(z.string()).optional(),
    captions: z.boolean().optional(),
    audioDescription: z.boolean().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'enhance'

    switch (action) {
      case 'enhance':
        return await handleContentEnhancement(body, userId)
      
      case 'thumbnails':
        return await handleThumbnailGeneration(body, userId)
      
      case 'quality':
        return await handleQualityAnalysis(body, userId)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Content enhancement API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Content enhancement failed' },
      { status: 500 }
    )
  }
}

async function handleContentEnhancement(body: any, userId: string) {
  const validatedData = enhancementRequestSchema.parse(body)
  const { videoId, videoPath, options } = validatedData

  try {
    // Process video with AI enhancement
    const metadata = await aiContentEnhancement.processUploadedVideo(
      videoId,
      videoPath,
      userId
    )

    const result: any = {
      videoId,
      metadata,
      processing: {
        thumbnails: options.generateThumbnails,
        metadata: options.generateMetadata,
        quality: options.analyzeQuality
      }
    }

    // Generate additional thumbnails if requested
    if (options.generateThumbnails) {
      const thumbnails = await thumbnailGenerator.generateThumbnails(
        videoId,
        videoPath,
        { count: 5 }
      )
      result.thumbnails = thumbnails
    }

    // Analyze content quality if requested
    if (options.analyzeQuality) {
      const qualityAnalysis = await contentQualityAnalyzer.analyzeContent(
        videoId,
        videoPath,
        metadata
      )
      result.qualityAnalysis = qualityAnalysis
    }

    // Generate recommendations if requested
    if (options.generateRecommendations) {
      const recommendations = await aiContentEnhancement.generateRecommendations(
        userId,
        videoId,
        5
      )
      result.recommendations = recommendations
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Content enhancement processing failed:', error)
    return NextResponse.json(
      { error: 'Enhancement processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleThumbnailGeneration(body: any, userId: string) {
  const validatedData = thumbnailRequestSchema.parse(body)
  const { videoId, videoPath, options } = validatedData

  try {
    const thumbnails = await thumbnailGenerator.generateThumbnails(
      videoId,
      videoPath,
      options
    )

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        thumbnails,
        count: thumbnails.length
      }
    })

  } catch (error) {
    console.error('Thumbnail generation failed:', error)
    return NextResponse.json(
      { error: 'Thumbnail generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleQualityAnalysis(body: any, userId: string) {
  const validatedData = qualityAnalysisSchema.parse(body)
  const { videoId, videoPath, metadata } = validatedData

  try {
    const analysis = await contentQualityAnalyzer.analyzeContent(
      videoId,
      videoPath,
      metadata
    )

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        analysis
      }
    })

  } catch (error) {
    console.error('Quality analysis failed:', error)
    return NextResponse.json(
      { error: 'Quality analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const videoId = searchParams.get('videoId')

    if (action === 'status' && videoId) {
      // Get processing status for a video
      return NextResponse.json({
        videoId,
        status: 'completed', // Simulate status
        progress: 100,
        stages: {
          thumbnails: 'completed',
          metadata: 'completed',
          quality: 'completed',
          recommendations: 'completed'
        }
      })
    }

    if (action === 'capabilities') {
      // Return AI capabilities and limits
      return NextResponse.json({
        capabilities: {
          thumbnailGeneration: {
            maxCount: 10,
            supportedFormats: ['jpeg', 'png', 'webp'],
            maxResolution: '1920x1080'
          },
          metadataGeneration: {
            languages: ['en', 'es', 'fr', 'de'],
            maxTitleLength: 100,
            maxDescriptionLength: 500
          },
          qualityAnalysis: {
            metrics: ['technical', 'engagement', 'accessibility', 'seo'],
            supportedFormats: ['mp4', 'mov', 'avi', 'mkv']
          },
          recommendations: {
            algorithms: ['collaborative', 'content-based', 'hybrid'],
            maxRecommendations: 50
          }
        },
        limits: {
          dailyProcessing: 100,
          concurrentJobs: 5,
          maxFileSize: '2GB'
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Content enhancement GET API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}