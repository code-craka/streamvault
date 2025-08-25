# StreamVault Deployment Guide

## Overview

This guide covers deploying StreamVault to production environments with proper configuration, security, and monitoring.

## Prerequisites

- Node.js 18+
- Docker (optional)
- Google Cloud Platform account
- Stripe account
- Clerk account
- Firebase project
- Domain name with SSL certificate

## Environment Setup

### 1. Google Cloud Platform

#### Create Project

```bash
gcloud projects create streamvault-prod --name="StreamVault Production"
gcloud config set project streamvault-prod
```

#### Enable APIs

```bash
gcloud services enable storage-api.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

#### Create Storage Bucket

```bash
gsutil mb -p streamvault-prod -c STANDARD -l us-central1 gs://streamvault-videos-prod
gsutil iam ch allUsers:objectViewer gs://streamvault-videos-prod
```

#### Create Service Account

```bash
gcloud iam service-accounts create streamvault-prod \
  --display-name="StreamVault Production Service Account"

gcloud projects add-iam-policy-binding streamvault-prod \
  --member="serviceAccount:streamvault-prod@streamvault-prod.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud iam service-accounts keys create ./service-account-prod.json \
  --iam-account=streamvault-prod@streamvault-prod.iam.gserviceaccount.com
```

### 2. Firebase Setup

#### Create Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: `streamvault-prod`
3. Enable Firestore Database
4. Set up security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Streams are publicly readable, writable by owner
    match /streams/{streamId} {
      allow read: if true;
      allow write: if request.auth != null &&
        (request.auth.uid == resource.data.streamerId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Chat messages are readable by all, writable by authenticated users
    match /chat/{streamId}/messages/{messageId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator']);
    }
  }
}
```

### 3. Clerk Configuration

#### Production Instance

1. Create production instance in [Clerk Dashboard](https://dashboard.clerk.com)
2. Configure OAuth providers:
   - Google OAuth
   - GitHub OAuth
   - Discord OAuth
3. Set up webhooks endpoint: `https://your-domain.com/api/webhooks/clerk`
4. Configure JWT template for custom claims

#### JWT Template

```json
{
  "metadata": "{{user.public_metadata}}",
  "role": "{{user.public_metadata.role}}",
  "subscriptionTier": "{{user.public_metadata.subscriptionTier}}"
}
```

### 4. Stripe Configuration

#### Production Setup

1. Activate Stripe account
2. Create products and prices:

   ```bash
   # Basic Plan
   stripe products create --name="StreamVault Basic" --description="Basic streaming features"
   stripe prices create --product=prod_xxx --unit-amount=999 --currency=usd --recurring[interval]=month

   # Premium Plan
   stripe products create --name="StreamVault Premium" --description="Enhanced streaming with HD"
   stripe prices create --product=prod_yyy --unit-amount=1999 --currency=usd --recurring[interval]=month

   # Pro Plan
   stripe products create --name="StreamVault Pro" --description="Professional streaming with 4K"
   stripe prices create --product=prod_zzz --unit-amount=2999 --currency=usd --recurring[interval]=month
   ```

3. Configure webhooks:
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: `customer.subscription.*`, `invoice.payment_*`

## Deployment Options

### Option 1: Vercel (Recommended)

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Deploy

```bash
vercel --prod
```

#### 3. Configure Environment Variables

```bash
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add GCP_PROJECT_ID production
vercel env add CLERK_SECRET_KEY production
# ... add all production environment variables
```

#### 4. Configure Custom Domain

```bash
vercel domains add your-domain.com
vercel alias your-deployment-url.vercel.app your-domain.com
```

### Option 2: Google Cloud Run

#### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./
EXPOSE 3000
CMD ["npm", "start"]
```

#### 2. Build and Deploy

```bash
# Build image
gcloud builds submit --tag gcr.io/streamvault-prod/streamvault

# Deploy to Cloud Run
gcloud run deploy streamvault \
  --image gcr.io/streamvault-prod/streamvault \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --memory=2Gi \
  --cpu=2 \
  --max-instances=100
```

### Option 3: Docker + Self-Hosted

#### 1. Docker Compose

```yaml
version: '3.8'
services:
  streamvault:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
    env_file:
      - .env.production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - streamvault
    restart: unless-stopped
```

#### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://streamvault:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

### Production Environment (.env.production)

```env
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://streamvault.app
GCP_PROJECT_ID=streamvault-prod
GCS_BUCKET_NAME=streamvault-videos-prod

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Firebase
FIREBASE_PROJECT_ID=streamvault-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@streamvault-prod.iam.gserviceaccount.com
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=streamvault-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=streamvault-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=streamvault-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# Streaming
STREAMING_DOMAIN=stream.streamvault.app
RTMP_INGEST_URL=rtmp://ingest.streamvault.app/live
HLS_DELIVERY_URL=https://cdn.streamvault.app/hls
CDN_BASE_URL=https://cdn.streamvault.app

# Security
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
ENCRYPTION_KEY=your-32-character-encryption-key
WEBHOOK_SECRET=your-webhook-secret-key

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_WHITE_LABEL=true
ENABLE_ANALYTICS=true
ENABLE_PWA=true

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
ANALYTICS_ID=G-XXXXXXXXXX
```

## SSL/TLS Configuration

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare (Recommended)

1. Add domain to Cloudflare
2. Update nameservers
3. Enable "Full (strict)" SSL mode
4. Enable "Always Use HTTPS"
5. Configure Page Rules for caching

## CDN Configuration

### Cloudflare Settings

```javascript
// Page Rules
// Rule 1: Cache everything
// URL: cdn.streamvault.app/*
// Settings: Cache Level = Cache Everything, Edge Cache TTL = 1 month

// Rule 2: API no cache
// URL: streamvault.app/api/*
// Settings: Cache Level = Bypass

// Rule 3: Static assets
// URL: streamvault.app/_next/static/*
// Settings: Cache Level = Cache Everything, Edge Cache TTL = 1 year
```

## Monitoring & Logging

### 1. Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})

export { Sentry }
```

### 2. Performance Monitoring

```typescript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export { Analytics, SpeedInsights }
```

### 3. Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkFirestore(),
    storage: await checkGCS(),
    auth: await checkClerk(),
    payments: await checkStripe(),
  }

  const healthy = Object.values(checks).every(check => check.status === 'ok')

  return Response.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  )
}
```

## Security Checklist

### Pre-Deployment

- [ ] All environment variables are set correctly
- [ ] JWT secrets are cryptographically secure (32+ characters)
- [ ] No environment variables start with "GITHUB_" (reserved for GitHub Actions)
- [ ] Database security rules are configured
- [ ] API rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Input validation is implemented
- [ ] SQL injection protection is in place
- [ ] XSS protection is enabled
- [ ] CSRF protection is configured

### Post-Deployment

- [ ] SSL certificate is valid and auto-renewing
- [ ] Security headers are set correctly
- [ ] Webhook endpoints are secured
- [ ] File upload restrictions are in place
- [ ] User permissions are working correctly
- [ ] Rate limiting is functioning
- [ ] Monitoring and alerting are active

## Performance Optimization

### 1. Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  images: {
    domains: ['cdn.streamvault.app', 'storage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
}

module.exports = nextConfig
```

