import { Storage } from '@google-cloud/storage'
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence'

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const videoClient = new VideoIntelligenceServiceClient({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

export interface Scene {
  startTime: number
  endTime: number
  confidence: number
  description?: string
  keyFrames: string[]
  emotions?: Array<{
    emotion: string
    confidence: number
  }>
  objects?: Array<{
    name: string
    confidence: number
    boundingBox?: {
      left: number
      top: number
      right: number
      bottom: number
    }
  }>
}

export interface Highlight {
  startTime: number
  endTime: number
  title: string
  description: string
  confidence: number
  thumbnailUrl: string
  tags: string[]
  excitement: number
  engagement: number
}

export interface SceneAnalysis {
  scenes: Scene[]
  highlights: Highlight[]
  totalDuration: number
  averageSceneLength: number
  mostExcitingMoments: Array<{
    timestamp: number
    excitement: number
    reason: string
  }>
}

export class SceneDetectionService {
  async analyzeVideo(videoPath: string, videoId: string): Promise<SceneAnalysis> {
    try {
      // Upload video to GCS if not already there
      const videoUri = await this.ensureVideoInGCS(videoPath, videoId)

      // Perform comprehensive video analysis
      const [sceneResults, objectResults, emotionResults] = await Promise.allSettled([
        this.detectScenes(videoUri),
        this.detectObjects(videoUri),
        this.analyzeEmotions(videoUri)
      ])

      // Process and combine results
      const scenes = this.processSceneResults(
        sceneResults.status === 'fulfilled' ? sceneResults.value : [],
        objectResults.status === 'fulfilled' ? objectResults.value : [],
        emotionResults.status === 'fulfilled' ? emotionResults.value : []
      )

      // Generate highlights from scenes
      const highlights = await this.generateHighlights(scenes, videoId)

      // Calculate analysis metrics
      const totalDuration = scenes.length > 0 ? 
        Math.max(...scenes.map(s => s.endTime)) : 0
      const averageSceneLength = scenes.length > 0 ? 
        totalDuration / scenes.length : 0

      // Find most exciting moments
      const mostExcitingMoments = this.findExcitingMoments(scenes, highlights)

      return {
        scenes,
        highlights,
        totalDuration,
        averageSceneLength,
        mostExcitingMoments
      }
    } catch (error) {
      console.error('Scene detection failed:', error)
      throw new Error(`Scene detection error: ${error.message}`)
    }
  }

  private async ensureVideoInGCS(videoPath: string, videoId: string): Promise<string> {
    if (videoPath.startsWith('gs://')) {
      return videoPath
    }

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)
    const fileName = `videos/${videoId}/original.mp4`

    await bucket.upload(videoPath, {
      destination: fileName,
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    })

    return `gs://${process.env.GCS_BUCKET_NAME}/${fileName}`
  }

  private async detectScenes(videoUri: string): Promise<any[]> {
    const request = {
      inputUri: videoUri,
      features: ['SHOT_CHANGE_DETECTION'],
    }

    const [operation] = await videoClient.annotateVideo(request)
    const [operationResult] = await operation.promise()

    return operationResult.annotationResults?.[0]?.shotAnnotations || []
  }

  private async detectObjects(videoUri: string): Promise<any[]> {
    const request = {
      inputUri: videoUri,
      features: ['OBJECT_TRACKING'],
    }

    const [operation] = await videoClient.annotateVideo(request)
    const [operationResult] = await operation.promise()

    return operationResult.annotationResults?.[0]?.objectAnnotations || []
  }

  private async analyzeEmotions(videoUri: string): Promise<any[]> {
    const request = {
      inputUri: videoUri,
      features: ['FACE_DETECTION'],
    }

    const [operation] = await videoClient.annotateVideo(request)
    const [operationResult] = await operation.promise()

    return operationResult.annotationResults?.[0]?.faceDetectionAnnotations || []
  }

  private processSceneResults(
    sceneResults: any[],
    objectResults: any[],
    emotionResults: any[]
  ): Scene[] {
    const scenes: Scene[] = []

    for (const shot of sceneResults) {
      const startTime = this.parseTimestamp(shot.startTimeOffset)
      const endTime = this.parseTimestamp(shot.endTimeOffset)

      // Find objects in this scene
      const sceneObjects = objectResults.filter(obj => {
        const objStart = this.parseTimestamp(obj.segment?.startTimeOffset)
        const objEnd = this.parseTimestamp(obj.segment?.endTimeOffset)
        return objStart >= startTime && objEnd <= endTime
      }).map(obj => ({
        name: obj.entity?.description || 'Unknown',
        confidence: obj.confidence || 0,
        boundingBox: obj.frames?.[0]?.normalizedBoundingBox
      }))

      // Find emotions in this scene
      const sceneEmotions = emotionResults.filter(face => {
        const faceStart = this.parseTimestamp(face.timeOffset)
        return faceStart >= startTime && faceStart <= endTime
      }).flatMap(face => 
        face.attributes?.emotions?.map((emotion: any) => ({
          emotion: emotion.emotion,
          confidence: emotion.confidence
        })) || []
      )

      // Generate key frames
      const keyFrames = await this.extractKeyFrames(startTime, endTime, shot)

      scenes.push({
        startTime,
        endTime,
        confidence: 1.0, // Shot detection is generally reliable
        keyFrames,
        objects: sceneObjects,
        emotions: sceneEmotions
      })
    }

    return scenes
  }

  private async extractKeyFrames(
    startTime: number,
    endTime: number,
    shot: any
  ): Promise<string[]> {
    // Extract 3 key frames per scene: beginning, middle, end
    const duration = endTime - startTime
    const frameTimestamps = [
      startTime + duration * 0.1,
      startTime + duration * 0.5,
      startTime + duration * 0.9
    ]

    // In a real implementation, you would extract actual frames
    // For now, return placeholder URLs
    return frameTimestamps.map(timestamp => 
      `/api/videos/frames/${shot.id || 'unknown'}_${Math.floor(timestamp)}.jpg`
    )
  }

  private async generateHighlights(scenes: Scene[], videoId: string): Promise<Highlight[]> {
    const highlights: Highlight[] = []

    for (const scene of scenes) {
      const excitement = this.calculateExcitement(scene)
      const engagement = this.calculateEngagement(scene)

      // Only create highlights for scenes with high excitement/engagement
      if (excitement > 0.7 || engagement > 0.8) {
        const highlight: Highlight = {
          startTime: scene.startTime,
          endTime: scene.endTime,
          title: await this.generateHighlightTitle(scene),
          description: await this.generateHighlightDescription(scene),
          confidence: Math.max(excitement, engagement),
          thumbnailUrl: scene.keyFrames[1] || scene.keyFrames[0] || '',
          tags: this.generateHighlightTags(scene),
          excitement,
          engagement
        }

        highlights.push(highlight)
      }
    }

    // Sort by confidence and return top 10
    return highlights
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
  }

  private calculateExcitement(scene: Scene): number {
    let excitement = 0

    // Factor in emotional intensity
    if (scene.emotions) {
      const positiveEmotions = scene.emotions.filter(e => 
        ['joy', 'surprise', 'excitement'].includes(e.emotion.toLowerCase())
      )
      excitement += positiveEmotions.reduce((sum, e) => sum + e.confidence, 0) / 3
    }

    // Factor in object diversity (more objects = more action)
    if (scene.objects) {
      excitement += Math.min(scene.objects.length / 10, 0.3)
    }

    // Factor in scene length (shorter scenes often more intense)
    const duration = scene.endTime - scene.startTime
    if (duration < 10) {
      excitement += 0.2
    }

    return Math.min(excitement, 1.0)
  }

  private calculateEngagement(scene: Scene): number {
    let engagement = 0

    // Factor in face detection (people = engagement)
    if (scene.emotions && scene.emotions.length > 0) {
      engagement += 0.4
    }

    // Factor in object recognition confidence
    if (scene.objects) {
      const avgConfidence = scene.objects.reduce((sum, obj) => 
        sum + obj.confidence, 0) / scene.objects.length
      engagement += avgConfidence * 0.3
    }

    // Factor in scene confidence
    engagement += scene.confidence * 0.3

    return Math.min(engagement, 1.0)
  }

  private async generateHighlightTitle(scene: Scene): Promise<string> {
    // Generate title based on scene content
    const objects = scene.objects?.slice(0, 3).map(obj => obj.name) || []
    const emotions = scene.emotions?.slice(0, 2).map(e => e.emotion) || []

    if (objects.length > 0) {
      return `Exciting moment with ${objects.join(', ')}`
    }

    if (emotions.length > 0) {
      return `${emotions[0]} moment`
    }

    return `Highlight at ${Math.floor(scene.startTime)}s`
  }

  private async generateHighlightDescription(scene: Scene): Promise<string> {
    const duration = Math.floor(scene.endTime - scene.startTime)
    const objects = scene.objects?.map(obj => obj.name).join(', ') || 'various elements'
    
    return `A ${duration}-second highlight featuring ${objects} with high engagement potential.`
  }

  private generateHighlightTags(scene: Scene): string[] {
    const tags: string[] = []

    // Add object-based tags
    scene.objects?.forEach(obj => {
      if (obj.confidence > 0.7) {
        tags.push(obj.name.toLowerCase())
      }
    })

    // Add emotion-based tags
    scene.emotions?.forEach(emotion => {
      if (emotion.confidence > 0.6) {
        tags.push(emotion.emotion.toLowerCase())
      }
    })

    // Add generic tags based on excitement level
    const excitement = this.calculateExcitement(scene)
    if (excitement > 0.8) {
      tags.push('exciting', 'highlight')
    }

    return [...new Set(tags)].slice(0, 5) // Remove duplicates and limit to 5
  }

  private findExcitingMoments(scenes: Scene[], highlights: Highlight[]): Array<{
    timestamp: number
    excitement: number
    reason: string
  }> {
    const moments = []

    for (const scene of scenes) {
      const excitement = this.calculateExcitement(scene)
      
      if (excitement > 0.6) {
        let reason = 'High activity detected'
        
        if (scene.emotions?.some(e => e.confidence > 0.7)) {
          reason = 'Strong emotional content'
        } else if (scene.objects && scene.objects.length > 5) {
          reason = 'Multiple objects and high activity'
        }

        moments.push({
          timestamp: scene.startTime + (scene.endTime - scene.startTime) / 2,
          excitement,
          reason
        })
      }
    }

    return moments
      .sort((a, b) => b.excitement - a.excitement)
      .slice(0, 5)
  }

  private parseTimestamp(timestamp: any): number {
    if (!timestamp) return 0
    
    const seconds = parseInt(timestamp.seconds || '0')
    const nanos = parseInt(timestamp.nanos || '0')
    
    return seconds + nanos / 1e9
  }
}

export const sceneDetectionService = new SceneDetectionService()