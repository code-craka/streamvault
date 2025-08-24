'use client'

import { useState } from 'react'
import { HLSPlayer } from '@/components/player/hls-player'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Sample HLS streams for testing
const SAMPLE_STREAMS = [
  {
    name: 'Big Buck Bunny (VOD)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    isLive: false,
    description: 'Sample VOD stream for testing'
  },
  {
    name: 'Apple Sample Stream',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    isLive: false,
    description: 'Apple\'s sample HLS stream'
  },
  {
    name: 'Sintel Movie',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    isLive: false,
    description: 'Sintel movie sample stream'
  }
]

export default function TestPlayerPage() {
  const [selectedStream, setSelectedStream] = useState(SAMPLE_STREAMS[0])
  const [playerKey, setPlayerKey] = useState(0)

  const handleStreamChange = (stream: typeof SAMPLE_STREAMS[0]) => {
    setSelectedStream(stream)
    // Force re-render of player component
    setPlayerKey(prev => prev + 1)
  }

  const handlePlayerError = (error: any) => {
    console.error('Player error:', error)
    alert(`Player Error: ${error.type || 'Unknown error'}`)
  }

  const handleLoadedData = () => {
    console.log('Video loaded successfully')
  }

  const handlePlay = () => {
    console.log('Video started playing')
  }

  const handlePause = () => {
    console.log('Video paused')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">HLS Player Test</h1>
          <p className="text-muted-foreground">
            Test the HLS video player component with sample streams
          </p>
        </div>

        {/* Stream Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Test Stream</CardTitle>
            <CardDescription>
              Choose a sample HLS stream to test the player functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {SAMPLE_STREAMS.map((stream, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStream.url === stream.url
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleStreamChange(stream)}
                >
                  <div className="font-medium">{stream.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {stream.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stream.isLive ? '🔴 Live Stream' : '📹 VOD'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Video Player */}
        <Card>
          <CardHeader>
            <CardTitle>Video Player</CardTitle>
            <CardDescription>
              Currently playing: {selectedStream.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HLSPlayer
              key={playerKey}
              src={selectedStream.url}
              isLive={selectedStream.isLive}
              autoPlay={false}
              muted={true}
              onError={handlePlayerError}
              onLoadedData={handleLoadedData}
              onPlay={handlePlay}
              onPause={handlePause}
              className="w-full"
            />
            
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Player Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ HLS.js integration with fallback to native HLS</li>
                <li>✅ Play/Pause controls</li>
                <li>✅ Volume control and mute</li>
                <li>✅ Fullscreen support</li>
                <li>✅ Progress bar (for VOD content)</li>
                <li>✅ Loading states and error handling</li>
                <li>✅ Auto-hiding controls</li>
                <li>✅ Live stream indicator</li>
                <li>✅ Responsive design</li>
              </ul>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPlayerKey(prev => prev + 1)}
              >
                Reload Player
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(selectedStream.url, '_blank')}
              >
                Open Stream URL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm">
              <div>
                <strong>HLS.js Support:</strong> {typeof window !== 'undefined' && (window as any).Hls?.isSupported() ? '✅ Supported' : '❌ Not Supported'}
              </div>
              <div>
                <strong>Native HLS Support:</strong> {typeof window !== 'undefined' && document.createElement('video').canPlayType('application/vnd.apple.mpegurl') ? '✅ Supported' : '❌ Not Supported'}
              </div>
              <div>
                <strong>Current Stream URL:</strong> 
                <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                  {selectedStream.url}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}