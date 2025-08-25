'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Ban, 
  Clock, 
  Trash2, 
  Flag, 
  Settings,
  Users,
  MessageSquareOff,
  Filter
} from 'lucide-react'

interface ModerationToolsProps {
  streamId: string
  onBanUser?: (userId: string, duration?: number, reason?: string) => void
  onTimeoutUser?: (userId: string, duration: number, reason?: string) => void
  onDeleteMessage?: (messageId: string, reason?: string) => void
  onUpdateChatSettings?: (settings: any) => void
  className?: string
}

export function ModerationTools({
  streamId,
  onBanUser,
  onTimeoutUser,
  onDeleteMessage,
  onUpdateChatSettings,
  className
}: ModerationToolsProps) {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<'actions' | 'settings' | 'banned'>('actions')
  const [banUserId, setBanUserId] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState<number | undefined>(undefined)
  const [timeoutUserId, setTimeoutUserId] = useState('')
  const [timeoutDuration, setTimeoutDuration] = useState(5)
  const [timeoutReason, setTimeoutReason] = useState('')

  // Check if user has moderation permissions
  const canModerate = () => {
    if (!user) return false
    const userRole = user.publicMetadata?.role as string
    return ['admin', 'streamer'].includes(userRole)
  }

  if (!canModerate()) {
    return null
  }

  const handleBanUser = () => {
    if (!banUserId.trim()) return
    
    onBanUser?.(banUserId, banDuration, banReason || 'No reason provided')
    setBanUserId('')
    setBanReason('')
    setBanDuration(undefined)
  }

  const handleTimeoutUser = () => {
    if (!timeoutUserId.trim() || timeoutDuration <= 0) return
    
    onTimeoutUser?.(timeoutUserId, timeoutDuration, timeoutReason || 'No reason provided')
    setTimeoutUserId('')
    setTimeoutDuration(5)
    setTimeoutReason('')
  }

  const renderActionsTab = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div>
        <h4 className="font-medium mb-3 flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span>Quick Actions</span>
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => onUpdateChatSettings?.({ slowMode: 5 })}
          >
            <Clock className="h-3 w-3 mr-2" />
            Slow Mode (5s)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => onUpdateChatSettings?.({ subscriberOnly: true })}
          >
            <Users className="h-3 w-3 mr-2" />
            Subscriber Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => onUpdateChatSettings?.({ emoteOnly: true })}
          >
            <MessageSquareOff className="h-3 w-3 mr-2" />
            Emote Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => onUpdateChatSettings?.({ profanityFilter: true })}
          >
            <Filter className="h-3 w-3 mr-2" />
            Profanity Filter
          </Button>
        </div>
      </div>

      {/* Ban User */}
      <div>
        <h4 className="font-medium mb-3 flex items-center space-x-2">
          <Ban className="h-4 w-4" />
          <span>Ban User</span>
        </h4>
        <div className="space-y-3">
          <Input
            placeholder="User ID or Username"
            value={banUserId}
            onChange={(e) => setBanUserId(e.target.value)}
          />
          <Input
            placeholder="Reason (optional)"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Duration (minutes, leave empty for permanent)"
              value={banDuration || ''}
              onChange={(e) => setBanDuration(e.target.value ? parseInt(e.target.value) : undefined)}
            />
            <Button onClick={handleBanUser} variant="destructive">
              Ban User
            </Button>
          </div>
        </div>
      </div>

      {/* Timeout User */}
      <div>
        <h4 className="font-medium mb-3 flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Timeout User</span>
        </h4>
        <div className="space-y-3">
          <Input
            placeholder="User ID or Username"
            value={timeoutUserId}
            onChange={(e) => setTimeoutUserId(e.target.value)}
          />
          <Input
            placeholder="Reason (optional)"
            value={timeoutReason}
            onChange={(e) => setTimeoutReason(e.target.value)}
          />
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Duration (minutes)"
              value={timeoutDuration}
              onChange={(e) => setTimeoutDuration(parseInt(e.target.value) || 5)}
              min={1}
              max={1440} // 24 hours max
            />
            <Button onClick={handleTimeoutUser} variant="secondary">
              Timeout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h4 className="font-medium mb-3 flex items-center space-x-2">
        <Settings className="h-4 w-4" />
        <span>Chat Settings</span>
      </h4>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Slow Mode</p>
            <p className="text-sm text-muted-foreground">Limit message frequency</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ slowMode: 0 })}
            >
              Off
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ slowMode: 5 })}
            >
              5s
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ slowMode: 30 })}
            >
              30s
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Subscriber Only</p>
            <p className="text-sm text-muted-foreground">Only subscribers can chat</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ subscriberOnly: false })}
            >
              Off
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ subscriberOnly: true })}
            >
              On
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Emote Only</p>
            <p className="text-sm text-muted-foreground">Only emotes allowed</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ emoteOnly: false })}
            >
              Off
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ emoteOnly: true })}
            >
              On
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Profanity Filter</p>
            <p className="text-sm text-muted-foreground">Auto-filter inappropriate content</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ profanityFilter: false })}
            >
              Off
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ profanityFilter: true })}
            >
              On
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Links Allowed</p>
            <p className="text-sm text-muted-foreground">Allow users to post links</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ linksAllowed: false })}
            >
              Off
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateChatSettings?.({ linksAllowed: true })}
            >
              On
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBannedTab = () => (
    <div className="space-y-4">
      <h4 className="font-medium mb-3 flex items-center space-x-2">
        <Ban className="h-4 w-4" />
        <span>Banned Users</span>
      </h4>
      
      <div className="text-center py-8 text-muted-foreground">
        <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No banned users</p>
        <p className="text-sm">Banned users will appear here</p>
      </div>
    </div>
  )

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span>Moderation Tools</span>
        </h3>
        <Badge variant="secondary" className="text-xs">
          {user?.publicMetadata?.role === 'admin' ? 'Admin' : 'Streamer'}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'actions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('actions')}
          className="flex-1"
        >
          Actions
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('settings')}
          className="flex-1"
        >
          Settings
        </Button>
        <Button
          variant={activeTab === 'banned' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('banned')}
          className="flex-1"
        >
          Banned
        </Button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'actions' && renderActionsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'banned' && renderBannedTab()}
      </div>
    </Card>
  )
}