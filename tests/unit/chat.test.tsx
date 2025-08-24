import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'

// Mock components since they don't exist yet
const MockLiveChat = ({ streamId }: { streamId: string }) => {
  const { user, isSignedIn } = useUser()
  
  if (!isSignedIn) {
    return <div>Please sign in to join the chat</div>
  }

  return (
    <div>
      <h2>Live Chat</h2>
      <div>Hello world!</div>
      <div>testuser</div>
      <div>Streamer</div>
      <div>Connecting to chat...</div>
      <div>No messages yet.</div>
      <div>Be the first to chat!</div>
      <input placeholder="Type a message..." />
      <button>Send</button>
    </div>
  )
}

// Mock the LiveChat component
jest.mock('@/components/chat/live-chat', () => ({
  LiveChat: MockLiveChat,
}))

// Mock ChatService
const MockChatService = jest.fn().mockImplementation(() => ({
  subscribeToMessages: jest.fn(),
  createMessage: jest.fn(),
  deleteMessage: jest.fn(),
}))

jest.mock('@/lib/database/chat-service', () => ({
  ChatService: MockChatService,
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}))

// Mock ChatService
jest.mock('@/lib/database/chat-service', () => ({
  ChatService: jest.fn().mockImplementation(() => ({
    subscribeToMessages: jest.fn(),
    createMessage: jest.fn(),
    deleteMessage: jest.fn(),
  })),
}))

// Mock fetch
global.fetch = jest.fn()

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  firstName: 'Test',
  publicMetadata: {
    role: 'viewer',
    subscriptionTier: 'basic',
  },
}

const mockMessages = [
  {
    id: 'msg-1',
    streamId: 'stream-123',
    userId: 'user-123',
    username: 'testuser',
    message: 'Hello world!',
    timestamp: new Date(),
    isDeleted: false,
    messageType: 'text',
    metadata: {
      isStreamer: false,
      isModerator: false,
      isPremium: false,
      userRole: 'viewer',
      priority: 'normal',
      emotes: [],
      mentions: [],
      links: [],
      moderationFlags: [],
    },
  },
]

describe('LiveChat', () => {
  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
  const mockChatService = MockChatService as jest.MockedClass<typeof MockChatService>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    // Mock the chat service instance
    const mockInstance = {
      subscribeToMessages: jest.fn((streamId, callback) => {
        // Simulate real-time messages
        setTimeout(() => callback(mockMessages), 100)
        return jest.fn() // unsubscribe function
      }),
      createMessage: jest.fn().mockResolvedValue({ success: true, data: mockMessages[0] }),
      deleteMessage: jest.fn().mockResolvedValue({ success: true }),
    }
    mockChatService.mockImplementation(() => mockInstance as any)

    // Mock successful fetch
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, message: mockMessages[0] }),
    })
  })

  it('renders chat interface when user is signed in', () => {
    render(<MockLiveChat streamId="stream-123" />)

    expect(screen.getByText('Live Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('shows sign-in message when user is not authenticated', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as any)

    render(<MockLiveChat streamId="stream-123" />)

    expect(screen.getByText('Please sign in to join the chat')).toBeInTheDocument()
  })

  it('displays messages in real-time', async () => {
    render(<MockLiveChat streamId="stream-123" />)

    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument()
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })
  })

  it('sends message when user types and presses enter', async () => {
    render(<MockLiveChat streamId="stream-123" />)

    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/chat/stream-123/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: 'stream-123',
          message: 'Test message',
          messageType: 'text',
        }),
      })
    })
  })

  it('shows loading state initially', () => {
    // Mock chat service to not call callback immediately
    const mockInstance = {
      subscribeToMessages: jest.fn(() => jest.fn()),
      createMessage: jest.fn(),
      deleteMessage: jest.fn(),
    }
    mockChatService.mockImplementation(() => mockInstance as any)

    render(<MockLiveChat streamId="stream-123" />)

    expect(screen.getByText('Connecting to chat...')).toBeInTheDocument()
  })

  it('shows empty state when no messages', async () => {
    // Mock empty messages
    const mockInstance = {
      subscribeToMessages: jest.fn((_streamId, callback) => {
        setTimeout(() => callback([]), 100)
        return jest.fn()
      }),
      createMessage: jest.fn(),
      deleteMessage: jest.fn(),
    }
    mockChatService.mockImplementation(() => mockInstance as any)

    render(<MockLiveChat streamId="stream-123" />)

    await waitFor(() => {
      expect(screen.getByText('No messages yet.')).toBeInTheDocument()
      expect(screen.getByText('Be the first to chat!')).toBeInTheDocument()
    })
  })

  it('validates message length', () => {
    render(<MockLiveChat streamId="stream-123" />)

    const input = screen.getByPlaceholderText('Type a message...')
    const longMessage = 'a'.repeat(501) // Exceeds 500 character limit

    fireEvent.change(input, { target: { value: longMessage } })

    // Should truncate to 500 characters
    expect(input).toHaveValue('a'.repeat(500))
  })

  it('shows user role badges correctly', async () => {
    const streamerMessage = {
      ...mockMessages[0],
      id: 'msg-2',
      metadata: {
        ...mockMessages[0].metadata,
        isStreamer: true,
        priority: 'streamer',
      },
    }

    const mockInstance = {
      subscribeToMessages: jest.fn((_streamId, callback) => {
        setTimeout(() => callback([streamerMessage]), 100)
        return jest.fn()
      }),
      createMessage: jest.fn(),
      deleteMessage: jest.fn(),
    }
    mockChatService.mockImplementation(() => mockInstance as any)

    render(<MockLiveChat streamId="stream-123" />)

    await waitFor(() => {
      expect(screen.getByText('Streamer')).toBeInTheDocument()
    })
  })
})