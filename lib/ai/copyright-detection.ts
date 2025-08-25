/**
 * Copyright Detection and DMCA Compliance Service
 * Provides automated copyright detection and DMCA takedown handling
 */

export interface CopyrightScanResult {
  hasViolation: boolean
  confidence: number
  matches: CopyrightMatch[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendation: CopyrightAction
  scanDuration: number
}

export interface CopyrightMatch {
  id: string
  type: 'audio' | 'video' | 'image' | 'text'
  startTime?: number
  endTime?: number
  duration?: number
  confidence: number
  originalWork: OriginalWork
  matchedSegment: string
  similarity: number
  isTransformative: boolean
  fairUseAnalysis: FairUseAnalysis
}

export interface OriginalWork {
  title: string
  artist?: string
  label?: string
  publisher?: string
  releaseDate?: Date
  copyrightOwner: string
  registrationNumber?: string
  isrcCode?: string
  contentId?: string
  thumbnailUrl?: string
}

export interface FairUseAnalysis {
  purpose: 'commercial' | 'educational' | 'commentary' | 'parody' | 'news' | 'research'
  nature: 'creative' | 'factual'
  amountUsed: number // percentage of original work
  marketImpact: 'positive' | 'neutral' | 'negative'
  transformative: boolean
  fairUseScore: number // 0-1, higher means more likely fair use
  factors: string[]
}

export interface CopyrightAction {
  type: 'approve' | 'flag' | 'block' | 'monetize_claim' | 'takedown'
  reason: string
  autoApplied: boolean
  appealable: boolean
  claimant?: string
  monetizationSplit?: number
}

export interface DMCATakedown {
  id: string
  contentId: string
  claimantName: string
  claimantEmail: string
  copyrightedWork: string
  infringingContent: string
  swornStatement: boolean
  goodFaithBelief: boolean
  submittedAt: Date
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'counter_claimed'
  processedAt?: Date
  response?: string
  counterClaim?: CounterClaim
}

export interface CounterClaim {
  id: string
  takedownId: string
  userId: string
  reason: string
  swornStatement: boolean
  goodFaithBelief: boolean
  submittedAt: Date
  status: 'pending' | 'approved' | 'rejected'
  processedAt?: Date
  response?: string
}

export interface ContentIDDatabase {
  audioFingerprints: Map<string, OriginalWork>
  videoFingerprints: Map<string, OriginalWork>
  imageHashes: Map<string, OriginalWork>
  textPatterns: Map<string, OriginalWork>
}

export class CopyrightDetectionService {
  private contentIDDatabase: ContentIDDatabase
  private fairUseThreshold = 0.6 // Threshold for fair use determination

  constructor() {
    this.contentIDDatabase = {
      audioFingerprints: new Map(),
      videoFingerprints: new Map(),
      imageHashes: new Map(),
      textPatterns: new Map(),
    }
    this.initializeDatabase()
  }

  /**
   * Scan content for copyright violations
   */
  async scanContent(
    contentPath: string,
    contentType: 'video' | 'audio' | 'image' | 'text',
    metadata?: {
      title?: string
      description?: string
      tags?: string[]
      duration?: number
    }
  ): Promise<CopyrightScanResult> {
    const startTime = Date.now()

    try {
      let matches: CopyrightMatch[] = []

      switch (contentType) {
        case 'video':
          matches = await this.scanVideo(contentPath, metadata)
          break
        case 'audio':
          matches = await this.scanAudio(contentPath, metadata)
          break
        case 'image':
          matches = await this.scanImage(contentPath, metadata)
          break
        case 'text':
          matches = await this.scanText(contentPath, metadata)
          break
      }

      // Filter matches by confidence threshold
      const significantMatches = matches.filter(match => match.confidence > 0.7)

      // Determine overall risk level
      const riskLevel = this.calculateRiskLevel(significantMatches)

      // Generate recommendation
      const recommendation = this.generateRecommendation(significantMatches, riskLevel)

      const scanDuration = Date.now() - startTime

      return {
        hasViolation: significantMatches.length > 0,
        confidence: Math.max(...significantMatches.map(m => m.confidence), 0),
        matches: significantMatches,
        riskLevel,
        recommendation,
        scanDuration,
      }
    } catch (error) {
      console.error('Copyright scan failed:', error)
      return {
        hasViolation: false,
        confidence: 0,
        matches: [],
        riskLevel: 'low',
        recommendation: {
          type: 'flag',
          reason: 'Copyright scan failed - manual review required',
          autoApplied: false,
          appealable: true,
        },
        scanDuration: Date.now() - startTime,
      }
    }
  }

