import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { securityLogger } from './logging'
import { auditTrail } from './audit-trail'
import Stripe from 'stripe'

export interface FraudSignal {
  type: 'velocity' | 'geolocation' | 'device' | 'behavioral' | 'payment' | 'account'
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  description: string
  metadata: Record<string, any>
}

export interface FraudAnalysisResult {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  signals: FraudSignal[]
  recommendedAction: 'allow' | 'review' | 'challenge' | 'block'
  reasoning: string[]
}

export interface UserBehaviorProfile {
  userId: string
  typicalLoginTimes: number[]
  commonLocations: string[]
  averageSessionDuration: number
  typicalDevices: string[]
  paymentPatterns: {
    averageAmount: number
    frequency: number
    preferredMethods: string[]
  }
  contentConsumption: {
    averageViewTime: number
    preferredCategories: string[]
    streamingHours: number[]
  }
  lastUpdated: number
}

export interface FraudEvent {
  id?: string
  userId: string
  eventType: 'login' | 'payment' | 'subscription_change' | 'account_modification' | 'content_access'
  timestamp: number
  ipAddress: string
  userAgent: string
  location?: {
    country: string
    region: string
    city: string
    coordinates?: [number, number]
  }
  deviceFingerprint: string
  riskScore: number
  signals: FraudSignal[]
  action: 'allowed' | 'challenged' | 'blocked' | 'reviewed'
  metadata: Record<string, any>
}

