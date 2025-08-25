'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileVideo, 
  Loader2,
  Sparkles,
  Eye,
  Lock,
  Globe
} from 'lucide-react'

interface UploadFormData {
  title: string
  description: string
  category: string
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  requiredTier: 'basic' | 'premium' | 'pro'
  enableAIProcessing: boolean
  autoPublish: boolean
}

const CATEGORIES = [
  'Gaming',
  'Education',
  'Entertainment',
  'Technology',
  'Music',
  'Sports',
  'Art',
  'Cooking',
  'Travel',
  'Fitness',
  'News',
  'Comedy',
  'Science',
  'Business',
  'Health',
]

const SUBSCRIPTION_TIERS = [
  { value: 'basic', label: 'Basic (Free)', description: 'Available to all users' },
  { value: 'premium', label: 'Premium', description: 'Requires Premium subscription' },
  { value: 'pro', label: 'Pro', description: 'Requires Pro subscription' },
]

export function VideoUploadForm() {
  const { user } = useUser()
  const router = useRouter()
  
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [tagInput, setTagInput] = useState('')
  
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    category: '',
    tags: [],
    visibility: 'public',
    requiredTier: 'basic',
    enableAIProcessing: true,
    autoPublish: false,
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        setUploadError('Please select a valid video file')
        return
      }

      // Validate file size (max 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
      if (selectedFile.size > maxSize) {
        setUploadError('File size must be less than 2GB')
        return
      }

      setFile(selectedFile)
      setUploadError(null)
      
      // Auto-generate title from filename if empty
      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, title: fileName }))
      }
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const updateFormData = <K extends keyof UploadFormData>(
    key: K,
    value: UploadFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!file) {
      setUploadError('Please select a video file')
      return
    }

    if (!formData.title.trim()) {
      setUploadError('Please enter a title')
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      // Step 1: Upload file to storage
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'video')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      const uploadResult = await uploadResponse.json()
      setUploadProgress(50)

      // Step 2: Create VOD entry
      const vodResponse = await fetch('/api/vods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: uploadResult.filePath,
          ...formData,
        }),
      })

      if (!vodResponse.ok) {
        throw new Error('Failed to create video entry')
      }

      const vodResult = await vodResponse.json()
      setUploadProgress(100)
      setUploadSuccess(true)

      // Redirect to video management page after a short delay
      setTimeout(() => {
        router.push('/library/my-videos')
      }, 2000)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  if (uploadSuccess) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold">Upload Successful!</h3>
            <p className="text-gray-600">
              Your video has been uploaded and is being processed. 
              {formData.enableAIProcessing && ' AI enhancement is in progress.'}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Redirecting to your videos...
              </p>
              <Progress value={100} className="w-64 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Video</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your video here</p>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <p className="text-sm text-gray-400">
                Supports MP4, MOV, AVI, MKV up to 2GB
              </p>
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileVideo className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-red-700 text-sm">{uploadError}</p>
            </div>
          )}

          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Details */}
      <Card>
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Describe your video..."
              rows={4}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => updateFormData('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                      {tag}
                      <X
                        className="w-3 h-3 ml-1"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Access */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visibility */}
          <div>
            <Label>Visibility</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                type="button"
                variant={formData.visibility === 'public' ? 'default' : 'outline'}
                onClick={() => updateFormData('visibility', 'public')}
                className="flex items-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </Button>
              <Button
                type="button"
                variant={formData.visibility === 'unlisted' ? 'default' : 'outline'}
                onClick={() => updateFormData('visibility', 'unlisted')}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Unlisted</span>
              </Button>
              <Button
                type="button"
                variant={formData.visibility === 'private' ? 'default' : 'outline'}
                onClick={() => updateFormData('visibility', 'private')}
                className="flex items-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </Button>
            </div>
          </div>

          {/* Required Tier */}
          <div>
            <Label>Required Subscription</Label>
            <Select
              value={formData.requiredTier}
              onValueChange={(value) => updateFormData('requiredTier', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    <div>
                      <div className="font-medium">{tier.label}</div>
                      <div className="text-xs text-gray-500">{tier.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>AI Processing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-processing">Enable AI Enhancement</Label>
              <p className="text-sm text-gray-500">
                Automatically generate thumbnails, transcription, and highlights
              </p>
            </div>
            <Switch
              id="ai-processing"
              checked={formData.enableAIProcessing}
              onCheckedChange={(checked) => updateFormData('enableAIProcessing', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-publish">Auto-publish when ready</Label>
              <p className="text-sm text-gray-500">
                Automatically make video available when processing completes
              </p>
            </div>
            <Switch
              id="auto-publish"
              checked={formData.autoPublish}
              onCheckedChange={(checked) => updateFormData('autoPublish', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!file || !formData.title.trim() || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </>
          )}
        </Button>
      </div>
    </form>
  )
}