'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { LiveChat } from './live-chat'
import { SuperChat, SuperChatDisplay } from './super-chat'
import { ChatPolls } from './chat-polls'
import { EmotePicker } from './custom-emote'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageCircle,
  Gift,
  BarChart3,
  Smile,
  TrendingUp,
  Heart,
  Zap,
} from 'lucide-react'

interface EnhancedChatProps {
  streamId: string
  showModerationTools?: boolean
  className?: string
}

export function EnhancedChat({
  streamId,
  showModerationTools = false,
  className,
}: EnhancedChatProps) {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('chat')
  const [activeSuperChats, setActiveSuperChats] = useState<any[]>([])
  const [showEmotePicker, setShowEmotePicker] = useState(false)

  // Get user's subscription tier
  const getUserTier = () => {
    if (!user) return 'basic'
    return (user.publicMetadata?.subscriptionTier as string) || 'basic'
  }

  // Handle super chat
  const handleSuperChat = async (
    amount: number,
    message: string,
    currency: string
  ) => {
    try {
      const response = await fetch(`/api/chat/${streamId}/super-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          message,
          currency,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send super chat')
      }

      const result = await response.json()

      // Add to active super chats display
      const superChat = {
        id: result.superChat.id,
        username: user?.username || user?.firstName || 'Anonymous',
        amount,
        currency,
        message,
        color: result.superChat.color,
        displayDuration: result.superChat.displayDuration,
        timestamp: new Date(),
      }

      setActiveSuperChats(prev => [...prev, superChat])

      // Auto-remove after display duration
      setTimeout(() => {
        setActiveSuperChats(prev => prev.filter(sc => sc.id !== superChat.id))
      }, result.superChat.displayDuration * 1000)
    } catch (error) {
      console.error('Super chat error:', error)
      throw error
    }
  }

  // Handle poll creation
  const handleCreatePoll = async (
    question: string,
    options: string[],
    duration: number
  ) => {
    try {
      const response = await fetch(`/api/chat/${streamId}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          options,
          duration,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create poll')
      }
    } catch (error) {
      console.error('Poll creation error:', error)
      throw error
    }
  }

  // Handle poll voting
  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const response = await fetch(
        `/api/chat/${streamId}/polls/${pollId}/vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            optionId,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to vote')
      }
    } catch (error) {
      console.error('Voting error:', error)
      throw error
    }
  }

  // Handle emote selection
  const handleEmoteSelect = (emoteId: string) => {
    // This would typically insert the emote into the chat input
    console.log('Selected emote:', emoteId)
    setShowEmotePicker(false)
  }

  const dismissSuperChat = (superChatId: string) => {
    setActiveSuperChats(prev => prev.filter(sc => sc.id !== superChatId))
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Super Chats Display */}
      {activeSuperChats.length > 0 && (
        <div className="space-y-2">
          {activeSuperChats.map(superChat => (
            <SuperChatDisplay
              key={superChat.id}
              superChat={superChat}
              onDismiss={() => dismissSuperChat(superChat.id)}
            />
          ))}
        </div>
      )}

      {/* Main Chat Interface */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="flex items-center space-x-1">
              <MessageCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger
              value="superchat"
              className="flex items-center space-x-1"
            >
              <Gift className="h-3 w-3" />
              <span className="hidden sm:inline">Super Chat</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="flex items-center space-x-1">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">Polls</span>
            </TabsTrigger>
            <TabsTrigger value="emotes" className="flex items-center space-x-1">
              <Smile className="h-3 w-3" />
              <span className="hidden sm:inline">Emotes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <LiveChat
              streamId={streamId}
              showModerationTools={showModerationTools}
              className="h-[500px]"
            />
          </TabsContent>

          <TabsContent value="superchat" className="mt-0 p-4">
            <SuperChat streamId={streamId} onSuperChat={handleSuperChat} />
          </TabsContent>

          <TabsContent value="polls" className="mt-0 p-4">
            <ChatPolls
              streamId={streamId}
              onCreatePoll={handleCreatePoll}
              onVote={handleVote}
            />
          </TabsContent>

          <TabsContent value="emotes" className="mt-0 p-4">
            <EmotePicker
              onEmoteSelect={handleEmoteSelect}
              userTier={getUserTier()}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Chat Analytics (for streamers/admins) */}
      {user &&
        ['admin', 'streamer'].includes(user.publicMetadata?.role as string) && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center space-x-2 font-semibold">
              <TrendingUp className="h-4 w-4" />
              <span>Chat Analytics</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">0</div>
                <div className="text-muted-foreground text-xs">
                  Messages/min
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">0</div>
                <div className="text-muted-foreground text-xs">
                  Active Users
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">$0</div>
                <div className="text-muted-foreground text-xs">Super Chat</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">😊</div>
                <div className="text-muted-foreground text-xs">Sentiment</div>
              </div>
            </div>
          </Card>
        )}

      {/* Engagement Features */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center space-x-2 font-semibold">
          <Heart className="h-4 w-4" />
          <span>Engagement</span>
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start">
            <Heart className="mr-2 h-3 w-3" />
            React
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <Zap className="mr-2 h-3 w-3" />
            Hype
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <Gift className="mr-2 h-3 w-3" />
            Gift Sub
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <BarChart3 className="mr-2 h-3 w-3" />
            Quick Poll
          </Button>
        </div>
      </Card>
    </div>
  )
}
