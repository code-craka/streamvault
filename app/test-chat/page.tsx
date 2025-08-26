import { EnhancedChat } from '@/components/chat/enhanced-chat'

export default function TestChatPage() {
  // Using a test stream ID for demonstration
  const testStreamId = 'test-stream-123'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Live Chat Test</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="flex aspect-video items-center justify-center rounded-lg bg-black">
              <p className="text-lg text-white">Video Player Placeholder</p>
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold">Test Stream</h2>
              <p className="text-muted-foreground">
                This is a test page for the live chat functionality. Sign in to
                start chatting!
              </p>

              <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                <span>👥 0 viewers</span>
                <span>💬 Live Chat</span>
                <span>🔴 Test Stream</span>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <EnhancedChat streamId={testStreamId} showModerationTools={true} />
          </div>
        </div>

        {/* Chat Features Info */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Real-time Messaging</h3>
            <p className="text-muted-foreground text-sm">
              Messages appear instantly using Firestore real-time listeners
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Rate Limiting</h3>
            <p className="text-muted-foreground text-sm">
              Different message limits based on subscription tier (1/3/5 per
              second)
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Message Validation</h3>
            <p className="text-muted-foreground text-sm">
              Input sanitization, spam detection, and content validation
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Role-based Features</h3>
            <p className="text-muted-foreground text-sm">
              Streamers and moderators can delete messages and manage chat
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Message History</h3>
            <p className="text-muted-foreground text-sm">
              Persistent chat history with pagination and search capabilities
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">User Badges</h3>
            <p className="text-muted-foreground text-sm">
              Visual indicators for streamers, moderators, and premium
              subscribers
            </p>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="bg-muted mt-12 rounded-lg p-6">
          <h3 className="mb-4 font-semibold">Testing Instructions</h3>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li>Sign in with your account to enable chat functionality</li>
            <li>Try sending messages to test real-time updates</li>
            <li>Test rate limiting by sending messages quickly</li>
            <li>If you have streamer/admin role, try deleting messages</li>
            <li>Test message validation with long messages or spam</li>
            <li>Open multiple browser tabs to see real-time sync</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
