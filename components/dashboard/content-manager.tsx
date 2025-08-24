// Content management tools for creators
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Video, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Upload,
  Play,
  Pause,
  Settings,
  Tag,
  Calendar,
  Clock,
  Users,
  BarChart3,
  Image as ImageIcon,
  FileText,
  Save,
  RefreshCw
} from 'lucide-react'

interface VODContent {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  thumbnailUrl: string
  videoUrl: string
  duration: number
  views: number
  likes: number
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  status: 'processing' | 'ready' | 'error'
}

interface Playlist {
  id: string
  name: string
  description: string
  videoCount: number
  isPublic: boolean
  createdAt: Date
  videos: string[] // VOD IDs
}

export function ContentManager() {
  const { user } = useUser()
  const [vods, setVods] = useState<VODContent[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [editingVod, setEditingVod] = useState<VODContent | null>(null)
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)

  // Form states
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [playlistIsPublic, setPlaylistIsPublic] = useState(true)

  useEffect(() => {
    fetchContent()
  }, [user])

  const fetchContent = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Fetch VODs
      const vodsResponse = await fetch('/api/vods/user')
      if (vodsResponse.ok) {
        const vodsData = await vodsResponse.json()
        setVods(vodsData.vods || [])
      }

      // Fetch playlists (mock data for now)
      const mockPlaylists: Playlist[] = [
        {
          id: '1',
          name: 'Gaming Highlights',
          description: 'Best moments from gaming streams',
          videoCount: 12,
          isPublic: true,
          createdAt: new Date('2024-01-15'),
          videos: ['1', '2', '3']
        },
        {
          id: '2',
          name: 'Tutorial Series',
          description: 'Educational content and tutorials',
          videoCount: 8,
          isPublic: true,
          createdAt: new Date('2024-01-10'),
          videos: ['4', '5']
        }
      ]
      setPlaylists(mockPlaylists)

    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateVOD = async (vodId: string, updates: Partial<VODContent>) => {
    try {
      const response = await fetch(`/api/vods/${vodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setVods(prev => prev.map(vod => 
          vod.id === vodId ? { ...vod, ...updates } : vod
        ))
        setEditingVod(null)
      }
    } catch (error) {
      console.error('Error updating VOD:', error)
    }
  }

  const deleteVOD = async (vodId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/vods/${vodId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setVods(prev => prev.filter(vod => vod.id !== vodId))
      }
    } catch (error) {
      console.error('Error deleting VOD:', error)
    }
  }

  const toggleVODVisibility = async (vodId: string, isPublic: boolean) => {
    await updateVOD(vodId, { isPublic })
  }

  const createPlaylist = async () => {
    if (!playlistName.trim()) return

    try {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        description: playlistDescription.trim(),
        videoCount: 0,
        isPublic: playlistIsPublic,
        createdAt: new Date(),
        videos: []
      }

      setPlaylists(prev => [newPlaylist, ...prev])
      setShowCreatePlaylist(false)
      setPlaylistName('')
      setPlaylistDescription('')
      setPlaylistIsPublic(true)
    } catch (error) {
      console.error('Error creating playlist:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
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
      <Tabs defaultValue="vods" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vods">Videos ({vods.length})</TabsTrigger>
          <TabsTrigger value="playlists">Playlists ({playlists.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vods" className="space-y-4">
          {/* VOD Management */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Video Library</h3>
              <p className="text-sm text-muted-foreground">
                Manage your video content and settings
              </p>
            </div>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>

          {vods.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No videos found. Upload your first video to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vods.map((vod) => (
                <Card key={vod.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {vod.thumbnailUrl ? (
                      <img 
                        src={vod.thumbnailUrl} 
                        alt={vod.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatDuration(vod.duration)}
                      </Badge>
                    </div>

                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant={vod.status === 'ready' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {vod.status}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium line-clamp-2">{vod.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {vod.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {vod.views.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {vod.createdAt.toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {vod.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {vod.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{vod.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => toggleVODVisibility(vod.id, !vod.isPublic)}
                          variant="ghost"
                          size="sm"
                        >
                          {vod.isPublic ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => setEditingVod(vod)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button
                        onClick={() => deleteVOD(vod.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit VOD Modal */}
          {editingVod && (
            <Card className="fixed inset-0 z-50 m-4 max-w-2xl mx-auto my-8 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Edit Video</CardTitle>
                <CardDescription>Update video information and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingVod.title}
                    onChange={(e) => setEditingVod({...editingVod, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingVod.description}
                    onChange={(e) => setEditingVod({...editingVod, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                    value={editingVod.category} 
                    onValueChange={(value) => setEditingVod({...editingVod, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

                <div className="space-y-2">
                  <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                  <Input
                    id="edit-tags"
                    value={editingVod.tags.join(', ')}
                    onChange={(e) => setEditingVod({
                      ...editingVod, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-public"
                    checked={editingVod.isPublic}
                    onCheckedChange={(checked) => setEditingVod({...editingVod, isPublic: checked})}
                  />
                  <Label htmlFor="edit-public">Public Video</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingVod(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => updateVOD(editingVod.id, editingVod)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4">
          {/* Playlist Management */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Playlists</h3>
              <p className="text-sm text-muted-foreground">
                Organize your videos into collections
              </p>
            </div>
            <Button onClick={() => setShowCreatePlaylist(true)}>
              Create Playlist
            </Button>
          </div>

          {/* Create Playlist Form */}
          {showCreatePlaylist && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Playlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playlist-name">Playlist Name</Label>
                  <Input
                    id="playlist-name"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Enter playlist name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playlist-description">Description</Label>
                  <Textarea
                    id="playlist-description"
                    value={playlistDescription}
                    onChange={(e) => setPlaylistDescription(e.target.value)}
                    placeholder="Describe your playlist..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="playlist-public"
                    checked={playlistIsPublic}
                    onCheckedChange={setPlaylistIsPublic}
                  />
                  <Label htmlFor="playlist-public">Public Playlist</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreatePlaylist(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createPlaylist}>
                    Create Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Playlists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <Card key={playlist.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{playlist.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {playlist.description}
                        </p>
                      </div>
                      <Badge variant={playlist.isPublic ? "default" : "secondary"}>
                        {playlist.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {playlist.videoCount} videos
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {playlist.createdAt.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}