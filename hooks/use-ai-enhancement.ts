'use client'

import { useState, useCallback } from 'react'
import type {
  VideoProcessingResult,
  VideoProcessingOptions,
  ContentQualityMetrics,
  OptimizationSuggestion,
  RecommendationResult,
  RecommendationInput,
} from '@/lib/ai/content-enhancement'

interface UseAIEnhancementReturn {
  // Content Enhancement
  enhanceContent: (
    videoId: string,
    videoPath: string,
    options?: VideoProcessingOptions
  ) => Promise<VideoProcessingResult | null>
  isEnhancing: boolean
  enhancementError: string | null

  // Quality Analysis
  analyzeQuality: (
    videoId: string,
    videoPath: string
  ) => Promise<{
    qualityMetrics: ContentQualityMetrics
    optimizationSuggestions: OptimizationSuggestion[]
  } | null>
  isAnalyzing: boolean
  analysisError: string | null

  // Recommendations
  getRecommendations: (
    input: RecommendationInput,
    limit?: number
  ) => Promise<RecommendationResult[]>
  isLoadingRecommendations: boolean
  recommendationError: string | null

  // Utility functions
  getTrendingTags: () => Promise<string[]>
  getCategories: () => Promise<string[]>

  // Clear errors
  clearErrors: () => void
}

export function useAIEnhancement(): UseAIEnhancementReturn {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancementError, setEnhancementError] = useState<string | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  )

  const enhanceContent = useCallback(
    async (
      videoId: string,
      videoPath: string,
      options?: VideoProcessingOptions
    ): Promise<VideoProcessingResult | null> => {
      setIsEnhancing(true)
      setEnhancementError(null)

      try {
        const response = await fetch(
          '/api/ai/content-enhancement?action=enhance',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoId,
              videoPath,
              options: {
                generateThumbnails: true,
                generateTranscription: true,
                generateHighlights: true,
                generateChapters: true,
                generateTags: true,
                generateDescription: true,
                ...options,
              },
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Enhancement failed')
        }

        const { data } = await response.json()
        return data as VideoProcessingResult
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Enhancement failed'
        setEnhancementError(errorMessage)
        console.error('Content enhancement failed:', error)
        return null
      } finally {
        setIsEnhancing(false)
      }
    },
    []
  )

  const analyzeQuality = useCallback(
    async (
      videoId: string,
      videoPath: string
    ): Promise<{
      qualityMetrics: ContentQualityMetrics
      optimizationSuggestions: OptimizationSuggestion[]
    } | null> => {
      setIsAnalyzing(true)
      setAnalysisError(null)

      try {
        const response = await fetch(
          '/api/ai/content-enhancement?action=analyze-quality',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoId,
              videoPath,
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Quality analysis failed')
        }

        const { data } = await response.json()
        return data
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Quality analysis failed'
        setAnalysisError(errorMessage)
        console.error('Quality analysis failed:', error)
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    []
  )

  const getRecommendations = useCallback(
    async (
      input: RecommendationInput,
      limit: number = 10
    ): Promise<RecommendationResult[]> => {
      setIsLoadingRecommendations(true)
      setRecommendationError(null)

      try {
        const response = await fetch(
          '/api/ai/content-enhancement?action=recommend',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...input,
              limit,
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to load recommendations')
        }

        const { data } = await response.json()
        return data as RecommendationResult[]
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to load recommendations'
        setRecommendationError(errorMessage)
        console.error('Recommendations loading failed:', error)
        return []
      } finally {
        setIsLoadingRecommendations(false)
      }
    },
    []
  )

  const getTrendingTags = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(
        '/api/ai/content-enhancement?action=trending-tags'
      )

      if (!response.ok) {
        throw new Error('Failed to load trending tags')
      }

      const { data } = await response.json()
      return data as string[]
    } catch (error) {
      console.error('Failed to load trending tags:', error)
      return []
    }
  }, [])

  const getCategories = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(
        '/api/ai/content-enhancement?action=categories'
      )

      if (!response.ok) {
        throw new Error('Failed to load categories')
      }

      const { data } = await response.json()
      return data as string[]
    } catch (error) {
      console.error('Failed to load categories:', error)
      return []
    }
  }, [])

  const clearErrors = useCallback(() => {
    setEnhancementError(null)
    setAnalysisError(null)
    setRecommendationError(null)
  }, [])

  return {
    // Content Enhancement
    enhanceContent,
    isEnhancing,
    enhancementError,

    // Quality Analysis
    analyzeQuality,
    isAnalyzing,
    analysisError,

    // Recommendations
    getRecommendations,
    isLoadingRecommendations,
    recommendationError,

    // Utility functions
    getTrendingTags,
    getCategories,

    // Clear errors
    clearErrors,
  }
}

// Additional utility hook for content optimization
export function useContentOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState<{
    title?: string
    description?: string
    tags?: string[]
    thumbnails?: string[]
  } | null>(null)

  const optimizeTitle = useCallback(
    async (
      currentTitle: string,
      contentContext: string
    ): Promise<string | null> => {
      setIsOptimizing(true)

      try {
        // In a real implementation, this would call an AI service to optimize the title
        // For now, we'll simulate title optimization
        const optimizedTitle = `${currentTitle} - Enhanced with AI`

        setOptimizationResults(prev => ({
          ...prev,
          title: optimizedTitle,
        }))

        return optimizedTitle
      } catch (error) {
        console.error('Title optimization failed:', error)
        return null
      } finally {
        setIsOptimizing(false)
      }
    },
    []
  )

  const optimizeDescription = useCallback(
    async (
      currentDescription: string,
      contentContext: string
    ): Promise<string | null> => {
      setIsOptimizing(true)

      try {
        // Simulate description optimization
        const optimizedDescription = `${currentDescription}\n\n🤖 Enhanced with AI for better engagement and SEO optimization.`

        setOptimizationResults(prev => ({
          ...prev,
          description: optimizedDescription,
        }))

        return optimizedDescription
      } catch (error) {
        console.error('Description optimization failed:', error)
        return null
      } finally {
        setIsOptimizing(false)
      }
    },
    []
  )

  const optimizeTags = useCallback(
    async (
      currentTags: string[],
      contentContext: string
    ): Promise<string[] | null> => {
      setIsOptimizing(true)

      try {
        // Simulate tag optimization
        const aiTags = ['ai-enhanced', 'optimized', 'trending']
        const optimizedTags = [...new Set([...currentTags, ...aiTags])]

        setOptimizationResults(prev => ({
          ...prev,
          tags: optimizedTags,
        }))

        return optimizedTags
      } catch (error) {
        console.error('Tag optimization failed:', error)
        return null
      } finally {
        setIsOptimizing(false)
      }
    },
    []
  )

  return {
    optimizeTitle,
    optimizeDescription,
    optimizeTags,
    isOptimizing,
    optimizationResults,
    clearOptimizationResults: () => setOptimizationResults(null),
  }
}
