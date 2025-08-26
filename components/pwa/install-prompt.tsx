'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePWA } from '@/hooks/use-pwa'
import { X, Download, Smartphone, Monitor } from 'lucide-react'

interface InstallPromptProps {
  onDismiss?: () => void
  className?: string
}

export function InstallPrompt({ onDismiss, className }: InstallPromptProps) {
  const { isInstallable, isInstalled, install, capabilities } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Show prompt if installable and not already installed
    if (isInstallable && !isInstalled) {
      // Delay showing prompt to avoid being too aggressive
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await install()
      if (success) {
        setShowPrompt(false)
        onDismiss?.()
      }
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    onDismiss?.()

    // Don't show again for 24 hours
    localStorage.setItem('streamvault-install-dismissed', Date.now().toString())
  }

  // Check if user has dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('streamvault-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const hoursSinceDismissed =
        (Date.now() - dismissedTime) / (1000 * 60 * 60)

      if (hoursSinceDismissed < 24) {
        setShowPrompt(false)
        return
      }
    }
  }, [])

  if (!showPrompt || isInstalled || !isInstallable) {
    return null
  }

  return (
    <Card
      className={`fixed bottom-4 right-4 z-50 max-w-sm border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-lg ${className}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-blue-100 p-2">
            <Download className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Install StreamVault</h3>
            <p className="text-sm text-gray-600">Get the app experience</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          <Smartphone className="h-4 w-4" />
          <span>Works offline</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          <Monitor className="h-4 w-4" />
          <span>Native app experience</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          <Download className="h-4 w-4" />
          <span>Fast loading</span>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isInstalling ? 'Installing...' : 'Install App'}
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="px-3">
            Later
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Compact install button for header/navigation
export function InstallButton() {
  const { isInstallable, isInstalled, install } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await install()
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  if (!isInstallable || isInstalled) {
    return null
  }

  return (
    <Button
      onClick={handleInstall}
      disabled={isInstalling}
      variant="outline"
      size="sm"
      className="hidden items-center space-x-2 sm:flex"
    >
      <Download className="h-4 w-4" />
      <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
    </Button>
  )
}
