import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: authUserId } = auth()
    
    if (!authUserId || authUserId !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync data from Firestore
    const syncDoc = await getDoc(doc(db, 'userSync', params.userId))
    
    if (!syncDoc.exists()) {
      return NextResponse.json({ error: 'No sync data found' }, { status: 404 })
    }

    const syncData = syncDoc.data()
    
    return NextResponse.json({
      userId: params.userId,
      deviceId: syncData.deviceId,
      timestamp: syncData.timestamp.toDate(),
      data: syncData.data
    })
  } catch (error) {
    console.error('Failed to get sync data:', error)
    return NextResponse.json(
      { error: 'Failed to get sync data' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: authUserId } = auth()
    
    if (!authUserId || authUserId !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const syncData = await request.json()
    
    // Validate sync data structure
    if (!syncData.deviceId || !syncData.data) {
      return NextResponse.json(
        { error: 'Invalid sync data structure' },
        { status: 400 }
      )
    }

    // Store sync data in Firestore
    await setDoc(doc(db, 'userSync', params.userId), {
      userId: params.userId,
      deviceId: syncData.deviceId,
      timestamp: new Date(),
      data: syncData.data,
      updatedAt: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save sync data:', error)
    return NextResponse.json(
      { error: 'Failed to save sync data' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: authUserId } = auth()
    
    if (!authUserId || authUserId !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete sync data from Firestore
    await setDoc(doc(db, 'userSync', params.userId), {
      deleted: true,
      deletedAt: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete sync data:', error)
    return NextResponse.json(
      { error: 'Failed to delete sync data' },
      { status: 500 }
    )
  }
}