'use client'

import { useState } from 'react'
import { SecureVODPlayer } from '@/components/player/secure-vod-player'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SubscriptionTier } from '@/types/auth'

// Sample video data for testing
const SAMPLE_VIDEOS = [
  {
    id: 'sample-video-1',
    title: 'Introduction to StreamVault',
    description:
      'Learn about the features and capabilities of our streaming platform.',
    duration: 180, // 3 minutes
    createdAt: new Date('2024-01-15'),
    creatorName: 'StreamVault Team',
    requiredTier: 'basic' as SubscriptionTier,
    tags: ['tutorial', 'introduction', 'platform'],
    thumbnailUrl: '/api/placeholder/640/360',
  },
  {
    id: 'premium-content-1',
    title: 'Advanced Streaming Techniques',
    description:
      'Deep dive into professional streaming setups and optimization strategies.',
    duration: 720, // 12 minutes
    createdAt: new Date('2024-01-20'),
    creatorName: 'Pro Streamer',
    requiredTier: 'premium' as SubscriptionTier,
    tags: ['advanced', 'techniques', 'optimization'],
    thumbnailUrl: '/api/placeholder/640/360',
  },
  {
    id: 'pro-exclusive-1',
    title: 'Enterprise Streaming Solutions',
    description:
      'Exclusive content for Pro subscribers covering enterprise-level streaming infrastructure.',
    duration: 1200, // 20 minutes
    createdAt: new Date('2024-01-25'),
    creatorName: 'Enterprise Expert',
    requiredTier: 'pro' as SubscriptionTier,
    tags: ['enterprise', 'infrastructure', 'exclusive'],
    thumbnailUrl: '/api/placeholder/640/360',
  },
]

const TIER_COLORS = {
  basic: 'bg-gray-100 text-gray-800',
  premium: 'bg-yellow-100 text-yellow-800',
  pro: 'bg-purple-100 text-purple-800',
}

const TIER_ICONS = {
  basic: '🥉',
  premium: '🥈',
  pro: '🥇',
}

export default function TestSecurePlayerPage() {
  const [selectedVideo, setSelectedVideo] = useState(SAMPLE_VIDEOS[0])
  const [playerKey, setPlayerKey] = useState(0)
  const [testTier, setTestTier] = useState<SubscriptionTier>('basic')

  const handleVideoChange = (videoId: string) => {
    const video = SAMPLE_VIDEOS.find(v => v.id === videoId)
    if (video) {
      setSelectedVideo(video)
      setPlayerKey(prev => prev + 1) // Force re-render
    }
  }

  const handlePlayerError = (error: any) => {
    console.error('Secure player error:', error)
  }

  const handlePlay = () => {
    console.log('Video started playing:', selectedVideo.title)
  }

  const handlePause = () => {
    console.log('Video paused:', selectedVideo.title)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Secure VOD Player Test</h1>
          <p className="text-muted-foreground">
            Test the secure video-on-demand player with signed URLs and
            subscription validation
          </p>
        </div>

        {/* Video Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Test Video</CardTitle>
            <CardDescription>
              Choose a video to test different subscription tiers and security
              features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {SAMPLE_VIDEOS.map(video => (
                <div
                  key={video.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedVideo.id === video.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleVideoChange(video.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 font-medium">{video.title}</div>
                      <div className="text-muted-foreground mb-2 text-sm">
                        {video.description}
                      </div>
                      <div className="text-muted-foreground flex items-center space-x-4 text-xs">
                        <span>👤 {video.creatorName}</span>
                        <span>
                          ⏱️ {Math.floor(video.duration / 60)}:
                          {(video.duration % 60).toString().padStart(2, '0')}
                        </span>
                        <span>📅 {video.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {video.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className={TIER_COLORS[video.requiredTier]}>
                      {TIER_ICONS[video.requiredTier]}{' '}
                      {video.requiredTier.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>
              Adjust test parameters to simulate different scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Override Tier:</label>
                <Select
                  value={testTier}
                  onValueChange={value =>
                    setTestTier(value as SubscriptionTier)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => setPlayerKey(prev => prev + 1)}
              >
                Reload Player
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secure Video Player */}
        <Card>
          <CardHeader>
            <CardTitle>Secure Video Player</CardTitle>
            <CardDescription>
              Currently testing: {selectedVideo.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecureVODPlayer
              key={playerKey}
              videoId={selectedVideo.id}
              requiredTier={testTier}
              videoMetadata={{
                title: selectedVideo.title,
                description: selectedVideo.description,
                duration: selectedVideo.duration,
                createdAt: selectedVideo.createdAt,
                creatorName: selectedVideo.creatorName,
                tags: selectedVideo.tags,
              }}
              onError={handlePlayerError}
              onPlay={handlePlay}
              onPause={handlePause}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Signed URLs:</strong> 15-minute expiration with
                  automatic refresh
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Subscription Validation:</strong> Real-time tier
                  checking via Clerk
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Session Management:</strong> Secure playback sessions
                  with refresh tokens
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Access Logging:</strong> Comprehensive analytics and
                  audit trails
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Error Handling:</strong> Graceful fallbacks and retry
                  mechanisms
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Content Protection:</strong> No direct file access,
                  secure streaming only
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <strong>GET</strong> /api/videos/[videoId]/signed-url?tier=
                {testTier}
              </div>
              <div>
                <strong>POST</strong> /api/videos/[videoId]/signed-url
              </div>
              <div>
                <strong>POST</strong> /api/videos/[videoId]/refresh-url
              </div>
              <div>
                <strong>GET</strong>{' '}
                /api/videos/[videoId]/refresh-url?sessionId=...&refreshToken=...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
