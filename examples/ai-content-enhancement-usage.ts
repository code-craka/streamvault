/**
 * AI Content Enhancement Usage Examples
 *
 * This file demonstrates how to use the AI content enhancement features
 * in the StreamVault platform.
 */

import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { thumbnailGenerator } from '@/lib/ai/thumbnail-generation'
import { contentQualityAnalyzer } from '@/lib/ai/content-quality-analyzer'

// Example 1: Complete video processing with AI enhancement
export async function processVideoWithAI() {
  const videoId = 'example-video-123'
  const videoPath = '/path/to/uploaded/video.mp4'
  const userId = 'user-456'

  try {
    console.log('Starting AI video processing...')

    // Process the video with comprehensive AI enhancement
    const metadata = await aiContentEnhancement.processUploadedVideo(
      videoId,
      videoPath,
      userId
    )

    console.log('AI Processing Results:')
    console.log('- Title:', metadata.title)
    console.log('- Description:', metadata.description)
    console.log('- Tags:', metadata.tags.join(', '))
    console.log('- Category:', metadata.category)
    console.log(
      '- AI Confidence:',
      Math.round(metadata.aiGenerated.confidence * 100) + '%'
    )
    console.log('- Thumbnails generated:', metadata.thumbnails.length)

    return metadata
  } catch (error) {
    console.error('AI processing failed:', error)
    throw error
  }
}

// Example 2: Generate thumbnails only
export async function generateVideoThumbnails() {
  const videoId = 'example-video-123'
  const videoPath = '/path/to/video.mp4'

  try {
    console.log('Generating AI-selected thumbnails...')

    const thumbnails = await thumbnailGenerator.generateThumbnails(
      videoId,
      videoPath,
      {
        count: 5,
        width: 1280,
        height: 720,
        quality: 85,
        format: 'jpeg',
      }
    )

    console.log(`Generated ${thumbnails.length} thumbnails:`)
    thumbnails.forEach((thumbnail, index) => {
      console.log(`- Thumbnail ${index + 1}:`)
      console.log(`  URL: ${thumbnail.url}`)
      console.log(`  Timestamp: ${thumbnail.timestamp}s`)
      console.log(`  Confidence: ${Math.round(thumbnail.confidence * 100)}%`)
      console.log(`  Size: ${(thumbnail.size / 1024).toFixed(1)}KB`)
    })

    return thumbnails
  } catch (error) {
    console.error('Thumbnail generation failed:', error)
    throw error
  }
}

// Example 3: Analyze content quality
export async function analyzeVideoQuality() {
  const videoId = 'example-video-123'
  const videoPath = '/path/to/video.mp4'
  const metadata = {
    title: 'How to Build Amazing Web Applications with Next.js',
    description:
      'Learn how to create modern web applications using Next.js, React, and TypeScript. Subscribe for more tutorials!',
    tags: ['nextjs', 'react', 'typescript', 'tutorial', 'web development'],
    thumbnails: ['https://example.com/thumb1.jpg'],
    captions: true,
    audioDescription: false,
  }

  try {
    console.log('Analyzing content quality...')

    const analysis = await contentQualityAnalyzer.analyzeContent(
      videoId,
      videoPath,
      metadata
    )

    console.log('Quality Analysis Results:')
    console.log(
      `- Overall Score: ${Math.round(analysis.overall * 100)}% (${analysis.score.grade})`
    )
    console.log('- Breakdown:')
    console.log(`  Technical: ${analysis.score.breakdown.technical}%`)
    console.log(`  Engagement: ${analysis.score.breakdown.engagement}%`)
    console.log(`  Accessibility: ${analysis.score.breakdown.accessibility}%`)
    console.log(`  SEO: ${analysis.score.breakdown.seo}%`)

    console.log('\nTop Improvement Suggestions:')
    analysis.suggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(
        `${index + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.issue}`
      )
      console.log(`   Suggestion: ${suggestion.suggestion}`)
      console.log(`   Impact: ${Math.round(suggestion.impact * 100)}%`)
    })

    return analysis
  } catch (error) {
    console.error('Quality analysis failed:', error)
    throw error
  }
}

