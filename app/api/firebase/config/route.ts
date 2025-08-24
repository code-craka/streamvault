import { NextResponse } from 'next/server'
import {
  testFirebaseConfig,
  testEnvironmentConfig,
} from '@/lib/firebase/config-test'

export async function GET() {
  try {
    // Test environment configuration
    const envConfig = testEnvironmentConfig()

    // Test Firebase app initialization
    const appConfig = testFirebaseConfig()

    return NextResponse.json({
      success: envConfig.isValid && appConfig.client && appConfig.admin,
      environment: envConfig,
      applications: appConfig,
      timestamp: new Date().toISOString(),
      message: envConfig.isValid
        ? 'Firebase configuration is valid'
        : 'Firebase configuration has issues',
    })
  } catch (error) {
    console.error('Firebase config test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test Firebase configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
