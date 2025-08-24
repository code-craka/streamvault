import { render, screen } from '@testing-library/react'
import { HLSPlayer } from '@/components/player/hls-player'

// Mock HLS.js completely for testing
jest.mock('hls.js', () => {
  return jest.fn().mockImplementation(() => ({
    loadSource: jest.fn(),
    attachMedia: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
  }))
})

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Volume2: () => <div data-testid="volume-icon" />,
  VolumeX: () => <div data-testid="mute-icon" />,
  Maximize: () => <div data-testid="maximize-icon" />,
  Minimize: () => <div data-testid="minimize-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

describe('HLSPlayer', () => {
  const defaultProps = {
    src: 'https://test-stream.m3u8',
    onError: jest.fn(),
    onLoadedData: jest.fn(),
    onPlay: jest.fn(),
    onPause: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock video element methods
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
      writable: true,
      value: jest.fn().mockResolvedValue(undefined),
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
      writable: true,
      value: jest.fn(),
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'canPlayType', {
      writable: true,
      value: jest.fn().mockReturnValue('probably'), // Support native HLS
    })

    // Mock HLS.js static method
    const Hls = require('hls.js')
    Hls.isSupported = jest.fn(() => false) // Use native HLS fallback
  })

  it('renders the video player component', () => {
    render(<HLSPlayer {...defaultProps} />)

    // Should render a video element
    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
  })

  it('shows live indicator for live streams', () => {
    render(<HLSPlayer {...defaultProps} isLive={true} />)

    expect(screen.getByText('🔴 LIVE')).toBeInTheDocument()
  })

  it('renders player controls', () => {
    render(<HLSPlayer {...defaultProps} />)

    // Should have play/pause button
    expect(screen.getByTestId('play-icon')).toBeInTheDocument()

    // Should have volume controls
    expect(screen.getByTestId('volume-icon')).toBeInTheDocument()

    // Should have fullscreen button
    expect(screen.getByTestId('maximize-icon')).toBeInTheDocument()
  })

  it('shows progress bar for VOD content', () => {
    render(<HLSPlayer {...defaultProps} isLive={false} />)

    // Progress bar should be present for non-live content (there are multiple sliders, so check for the specific one)
    const sliders = screen.getAllByRole('slider')
    expect(sliders.length).toBeGreaterThan(1) // Should have progress bar + volume slider
  })

  it('hides progress bar for live content', () => {
    render(<HLSPlayer {...defaultProps} isLive={true} />)

    // For live content, should only have volume slider, not progress bar
    const sliders = screen.getAllByRole('slider')
    expect(sliders.length).toBe(1) // Should only have volume slider
  })

  it('applies custom className', () => {
    const customClass = 'custom-player-class'
    const { container } = render(
      <HLSPlayer {...defaultProps} className={customClass} />
    )

    expect(container.firstChild).toHaveClass(customClass)
  })
})
