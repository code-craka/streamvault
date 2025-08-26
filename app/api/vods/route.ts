import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { VODService } from '@/lib/database/vod-service'
import { vodProcessor } from '@/lib/streaming/vod-processor'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods - Get public VODs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const querySchema = z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      requiredTier: z.enum(['basic', 'premium', 'pro']).optional(),
      limit: z.string().transform(val => parseInt(val) || 20),
      offset: z.string().transform(val => parseInt(val) || 0),
      orderBy: z
        .enum(['createdAt', 'viewCount', 'duration', 'title'])
        .default('createdAt'),
      orderDirection: z.enum(['asc', 'desc']).default('desc'),
      minDuration: z
        .string()
        .transform(val => parseInt(val) || 0)
        .optional(),
      maxDuration: z
        .string()
        .transform(val => parseInt(val) || Infinity)
        .optional(),
      hasTranscription: z
        .string()
        .transform(val => val === 'true')
        .optional(),
      hasHighlights: z
        .string()
        .transform(val => val === 'true')
        .optional(),
      minViews: z
        .string()
        .transform(val => parseInt(val) || 0)
        .optional(),
      tags: z.string().optional(),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Build query input
    const queryInput = {
      search: query.search,
      category: query.category,
      requiredTier: query.requiredTier,
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
    }

    const result = await vodService.searchVODs(queryInput)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    let vods = result.data || []

    // Apply additional filters
    if (query.minDuration || query.maxDuration !== Infinity) {
      vods = vods.filter(
        vod =>
          vod.duration >= query.minDuration! &&
          vod.duration <= query.maxDuration!
      )
    }

    if (query.hasTranscription) {
      vods = vods.filter(vod => vod.metadata.aiGenerated?.transcription)
    }

    if (query.hasHighlights) {
      vods = vods.filter(
        vod =>
          vod.metadata.aiGenerated?.highlights &&
          vod.metadata.aiGenerated.highlights.length > 0
      )
    }

    if (query.minViews) {
      vods = vods.filter(vod => vod.viewCount >= query.minViews!)
    }

    if (query.tags) {
      const searchTags = query.tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
      vods = vods.filter(vod =>
        searchTags.some(searchTag =>
          vod.tags.some(vodTag => vodTag.toLowerCase().includes(searchTag))
        )
      )
    }

    return NextResponse.json({
      vods,
      total: vods.length,
      hasMore: vods.length === query.limit,
    })
  } catch (error) {
    console.error('Failed to get VODs:', error)
    return NextResponse.json({ error: 'Failed to get VODs' }, { status: 500 })
  }
}

// POST /api/vods - Create VOD from upload
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const createSchema = z.object({
      filePath: z.string().min(1, 'File path is required'),
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
      requiredTier: z.enum(['basic', 'premium', 'pro']).default('basic'),
      enableAIProcessing: z.boolean().default(true),
      autoPublish: z.boolean().default(false),
    })

    const data = createSchema.parse(body)

    const result = await vodProcessor.createVODFromUpload(
      userId,
      data.filePath,
      {
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        visibility: data.visibility,
        requiredTier: data.requiredTier,
      },
      {
        enableAIProcessing: data.enableAIProcessing,
        autoPublish: data.autoPublish,
      }
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      vod: result.data?.vod,
      message: 'VOD created successfully',
    })
  } catch (error) {
    console.error('Failed to create VOD:', error)
    return NextResponse.json({ error: 'Failed to create VOD' }, { status: 500 })
  }
}
