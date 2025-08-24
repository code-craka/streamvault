import { EnhancedChat } from '@/components/chat/enhanced-chat'

export default function TestChatPage() {
  // Using a test stream ID for demonstration
  const testStreamId = 'test-stream-123'

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Live Chat Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-black aspect-video rounded-lg flex items-center justify-center">
              <p className="text-white text-lg">Video Player Placeholder</p>
            </div>
            
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold">Test Stream</h2>
              <p className="text-muted-foreground">
                This is a test page for the live chat functionality. 
                Sign in to start chatting!
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>👥 0 viewers</span>
                <span>💬 Live Chat</span>
                <span>🔴 Test Stream</span>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <EnhancedChat 
              streamId={testStreamId}
              showModerationTools={true}
            />
          </div>
        </div>

        {/* Chat Features Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Real-time Messaging</h3>
            <p className="text-sm text-muted-foreground">
              Messages appear instantly using Firestore real-time listeners
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Rate Limiting</h3>
            <p className="text-sm text-muted-foreground">
              Different message limits based on subscription tier (1/3/5 per second)
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Message Validation</h3>
            <p className="text-sm text-muted-foreground">
              Input sanitization, spam detection, and content validation
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Role-based Features</h3>
            <p className="text-sm text-muted-foreground">
              Streamers and moderators can delete messages and manage chat
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Message History</h3>
            <p className="text-sm text-muted-foreground">
              Persistent chat history with pagination and search capabilities
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">User Badges</h3>
            <p className="text-sm text-muted-foreground">
              Visual indicators for streamers, moderators, and premium subscribers
            </p>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-4">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
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