  /**
   * Process DMCA takedown request
   */
  async processDMCATakedown(takedown: Omit<DMCATakedown, 'id' | 'submittedAt' | 'status'>): Promise<DMCATakedown> {
    const dmcaTakedown: DMCATakedown = {
      id: this.generateId(),
      ...takedown,
      submittedAt: new Date(),
      status: 'pending',
    }

    try {
      // Validate takedown request
      const isValid = await this.validateDMCATakedown(dmcaTakedown)

      if (!isValid) {
        dmcaTakedown.status = 'rejected'
        dmcaTakedown.response = 'Invalid DMCA takedown request - missing required information'
        dmcaTakedown.processedAt = new Date()
        return dmcaTakedown
      }

      // Automatically process if we have a clear match
      const scanResult = await this.scanContent(dmcaTakedown.infringingContent, 'video')

      if (scanResult.hasViolation && scanResult.confidence > 0.9) {
        dmcaTakedown.status = 'approved'
        dmcaTakedown.response = 'Automatic approval - clear copyright match detected'
        dmcaTakedown.processedAt = new Date()

        // Take down the content
        await this.executeContentTakedown(dmcaTakedown.contentId)
      } else {
        dmcaTakedown.status = 'processing'
        dmcaTakedown.response = 'Under manual review - no clear automatic match'
      }

      // Store takedown request
      await this.storeDMCATakedown(dmcaTakedown)

      return dmcaTakedown
    } catch (error) {
      console.error('DMCA takedown processing failed:', error)
      dmcaTakedown.status = 'rejected'
      dmcaTakedown.response = 'Processing error - please resubmit'
      dmcaTakedown.processedAt = new Date()
      return dmcaTakedown
    }
  }

  /**
   * Process counter-claim to DMCA takedown
   */
  async processCounterClaim(
    takedownId: string,
    counterClaim: Omit<CounterClaim, 'id' | 'takedownId' | 'submittedAt' | 'status'>
  ): Promise<CounterClaim> {
    const claim: CounterClaim = {
      id: this.generateId(),
      takedownId,
      ...counterClaim,
      submittedAt: new Date(),
      status: 'pending',
    }

    try {
      // Validate counter-claim
      const isValid = await this.validateCounterClaim(claim)

      if (!isValid) {
        claim.status = 'rejected'
        claim.response = 'Invalid counter-claim - missing required information'
        claim.processedAt = new Date()
        return claim
      }

      // Get original takedown
      const takedown = await this.getDMCATakedown(takedownId)
      if (!takedown) {
        claim.status = 'rejected'
        claim.response = 'Original takedown not found'
        claim.processedAt = new Date()
        return claim
      }

      // Re-analyze content with fair use considerations
      const scanResult = await this.scanContent(takedown.infringingContent, 'video')
      const fairUseAnalysis = await this.analyzeFairUse(
        takedown.infringingContent,
        claim.reason
      )

      if (fairUseAnalysis.fairUseScore > this.fairUseThreshold) {
        claim.status = 'approved'
        claim.response = 'Counter-claim approved - fair use likely applies'
        claim.processedAt = new Date()

        // Restore content
        await this.restoreContent(takedown.contentId)
      } else {
        claim.status = 'rejected'
        claim.response = 'Counter-claim rejected - copyright violation stands'
        claim.processedAt = new Date()
      }

      // Store counter-claim
      await this.storeCounterClaim(claim)

      return claim
    } catch (error) {
      console.error('Counter-claim processing failed:', error)
      claim.status = 'rejected'
      claim.response = 'Processing error - please resubmit'
      claim.processedAt = new Date()
      return claim
    }
  }

  /**
   * Scan video content for copyright matches
   */
  private async scanVideo(contentPath: string, metadata?: any): Promise<CopyrightMatch[]> {
    const matches: CopyrightMatch[] = []

    // Extract audio fingerprint
    const audioFingerprint = await this.extractAudioFingerprint(contentPath)
    const audioMatches = await this.matchAudioFingerprint(audioFingerprint)

    // Extract video fingerprint
    const videoFingerprint = await this.extractVideoFingerprint(contentPath)
    const videoMatches = await this.matchVideoFingerprint(videoFingerprint)

    // Combine matches
    matches.push(...audioMatches, ...videoMatches)

    // Analyze each match for fair use
    for (const match of matches) {
      match.fairUseAnalysis = await this.analyzeFairUse(contentPath, '', match)
      match.isTransformative = match.fairUseAnalysis.transformative
    }

    return matches
  }

