'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Play,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Clock,
  Calendar,
  Download,
  Share2,
} from 'lucide-react'
import type { VOD } from '@/types/streaming'

interface VODCardProps {
  vod: VOD
  showOwnerActions?: boolean
  onEdit?: (vod: VOD) => void
  onDelete?: (vod: VOD) => void
}

export function VODCard({
  vod,
  showOwnerActions = false,
  onEdit,
  onDelete,
}: VODCardProps) {
  const { user } = useUser()
  const [imageError, setImageError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getStatusColor = (status: VOD['status']) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'deleted':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic':
        return 'bg-blue-100 text-blue-800'
      case 'premium':
        return 'bg-purple-100 text-purple-800'
      case 'pro':
        return 'bg-gold-100 text-gold-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this video? This action cannot be undone.'
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(vod)
    } catch (error) {
      console.error('Failed to delete VOD:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/watch/${vod.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: vod.title,
          text: vod.description || 'Check out this video',
          url,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url)
        // You could show a toast notification here
        alert('Link copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    }
  }

  const canWatch = () => {
    if (vod.status !== 'ready') return false
    if (vod.visibility === 'private' && vod.userId !== user?.id) return false

    // Check subscription tier access
    const userTier = user?.publicMetadata?.subscriptionTier as string
    if (
      vod.requiredTier === 'premium' &&
      !['premium', 'pro'].includes(userTier)
    )
      return false
    if (vod.requiredTier === 'pro' && userTier !== 'pro') return false

    return true
  }

  return (
    <Card className="group transition-shadow duration-200 hover:shadow-lg">
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-gray-900">
          {vod.thumbnailUrl && !imageError ? (
            <img
              src={vod.thumbnailUrl}
              alt={vod.title}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <Play className="h-12 w-12 text-white opacity-50" />
            </div>
          )}

          {/* Duration overlay */}
          <div className="absolute bottom-2 right-2 rounded bg-black bg-opacity-75 px-2 py-1 text-xs text-white">
            {formatDuration(vod.duration)}
          </div>

          {/* Status badge */}
          {vod.status !== 'ready' && (
            <div className="absolute left-2 top-2">
              <Badge className={getStatusColor(vod.status)}>{vod.status}</Badge>
            </div>
          )}

          {/* Play button overlay */}
          {canWatch() && (
            <Link href={`/watch/${vod.id}`}>
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-30">
                <div className="scale-75 transform rounded-full bg-white bg-opacity-90 p-3 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                  <Play className="ml-1 h-6 w-6 text-gray-900" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold transition-colors group-hover:text-blue-600">
            {canWatch() ? (
              <Link href={`/watch/${vod.id}`}>{vod.title}</Link>
            ) : (
              vod.title
            )}
          </h3>

          {/* Metadata */}
          <div className="space-y-2 text-xs text-gray-500">
            {/* Category and tier */}
            <div className="flex items-center justify-between">
              {vod.category && (
                <Badge variant="outline" className="text-xs">
                  {vod.category}
                </Badge>
              )}
              <Badge className={getTierColor(vod.requiredTier)}>
                {vod.requiredTier}
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{vod.viewCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(vod.createdAt)}</span>
                </div>
              </div>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canWatch() && (
                    <DropdownMenuItem asChild>
                      <Link href={`/watch/${vod.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Watch
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>

                  {/* Owner actions */}
                  {showOwnerActions && vod.userId === user?.id && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(vod)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* File size */}
            <div className="text-xs text-gray-400">
              {formatFileSize(vod.fileSize)}
            </div>
          </div>

          {/* Tags */}
          {vod.tags && vod.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {vod.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {vod.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{vod.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Access restriction notice */}
          {!canWatch() && vod.status === 'ready' && (
            <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
              {vod.requiredTier !== 'basic' ? (
                <>Requires {vod.requiredTier} subscription</>
              ) : (
                <>Private video</>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
