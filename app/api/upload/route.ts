import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { bucket } from '@/lib/storage/gcs-client'
import { z } from 'zod'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
]

// POST /api/upload - Upload file to GCS
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 2GB limit' },
        { status: 400 }
      )
    }

    // Validate file type for videos
    if (type === 'video' && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid video file type' },
        { status: 400 }
      )
    }

    // Generate unique file path
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`
    
    let filePath: string
    if (type === 'video') {
      filePath = `videos/${userId}/${fileName}`
    } else {
      filePath = `uploads/${userId}/${fileName}`
    }

    // Upload to GCS
    const gcsFile = bucket.file(filePath)
    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: userId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      },
    })

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Upload error:', error)
        resolve(NextResponse.json(
          { error: 'Failed to upload file' },
          { status: 500 }
        ))
      })

      stream.on('finish', () => {
        resolve(NextResponse.json({
          filePath,
          fileName,
          originalName: file.name,
          size: file.size,
          type: file.type,
          message: 'File uploaded successfully',
        }))
      })

      stream.end(buffer)
    })

  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}