import { NextRequest, NextResponse } from 'next/server'
import { hlsService } from '@/lib/streaming/hls-service'
import { StreamService } from '@/lib/database/stream-service'

const streamService = new StreamService()

/**
 * GET /api/hls/[streamId]/[...playlist] - Serve HLS playlists and segments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; playlist: string[] }> }
) {
  try {
    const { streamId, playlist } = await params
    const playlistPath = playlist.join('/')

    // Verify stream exists and is active
    const streamResult = await streamService.getById(streamId)
    if (!streamResult.success || !streamResult.data) {
      return new NextResponse('Stream not found', { status: 404 })
    }

    const stream = streamResult.data

    // Check if stream is live
    if (!stream.isLive || stream.status !== 'active') {
      return new NextResponse('Stream is not live', { status: 404 })
    }

    // Check if stream is private and requires authentication
    if (stream.settings.isPrivate) {
      // TODO: Implement authentication check for private streams
      // For now, we'll allow access to demonstrate the functionality
    }

    // Get playlist content from HLS service
    const playlistContent = hlsService.getPlaylist(streamId, playlistPath)

    if (!playlistContent) {
      return new NextResponse('Playlist not found', { status: 404 })
    }

    // Determine content type based on file extension
    const contentType = playlistPath.endsWith('.m3u8') 
      ? 'application/vnd.apple.mpegurl'
      : 'video/mp2t' // For .ts segments

    // Set appropriate headers for HLS delivery
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': playlistPath.endsWith('.m3u8') 
        ? 'no-cache, no-store, must-revalidate' // Playlists should not be cached
        : 'public, max-age=31536000', // Segments can be cached for a long time
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Last-Modified': playlistContent.lastModified.toUTCString(),
    })

    // Handle range requests for video segments
    const range = request.headers.get('range')
    if (range && !playlistPath.endsWith('.m3u8')) {
      // TODO: Implement proper range request handling for video segments
      // This would involve reading the actual segment file and serving the requested byte range
      console.log(`Range request for ${playlistPath}: ${range}`)
    }

    return new NextResponse(playlistContent.content, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error serving HLS content:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

/**
 * HEAD /api/hls/[streamId]/[...playlist] - Handle HEAD requests for HLS content
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; playlist: string[] }> }
) {
  try {
    const { streamId, playlist } = await params
    const playlistPath = playlist.join('/')

    // Verify stream exists and is active
    const streamResult = await streamService.getById(streamId)
    if (!streamResult.success || !streamResult.data) {
      return new NextResponse(null, { status: 404 })
    }

    const stream = streamResult.data

    if (!stream.isLive || stream.status !== 'active') {
      return new NextResponse(null, { status: 404 })
    }

    // Get playlist content to check if it exists
    const playlistContent = hlsService.getPlaylist(streamId, playlistPath)

    if (!playlistContent) {
      return new NextResponse(null, { status: 404 })
    }

    // Return headers without content
    const contentType = playlistPath.endsWith('.m3u8') 
      ? 'application/vnd.apple.mpegurl'
      : 'video/mp2t'

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': playlistContent.content.length.toString(),
      'Cache-Control': playlistPath.endsWith('.m3u8') 
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Last-Modified': playlistContent.lastModified.toUTCString(),
    })

    return new NextResponse(null, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error handling HEAD request for HLS content:', error)
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * OPTIONS /api/hls/[streamId]/[...playlist] - Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}