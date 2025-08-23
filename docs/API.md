# StreamVault API Documentation

## Overview

StreamVault provides a comprehensive REST API for managing users, streams, subscriptions, and content. All API endpoints require authentication unless otherwise specified.

## Authentication

### Headers

```http
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

### User Roles

- **viewer**: Basic access to streams and content
- **streamer**: Can create and manage streams
- **admin**: Full system access

### Subscription Tiers

- **basic** ($9.99/month): Standard features
- **premium** ($19.99/month): Enhanced features + HD streaming
- **pro** ($29.99/month): All features + 4K streaming + API access

## Base URL

```
Production: https://streamvault.app/api
Development: http://localhost:3000/api
```

## Endpoints

### Authentication

#### GET /api/auth/user

Get current user information

**Response:**

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "username": "streamer123",
  "role": "streamer",
  "subscriptionTier": "premium",
  "subscriptionStatus": "active",
  "preferences": {
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": true
    }
  }
}
```

#### PUT /api/auth/user

Update user profile

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

#### PUT /api/auth/user/preferences

Update user preferences

**Request Body:**

```json
{
  "theme": "dark",
  "language": "en",
  "notifications": {
    "email": true,
    "push": false,
    "streamStart": true
  },
  "privacy": {
    "showOnlineStatus": true,
    "allowDirectMessages": false
  }
}
```

### Streams

#### GET /api/streams

List all streams

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `live` (boolean): Filter live streams only

**Response:**

```json
{
  "streams": [
    {
      "id": "stream_123",
      "title": "Gaming Session",
      "description": "Playing the latest games",
      "streamerId": "user_456",
      "streamerName": "GamerPro",
      "category": "gaming",
      "isLive": true,
      "viewerCount": 1250,
      "thumbnailUrl": "https://cdn.streamvault.app/thumbs/stream_123.jpg",
      "startedAt": "2024-01-15T10:00:00Z",
      "tags": ["gaming", "fps", "competitive"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### POST /api/streams

Create a new stream (Requires: streamer role)

**Request Body:**

```json
{
  "title": "My Gaming Stream",
  "description": "Playing the latest games",
  "category": "gaming",
  "tags": ["gaming", "fps"],
  "isPrivate": false
}
```

**Response:**

```json
{
  "id": "stream_123",
  "title": "My Gaming Stream",
  "streamKey": "sk_live_abc123def456",
  "rtmpUrl": "rtmp://ingest.streamvault.app/live",
  "hlsUrl": "https://cdn.streamvault.app/hls/stream_123/playlist.m3u8"
}
```

#### GET /api/streams/:id

Get stream details

#### PUT /api/streams/:id

Update stream (Requires: owner or admin)

#### DELETE /api/streams/:id

Delete stream (Requires: owner or admin)

#### POST /api/streams/:id/start

Start streaming (Requires: owner)

#### POST /api/streams/:id/stop

Stop streaming (Requires: owner)

### Videos (VOD)

#### GET /api/videos

List videos

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `streamerId` (string): Filter by streamer
- `category` (string): Filter by category

#### GET /api/videos/:id

Get video details with signed URL

**Response:**

```json
{
  "id": "video_123",
  "title": "Epic Gaming Moments",
  "description": "Highlights from last night's stream",
  "duration": 3600,
  "thumbnailUrl": "https://cdn.streamvault.app/thumbs/video_123.jpg",
  "videoUrl": "https://storage.googleapis.com/streamvault-videos/video_123.mp4?X-Goog-Signature=...",
  "urlExpiresAt": "2024-01-15T11:00:00Z",
  "streamerId": "user_456",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Subscriptions

#### GET /api/subscriptions/tiers

Get available subscription tiers

**Response:**

```json
{
  "tiers": [
    {
      "id": "basic",
      "name": "Basic",
      "price": 9.99,
      "interval": "month",
      "features": [
        "Access to live streams",
        "Limited VOD history (30 days)",
        "Standard quality streaming (720p)"
      ],
      "limits": {
        "vodRetentionDays": 30,
        "maxQuality": "720p",
        "concurrentStreams": 1
      }
    }
  ]
}
```

#### POST /api/subscriptions/checkout

Create Stripe checkout session

**Request Body:**

```json
{
  "priceId": "price_1234567890",
  "successUrl": "https://streamvault.app/dashboard?success=true",
  "cancelUrl": "https://streamvault.app/pricing"
}
```

#### GET /api/subscriptions/portal

Get Stripe customer portal URL

### Chat

#### GET /api/chat/:streamId/messages

Get chat messages for a stream

#### POST /api/chat/:streamId/messages

Send a chat message

**Request Body:**

```json
{
  "message": "Great stream!",
  "type": "text"
}
```

#### DELETE /api/chat/messages/:messageId

Delete a message (Requires: moderator or admin)

### Analytics (Pro tier required)

#### GET /api/analytics/streams/:streamId

Get stream analytics

**Response:**

```json
{
  "streamId": "stream_123",
  "totalViews": 5000,
  "uniqueViewers": 3200,
  "averageViewDuration": 1800,
  "peakViewers": 1250,
  "chatMessages": 850,
  "viewersByCountry": {
    "US": 1200,
    "CA": 300,
    "UK": 250
  },
  "viewersByHour": [
    { "hour": "2024-01-15T10:00:00Z", "viewers": 100 },
    { "hour": "2024-01-15T11:00:00Z", "viewers": 250 }
  ]
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": "Please provide a valid session token"
  }
}
```

### Common Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

### Rate Limiting

Rate limits vary by user role and subscription tier:

- **Viewer**: 100 requests/minute
- **Streamer**: 500 requests/minute
- **Admin**: 1000 requests/minute
- **Pro Subscription**: +500 requests/minute bonus

Rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T10:01:00Z
```

## Webhooks

### Stripe Webhooks

#### POST /api/webhooks/stripe

Handle Stripe subscription events

**Events:**

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Stream Webhooks

#### POST /api/webhooks/stream

Handle streaming events

**Events:**

- `stream.started`
- `stream.ended`
- `stream.recording_ready`

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @streamvault/sdk
```

```typescript
import { StreamVault } from '@streamvault/sdk'

const client = new StreamVault({
  apiKey: 'your-api-key',
  baseUrl: 'https://streamvault.app/api',
})

// Get user streams
const streams = await client.streams.list()

// Create a new stream
const stream = await client.streams.create({
  title: 'My Stream',
  category: 'gaming',
})
```

## Examples

### Create and Start a Stream

```typescript
// 1. Create stream
const stream = await fetch('/api/streams', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'My Gaming Stream',
    category: 'gaming',
  }),
})

// 2. Start streaming to RTMP endpoint
// Use the returned streamKey and rtmpUrl with your streaming software

// 3. Start the stream
await fetch(`/api/streams/${stream.id}/start`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
})
```

### Subscribe to a Plan

```typescript
// Create checkout session
const checkout = await fetch('/api/subscriptions/checkout', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_premium_monthly',
    successUrl: window.location.origin + '/dashboard?success=true',
    cancelUrl: window.location.origin + '/pricing',
  }),
})

// Redirect to Stripe Checkout
window.location.href = checkout.url
```

## Support

For API support, please contact:

- **Email**: api-support@streamvault.app
- **Documentation**: https://docs.streamvault.app
- **Status Page**: https://status.streamvault.app
