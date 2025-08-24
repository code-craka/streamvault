'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, Smile, Gift } from 'lucide-react'
import { createChatMessageSchema } from '@/lib/validations/chat'
import type { CreateChatMessageInput } from '@/lib/validations/chat'

interface ChatInputProps {
  streamId: string
  onSendMessage: (message: CreateChatMessageInput) => Promise<void>
  disabled?: boolean
  rateLimitInfo?: {
    isLimited: boolean
    remainingTime: number
    messagesPerSecond: number
  }
  className?: string
}

export function ChatInput({ 
  streamId, 
  onSendMessage, 
  disabled = false,
  rateLimitInfo,
  className 
}: ChatInputProps) {
  const { user } = useUser()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const rateLimitTimerRef = useRef<NodeJS.Timeout>()

  // Get user's rate limit based on subscription tier
  const getRateLimit = () => {
    if (!user) return 1000 // 1 message per second for unauthenticated
    
    const tier = user.publicMetadata?.subscriptionTier as string
    const role = user.publicMetadata?.role as string
    
    // Streamers and admins have higher limits
    if (['streamer', 'admin'].includes(role)) {
      return 200 // 5 messages per second
    }
    
    switch (tier) {
      case 'pro':
        return 200 // 5 messages per second
      case 'premium':
        return 333 // 3 messages per second
      case 'basic':
      default:
        return 1000 // 1 message per second
    }
  }

  // Apply rate limiting
  const applyRateLimit = () => {
    const cooldownMs = getRateLimit()
    setIsRateLimited(true)
    setRateLimitCooldown(cooldownMs / 1000)

    // Clear existing timer
    if (rateLimitTimerRef.current) {
      clearTimeout(rateLimitTimerRef.current)
    }

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setRateLimitCooldown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setIsRateLimited(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Set main timeout
    rateLimitTimerRef.current = setTimeout(() => {
      setIsRateLimited(false)
      setRateLimitCooldown(0)
    }, cooldownMs)
  }

  // Sanitize message content
  const sanitizeMessage = (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .slice(0, 500) // Enforce max length
  }

  // Validate message before sending
  const validateMessage = (text: string): { valid: boolean; error?: string } => {
    if (!text.trim()) {
      return { valid: false, error: 'Message cannot be empty' }
    }

    if (text.length > 500) {
      return { valid: false, error: 'Message too long (max 500 characters)' }
    }

    // Check for spam (repeated characters)
    const repeatedCharPattern = /(.)\1{10,}/
    if (repeatedCharPattern.test(text)) {
      return { valid: false, error: 'Message contains too many repeated characters' }
    }

    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length
    if (text.length > 10 && capsRatio > 0.7) {
      return { valid: false, error: 'Please reduce the use of capital letters' }
    }

    return { valid: true }
  }

  const sendMessage = async () => {
    if (!message.trim() || !user || isSending || isRateLimited) return

    const sanitizedMessage = sanitizeMessage(message)
    const validation = validateMessage(sanitizedMessage)

    if (!validation.valid) {
      setError(validation.error || 'Invalid message')
      return
    }

    // Validate with Zod schema
    const schemaValidation = createChatMessageSchema.safeParse({
      streamId,
      message: sanitizedMessage,
      messageType: 'text',
    })

    if (!schemaValidation.success) {
      setError('Invalid message format')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      await onSendMessage(schemaValidation.data)
      setMessage('')
      applyRateLimit()
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 500) {
      setMessage(value)
      setError(null)
    }
  }

  // Get user's subscription tier for display
  const getSubscriptionBadge = () => {
    if (!user) return null
    
    const tier = user.publicMetadata?.subscriptionTier as string
    const role = user.publicMetadata?.role as string
    
    if (role === 'streamer') {
      return <Badge variant="destructive" className="text-xs">Streamer</Badge>
    }
    if (role === 'admin') {
      return <Badge variant="secondary" className="text-xs">Admin</Badge>
    }
    if (tier) {
      return (
        <Badge variant="outline" className="text-xs">
          {tier.toUpperCase()}
        </Badge>
      )
    }
    return null
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current)
      }
    }
  }, [])

  if (!user) {
    return (
      <div className={`p-4 border-t bg-muted/50 ${className}`}>
        <p className="text-center text-muted-foreground">
          Please sign in to join the chat
        </p>
      </div>
    )
  }

  return (
    <div className={`p-4 border-t space-y-3 ${className}`}>
      {/* User Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            {user.username || user.firstName || 'Anonymous'}
          </span>
          {getSubscriptionBadge()}
        </div>
        <div className="text-xs text-muted-foreground">
          Rate limit: {getRateLimit() / 1000}s cooldown
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Rate Limit Warning */}
      {isRateLimited && (
        <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded text-sm text-orange-600">
          Rate limited. Please wait {rateLimitCooldown}s before sending another message.
        </div>
      )}

      {/* Message Input */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={
              isRateLimited 
                ? `Rate limited (${rateLimitCooldown}s)...` 
                : 'Type a message...'
            }
            disabled={disabled || isSending || isRateLimited}
            className="pr-12"
            maxLength={500}
          />
          
          {/* Character Count */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className={`text-xs ${
              message.length > 450 
                ? 'text-destructive' 
                : message.length > 400 
                ? 'text-orange-500' 
                : 'text-muted-foreground'
            }`}>
              {message.length}/500
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-1">
          {/* Emote Button (placeholder for future implementation) */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="px-3"
            title="Emotes (Coming Soon)"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Super Chat Button (placeholder for future implementation) */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="px-3"
            title="Super Chat (Coming Soon)"
          >
            <Gift className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={sendMessage}
            disabled={disabled || !message.trim() || isSending || isRateLimited}
            size="sm"
            className="px-4"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Input Help Text */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span>Max 500 characters</span>
      </div>
    </div>
  )
}