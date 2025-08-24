import { render, screen, waitFor } from '@testing-library/react'
import { SecureVODPlayer } from '@/components/player/secure-vod-player'

// Mock useUser hook
const mockUser = {
  id: 'user_123',
  getToken: jest.fn().mockResolvedValue('mock-token'),
}

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: mockUser,
    isLoaded: true,
  }),
}))

// Mock HLS Player
jest.mock('@/components/player/hls-player', () => ({
  HLSPlayer: ({ src, onError, onPlay, onPause }: any) => (
    <div data-testid="hls-player" data-src={src}>
      <button onClick={onPlay}>Play</button>
      <button onClick={onPause}>Pause</button>
      <button onClick={() => onError({ type: 'networkError' })}>
        Trigger Error
      </button>
    </div>
  ),
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Shield: () => <div data-testid="shield-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
}))

// Mock fetch
global.fetch = jest.fn()

describe('SecureVODPlayer', () => {
  const defaultProps = {
    videoId: 'test-video-123',
    requiredTier: 'basic' as const,
    onError: jest.fn(),
    onPlay: jest.fn(),
    onPause: jest.fn(),
  }

  const mockSuccessResponse = {
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          signedUrl:
            'https://storage.googleapis.com/test-bucket/videos/test-video-123.mp4?signed=true',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          sessionId: 'session-123',
          refreshToken: 'refresh-token-123',
        },
      }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse)
  })

  it('renders loading state initially', () => {
    render(<SecureVODPlayer {...defaultProps} />)

    expect(screen.getByText('Securing video access...')).toBeInTheDocument()
  })

  it('fetches signed URL on mount', async () => {
    render(<SecureVODPlayer {...defaultProps} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/videos/test-video-123/signed-url?tier=basic',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      )
    })
  })

  it('renders HLS player with signed URL after successful fetch', async () => {
    render(<SecureVODPlayer {...defaultProps} />)

    await waitFor(() => {
      const hlsPlayer = screen.getByTestId('hls-player')
      expect(hlsPlayer).toBeInTheDocument()
      expect(hlsPlayer).toHaveAttribute(
        'data-src',
        expect.stringContaining('signed=true')
      )
    })
  })

  it('shows security indicator when video is loaded', async () => {
    render(<SecureVODPlayer {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
      expect(screen.getByText('Secure')).toBeInTheDocument()
    })
  })

  it('displays video metadata when provided', async () => {
    const videoMetadata = {
      title: 'Test Video Title',
      description: 'Test video description',
      duration: 180,
      createdAt: new Date('2024-01-15'),
      creatorName: 'Test Creator',
      tags: ['test', 'video'],
    }

    render(<SecureVODPlayer {...defaultProps} videoMetadata={videoMetadata} />)

    await waitFor(() => {
      expect(screen.getByText('Test Video Title')).toBeInTheDocument()
      expect(screen.getByText('Test video description')).toBeInTheDocument()
      expect(screen.getByText('Test Creator')).toBeInTheDocument()
      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('video')).toBeInTheDocument()
    })
  })

  it('shows access denied for insufficient subscription', async () => {
    const errorResponse = {
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Premium subscription or higher required',
          code: 'INSUFFICIENT_SUBSCRIPTION_TIER',
        }),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)

    render(<SecureVODPlayer {...defaultProps} requiredTier="premium" />)

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(
        screen.getByText('Premium subscription or higher required')
      ).toBeInTheDocument()
      expect(screen.getByText(/PREMIUM.*Required/)).toBeInTheDocument()
    })
  })

  it('shows upgrade button for premium/pro content', async () => {
    const errorResponse = {
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Pro subscription required',
          code: 'INSUFFICIENT_SUBSCRIPTION_TIER',
        }),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)

    render(<SecureVODPlayer {...defaultProps} requiredTier="pro" />)

    await waitFor(() => {
      expect(screen.getByText('Upgrade Subscription')).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    const errorResponse = {
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Network error occurred',
        }),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)

    render(<SecureVODPlayer {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Network error occurred')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('calls onPlay and onPause callbacks', async () => {
    const onPlay = jest.fn()
    const onPause = jest.fn()

    render(
      <SecureVODPlayer {...defaultProps} onPlay={onPlay} onPause={onPause} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('hls-player')).toBeInTheDocument()
    })

    const playButton = screen.getByText('Play')
    const pauseButton = screen.getByText('Pause')

    playButton.click()
    expect(onPlay).toHaveBeenCalled()

    pauseButton.click()
    expect(onPause).toHaveBeenCalled()
  })

  it('shows different tier badges correctly with metadata', async () => {
    const videoMetadata = {
      title: 'Test Video',
      description: 'Test description',
    }

    const { rerender } = render(
      <SecureVODPlayer
        {...defaultProps}
        requiredTier="basic"
        videoMetadata={videoMetadata}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/🥉.*BASIC/)).toBeInTheDocument()
    })

    rerender(
      <SecureVODPlayer
        {...defaultProps}
        requiredTier="premium"
        videoMetadata={videoMetadata}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/🥈.*PREMIUM/)).toBeInTheDocument()
    })

    rerender(
      <SecureVODPlayer
        {...defaultProps}
        requiredTier="pro"
        videoMetadata={videoMetadata}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/🥇.*PRO/)).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    const customClass = 'custom-secure-player'
    const { container } = render(
      <SecureVODPlayer {...defaultProps} className={customClass} />
    )

    expect(container.firstChild).toHaveClass(customClass)
  })
})
