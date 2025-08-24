import { NextRequest, NextResponse } from 'next/server'
import {
  runFirebaseTests,
  validateFirebaseEnvironment,
} from '@/lib/firebase/connection-test'

export async function GET() {
  try {
    // First validate environment variables
    const envValidation = validateFirebaseEnvironment()

    if (!envValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase environment configuration incomplete',
          missing: envValidation.missing,
          warnings: envValidation.warnings,
        },
        { status: 500 }
      )
    }

    // Run Firebase connection tests
    const testResults = await runFirebaseTests()

    return NextResponse.json({
      success: testResults.overall,
      results: testResults,
      environment: envValidation,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Firebase test API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run Firebase tests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json()

    let result
    switch (testType) {
      case 'client':
        const { testClientConnection } = await import(
          '@/lib/firebase/connection-test'
        )
        result = await testClientConnection()
        break
      case 'admin':
        const { testAdminConnection } = await import(
          '@/lib/firebase/connection-test'
        )
        result = await testAdminConnection()
        break
      case 'crud':
        const { testCRUDOperations } = await import(
          '@/lib/firebase/connection-test'
        )
        result = await testCRUDOperations()
        break
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid test type. Use: client, admin, or crud',
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result,
      testType,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Firebase individual test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run individual Firebase test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
