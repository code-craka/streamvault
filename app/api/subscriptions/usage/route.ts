import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore'
import type { UsageMetrics } from '@/types/subscription'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate current billing period
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get streaming minutes
    const streamsQuery = query(
      collection(db, 'streams'),
      where('userId', '==', userId),
      where('createdAt', '>=', startOfMonth),
      where('createdAt', '<=', endOfMonth)
    )
    const streamsSnapshot = await getDocs(streamsQuery)

    let streamingMinutes = 0
    streamsSnapshot.docs.forEach(doc => {
      const stream = doc.data()
      if (stream.endedAt && stream.startedAt) {
        const duration =
          (stream.endedAt.toDate().getTime() -
            stream.startedAt.toDate().getTime()) /
          (1000 * 60)
        streamingMinutes += duration
      }
    })

    // Get storage usage (sum of all video file sizes)
    const videosQuery = query(
      collection(db, 'videos'),
      where('userId', '==', userId)
    )
    const videosSnapshot = await getDocs(videosQuery)

    let storageUsed = 0 // in GB
    videosSnapshot.docs.forEach(doc => {
      const video = doc.data()
      if (video.fileSize) {
        storageUsed += video.fileSize / (1024 * 1024 * 1024) // Convert bytes to GB
      }
    })

    // Get bandwidth usage (approximate from video views)
    let bandwidthUsed = 0 // in GB
    videosSnapshot.docs.forEach(doc => {
      const video = doc.data()
      if (video.views && video.fileSize) {
        // Approximate bandwidth = views * file size
        bandwidthUsed += (video.views * video.fileSize) / (1024 * 1024 * 1024)
      }
    })

    // Get API calls (if user has API access)
    const apiCallsQuery = query(
      collection(db, 'apiUsage'),
      where('userId', '==', userId),
      where('timestamp', '>=', startOfMonth),
      where('timestamp', '<=', endOfMonth)
    )
    const apiCallsSnapshot = await getDocs(apiCallsQuery)
    const apiCalls = apiCallsSnapshot.size

    // Get chat messages count
    const chatQuery = query(
      collection(db, 'chatMessages'),
      where('userId', '==', userId),
      where('timestamp', '>=', startOfMonth),
      where('timestamp', '<=', endOfMonth)
    )
    const chatSnapshot = await getDocs(chatQuery)
    const chatMessages = chatSnapshot.size

    // Get downloads count
    const downloadsQuery = query(
      collection(db, 'downloads'),
      where('userId', '==', userId),
      where('downloadedAt', '>=', startOfMonth),
      where('downloadedAt', '<=', endOfMonth)
    )
    const downloadsSnapshot = await getDocs(downloadsQuery)
    const downloadsCount = downloadsSnapshot.size

    // Calculate overages (simplified - in real implementation, you'd get limits from user's subscription)
    const overages = {
      storage: Math.max(0, storageUsed - 50) * 0.1, // $0.10 per GB over limit
      bandwidth: Math.max(0, bandwidthUsed - 200) * 0.05, // $0.05 per GB over limit
      apiCalls: Math.max(0, apiCalls - 10000) * 0.001, // $0.001 per call over limit
    }

    const baseCharge = 19.99 // Assuming premium tier
    const overageTotal =
      overages.storage + overages.bandwidth + overages.apiCalls

    const usageMetrics: UsageMetrics = {
      userId,
      subscriptionId: 'sub_placeholder', // Would get from user metadata
      period: {
        start: startOfMonth,
        end: endOfMonth,
      },
      metrics: {
        streamingMinutes: Math.round(streamingMinutes),
        storageUsed: Number(storageUsed.toFixed(2)),
        bandwidthUsed: Number(bandwidthUsed.toFixed(2)),
        apiCalls,
        chatMessages,
        downloadsCount,
      },
      overages,
      charges: {
        base: baseCharge,
        overages: Number(overageTotal.toFixed(2)),
        total: Number((baseCharge + overageTotal).toFixed(2)),
      },
    }

    return NextResponse.json(usageMetrics)
  } catch (error) {
    console.error('Usage metrics error:', error)

    return NextResponse.json(
      { error: 'Failed to get usage metrics' },
      { status: 500 }
    )
  }
}
