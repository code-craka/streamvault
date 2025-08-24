# Google Cloud Storage Integration

This document describes the Google Cloud Storage (GCS) integration for StreamVault, including setup, configuration, and usage.

## Overview

StreamVault uses Google Cloud Storage for secure video storage with the following features:

- **Secure Video Storage**: Videos stored in `gs://streamvault-videos` bucket
- **Signed URLs**: 15-minute expiring URLs for content protection
- **Lifecycle Management**: Automatic storage class transitions and cleanup
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Service Account Authentication**: Secure access using dedicated service account

## Configuration

### Environment Variables

Required environment variables in `.env.local`:

```bash
# Google Cloud Platform Configuration
GCP_PROJECT_ID=shining-courage-465501-i8
GCS_BUCKET_NAME=streamvault-videos
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCS_SERVICE_ACCOUNT_EMAIL=ghstreamvault@shining-courage-465501-i8.iam.gserviceaccount.com
```

### Service Account

The service account `ghstreamvault@shining-courage-465501-i8.iam.gserviceaccount.com` has the following permissions:

- **Storage Object Admin**: Full control over objects in the bucket
- **Storage Legacy Bucket Reader**: Read access to bucket metadata
- **Storage Legacy Object Reader**: Read access to objects

### Bucket Configuration

The `streamvault-videos` bucket is configured with:

- **Location**: `us-central1` (Iowa)
- **Storage Class**: `STANDARD`
- **Versioning**: Enabled
- **Uniform Bucket-Level Access**: Enabled for security
- **Public Access Prevention**: Enforced

## Folder Structure

The bucket uses the following folder organization:

```
gs://streamvault-videos/
├── videos/                 # Processed video files
│   └── YYYY-MM-DD/        # Organized by date
├── thumbnails/            # Video thumbnails
│   └── YYYY-MM-DD/
├── live-streams/          # Live stream recordings
│   └── YYYY-MM-DD/
├── temp/                  # Temporary files (auto-deleted after 7 days)
├── uploads/               # User uploads
│   └── YYYY-MM-DD/
└── exports/               # Exported content
```

## Lifecycle Policies

Automatic lifecycle management:

1. **Temporary Files**: Deleted after 7 days
   - Applies to: `temp/`, `uploads/temp/`

2. **Nearline Storage**: After 30 days
   - Applies to: `videos/`, `live-streams/`
   - Reduces storage costs for older content

3. **Coldline Storage**: After 90 days
   - Applies to: `videos/`, `live-streams/`
   - Further cost reduction for archive content

4. **Version Cleanup**: Delete old versions after 365 days
   - Maintains current versions while cleaning up history

## Security Features

### Signed URLs

- **Expiration**: 15 minutes for video access
- **Automatic Refresh**: Client-side URL renewal
- **Subscription Validation**: Tier-based access control
- **Access Logging**: Track video access for analytics

### Content Protection

- **No Public Access**: All content requires authentication
- **Uniform Bucket Access**: Consistent security model
- **Service Account Only**: No user-based access
- **CORS Restrictions**: Limited to StreamVault domains

## Usage Examples

### File Upload

```typescript
import { fileUploadService } from '@/lib/storage'

// Upload a video file
const result = await fileUploadService.uploadVideo(
  videoBuffer,
  'video-123',
  {
    title: 'My Video',
    duration: '300',
    resolution: '1920x1080',
  }
)

console.log(`Video uploaded: ${result.filename}`)
```

### Thumbnail Upload

```typescript
// Upload thumbnail
const thumbnailResult = await fileUploadService.uploadThumbnail(
  thumbnailBuffer,
  'video-123',
  0 // thumbnail index
)
```

### File Management

```typescript
// Check if file exists
const exists = await fileUploadService.fileExists('videos/2025-08-23/video-123.mp4')

// Get file metadata
const metadata = await fileUploadService.getFileMetadata('videos/2025-08-23/video-123.mp4')

// List files in folder
const files = await fileUploadService.listFiles('videos/2025-08-23', 10)

// Delete file
await fileUploadService.deleteFile('temp/upload-123.tmp')
```

## Setup Commands

### Initial Setup

```bash
# Validate GCS configuration
pnpm gcs:setup

# Configure bucket policies
pnpm gcs:configure

# Test functionality
pnpm gcs:test-direct
```

### Development Testing

```bash
# Test with running server
pnpm dev
pnpm gcs:test

# Direct testing (no server needed)
pnpm gcs:test-direct
```

## API Endpoints

### Storage Test Endpoint

```bash
# Test all functionality
GET /api/storage/test

# Test specific functionality
POST /api/storage/test
{
  "testType": "bucket-access" | "bucket-info" | "file-upload"
}
```

## Monitoring and Troubleshooting

### Common Issues

1. **Permission Denied**
   - Verify service account has correct roles
   - Check service account key file path
   - Ensure bucket exists and is accessible

2. **File Upload Failures**
   - Check file size limits (5GB for videos, 10MB for images)
   - Verify file type is allowed
   - Ensure sufficient bucket quota

3. **CORS Errors**
   - Verify domain is in CORS configuration
   - Check request headers and methods
   - Ensure proper authentication

### Debugging

Enable debug logging:

```bash
export GOOGLE_CLOUD_DEBUG=true
export GCLOUD_PROJECT=shining-courage-465501-i8
```

Check bucket status:

```bash
gsutil ls -L gs://streamvault-videos
gsutil lifecycle get gs://streamvault-videos
gsutil cors get gs://streamvault-videos
```

## Performance Optimization

### Upload Performance

- **Resumable Uploads**: Enabled for files > 5MB
- **Parallel Uploads**: Multiple files can be uploaded concurrently
- **Compression**: Client-side compression before upload
- **Progress Tracking**: Real-time upload progress

### Download Performance

- **CDN Integration**: Cloudflare CDN for global delivery
- **Signed URL Caching**: Client-side URL caching with refresh
- **Adaptive Streaming**: Multiple quality levels
- **Range Requests**: Partial content delivery support

## Cost Optimization

### Storage Classes

- **Standard**: Active content (0-30 days)
- **Nearline**: Less frequent access (30-90 days)
- **Coldline**: Archive content (90+ days)

### Lifecycle Management

- Automatic transitions reduce storage costs
- Temporary file cleanup prevents unnecessary charges
- Version management balances safety and cost

### Monitoring

- Track storage usage by folder
- Monitor data transfer costs
- Analyze access patterns for optimization

## Security Best Practices

1. **Service Account Security**
   - Rotate keys regularly
   - Use least privilege principle
   - Monitor service account usage

2. **Access Control**
   - Never make bucket public
   - Use signed URLs for all access
   - Implement proper authentication

3. **Data Protection**
   - Enable versioning for important data
   - Regular backup verification
   - Implement data retention policies

4. **Monitoring**
   - Enable audit logging
   - Monitor unusual access patterns
   - Set up alerts for security events

## Integration with StreamVault Features

### Live Streaming

- Automatic VOD creation from live streams
- Thumbnail generation during streaming
- Real-time upload progress tracking

### Subscription Tiers

- Storage quota based on subscription level
- Quality restrictions by tier
- Download limits enforcement

### AI Enhancement

- Automatic thumbnail generation
- Content analysis and tagging
- Transcription and subtitle storage

### Analytics

- Access pattern tracking
- Storage usage analytics
- Performance metrics collection

This GCS integration provides a robust, secure, and scalable foundation for StreamVault's video storage needs while maintaining cost efficiency and high performance.