  /**
   * Scan audio content for copyright matches
   */
  private async scanAudio(contentPath: string, metadata?: any): Promise<CopyrightMatch[]> {
    const audioFingerprint = await this.extractAudioFingerprint(contentPath)
    const matches = await this.matchAudioFingerprint(audioFingerprint)

    // Analyze each match for fair use
    for (const match of matches) {
      match.fairUseAnalysis = await this.analyzeFairUse(contentPath, '', match)
      match.isTransformative = match.fairUseAnalysis.transformative
    }

    return matches
  }

  /**
   * Scan image content for copyright matches
   */
  private async scanImage(contentPath: string, metadata?: any): Promise<CopyrightMatch[]> {
    const imageHash = await this.extractImageHash(contentPath)
    const matches = await this.matchImageHash(imageHash)

    // Analyze each match for fair use
    for (const match of matches) {
      match.fairUseAnalysis = await this.analyzeFairUse(contentPath, '', match)
      match.isTransformative = match.fairUseAnalysis.transformative
    }

    return matches
  }

  /**
   * Scan text content for copyright matches
   */
  private async scanText(contentPath: string, metadata?: any): Promise<CopyrightMatch[]> {
    // Read text content
    const textContent = contentPath // Assuming contentPath is the text itself for this method

    const matches: CopyrightMatch[] = []

    // Check against known copyrighted text patterns
    for (const [pattern, originalWork] of this.contentIDDatabase.textPatterns) {
      const similarity = this.calculateTextSimilarity(textContent, pattern)

      if (similarity > 0.8) {
        const fairUseAnalysis = await this.analyzeFairUse(textContent, '', {
          type: 'text',
          originalWork,
        } as CopyrightMatch)

        matches.push({
          id: this.generateId(),
          type: 'text',
          confidence: similarity,
          originalWork,
          matchedSegment: textContent.substring(0, 200),
          similarity,
          isTransformative: fairUseAnalysis.transformative,
          fairUseAnalysis,
        })
      }
    }

    return matches
  }

  /**
   * Extract audio fingerprint from content
   */
  private async extractAudioFingerprint(contentPath: string): Promise<string> {
    // Mock implementation - in production would use audio fingerprinting libraries
    return `audio_fingerprint_${contentPath.slice(-10)}`
  }

  /**
   * Extract video fingerprint from content
   */
  private async extractVideoFingerprint(contentPath: string): Promise<string> {
    // Mock implementation - in production would use video fingerprinting
    return `video_fingerprint_${contentPath.slice(-10)}`
  }

  /**
   * Extract image hash from content
   */
  private async extractImageHash(contentPath: string): Promise<string> {
    // Mock implementation - in production would use perceptual hashing
    return `image_hash_${contentPath.slice(-10)}`
  }

  /**
   * Match audio fingerprint against database
   */
  private async matchAudioFingerprint(fingerprint: string): Promise<CopyrightMatch[]> {
    const matches: CopyrightMatch[] = []

    // Mock matching - in production would use sophisticated matching algorithms
    for (const [dbFingerprint, originalWork] of this.contentIDDatabase.audioFingerprints) {
      const similarity = this.calculateSimilarity(fingerprint, dbFingerprint)

      if (similarity > 0.8) {
        matches.push({
          id: this.generateId(),
          type: 'audio',
          startTime: 0,
          endTime: 30,
          duration: 30,
          confidence: similarity,
          originalWork,
          matchedSegment: fingerprint,
          similarity,
          isTransformative: false,
          fairUseAnalysis: {
            purpose: 'commercial',
            nature: 'creative',
            amountUsed: 0.8,
            marketImpact: 'negative',
            transformative: false,
            fairUseScore: 0.2,
            factors: ['substantial portion used', 'commercial purpose'],
          },
        })
      }
    }

    return matches
  }

