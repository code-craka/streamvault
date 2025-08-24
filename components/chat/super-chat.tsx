'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Gift, 
  DollarSign, 
  Heart, 
  Star, 
  Crown,
  Zap,
  X
} from 'lucide-react'

interface SuperChatProps {
  streamId: string
  onSuperChat?: (amount: number, message: string, currency: string) => Promise<void>
  className?: string
}

export function SuperChat({ streamId, onSuperChat, className }: SuperChatProps) {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Predefined super chat amounts with colors and durations
  const superChatTiers = [
    { amount: 2, color: '#1e90ff', duration: 15, icon: Heart, label: 'Support' },
    { amount: 5, color: '#00ff00', duration: 30, icon: Star, label: 'Appreciate' },
    { amount: 10, color: '#ffff00', duration: 60, icon: Zap, label: 'Highlight' },
    { amount: 20, color: '#ff6600', duration: 120, icon: Crown, label: 'Feature' },
    { amount: 50, color: '#ff0000', duration: 180, icon: Gift, label: 'Celebrate' },
    { amount: 100, color: '#9400d3', duration: 300, icon: Crown, label: 'Champion' },
  ]

  const handleSuperChat = async () => {
    const amount = selectedAmount || parseFloat(customAmount)
    
    if (!amount || amount < 1 || amount > 500) {
      alert('Please select a valid amount between $1 and $500')
      return
    }

    if (!message.trim()) {
      alert('Please enter a message')
      return
    }

    setIsProcessing(true)

    try {
      await onSuperChat?.(amount, message.trim(), 'USD')
      setMessage('')
      setSelectedAmount(null)
      setCustomAmount('')
      setIsOpen(false)
    } catch (error) {
      console.error('Super chat error:', error)
      alert('Failed to send super chat. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getTierForAmount = (amount: number) => {
    return superChatTiers
      .slice()
      .reverse()
      .find(tier => amount >= tier.amount) || superChatTiers[0]
  }

  const currentTier = selectedAmount ? getTierForAmount(selectedAmount) : 
                     customAmount ? getTierForAmount(parseFloat(customAmount)) : null

  if (!user) {
    return null
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:from-yellow-600 hover:to-orange-600 ${className}`}
      >
        <Gift className="h-4 w-4 mr-2" />
        Super Chat
      </Button>
    )
  }

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center space-x-2">
          <Gift className="h-4 w-4" />
          <span>Super Chat</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Amount Selection */}
      <div>
        <p className="text-sm font-medium mb-3">Choose Amount</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {superChatTiers.map((tier) => {
            const Icon = tier.icon
            return (
              <Button
                key={tier.amount}
                variant={selectedAmount === tier.amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedAmount(tier.amount)
                  setCustomAmount('')
                }}
                className="flex flex-col h-auto py-2"
                style={{
                  backgroundColor: selectedAmount === tier.amount ? tier.color : undefined,
                  borderColor: tier.color,
                }}
              >
                <Icon className="h-3 w-3 mb-1" />
                <span className="text-xs">${tier.amount}</span>
              </Button>
            )
          })}
        </div>

        {/* Custom Amount */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Custom amount ($1-$500)"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
              }}
              min={1}
              max={500}
              step={0.01}
            />
          </div>
          <div className="flex items-center px-2 text-sm text-muted-foreground">
            USD
          </div>
        </div>
      </div>

      {/* Preview */}
      {currentTier && (
        <div 
          className="p-3 rounded-lg border-l-4"
          style={{ 
            borderLeftColor: currentTier.color,
            backgroundColor: `${currentTier.color}20`
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ backgroundColor: currentTier.color, color: 'white' }}
            >
              {currentTier.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Highlighted for {Math.floor(currentTier.duration / 60)}m {currentTier.duration % 60}s
            </span>
          </div>
          <p className="text-sm font-medium">
            ${selectedAmount || customAmount} Super Chat
          </p>
        </div>
      )}

      {/* Message Input */}
      <div>
        <p className="text-sm font-medium mb-2">Your Message</p>
        <Input
          placeholder="Say something nice... (max 200 characters)"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
          maxLength={200}
        />
        <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
          <span>{message.length}/200</span>
          <span>Your message will be highlighted in chat</span>
        </div>
      </div>

      {/* Send Button */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSuperChat}
          disabled={isProcessing || (!selectedAmount && !customAmount) || !message.trim()}
          className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          {isProcessing ? (
            'Processing...'
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Send ${selectedAmount || customAmount || 0}
            </>
          )}
        </Button>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Super Chats are highlighted and pinned in chat</p>
        <p>• Higher amounts stay visible longer</p>
        <p>• Support your favorite creators directly</p>
      </div>
    </Card>
  )
}

interface SuperChatDisplayProps {
  superChat: {
    id: string
    username: string
    amount: number
    currency: string
    message: string
    color: string
    displayDuration: number
    timestamp: Date
  }
  onDismiss?: () => void
  className?: string
}

export function SuperChatDisplay({ superChat, onDismiss, className }: SuperChatDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState(superChat.displayDuration)

  // Countdown timer
  useState(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onDismiss?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  })

  return (
    <div 
      className={`p-4 rounded-lg border-l-4 shadow-lg animate-in slide-in-from-right ${className}`}
      style={{ 
        borderLeftColor: superChat.color,
        background: `linear-gradient(135deg, ${superChat.color}20, ${superChat.color}10)`
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Gift 
            className="h-4 w-4" 
            style={{ color: superChat.color }}
          />
          <span className="font-semibold text-sm">{superChat.username}</span>
          <Badge 
            variant="secondary"
            style={{ backgroundColor: superChat.color, color: 'white' }}
            className="text-xs"
          >
            ${superChat.amount} {superChat.currency}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-4 w-4 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm font-medium">{superChat.message}</p>
    </div>
  )
}