'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import type { ChatMessage } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Flag, Reply } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ChatMessageProps {
  message: ChatMessage
  onDelete?: (messageId: string) => void
  onReport?: (messageId: string, reason: string) => void
  className?: string
}

export function ChatMessageComponent({
  message,
  onDelete,
  onReport,
  className,
}: ChatMessageProps) {
  const { user } = useUser()
  const [showActions, setShowActions] = useState(false)

  const canDelete = () => {
    if (!user) return false

    const userRole = user.publicMetadata?.role as string
    const isMessageOwner = user.id === message.userId
    const isModerator = ['admin', 'streamer'].includes(userRole)

    return isMessageOwner || isModerator
  }

  const canReport = () => {
    return user && user.id !== message.userId
  }

  const getUserRoleBadge = () => {
    if (message.metadata.isStreamer) {
      return (
        <Badge variant="destructive" className="ml-2 text-xs">
          Streamer
        </Badge>
      )
    }
    if (message.metadata.isModerator) {
      return (
        <Badge variant="secondary" className="ml-2 text-xs">
          Mod
        </Badge>
      )
    }
    if (message.metadata.isPremium) {
      return (
        <Badge variant="outline" className="ml-2 text-xs">
          {message.metadata.subscriptionTier?.toUpperCase() || 'Premium'}
        </Badge>
      )
    }
    return null
  }

  const getMessagePriorityClass = () => {
    switch (message.metadata.priority) {
      case 'streamer':
        return 'bg-red-900/20 border-l-4 border-red-500'
      case 'premium':
        return 'bg-yellow-900/20 border-l-4 border-yellow-500'
      case 'system':
        return 'bg-blue-900/20 border-l-4 border-blue-500'
      default:
        return ''
    }
  }

  const getUsernameColor = () => {
    if (message.metadata.isStreamer) return 'text-red-400'
    if (message.metadata.isModerator) return 'text-blue-400'
    if (message.metadata.isPremium) return 'text-yellow-400'
    return 'text-foreground'
  }

  const formatTimestamp = () => {
    return formatDistanceToNow(message.timestamp, { addSuffix: true })
  }

  const renderMessageContent = () => {
    if (message.isDeleted) {
      return (
        <p className="text-muted-foreground text-sm italic">
          [Message deleted by {message.deletedBy}]
        </p>
      )
    }

    // Process message for mentions and links
    let content = message.message

    // Highlight mentions
    message.metadata.mentions.forEach(mention => {
      content = content.replace(
        new RegExp(`@${mention}`, 'gi'),
        `<span class="text-blue-400 font-semibold">@${mention}</span>`
      )
    })

    // Make links clickable (basic implementation)
    message.metadata.links.forEach(link => {
      content = content.replace(
        link,
        `<a href="${link}" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">${link}</a>`
      )
    })

    return (
      <p
        className="break-words text-sm"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  const renderEmotes = () => {
    if (message.metadata.emotes.length === 0) return null

    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {message.metadata.emotes.map((emote, index) => (
          <img
            key={index}
            src={emote.emoteUrl}
            alt={emote.emoteName}
            className="inline-block h-6 w-6"
            title={emote.emoteName}
          />
        ))}
      </div>
    )
  }

  const renderModerationFlags = () => {
    if (message.metadata.moderationFlags.length === 0) return null

    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {message.metadata.moderationFlags.map((flag, index) => (
          <Badge
            key={index}
            variant="outline"
            className="border-orange-400 text-xs text-orange-400"
          >
            {flag.type} ({Math.round(flag.confidence * 100)}%)
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`hover:bg-muted/50 group relative rounded-lg p-3 transition-colors ${getMessagePriorityClass()} ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Message Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-semibold ${getUsernameColor()}`}>
            {message.username}
          </span>
          {getUserRoleBadge()}
          <span className="text-muted-foreground text-xs">
            {formatTimestamp()}
          </span>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
            {canReport() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReport?.(message.id, 'inappropriate')}
                className="h-6 w-6 p-0 hover:bg-orange-500/20 hover:text-orange-400"
                title="Report message"
              >
                <Flag className="h-3 w-3" />
              </Button>
            )}
            {canDelete() && !message.isDeleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(message.id)}
                className="hover:bg-destructive/20 hover:text-destructive h-6 w-6 p-0"
                title="Delete message"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="space-y-1">
        {renderMessageContent()}
        {renderEmotes()}
        {renderModerationFlags()}
      </div>

      {/* Super Chat Indicator */}
      {message.messageType === 'super_chat' &&
        message.metadata.superChatAmount && (
          <div className="mt-2 rounded border border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-yellow-400">
                Super Chat
              </span>
              <span className="text-sm font-bold text-yellow-400">
                ${message.metadata.superChatAmount}{' '}
                {message.metadata.superChatCurrency || 'USD'}
              </span>
            </div>
          </div>
        )}
    </div>
  )
}