  /**
   * Match video fingerprint against database
   */
  private async matchVideoFingerprint(fingerprint: string): Promise<CopyrightMatch[]> {
    const matches: CopyrightMatch[] = []

    for (const [dbFingerprint, originalWork] of this.contentIDDatabase.videoFingerprints) {
      const similarity = this.calculateSimilarity(fingerprint, dbFingerprint)

      if (similarity > 0.8) {
        matches.push({
          id: this.generateId(),
          type: 'video',
          startTime: 0,
          endTime: 60,
          duration: 60,
          confidence: similarity,
          originalWork,
          matchedSegment: fingerprint,
          similarity,
          isTransformative: false,
          fairUseAnalysis: {
            purpose: 'commercial',
            nature: 'creative',
            amountUsed: 0.9,
            marketImpact: 'negative',
            transformative: false,
            fairUseScore: 0.1,
            factors: ['full work used', 'commercial purpose', 'market substitution'],
          },
        })
      }
    }

    return matches
  }

  /**
   * Match image hash against database
   */
  private async matchImageHash(hash: string): Promise<CopyrightMatch[]> {
    const matches: CopyrightMatch[] = []

    for (const [dbHash, originalWork] of this.contentIDDatabase.imageHashes) {
      const similarity = this.calculateSimilarity(hash, dbHash)

      if (similarity > 0.9) {
        matches.push({
          id: this.generateId(),
          type: 'image',
          confidence: similarity,
          originalWork,
          matchedSegment: hash,
          similarity,
          isTransformative: false,
          fairUseAnalysis: {
            purpose: 'commercial',
            nature: 'creative',
            amountUsed: 1.0,
            marketImpact: 'negative',
            transformative: false,
            fairUseScore: 0.1,
            factors: ['entire work used', 'commercial purpose'],
          },
        })
      }
    }

    return matches
  }

  /**
   * Analyze fair use factors
   */
  private async analyzeFairUse(
    contentPath: string,
    context: string,
    match?: CopyrightMatch
  ): Promise<FairUseAnalysis> {
    // Mock implementation - in production would use sophisticated fair use analysis
    const analysis: FairUseAnalysis = {
      purpose: this.determinePurpose(context),
      nature: 'creative',
      amountUsed: match ? this.calculateAmountUsed(match) : 0.5,
      marketImpact: 'neutral',
      transformative: this.isTransformative(context),
      fairUseScore: 0,
      factors: [],
    }

    // Calculate fair use score based on factors
    let score = 0

    // Purpose factor
    if (analysis.purpose === 'educational' || analysis.purpose === 'commentary' || analysis.purpose === 'parody') {
      score += 0.3
      analysis.factors.push('favorable purpose')
    }

    // Amount used factor
    if (analysis.amountUsed < 0.3) {
      score += 0.3
      analysis.factors.push('small portion used')
    } else if (analysis.amountUsed > 0.8) {
      score -= 0.2
      analysis.factors.push('substantial portion used')
    }

    // Transformative factor
    if (analysis.transformative) {
      score += 0.4
      analysis.factors.push('transformative use')
    }

    // Market impact factor
    if (analysis.marketImpact === 'positive' || analysis.marketImpact === 'neutral') {
      score += 0.2
      analysis.factors.push('no negative market impact')
    }

    analysis.fairUseScore = Math.max(0, Math.min(1, score))

    return analysis
  }

