/**
 * Test script for SignedURLService functionality
 * This script validates the signed URL service implementation
 */

import { signedURLService, VideoAccessError } from './signed-url-service'
import { validateGCSConfig } from './config'
import { validateBucketAccess } from './gcs-client'

interface TestResult {
  testName: string
  success: boolean
  error?: string
  duration?: number
}

class SignedURLTester {
  private results: TestResult[] = []

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Signed URL Service Tests...\n')

    // Test configuration
    await this.runTest('Configuration Validation', () => this.testConfiguration())

    // Test bucket access
    await this.runTest('GCS Bucket Access', () => this.testBucketAccess())

    // Test signed URL generation (requires mock data)
    await this.runTest('Signed URL Generation (Mock)', () => this.testSignedURLGeneration())

    // Test analytics functionality
    await this.runTest('Analytics Functionality', () => this.testAnalytics())

    // Test session cleanup
    await this.runTest('Session Cleanup', () => this.testSessionCleanup())

    // Print results
    this.printResults()

    return this.results
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    
    try {
      await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        testName,
        success: true,
        duration,
      })
      
      console.log(`✅ ${testName} - Passed (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.results.push({
        testName,
        success: false,
        error: errorMessage,
        duration,
      })
      
      console.log(`❌ ${testName} - Failed (${duration}ms): ${errorMessage}`)
    }
  }

  private async testConfiguration(): Promise<void> {
    // Test environment configuration
    const config = validateGCSConfig()
    
    if (!config.GCP_PROJECT_ID) {
      throw new Error('GCP_PROJECT_ID not configured')
    }
    
    if (!config.GCS_BUCKET_NAME) {
      throw new Error('GCS_BUCKET_NAME not configured')
    }
    
    if (!config.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured')
    }
    
    console.log(`   📋 Project ID: ${config.GCP_PROJECT_ID}`)
    console.log(`   📋 Bucket: ${config.GCS_BUCKET_NAME}`)
    console.log(`   📋 Service Account: ${config.GCS_SERVICE_ACCOUNT_EMAIL}`)
  }

  private async testBucketAccess(): Promise<void> {
    const hasAccess = await validateBucketAccess()
    
    if (!hasAccess) {
      throw new Error('Cannot access GCS bucket')
    }
    
    console.log('   📦 GCS bucket access validated')
  }

  private async testSignedURLGeneration(): Promise<void> {
    // This test would require actual user data and video files
    // For now, we'll test the error handling
    
    try {
      await signedURLService.generateSignedURL({
        videoId: 'test_video_123',
        userId: 'test_user_123',
        requiredTier: 'basic',
      })
      
      // If we get here without error, that's unexpected in test environment
      console.log('   ⚠️  Signed URL generated (unexpected in test environment)')
    } catch (error) {
      if (error instanceof VideoAccessError) {
        console.log(`   🔒 Access control working: ${error.code}`)
      } else {
        throw error
      }
    }
  }

  private async testAnalytics(): Promise<void> {
    try {
      const analytics = await signedURLService.getVideoAccessAnalytics('test_video_123')
      
      // Should return default analytics structure even for non-existent video
      if (typeof analytics.totalAccesses !== 'number') {
        throw new Error('Analytics structure invalid')
      }
      
      console.log(`   📊 Analytics structure validated`)
    } catch (error) {
      if (error instanceof VideoAccessError && error.code === 'ANALYTICS_RETRIEVAL_FAILED') {
        console.log('   📊 Analytics error handling working')
      } else {
        throw error
      }
    }
  }

  private async testSessionCleanup(): Promise<void> {
    const cleanedCount = await signedURLService.cleanupExpiredSessions()
    
    if (typeof cleanedCount !== 'number') {
      throw new Error('Cleanup should return number')
    }
    
    console.log(`   🧹 Session cleanup completed (${cleanedCount} sessions)`)
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:')
    console.log('=' .repeat(50))
    
    const passed = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.testName}: ${r.error}`)
        })
    }
    
    console.log('\n' + '='.repeat(50))
  }
}

// Export test functions
export async function testSignedURLService(): Promise<TestResult[]> {
  const tester = new SignedURLTester()
  return await tester.runAllTests()
}

export async function testSignedURLGeneration(
  videoId: string,
  userId: string,
  requiredTier: 'basic' | 'premium' | 'pro' = 'basic'
): Promise<any> {
  console.log(`🔗 Testing signed URL generation for video: ${videoId}`)
  
  try {
    const result = await signedURLService.generateSignedURL({
      videoId,
      userId,
      requiredTier,
    })
    
    console.log('✅ Signed URL generated successfully:')
    console.log(`   URL: ${result.signedUrl.substring(0, 100)}...`)
    console.log(`   Expires: ${result.expiresAt.toISOString()}`)
    console.log(`   Session: ${result.sessionId}`)
    
    return result
  } catch (error) {
    if (error instanceof VideoAccessError) {
      console.log(`❌ Access denied: ${error.message} (${error.code})`)
    } else {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    throw error
  }
}

export async function testSignedURLRefresh(
  sessionId: string,
  userId: string,
  refreshToken: string
): Promise<any> {
  console.log(`🔄 Testing signed URL refresh for session: ${sessionId}`)
  
  try {
    const result = await signedURLService.refreshSignedURL(
      sessionId,
      userId,
      refreshToken
    )
    
    console.log('✅ Signed URL refreshed successfully:')
    console.log(`   New URL: ${result.signedUrl.substring(0, 100)}...`)
    console.log(`   New Expires: ${result.expiresAt.toISOString()}`)
    console.log(`   New Token: ${result.refreshToken.substring(0, 20)}...`)
    
    return result
  } catch (error) {
    if (error instanceof VideoAccessError) {
      console.log(`❌ Refresh failed: ${error.message} (${error.code})`)
    } else {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    throw error
  }
}

// CLI execution
if (require.main === module) {
  testSignedURLService()
    .then((results) => {
      const failed = results.filter(r => !r.success).length
      process.exit(failed > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('Test execution failed:', error)
      process.exit(1)
    })
}