import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progressData = await request.json()
    
    // Validate progress data
    if (!progressData.videoId || typeof progressData.currentTime !== 'number') {
      return NextResponse.json(
        { error: 'Invalid progress data' },
        { status: 400 }
      )
    }

    // Store watch progress in Firestore
    await setDoc(doc(db, 'watchProgress', `${userId}_${progressData.videoId}`), {
      userId,
      videoId: progressData.videoId,
      currentTime: progressData.currentTime,
      duration: progressData.duration,
      watchedAt: new Date(),
      synced: true
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save watch progress:', error)
    return NextResponse.json(
      { error: 'Failed to save watch progress' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID required' },
        { status: 400 }
      )
    }

    // Get watch progress from Firestore
    const progressDoc = await getDoc(doc(db, 'watchProgress', `${userId}_${videoId}`))
    
    if (!progressDoc.exists()) {
      return NextResponse.json({ progress: null })
    }

    const progressData = progressDoc.data()
    
    return NextResponse.json({
      progress: {
        videoId: progressData.videoId,
        currentTime: progressData.currentTime,
        duration: progressData.duration,
        watchedAt: progressData.watchedAt.toDate()
      }
    })
  } catch (error) {
    console.error('Failed to get watch progress:', error)
    return NextResponse.json(
      { error: 'Failed to get watch progress' },
      { status: 500 }
    )
  }
}