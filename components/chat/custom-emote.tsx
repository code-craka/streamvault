'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

interface CustomEmoteProps {
  emoteId: string
  emoteName?: string
  emoteUrl?: string
  isAnimated?: boolean
  className?: string
  onClick?: () => void
}

export function CustomEmote({
  emoteId,
  emoteName,
  emoteUrl,
  isAnimated = false,
  className = '',
  onClick,
}: CustomEmoteProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fallback emote data (in a real app, this would come from a service)
  const fallbackEmotes: Record<
    string,
    { name: string; url: string; animated: boolean }
  > = {
    kappa: {
      name: 'Kappa',
      url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
      animated: false,
    },
    pogchamp: {
      name: 'PogChamp',
      url: 'https://static-cdn.jtvnw.net/emoticons/v2/88/default/dark/1.0',
      animated: false,
    },
    lul: {
      name: 'LUL',
      url: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
      animated: false,
    },
  }

  const emote = fallbackEmotes[emoteId.toLowerCase()] || {
    name: emoteName || emoteId,
    url: emoteUrl || '',
    animated: isAnimated,
  }

  if (imageError || !emote.url) {
    return (
      <span
        className={`bg-muted inline-block rounded px-1 py-0.5 font-mono text-xs ${className}`}
        onClick={onClick}
        title={emote.name}
      >
        :{emote.name}:
      </span>
    )
  }

  return (
    <img
      src={emote.url}
      alt={emote.name}
      title={emote.name}
      className={`inline-block h-6 w-6 cursor-pointer object-contain transition-transform hover:scale-110 ${className}`}
      onLoad={() => setIsLoading(false)}
      onError={() => {
        setImageError(true)
        setIsLoading(false)
      }}
      onClick={onClick}
      style={{
        filter: isLoading ? 'blur(2px)' : 'none',
      }}
    />
  )
}

interface EmotePickerProps {
  onEmoteSelect: (emoteId: string) => void
  userTier?: string
  className?: string
}

export function EmotePicker({
  onEmoteSelect,
  userTier = 'basic',
  className,
}: EmotePickerProps) {
  const { user } = useUser()

  // Basic emotes available to all users
  const basicEmotes = ['kappa', 'pogchamp', 'lul']

  // Premium emotes (5 for Premium, unlimited for Pro)
  const premiumEmotes = ['pepehands', 'monkas', 'omegalul', 'sadge', 'copium']

  // Get available emotes based on subscription tier
  const getAvailableEmotes = () => {
    let emotes = [...basicEmotes]

    if (userTier === 'premium') {
      emotes = [...emotes, ...premiumEmotes.slice(0, 5)]
    } else if (userTier === 'pro') {
      emotes = [...emotes, ...premiumEmotes]
    }

    return emotes
  }

  const availableEmotes = getAvailableEmotes()

  return (
    <div
      className={`bg-background grid grid-cols-6 gap-2 rounded-lg border p-3 shadow-lg ${className}`}
    >
      <div className="text-muted-foreground col-span-6 mb-2 text-xs">
        Available Emotes ({userTier})
      </div>
      {availableEmotes.map(emoteId => (
        <div
          key={emoteId}
          className="hover:bg-muted flex cursor-pointer items-center justify-center rounded p-1"
          onClick={() => onEmoteSelect(emoteId)}
        >
          <CustomEmote emoteId={emoteId} />
        </div>
      ))}

      {userTier === 'basic' && (
        <div className="text-muted-foreground bg-muted col-span-6 mt-2 rounded p-2 text-xs">
          Upgrade to Premium for 5 custom emotes, or Pro for unlimited emotes!
        </div>
      )}
    </div>
  )
}
