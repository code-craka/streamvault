import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WifiOff, RefreshCw, Download, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Offline - StreamVault',
  description: 'You are currently offline. Access your downloaded content or try reconnecting.',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-gray-100 rounded-full">
            <WifiOff className="h-12 w-12 text-gray-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">You're Offline</h1>
          <p className="text-gray-600">
            No internet connection detected. You can still access your downloaded content or try reconnecting.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.href = '/library?offline=true'}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>View Downloaded Videos</span>
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Offline Features</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span>Watch downloaded videos</span>
            </div>
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Access offline content library</span>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Sync when connection returns</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Your data will sync automatically when you reconnect to the internet.
        </div>
      </Card>
    </div>
  )
}