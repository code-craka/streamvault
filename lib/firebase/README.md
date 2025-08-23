# Firebase Setup for StreamVault

This directory contains the Firebase configuration and utilities for StreamVault's real-time features.

## Overview

StreamVault uses Firebase for:

- **Firestore**: Real-time database for chat, streams, and user data
- **Authentication**: User session management (integrated with Clerk)
- **Storage**: File uploads and media management
- **Real-time Updates**: Live chat, viewer counts, and notifications

## Configuration Files

### Core Configuration

- `config.ts` - Client-side Firebase configuration
- `admin.ts` - Server-side Firebase Admin SDK configuration
- `firestore.ts` - Firestore service utilities and CRUD operations
- `index.ts` - Main exports for Firebase utilities

### Testing & Validation

- `connection-test.ts` - Connection and CRUD testing utilities
- `config-test.ts` - Configuration validation without API calls
- `init.ts` - Firebase initialization and status management

### Project Configuration

- `firebase.json` - Firebase CLI configuration
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore database indexes

## Environment Variables

### Required Client Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=streamvault-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=streamvault-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=streamvault-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:...
```

### Required Server Variables

```env
GCP_PROJECT_ID=shining-courage-465501-i8
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Service Account Setup

1. **Service Account File**: Place your service account JSON file at `.gcp/service-account.json`
2. **Permissions**: Ensure the service account has the following roles:
   - `Cloud Datastore User`
   - `Firebase Admin SDK Administrator Service Agent`

## Security Rules

The Firestore security rules implement:

- **Role-based Access Control**: viewer/streamer/admin roles
- **Subscription-based Access**: Content access based on subscription tiers
- **Owner-based Permissions**: Users can only modify their own data
- **Real-time Chat Security**: Rate limiting and moderation controls

### Key Security Features

- Users can only read/write their own data
- Streamers can manage their own streams and moderate chat
- Admins have full access to all collections
- Subscription tiers control access to premium content
- Chat messages have role-based moderation

## Database Collections

### Core Collections

- `users` - User profiles and metadata
- `streams` - Live stream information and status
- `videos` - VOD content and metadata
- `subscriptions` - User subscription data
- `analytics` - Usage and performance metrics

### Real-time Collections

- `streams/{streamId}/messages` - Chat messages for each stream
- `notifications` - User notifications and alerts
- `userPreferences` - User settings and preferences

### System Collections

- `admin` - Admin-only data and configurations
- `system` - Server-side system data

## Usage Examples

### Basic Firestore Operations

```typescript
import { streamsService, firestoreHelpers } from '@/lib/firebase'

// Create a new stream
const streamId = await streamsService.create({
  userId: 'user123',
  title: 'My Live Stream',
  status: 'inactive',
})

// Get user's streams
const userStreams = await firestoreHelpers.getUserStreams('user123')

// Listen to real-time chat
const unsubscribe = firestoreHelpers.listenToChat('stream123', messages => {
  console.log('New messages:', messages)
})
```

### Real-time Listeners

```typescript
import { streamsService } from '@/lib/firebase'

// Listen to stream updates
const unsubscribe = streamsService.onDocSnapshot('stream123', stream => {
  if (stream) {
    console.log('Stream updated:', stream)
  }
})

// Clean up listener
unsubscribe()
```

## Testing

### Configuration Test

```bash
# Test Firebase configuration
curl http://localhost:3000/api/firebase/config
```

### Connection Test (requires Firestore API enabled)

```bash
# Test Firebase connection and CRUD operations
curl http://localhost:3000/api/firebase/test
```

### Setup Validation

```bash
# Run setup validation script
node scripts/setup-firebase.js
```

## Deployment

### Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Database Indexes

```bash
firebase deploy --only firestore:indexes
```

### Full Firebase Deploy

```bash
firebase deploy
```

## Troubleshooting

### Common Issues

1. **Firestore API Not Enabled**
   - Visit: https://console.developers.google.com/apis/api/firestore.googleapis.com/
   - Enable the Firestore API for your project

2. **Service Account Permissions**
   - Ensure service account has proper IAM roles
   - Check that the service account file is valid JSON

3. **Environment Variables**
   - Verify all required environment variables are set
   - Check that project IDs match between client and server config

4. **Security Rules**
   - Test rules in Firebase Console simulator
   - Ensure user tokens include required custom claims (role, subscriptionTier)

### Debug Mode

Set `NEXT_PUBLIC_DEBUG_MODE=true` to enable detailed Firebase logging.

## Performance Optimization

### Firestore Best Practices

- Use compound indexes for complex queries
- Implement pagination for large result sets
- Cache frequently accessed data
- Use real-time listeners sparingly
- Batch write operations when possible

### Security Best Practices

- Never expose admin credentials to client
- Validate all data on both client and server
- Use security rules as the primary security layer
- Implement rate limiting for write operations
- Monitor for suspicious activity

## Monitoring

### Firebase Console

- Monitor usage and performance in Firebase Console
- Set up alerts for quota limits and errors
- Review security rule usage and denials

### Application Monitoring

- Track Firebase operation success/failure rates
- Monitor real-time listener connection counts
- Alert on authentication failures

## Support

For Firebase-related issues:

1. Check the Firebase Console for error logs
2. Review security rule simulator results
3. Validate environment configuration
4. Test with the provided utilities
5. Consult Firebase documentation: https://firebase.google.com/docs
