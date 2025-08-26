'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/hooks/use-pwa'
import {
  Home,
  Play,
  Download,
  User,
  Settings,
  ArrowLeft,
  MoreVertical,
  Wifi,
  WifiOff,
} from 'lucide-react'

interface PWANavigationProps {
  className?: string
}

export function PWANavigation({ className }: PWANavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isInstalled, isOnline } = usePWA()
  const [showBackButton, setShowBackButton] = useState(false)

  useEffect(() => {
    // Show back button if not on main pages and PWA is installed
    const mainPages = ['/', '/dashboard', '/library', '/settings']
    setShowBackButton(isInstalled && !mainPages.includes(pathname))
  }, [pathname, isInstalled])

  const navigationItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Play, label: 'Dashboard', path: '/dashboard' },
    { icon: Download, label: 'Library', path: '/library' },
    { icon: User, label: 'Profile', path: '/settings' },
  ]

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  if (!isInstalled) {
    return null
  }

  return (
    <>
      {/* Top Navigation Bar (PWA only) */}
      <div
        className={`fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white ${className}`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold">StreamVault</h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* Network status indicator */}
            <div className="flex items-center">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
            </div>

            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar (PWA only) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map(item => {
            const isActive = pathname === item.path
            const Icon = item.icon

            return (
              <Button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                variant="ghost"
                className={`flex h-auto flex-col items-center space-y-1 p-2 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Touch gesture handler for PWA
export function PWAGestureHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isInstalled } = usePWA()
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const [isGestureActive, setIsGestureActive] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isInstalled) return

    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    setIsGestureActive(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isInstalled || !isGestureActive) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current

    // Minimum swipe distance
    const minSwipeDistance = 100

    // Check if it's a horizontal swipe (not vertical scroll)
    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > minSwipeDistance
    ) {
      if (deltaX > 0 && touchStartX.current < 50) {
        // Swipe right from left edge - go back
        if (window.history.length > 1) {
          router.back()
        }
      } else if (deltaX < 0 && touchStartX.current > window.innerWidth - 50) {
        // Swipe left from right edge - go forward (if available)
        router.forward()
      }
    }

    setIsGestureActive(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isInstalled || !isGestureActive) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current

    // If it's more of a vertical scroll, disable gesture
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      setIsGestureActive(false)
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className="min-h-screen"
    >
      {children}
    </div>
  )
}

// Pull-to-refresh component
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}) {
  const { isInstalled } = usePWA()
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartY = useRef<number>(0)
  const isRefreshing = useRef<boolean>(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isInstalled || window.scrollY > 0) return

    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isInstalled || window.scrollY > 0 || isRefreshing.current) return

    const currentY = e.touches[0].clientY
    const distance = currentY - touchStartY.current

    if (distance > 0) {
      setIsPulling(true)
      setPullDistance(Math.min(distance, 100))

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isInstalled || !isPulling) return

    if (pullDistance > 60) {
      isRefreshing.current = true
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        isRefreshing.current = false
      }
    }

    setIsPulling(false)
    setPullDistance(0)
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {isPulling && (
        <div
          className="fixed left-0 right-0 top-0 z-40 border-b border-blue-200 bg-blue-50 transition-all duration-200"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance / 100,
          }}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-sm font-medium text-blue-600">
              {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