class FraudDetectionEngine {
  private readonly FRAUD_EVENTS_COLLECTION = 'fraud_events'
  private readonly USER_PROFILES_COLLECTION = 'user_behavior_profiles'
  private readonly FRAUD_RULES_COLLECTION = 'fraud_detection_rules'
  
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20'
    })
  }

  async analyzeTransaction(
    userId: string,
    eventType: FraudEvent['eventType'],
    eventData: {
      ipAddress: string
      userAgent: string
      deviceFingerprint: string
      amount?: number
      paymentMethodId?: string
      location?: FraudEvent['location']
      metadata?: Record<string, any>
    }
  ): Promise<FraudAnalysisResult> {
    try {
      const signals: FraudSignal[] = []
      
      // Get user behavior profile
      const userProfile = await this.getUserBehaviorProfile(userId)
      
      // Analyze velocity patterns
      const velocitySignals = await this.analyzeVelocity(userId, eventType)
      signals.push(...velocitySignals)
      
      // Analyze geolocation anomalies
      if (eventData.location && userProfile) {
        const geoSignals = this.analyzeGeolocation(eventData.location, userProfile)
        signals.push(...geoSignals)
      }
      
      // Analyze device fingerprinting
      if (userProfile) {
        const deviceSignals = this.analyzeDevice(eventData.deviceFingerprint, userProfile)
        signals.push(...deviceSignals)
      }
      
      // Analyze behavioral patterns
      if (userProfile) {
        const behaviorSignals = this.analyzeBehavior(eventData, userProfile)
        signals.push(...behaviorSignals)
      }
      
      // Analyze payment-specific fraud signals
      if (eventType === 'payment' && eventData.paymentMethodId) {
        const paymentSignals = await this.analyzePaymentFraud(
          eventData.paymentMethodId,
          eventData.amount || 0,
          userId
        )
        signals.push(...paymentSignals)
      }
      
      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(signals)
      const riskLevel = this.getRiskLevel(riskScore)
      const recommendedAction = this.getRecommendedAction(riskLevel, signals)
      
      // Generate reasoning
      const reasoning = this.generateReasoning(signals, riskScore)
      
      const result: FraudAnalysisResult = {
        riskScore,
        riskLevel,
        signals,
        recommendedAction,
        reasoning
      }
      
      // Log the fraud analysis
      await this.logFraudEvent(userId, eventType, eventData, result)
      
      return result
      
    } catch (error) {
      console.error('Fraud analysis failed:', error)
      
      // Return safe default on error
      return {
        riskScore: 0.8, // High risk when analysis fails
        riskLevel: 'high',
        signals: [{
          type: 'account',
          severity: 'high',
          confidence: 0.9,
          description: 'Fraud analysis system error',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        }],
        recommendedAction: 'review',
        reasoning: ['Fraud detection system encountered an error - manual review required']
      }
    }
  }

  private async analyzeVelocity(userId: string, eventType: string): Promise<FraudSignal[]> {
    const signals: FraudSignal[] = []
    const now = Date.now()
    const timeWindows = [
      { name: '1_minute', duration: 60 * 1000, threshold: 5 },
      { name: '5_minutes', duration: 5 * 60 * 1000, threshold: 15 },
      { name: '1_hour', duration: 60 * 60 * 1000, threshold: 50 },
      { name: '24_hours', duration: 24 * 60 * 60 * 1000, threshold: 200 }
    ]
    
    for (const window of timeWindows) {
      const startTime = now - window.duration
      
      const eventsRef = collection(db, this.FRAUD_EVENTS_COLLECTION)
      const q = query(
        eventsRef,
        where('userId', '==', userId),
        where('eventType', '==', eventType),
        where('timestamp', '>=', startTime),
        orderBy('timestamp', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const eventCount = snapshot.size
      
      if (eventCount > window.threshold) {
        signals.push({
          type: 'velocity',
          severity: eventCount > window.threshold * 2 ? 'critical' : 'high',
          confidence: Math.min(eventCount / window.threshold, 1),
          description: `Unusual velocity: ${eventCount} ${eventType} events in ${window.name}`,
          metadata: {
            window: window.name,
            eventCount,
            threshold: window.threshold,
            eventType
          }
        })
      }
    }
    
    return signals
  }

  private analyzeGeolocation(
    currentLocation: FraudEvent['location'],
    userProfile: UserBehaviorProfile
  ): FraudSignal[] {
    const signals: FraudSignal[] = []
    
    if (!currentLocation || !userProfile.commonLocations.length) {
      return signals
    }
    
    // Check if current location is in common locations
    const isCommonLocation = userProfile.commonLocations.some(location => 
      location.includes(currentLocation.country) || 
      location.includes(currentLocation.region)
    )
    
    if (!isCommonLocation) {
      // Calculate distance from common locations (simplified)
      const isDistantLocation = !userProfile.commonLocations.some(location =>
        location.includes(currentLocation.country)
      )
      
      if (isDistantLocation) {
        signals.push({
          type: 'geolocation',
          severity: 'medium',
          confidence: 0.7,
          description: `Login from unusual location: ${currentLocation.city}, ${currentLocation.country}`,
          metadata: {
            currentLocation,
            commonLocations: userProfile.commonLocations
          }
        })
      }
    }
    
    return signals
  }

  private analyzeDevice(
    deviceFingerprint: string,
    userProfile: UserBehaviorProfile
  ): FraudSignal[] {
    const signals: FraudSignal[] = []
    
    if (!userProfile.typicalDevices.includes(deviceFingerprint)) {
      signals.push({
        type: 'device',
        severity: 'medium',
        confidence: 0.6,
        description: 'Login from unrecognized device',
        metadata: {
          deviceFingerprint,
          knownDevices: userProfile.typicalDevices.length
        }
      })
    }
    
    return signals
  }

  private analyzeBehavior(
    eventData: any,
    userProfile: UserBehaviorProfile
  ): FraudSignal[] {
    const signals: FraudSignal[] = []
    const currentHour = new Date().getHours()
    
    // Check if login time is unusual
    const isTypicalTime = userProfile.typicalLoginTimes.some(hour => 
      Math.abs(hour - currentHour) <= 2
    )
    
    if (!isTypicalTime && userProfile.typicalLoginTimes.length > 0) {
      signals.push({
        type: 'behavioral',
        severity: 'low',
        confidence: 0.4,
        description: `Login at unusual time: ${currentHour}:00`,
        metadata: {
          currentHour,
          typicalHours: userProfile.typicalLoginTimes
        }
      })
    }
    
    return signals
  }

  private async analyzePaymentFraud(
    paymentMethodId: string,
    amount: number,
    userId: string
  ): Promise<FraudSignal[]> {
    const signals: FraudSignal[] = []
    
    try {
      // Get payment method details from Stripe
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId)
      
      // Check for high-risk payment methods
      if (paymentMethod.card?.funding === 'prepaid') {
        signals.push({
          type: 'payment',
          severity: 'medium',
          confidence: 0.6,
          description: 'Payment method is a prepaid card',
          metadata: { paymentMethodType: 'prepaid_card' }
        })
      }
      
      // Check for unusual amounts
      const userProfile = await this.getUserBehaviorProfile(userId)
      if (userProfile && amount > userProfile.paymentPatterns.averageAmount * 5) {
        signals.push({
          type: 'payment',
          severity: 'high',
          confidence: 0.8,
          description: `Unusually large payment amount: $${amount}`,
          metadata: {
            amount,
            averageAmount: userProfile.paymentPatterns.averageAmount,
            multiplier: amount / userProfile.paymentPatterns.averageAmount
          }
        })
      }
      
      // Check Stripe's built-in fraud detection
      if (paymentMethod.card?.checks?.cvc_check === 'fail') {
        signals.push({
          type: 'payment',
          severity: 'high',
          confidence: 0.9,
          description: 'CVC check failed',
          metadata: { cvcCheck: 'failed' }
        })
      }
      
    } catch (error) {
      console.error('Payment fraud analysis error:', error)
      signals.push({
        type: 'payment',
        severity: 'medium',
        confidence: 0.5,
        description: 'Unable to verify payment method',
        metadata: { error: 'payment_verification_failed' }
      })
    }
    
    return signals
  }

  private calculateRiskScore(signals: FraudSignal[]): number {
    if (signals.length === 0) return 0
    
    let totalScore = 0
    let totalWeight = 0
    
    const severityWeights = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 1.0
    }
    
    signals.forEach(signal => {
      const weight = severityWeights[signal.severity]
      const score = signal.confidence * weight
      totalScore += score
      totalWeight += weight
    })
    
    return Math.min(totalScore / Math.max(totalWeight, 1), 1)
  }

  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 0.8) return 'critical'
    if (riskScore >= 0.6) return 'high'
    if (riskScore >= 0.3) return 'medium'
    return 'low'
  }

  private getRecommendedAction(
    riskLevel: string,
    signals: FraudSignal[]
  ): 'allow' | 'review' | 'challenge' | 'block' {
    const hasCriticalSignal = signals.some(s => s.severity === 'critical')
    
    if (hasCriticalSignal || riskLevel === 'critical') return 'block'
    if (riskLevel === 'high') return 'challenge'
    if (riskLevel === 'medium') return 'review'
    return 'allow'
  }

  private generateReasoning(signals: FraudSignal[], riskScore: number): string[] {
    const reasoning: string[] = []
    
    reasoning.push(`Overall risk score: ${(riskScore * 100).toFixed(1)}%`)
    
    if (signals.length === 0) {
      reasoning.push('No fraud signals detected')
    } else {
      reasoning.push(`${signals.length} fraud signal(s) detected:`)
      signals.forEach(signal => {
        reasoning.push(`- ${signal.description} (${signal.severity} risk, ${(signal.confidence * 100).toFixed(1)}% confidence)`)
      })
    }
    
    return reasoning
  }

  private async logFraudEvent(
    userId: string,
    eventType: FraudEvent['eventType'],
    eventData: any,
    result: FraudAnalysisResult
  ): Promise<void> {
    const fraudEvent: Omit<FraudEvent, 'id'> = {
      userId,
      eventType,
      timestamp: Date.now(),
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      location: eventData.location,
      deviceFingerprint: eventData.deviceFingerprint,
      riskScore: result.riskScore,
      signals: result.signals,
      action: result.recommendedAction === 'allow' ? 'allowed' : 
              result.recommendedAction === 'block' ? 'blocked' : 'reviewed',
      metadata: eventData.metadata || {}
    }
    
    // Store in Firestore
    await addDoc(collection(db, this.FRAUD_EVENTS_COLLECTION), {
      ...fraudEvent,
      timestamp: Timestamp.fromMillis(fraudEvent.timestamp)
    })
    
    // Log security event if high risk
    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      await securityLogger.logSecurityEvent({
        eventType: 'payment_fraud',
        userId,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        timestamp: Date.now(),
        severity: result.riskLevel === 'critical' ? 'critical' : 'high',
        details: {
          riskScore: result.riskScore,
          signals: result.signals,
          recommendedAction: result.recommendedAction
        }
      })
    }
    
    // Audit trail
    await auditTrail.logAction({
      userId,
      action: 'fraud_analysis',
      resourceType: 'fraud_detection',
      resourceId: eventType,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      success: true,
      severity: result.riskLevel === 'critical' ? 'critical' : 'medium',
      category: 'security',
      complianceRelevant: true,
      retentionPeriod: 2555, // 7 years
      metadata: {
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        recommendedAction: result.recommendedAction,
        signalCount: result.signals.length
      }
    })
  }

  private async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | null> {
    try {
      const profilesRef = collection(db, this.USER_PROFILES_COLLECTION)
      const q = query(profilesRef, where('userId', '==', userId), limit(1))
      
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return null
      }
      
      return snapshot.docs[0].data() as UserBehaviorProfile
      
    } catch (error) {
      console.error('Failed to get user behavior profile:', error)
      return null
    }
  }

  async updateUserBehaviorProfile(
    userId: string,
    sessionData: {
      loginTime: number
      location: string
      device: string
      sessionDuration?: number
      paymentAmount?: number
      paymentMethod?: string
    }
  ): Promise<void> {
    try {
      // This would be called after successful user sessions to build the profile
      // Implementation would aggregate data over time to build behavioral patterns
      
      const profileData = {
        userId,
        lastUpdated: Date.now(),
        // Add session data to existing profile or create new one
        // This is a simplified version - real implementation would be more sophisticated
      }
      
      // Store or update profile in Firestore
      // Implementation details would depend on how you want to aggregate the data
      
    } catch (error) {
      console.error('Failed to update user behavior profile:', error)
    }
  }

  async getFraudEvents(
    filters: {
      userId?: string
      riskLevel?: string
      startTime?: number
      endTime?: number
    },
    limitCount: number = 100
  ): Promise<FraudEvent[]> {
    try {
      let q = query(
        collection(db, this.FRAUD_EVENTS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )

      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId))
      }
      if (filters.startTime) {
        q = query(q, where('timestamp', '>=', Timestamp.fromMillis(filters.startTime)))
      }
      if (filters.endTime) {
        q = query(q, where('timestamp', '<=', Timestamp.fromMillis(filters.endTime)))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toMillis()
      } as FraudEvent))

    } catch (error) {
      console.error('Failed to get fraud events:', error)
      return []
    }
  }
}

// Export singleton instance
export const fraudDetectionEngine = new FraudDetectionEngine()

// Helper functions
export async function analyzeFraudRisk(
  userId: string,
  eventType: FraudEvent['eventType'],
  eventData: {
    ipAddress: string
    userAgent: string
    deviceFingerprint: string
    amount?: number
    paymentMethodId?: string
    location?: FraudEvent['location']
    metadata?: Record<string, any>
  }
): Promise<FraudAnalysisResult> {
  return fraudDetectionEngine.analyzeTransaction(userId, eventType, eventData)
}

export async function updateUserProfile(
  userId: string,
  sessionData: {
    loginTime: number
    location: string
    device: string
    sessionDuration?: number
    paymentAmount?: number
    paymentMethod?: string
  }
): Promise<void> {
  return fraudDetectionEngine.updateUserBehaviorProfile(userId, sessionData)
}