  /**
   * Calculate risk level based on matches
   */
  private calculateRiskLevel(matches: CopyrightMatch[]): 'low' | 'medium' | 'high' | 'critical' {
    if (matches.length === 0) return 'low'

    const highConfidenceMatches = matches.filter(m => m.confidence > 0.9)
    const lowFairUseMatches = matches.filter(m => m.fairUseAnalysis.fairUseScore < 0.3)

    if (highConfidenceMatches.length > 0 && lowFairUseMatches.length > 0) {
      return 'critical'
    }

    if (matches.some(m => m.confidence > 0.8 && m.fairUseAnalysis.fairUseScore < 0.5)) {
      return 'high'
    }

    if (matches.length > 2 || matches.some(m => m.confidence > 0.7)) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Generate recommendation based on scan results
   */
  private generateRecommendation(matches: CopyrightMatch[], riskLevel: string): CopyrightAction {
    if (matches.length === 0) {
      return {
        type: 'approve',
        reason: 'No copyright violations detected',
        autoApplied: true,
        appealable: false,
      }
    }

    if (riskLevel === 'critical') {
      return {
        type: 'takedown',
        reason: 'Clear copyright violation detected',
        autoApplied: true,
        appealable: true,
        claimant: matches[0].originalWork.copyrightOwner,
      }
    }

    if (riskLevel === 'high') {
      const hasMonetizationClaim = matches.some(m => 
        m.originalWork.label || m.originalWork.publisher
      )

      if (hasMonetizationClaim) {
        return {
          type: 'monetize_claim',
          reason: 'Copyright match detected - revenue sharing required',
          autoApplied: true,
          appealable: true,
          claimant: matches[0].originalWork.copyrightOwner,
          monetizationSplit: 0.5,
        }
      }

      return {
        type: 'block',
        reason: 'High risk copyright violation',
        autoApplied: false,
        appealable: true,
      }
    }

    return {
      type: 'flag',
      reason: 'Potential copyright issue detected - manual review recommended',
      autoApplied: false,
      appealable: true,
    }
  }

  /**
   * Initialize content ID database with sample data
   */
  private initializeDatabase(): void {
    // Sample copyrighted works - in production would be populated from external databases
    const sampleWork: OriginalWork = {
      title: 'Sample Song',
      artist: 'Sample Artist',
      label: 'Sample Records',
      copyrightOwner: 'Sample Records Inc.',
      releaseDate: new Date('2020-01-01'),
      isrcCode: 'SAMPLE123456',
    }

    this.contentIDDatabase.audioFingerprints.set('sample_fingerprint_1', sampleWork)
    this.contentIDDatabase.videoFingerprints.set('sample_video_1', sampleWork)
    this.contentIDDatabase.imageHashes.set('sample_hash_1', sampleWork)
  }

  /**
   * Helper methods
   */
  private generateId(): string {
    return `copyright_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation - in production would use more sophisticated algorithms
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple text similarity - in production would use NLP techniques
    const words1 = text1.toLowerCase().split(' ')
    const words2 = text2.toLowerCase().split(' ')
    
    const commonWords = words1.filter(word => words2.includes(word))
    return commonWords.length / Math.max(words1.length, words2.length)
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  private determinePurpose(context: string): FairUseAnalysis['purpose'] {
    const lowerContext = context.toLowerCase()
    
    if (lowerContext.includes('education') || lowerContext.includes('teach')) return 'educational'
    if (lowerContext.includes('comment') || lowerContext.includes('review')) return 'commentary'
    if (lowerContext.includes('parody') || lowerContext.includes('satire')) return 'parody'
    if (lowerContext.includes('news') || lowerContext.includes('report')) return 'news'
    if (lowerContext.includes('research') || lowerContext.includes('study')) return 'research'
    
    return 'commercial'
  }

  private calculateAmountUsed(match: CopyrightMatch): number {
    if (match.duration && match.originalWork) {
      // Estimate based on duration - in production would be more precise
      return Math.min(1.0, (match.duration || 30) / 180) // Assume 3-minute average song
    }
    return 0.5 // Default estimate
  }

  private isTransformative(context: string): boolean {
    const transformativeIndicators = [
      'commentary', 'review', 'parody', 'education', 'criticism', 'remix', 'mashup'
    ]
    
    const lowerContext = context.toLowerCase()
    return transformativeIndicators.some(indicator => lowerContext.includes(indicator))
  }

  // Mock database operations - in production would use actual database
  private async validateDMCATakedown(takedown: DMCATakedown): Promise<boolean> {
    return takedown.swornStatement && takedown.goodFaithBelief && 
           takedown.claimantName && takedown.claimantEmail
  }

  private async validateCounterClaim(claim: CounterClaim): Promise<boolean> {
    return claim.swornStatement && claim.goodFaithBelief && claim.reason
  }

  private async storeDMCATakedown(takedown: DMCATakedown): Promise<void> {
    // Mock storage
    console.log('Storing DMCA takedown:', takedown.id)
  }

  private async storeCounterClaim(claim: CounterClaim): Promise<void> {
    // Mock storage
    console.log('Storing counter-claim:', claim.id)
  }

  private async getDMCATakedown(id: string): Promise<DMCATakedown | null> {
    // Mock retrieval
    return null
  }

  private async executeContentTakedown(contentId: string): Promise<void> {
    // Mock takedown execution
    console.log('Taking down content:', contentId)
  }

  private async restoreContent(contentId: string): Promise<void> {
    // Mock content restoration
    console.log('Restoring content:', contentId)
  }
}