### 2. Database Optimization

- Index frequently queried fields
- Use Firestore composite indexes
- Implement pagination for large datasets
- Cache frequently accessed data

### 3. CDN Optimization

- Enable Brotli compression
- Set appropriate cache headers
- Use WebP/AVIF image formats
- Implement lazy loading

## Backup & Recovery

### 1. Database Backup

```bash
# Firestore export
gcloud firestore export gs://streamvault-backups/$(date +%Y%m%d)

# Automated daily backup
gcloud scheduler jobs create app-engine backup-firestore \
  --schedule="0 2 * * *" \
  --time-zone="UTC" \
  --uri="/backup" \
  --http-method=POST
```

### 2. File Backup

```bash
# GCS bucket backup
gsutil -m rsync -r -d gs://streamvault-videos-prod gs://streamvault-backups/files
```

### 3. Recovery Procedures

1. **Database Recovery**: Import from Firestore backup
2. **File Recovery**: Restore from GCS backup
3. **Application Recovery**: Redeploy from Git repository
4. **DNS Recovery**: Update DNS records if needed

## Troubleshooting

### Common Issues

#### 1. Build Failures

```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check for TypeScript errors
npm run type-check

# Verify environment variables
npm run env:check
```

#### 2. Authentication Issues

- Verify Clerk webhook endpoints
- Check JWT template configuration
- Validate environment variables
- Test OAuth provider settings

#### 3. Database Connection Issues

- Verify Firebase service account permissions
- Check Firestore security rules
- Validate network connectivity
- Review API quotas and limits

#### 4. Storage Issues

- Verify GCS bucket permissions
- Check signed URL generation
- Validate service account credentials
- Review CORS configuration

### Logs and Debugging

#### Application Logs

```bash
# Vercel logs
vercel logs --follow

# Google Cloud Run logs
gcloud logs tail --service=streamvault

# Docker logs
docker logs -f streamvault
```

#### Performance Debugging

```bash
# Lighthouse CI
npm run lighthouse

# Bundle analyzer
npm run analyze

# Performance profiling
npm run profile
```

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review security logs weekly
- [ ] Monitor performance metrics daily
- [ ] Backup verification weekly
- [ ] SSL certificate renewal (automated)
- [ ] Database cleanup monthly

### Update Procedures

1. Test updates in staging environment
2. Create database backup
3. Deploy during low-traffic hours
4. Monitor error rates post-deployment
5. Rollback if issues detected

## Support

For deployment support:

- **Documentation**: https://docs.streamvault.app/deployment
- **Email**: devops@streamvault.app
- **Status**: https://status.streamvault.app
