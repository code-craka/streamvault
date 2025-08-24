// Stream management and configuration component
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Square, 
  Settings, 
  Copy, 
  Eye, 
  Clock,
  Users,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Stream {
  id: string
  title: string
  description: string
  category: string
  status: 'inactive' | 'active' | 'ended'
  streamKey: string
  rtmpUrl: string
  hlsUrl: string
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
  currentViewers?: number
  totalViewers?: number
  chatMessages?: number
}

export function StreamManager() {
  const { user } = useUser()
  const [streams, setStreams] = useState<Stream[]>([])
  const [activeStream, setActiveStream] = useState<Stream | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    fetchStreams()
  }, [user])

  const fetchStreams = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/streams')
      if (response.ok) {
        const data = await response.json()
        setStreams(data.streams || [])
        
        // Find active stream
        const active = data.streams?.find((s: Stream) => s.status === 'active')
        setActiveStream(active || null)
      }
    } catch (error) {
      console.error('Error fetching streams:', error)
    } finally {
      setLoading(false)
    }
  }

  const createStream = async () => {
    if (!title.trim()) return

    try {
      setCreating(true)
      const response = await fetch('/api/streams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          isPrivate
        })
      })

      if (response.ok) {
        const newStream = await response.json()
        setStreams(prev => [newStream, ...prev])
        setShowCreateForm(false)
        setTitle('')
        setDescription('')
        setCategory('')
        setIsPrivate(false)
      }
    } catch (error) {
      console.error('Error creating stream:', error)
    } finally {
      setCreating(false)
    }
  }

  const startStream = async (streamId: string) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/start`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchStreams()
      }
    } catch (error) {
      console.error('Error starting stream:', error)
    }
  }

  const endStream = async (streamId: string) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchStreams()
        setActiveStream(null)
      }
    } catch (error) {
      console.error('Error ending stream:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const regenerateStreamKey = async (streamId: string) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/regenerate-key`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchStreams()
      }
    } catch (error) {
      console.error('Error regenerating stream key:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Stream Status */}
      {activeStream && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">
                  <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                  LIVE
                </Badge>
                <CardTitle className="text-green-800 dark:text-green-200">
                  {activeStream.title}
                </CardTitle>
              </div>
              <Button 
                onClick={() => endStream(activeStream.id)}
                variant="destructive"
                size="sm"
              >
                <Square className="h-4 w-4 mr-1" />
                End Stream
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {activeStream.currentViewers || 0} viewers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {activeStream.chatMessages || 0} messages
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Started {activeStream.startedAt ? new Date(activeStream.startedAt).toLocaleTimeString() : 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Stream */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stream Management</CardTitle>
              <CardDescription>Create and manage your live streams</CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={!!activeStream}
            >
              {showCreateForm ? 'Cancel' : 'New Stream'}
            </Button>
          </div>
        </CardHeader>

        {showCreateForm && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Stream Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter stream title..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="art">Art & Design</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your stream..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <Label htmlFor="private">Private Stream</Label>
            </div>

            <Button 
              onClick={createStream} 
              disabled={creating || !title.trim()}
              className="w-full"
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Stream'
              )}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Stream List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Streams</h3>
        
        {streams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No streams found. Create your first stream to get started!</p>
            </CardContent>
          </Card>
        ) : (
          streams.map((stream) => (
            <Card key={stream.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        stream.status === 'active' ? 'default' :
                        stream.status === 'inactive' ? 'secondary' : 'outline'
                      }
                    >
                      {stream.status === 'active' && <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />}
                      {stream.status.toUpperCase()}
                    </Badge>
                    <div>
                      <CardTitle className="text-base">{stream.title}</CardTitle>
                      <CardDescription>{stream.category}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {stream.status === 'inactive' && (
                      <Button 
                        onClick={() => startStream(stream.id)}
                        size="sm"
                        disabled={!!activeStream}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {stream.status === 'active' && (
                      <Button 
                        onClick={() => endStream(stream.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        End
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {stream.description && (
                  <p className="text-sm text-muted-foreground">{stream.description}</p>
                )}

                {/* Stream Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{stream.totalViewers || 0} total views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{stream.currentViewers || 0} current</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{stream.chatMessages || 0} messages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(stream.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <Separator />

                {/* Stream Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">RTMP URL</Label>
                    <Button 
                      onClick={() => copyToClipboard(stream.rtmpUrl)}
                      variant="ghost" 
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input value={stream.rtmpUrl} readOnly className="font-mono text-xs" />

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Stream Key</Label>
                    <div className="flex gap-1">
                      <Button 
                        onClick={() => copyToClipboard(stream.streamKey)}
                        variant="ghost" 
                        size="sm"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => regenerateStreamKey(stream.id)}
                        variant="ghost" 
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input 
                    value={stream.streamKey} 
                    readOnly 
                    type="password"
                    className="font-mono text-xs" 
                  />

                  {stream.status === 'active' && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Watch URL</Label>
                        <Button 
                          onClick={() => window.open(`/stream/${stream.id}`, '_blank')}
                          variant="ghost" 
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input 
                        value={`${window.location.origin}/stream/${stream.id}`} 
                        readOnly 
                        className="font-mono text-xs" 
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}