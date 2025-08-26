'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { ChatService } from '@/lib/database/chat-service'
import { createChatMessageSchema } from '@/lib/validations/chat'
import type { ChatMessage, ChatRoom } from '@/types/chat'
import type { CreateChatMessageInput } from '@/lib/validations/chat'
import { ChatMessageComponent } from './chat-message'
import { ChatInput } from './chat-input'
import { ModerationTools } from './moderation-tools'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Users,
  MessageCircle,
  Settings,
  Shield,
  Clock,
} from 'lucide-react'

interface LiveChatProps {
  streamId: string
  showModerationTools?: boolean
  className?: string
}

export function LiveChat({
  streamId,
  showModerationTools = false,
  className,
}: LiveChatProps) {
  const { user, isLoaded } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeUsers, setActiveUsers] = useState(0)
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
  const [showModTools, setShowModTools] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isLimited: boolean
    remainingTime: number
    messagesPerSecond: number
  }>({
    isLimited: false,
    remainingTime: 0,
    messagesPerSecond: 1,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatService = useRef(new ChatService())
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const rateLimitTimerRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
      // Fallback for test environments where scrollIntoView might not be available
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get user's rate limit based on subscription tier and role
  const getUserRateLimit = () => {
    if (!user) return { messagesPerSecond: 1, burstLimit: 1 }

    const tier = user.publicMetadata?.subscriptionTier as string
    const role = user.publicMetadata?.role as string

    // Streamers and admins have higher limits
    if (['streamer', 'admin'].includes(role)) {
      return { messagesPerSecond: 5, burstLimit: 10 }
    }

    switch (tier) {
      case 'pro':
        return { messagesPerSecond: 5, burstLimit: 10 }
      case 'premium':
        return { messagesPerSecond: 3, burstLimit: 6 }
      case 'basic':
      default:
        return { messagesPerSecond: 1, burstLimit: 2 }
    }
  }

  // Check if user can moderate
  const canModerate = () => {
    if (!user) return false
    const userRole = user.publicMetadata?.role as string
    return ['admin', 'streamer'].includes(userRole)
  }

  // Load chat room settings
  useEffect(() => {
    if (!streamId) return

    const loadChatRoom = async () => {
      try {
        const response = await fetch(`/api/chat/${streamId}/room`)
        if (response.ok) {
          const data = await response.json()
          setChatRoom(data.room)
        }
      } catch (err) {
        console.error('Error loading chat room:', err)
      }
    }

    loadChatRoom()
  }, [streamId])

  // Subscribe to real-time messages
  useEffect(() => {
    if (!streamId) return

    setIsLoading(true)
    setError(null)

    try {
      // Subscribe to real-time messages
      const unsubscribe = chatService.current.subscribeToMessages(
        streamId,
        newMessages => {
          setMessages(newMessages)
          setIsLoading(false)

          // Calculate active users from recent messages
          const recentMessages = newMessages.filter(
            msg => Date.now() - msg.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
          )
          const uniqueUsers = new Set(recentMessages.map(msg => msg.userId))
          setActiveUsers(uniqueUsers.size)
        }
      )

      unsubscribeRef.current = unsubscribe

      return () => {
        unsubscribe()
      }
    } catch (err) {
      console.error('Error subscribing to chat messages:', err)
      setError('Failed to connect to chat')
      setIsLoading(false)
    }
  }, [streamId])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  const handleSendMessage = async (messageData: CreateChatMessageInput) => {
    if (!user) return

    // Check rate limiting
    const rateLimit = getUserRateLimit()
    if (rateLimitInfo.isLimited) {
      throw new Error(
        `Rate limited. Please wait ${rateLimitInfo.remainingTime}s`
      )
    }

    // Apply rate limiting
    setRateLimitInfo({
      isLimited: true,
      remainingTime: Math.ceil(1000 / rateLimit.messagesPerSecond / 1000),
      messagesPerSecond: rateLimit.messagesPerSecond,
    })

    // Clear rate limit after cooldown
    if (rateLimitTimerRef.current) {
      clearTimeout(rateLimitTimerRef.current)
    }

    rateLimitTimerRef.current = setTimeout(() => {
      setRateLimitInfo(prev => ({
        ...prev,
        isLimited: false,
        remainingTime: 0,
      }))
    }, 1000 / rateLimit.messagesPerSecond)

    try {
      const response = await fetch(`/api/chat/${streamId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Message will be updated via real-time listener
    } catch (err) {
      console.error('Error sending message:', err)
      throw err // Re-throw to let ChatInput handle the error
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return

    try {
      const response = await fetch(
        `/api/chat/${streamId}/messages/${messageId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete message')
      }

      // Message will be updated via real-time listener
    } catch (err) {
      console.error('Error deleting message:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete message')
    }
  }

  const handleReportMessage = async (messageId: string, reason: string) => {
    if (!user) return

    try {
      const response = await fetch(
        `/api/chat/${streamId}/messages/${messageId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'flag',
            reason,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to report message')
      }

      // Show success message
      setError(null)
    } catch (err) {
      console.error('Error reporting message:', err)
      setError(err instanceof Error ? err.message : 'Failed to report message')
    }
  }

  const handleBanUser = async (
    userId: string,
    duration?: number,
    reason?: string
  ) => {
    if (!canModerate()) return

    try {
      const response = await fetch(`/api/chat/${streamId}/moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'ban',
          targetUserId: userId,
          reason,
          duration,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to ban user')
      }

      const result = await response.json()
      setError(null)
      // You could show a success toast here
    } catch (err) {
      console.error('Error banning user:', err)
      setError(err instanceof Error ? err.message : 'Failed to ban user')
    }
  }

  const handleTimeoutUser = async (
    userId: string,
    duration: number,
    reason?: string
  ) => {
    if (!canModerate()) return

    try {
      const response = await fetch(`/api/chat/${streamId}/moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'timeout',
          targetUserId: userId,
          reason,
          duration,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to timeout user')
      }

      const result = await response.json()
      setError(null)
      // You could show a success toast here
    } catch (err) {
      console.error('Error timing out user:', err)
      setError(err instanceof Error ? err.message : 'Failed to timeout user')
    }
  }

  const handleUpdateChatSettings = async (settings: any) => {
    if (!canModerate()) return

    try {
      const response = await fetch(`/api/chat/${streamId}/room`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            ...chatRoom?.settings,
            ...settings,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update chat settings')
      }

      const result = await response.json()
      setChatRoom(result.room)
      setError(null)
      // You could show a success toast here
    } catch (err) {
      console.error('Error updating chat settings:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to update chat settings'
      )
    }
  }

  if (!isLoaded) {
    return (
      <Card className={`flex h-96 items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center space-x-2 font-semibold">
              <MessageCircle className="h-4 w-4" />
              <span>Live Chat</span>
            </h3>
            <div className="flex items-center space-x-3">
              {/* Chat Settings Indicators */}
              {chatRoom?.settings && (
                <div className="flex items-center space-x-1">
                  {chatRoom.settings.slowMode > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {chatRoom.settings.slowMode}s
                    </Badge>
                  )}
                  {chatRoom.settings.subscriberOnly && (
                    <Badge variant="secondary" className="text-xs">
                      Sub Only
                    </Badge>
                  )}
                  {chatRoom.settings.emoteOnly && (
                    <Badge variant="secondary" className="text-xs">
                      Emote Only
                    </Badge>
                  )}
                </div>
              )}

              {/* User Stats */}
              <div className="text-muted-foreground flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{activeUsers}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{messages.length}</span>
                </div>
              </div>

              {/* Moderation Tools Toggle */}
              {canModerate() && showModerationTools && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModTools(!showModTools)}
                  className="ml-2"
                >
                  <Shield className="mr-1 h-3 w-3" />
                  {showModTools ? 'Hide' : 'Show'} Tools
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Connecting to chat...
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <MessageCircle className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground">No messages yet.</p>
                <p className="text-muted-foreground text-sm">
                  Be the first to chat!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {messages.map(message => (
                <ChatMessageComponent
                  key={message.id}
                  message={message}
                  onDelete={handleDeleteMessage}
                  onReport={handleReportMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive mx-4 mb-2 rounded border p-2 text-sm">
            {error}
          </div>
        )}

        {/* Message Input */}
        <ChatInput
          streamId={streamId}
          onSendMessage={handleSendMessage}
          disabled={!user || rateLimitInfo.isLimited}
          rateLimitInfo={rateLimitInfo}
        />
      </Card>

      {/* Moderation Tools */}
      {canModerate() && showModerationTools && showModTools && (
        <ModerationTools
          streamId={streamId}
          onBanUser={handleBanUser}
          onTimeoutUser={handleTimeoutUser}
          onUpdateChatSettings={handleUpdateChatSettings}
        />
      )}
    </div>
  )
}
