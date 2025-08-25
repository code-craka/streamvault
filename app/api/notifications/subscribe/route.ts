import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptionData = await request.json()
    
    // Validate subscription data
    if (!subscriptionData.endpoint || !subscriptionData.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Store push subscription in Firestore
    await setDoc(doc(db, 'pushSubscriptions', userId), {
      userId,
      endpoint: subscriptionData.endpoint,
      keys: subscriptionData.keys,
      subscribedAt: new Date(),
      active: true
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark subscription as inactive
    await setDoc(doc(db, 'pushSubscriptions', userId), {
      active: false,
      unsubscribedAt: new Date()
    }, { merge: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    )
  }
}