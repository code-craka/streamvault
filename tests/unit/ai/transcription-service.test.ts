/**
 * Tests for Transcription Service
 */

import {
  TranscriptionService,
  TranscriptionResult,
  MultiLanguageSubtitles,
} from '@/lib/ai/transcription-service'

describe('TranscriptionService', () => {
  let transcriptionService: TranscriptionService

  beforeEach(() => {
    transcriptionService = new TranscriptionService()
  })

  describe('transcribeVideo', () => {
    it('should transcribe video with high accuracy', async () => {
      const videoPath = 'test-video.mp4'

      const result = await transcriptionService.transcribeVideo(
        videoPath,
        'en-US'
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('language')
      expect(result).toHaveProperty('segments')
      expect(result).toHaveProperty('duration')
      expect(result).toHaveProperty('wordCount')

      // Verify high accuracy requirement (>95%)
      expect(result.confidence).toBeGreaterThan(0.95)
      expect(result.language).toBe('en-US')
      expect(Array.isArray(result.segments)).toBe(true)
      expect(result.duration).toBeGreaterThan(0)
      expect(result.wordCount).toBeGreaterThan(0)
    })

    it('should handle different language codes', async () => {
      const videoPath = 'test-video.mp4'
      const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE']

      for (const language of languages) {
        const result = await transcriptionService.transcribeVideo(
          videoPath,
          language
        )
        expect(result.language).toBe(language)
      }
    })

    it('should provide detailed segments with timing', async () => {
      const videoPath = 'test-video.mp4'

      const result = await transcriptionService.transcribeVideo(videoPath)

      result.segments.forEach(segment => {
        expect(segment).toHaveProperty('text')
        expect(segment).toHaveProperty('startTime')
        expect(segment).toHaveProperty('endTime')
        expect(segment).toHaveProperty('confidence')

        expect(segment.startTime).toBeGreaterThanOrEqual(0)
        expect(segment.endTime).toBeGreaterThan(segment.startTime)
        expect(segment.confidence).toBeGreaterThanOrEqual(0)
        expect(segment.confidence).toBeLessThanOrEqual(1)
        expect(segment.text.trim()).not.toBe('')
      })
    })
  })

  describe('generateMultiLanguageSubtitles', () => {
    it('should generate subtitles in multiple languages', async () => {
      const videoPath = 'test-video.mp4'
      const targetLanguages = ['en-US', 'es-ES', 'fr-FR', 'de-DE']

      const subtitles =
        await transcriptionService.generateMultiLanguageSubtitles(
          videoPath,
          targetLanguages
        )

      expect(subtitles).toBeDefined()
      expect(Array.isArray(subtitles)).toBe(true)
      expect(subtitles.length).toBe(targetLanguages.length)

      subtitles.forEach((subtitle, index) => {
        expect(subtitle).toHaveProperty('language')
        expect(subtitle).toHaveProperty('languageCode')
        expect(subtitle).toHaveProperty('subtitles')
        expect(subtitle).toHaveProperty('confidence')

        expect(subtitle.languageCode).toBe(targetLanguages[index])
        expect(Array.isArray(subtitle.subtitles)).toBe(true)
        expect(subtitle.confidence).toBeGreaterThanOrEqual(0)
        expect(subtitle.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should maintain timing accuracy across languages', async () => {
      const videoPath = 'test-video.mp4'

      const subtitles =
        await transcriptionService.generateMultiLanguageSubtitles(videoPath)

      subtitles.forEach(subtitle => {
        subtitle.subtitles.forEach(entry => {
          expect(entry).toHaveProperty('startTime')
          expect(entry).toHaveProperty('endTime')
          expect(entry).toHaveProperty('text')
          expect(entry).toHaveProperty('position')

          expect(entry.startTime).toBeGreaterThanOrEqual(0)
          expect(entry.endTime).toBeGreaterThan(entry.startTime)
          expect(entry.text.trim()).not.toBe('')
          expect(['bottom', 'top']).toContain(entry.position)
        })
      })
    })

    it('should handle empty target languages array', async () => {
      const videoPath = 'test-video.mp4'

      const subtitles =
        await transcriptionService.generateMultiLanguageSubtitles(videoPath, [])

      expect(subtitles).toBeDefined()
      expect(Array.isArray(subtitles)).toBe(true)
      expect(subtitles.length).toBeGreaterThan(0) // Should default to supported languages
    })
  })

  describe('exportSubtitles', () => {
    let mockSubtitles: MultiLanguageSubtitles

    beforeEach(() => {
      mockSubtitles = {
        language: 'English',
        languageCode: 'en-US',
        confidence: 0.95,
        subtitles: [
          {
            startTime: 0,
            endTime: 2.5,
            text: 'Hello world',
            position: 'bottom',
          },
          {
            startTime: 2.5,
            endTime: 5.0,
            text: 'This is a test',
            position: 'bottom',
          },
        ],
      }
    })

    it('should export subtitles in SRT format', async () => {
      const srtContent = await transcriptionService.exportSubtitles(
        mockSubtitles,
        'srt'
      )

      expect(srtContent).toBeDefined()
      expect(typeof srtContent).toBe('string')
      expect(srtContent).toContain('1\n')
      expect(srtContent).toContain('00:00:00,000 --> 00:00:02,500')
      expect(srtContent).toContain('Hello world')
      expect(srtContent).toContain('2\n')
      expect(srtContent).toContain('This is a test')
    })

    it('should export subtitles in VTT format', async () => {
      const vttContent = await transcriptionService.exportSubtitles(
        mockSubtitles,
        'vtt'
      )

      expect(vttContent).toBeDefined()
      expect(typeof vttContent).toBe('string')
      expect(vttContent).toContain('WEBVTT')
      expect(vttContent).toContain('00:00:00.000 --> 00:00:02.500')
      expect(vttContent).toContain('Hello world')
      expect(vttContent).toContain('This is a test')
    })

    it('should export subtitles in ASS format', async () => {
      const assContent = await transcriptionService.exportSubtitles(
        mockSubtitles,
        'ass'
      )

      expect(assContent).toBeDefined()
      expect(typeof assContent).toBe('string')
      expect(assContent).toContain('[Script Info]')
      expect(assContent).toContain('[V4+ Styles]')
      expect(assContent).toContain('[Events]')
      expect(assContent).toContain('Dialogue:')
      expect(assContent).toContain('Hello world')
      expect(assContent).toContain('This is a test')
    })

    it('should handle unsupported formats', async () => {
      await expect(
        transcriptionService.exportSubtitles(mockSubtitles, 'invalid' as any)
      ).rejects.toThrow('Unsupported subtitle format')
    })
  })

  describe('error handling', () => {
    it('should handle transcription failures gracefully', async () => {
      const invalidPath = 'non-existent-video.mp4'

      await expect(
        transcriptionService.transcribeVideo(invalidPath)
      ).rejects.toThrow()
    })

    it('should handle unsupported language codes', async () => {
      const videoPath = 'test-video.mp4'
      const unsupportedLanguage = 'xx-XX'

      const result = await transcriptionService.transcribeVideo(
        videoPath,
        unsupportedLanguage
      )

      // Should still return a result, possibly with lower confidence
      expect(result).toBeDefined()
      expect(result.language).toBe(unsupportedLanguage)
    })
  })

  describe('performance', () => {
    it('should meet accuracy requirements', async () => {
      const videoPath = 'test-video.mp4'

      const result = await transcriptionService.transcribeVideo(videoPath)

      // Verify >95% accuracy requirement
      expect(result.confidence).toBeGreaterThan(0.95)
    })

    it('should complete transcription within reasonable time', async () => {
      const startTime = Date.now()
      const videoPath = 'test-video.mp4'

      await transcriptionService.transcribeVideo(videoPath)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within 10 seconds for mock implementation
      expect(duration).toBeLessThan(10000)
    })
  })

  describe('subtitle timing accuracy', () => {
    it('should maintain consistent timing across segments', async () => {
      const videoPath = 'test-video.mp4'

      const result = await transcriptionService.transcribeVideo(videoPath)

      for (let i = 1; i < result.segments.length; i++) {
        const prevSegment = result.segments[i - 1]
        const currentSegment = result.segments[i]

        // Current segment should start after or at the end of previous segment
        expect(currentSegment.startTime).toBeGreaterThanOrEqual(
          prevSegment.endTime
        )
      }
    })

    it('should have reasonable segment durations', async () => {
      const videoPath = 'test-video.mp4'

      const result = await transcriptionService.transcribeVideo(videoPath)

      result.segments.forEach(segment => {
        const duration = segment.endTime - segment.startTime

        // Segments should be between 0.1 and 30 seconds
        expect(duration).toBeGreaterThan(0.1)
        expect(duration).toBeLessThan(30)
      })
    })
  })
})
