import { NextRequest, NextResponse } from 'next/server'
import { runAllGCSTests } from '@/lib/storage/gcs-test'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Starting GCS integration tests...')
    
    // Run all GCS tests
    await runAllGCSTests()
    
    return NextResponse.json({
      success: true,
      message: 'All Google Cloud Storage tests passed successfully!',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ GCS tests failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json()
    
    switch (testType) {
      case 'bucket-access':
        const { validateBucketAccess } = await import('@/lib/storage/gcs-client')
        const hasAccess = await validateBucketAccess()
        return NextResponse.json({ success: hasAccess, testType })
        
      case 'bucket-info':
        const { getBucketInfo } = await import('@/lib/storage/gcs-client')
        const bucketInfo = await getBucketInfo()
        return NextResponse.json({ success: true, data: bucketInfo, testType })
        
      case 'file-upload':
        const { fileUploadService } = await import('@/lib/storage/file-upload')
        const testContent = Buffer.from(`Test upload at ${new Date().toISOString()}`)
        const result = await fileUploadService.uploadFile(testContent, {
          folder: 'api-test',
          filename: `api-test-${Date.now()}.txt`,
          contentType: 'text/plain',
        })
        
        // Clean up immediately
        await fileUploadService.deleteFile(result.filename)
        
        return NextResponse.json({ success: true, data: result, testType })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Use: bucket-access, bucket-info, or file-upload'
        }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 })
  }
}