// Example 4: Generate personalized recommendations
export async function generateRecommendations() {
  const userId = 'user-456'
  const currentVideoId = 'example-video-123'

  try {
    console.log('Generating AI-powered recommendations...')

    const recommendations = await aiContentEnhancement.generateRecommendations(
      userId,
      currentVideoId,
      10
    )

    console.log(`Generated ${recommendations.length} recommendations:`)
    recommendations.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`)
      console.log(`   Category: ${video.category}`)
      console.log(`   Tags: ${video.tags.slice(0, 3).join(', ')}`)
      console.log(
        `   AI Confidence: ${Math.round(video.aiGenerated.confidence * 100)}%`
      )
    })

    return recommendations
  } catch (error) {
    console.error('Recommendation generation failed:', error)
    throw error
  }
}

// Example 5: Analyze thumbnail quality
export async function analyzeThumbnailQuality() {
  const thumbnailUrl =
    'https://storage.googleapis.com/streamvault-videos/thumbnails/example.jpg'

  try {
    console.log('Analyzing thumbnail quality...')

    const analysis =
      await thumbnailGenerator.analyzeThumbnailQuality(thumbnailUrl)

    console.log('Thumbnail Analysis Results:')
    console.log(`- Quality Score: ${Math.round(analysis.score * 100)}%`)
    console.log('- Improvements needed:')
    console.log(
      `  Brightness: ${analysis.improvements.brightness > 0 ? '+' + Math.round(analysis.improvements.brightness * 100) + '%' : 'Good'}`
    )
    console.log(
      `  Contrast: ${analysis.improvements.contrast > 0 ? '+' + Math.round(analysis.improvements.contrast * 100) + '%' : 'Good'}`
    )
    console.log(
      `  Sharpness: ${analysis.improvements.sharpness > 0 ? '+' + Math.round(analysis.improvements.sharpness * 100) + '%' : 'Good'}`
    )
    console.log(
      `  Composition: ${analysis.improvements.composition > 0 ? '+' + Math.round(analysis.improvements.composition * 100) + '%' : 'Good'}`
    )

    if (analysis.suggestions.length > 0) {
      console.log('\nSuggestions:')
      analysis.suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`)
      })
    }

    return analysis
  } catch (error) {
    console.error('Thumbnail analysis failed:', error)
    throw error
  }
}

// Example 6: API usage example
export async function useContentEnhancementAPI() {
  const videoId = 'example-video-123'
  const videoPath = '/path/to/video.mp4'

  try {
    console.log('Using Content Enhancement API...')

    // Call the API endpoint
    const response = await fetch('/api/ai/content-enhancement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer your-auth-token',
      },
      body: JSON.stringify({
        videoId,
        videoPath,
        options: {
          generateThumbnails: true,
          generateMetadata: true,
          analyzeQuality: true,
          generateRecommendations: false,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success) {
      console.log('API Enhancement Results:')
      console.log('- Video ID:', result.data.videoId)
      console.log('- Metadata generated:', !!result.data.metadata)
      console.log(
        '- Thumbnails generated:',
        result.data.thumbnails?.length || 0
      )
      console.log('- Quality analyzed:', !!result.data.qualityAnalysis)

      if (result.data.qualityAnalysis) {
        console.log(`- Quality Grade: ${result.data.qualityAnalysis.grade}`)
        console.log(
          `- Overall Score: ${Math.round(result.data.qualityAnalysis.overall * 100)}%`
        )
      }
    } else {
      console.error('API enhancement failed:', result.error)
    }

    return result
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// Example 7: React component usage
export const AIEnhancementExample = `
// Example React component using the AI Content Enhancement Panel

import { ContentEnhancementPanel } from '@/components/ai/content-enhancement-panel'
import { RecommendationEngine } from '@/components/ai/recommendation-engine'

export function VideoUploadPage() {
  const [videoId, setVideoId] = useState('')
  const [videoPath, setVideoPath] = useState('')

  const handleEnhancementComplete = (data) => {
    console.log('AI enhancement completed:', data)
    // Update video metadata in your database
    // Show success message to user
    // Navigate to video management page
  }

  return (
    <div className="space-y-6">
      {/* Video upload form */}
      <VideoUploadForm 
        onUploadComplete={(id, path) => {
          setVideoId(id)
          setVideoPath(path)
        }}
      />

      {/* AI Content Enhancement Panel */}
      {videoId && videoPath && (
        <ContentEnhancementPanel
          videoId={videoId}
          videoPath={videoPath}
          onEnhancementComplete={handleEnhancementComplete}
        />
      )}

      {/* AI-powered recommendations */}
      <RecommendationEngine
        currentVideoId={videoId}
        limit={6}
        showReason={true}
      />
    </div>
  )
}
`

// Example usage in a Next.js API route
export const APIRouteExample = `
// pages/api/videos/[videoId]/enhance.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { videoId } = req.query
  const { videoPath, userId } = req.body

  try {
    const metadata = await aiContentEnhancement.processUploadedVideo(
      videoId as string,
      videoPath,
      userId
    )

    res.status(200).json({
      success: true,
      data: metadata
    })

  } catch (error) {
    console.error('Enhancement failed:', error)
    res.status(500).json({
      success: false,
      error: 'Enhancement processing failed'
    })
  }
}
`

// Run examples (uncomment to test)
// processVideoWithAI()
// generateVideoThumbnails()
// analyzeVideoQuality()
// generateRecommendations()
// analyzeThumbnailQuality()
// useContentEnhancementAPI()
