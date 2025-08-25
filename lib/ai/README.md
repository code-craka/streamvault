# AI Content Enhancement System

This directory contains the AI-powered content enhancement system for StreamVault, providing comprehensive video processing, thumbnail generation, quality analysis, and personalized recommendations.

## Overview

The AI Content Enhancement system consists of several interconnected services:

- **Content Enhancement Service**: Main orchestrator for AI processing
- **Thumbnail Generation Service**: AI-powered thumbnail creation and optimization
- **Content Quality Analyzer**: Comprehensive quality assessment and improvement suggestions
- **Recommendation Engine**: Personalized content recommendations using collaborative filtering

## Features

### 🎯 Core AI Features

- **Automatic Thumbnail Generation**: AI-selected key frames with confidence scoring
- **Metadata Generation**: AI-powered titles, descriptions, tags, and categories
- **Quality Analysis**: Technical, engagement, accessibility, and SEO scoring
- **Content Recommendations**: Personalized suggestions using machine learning
- **Scene Detection**: Automatic highlight and clip creation
- **Content Moderation**: AI-powered filtering and safety checks

### 🚀 Advanced Features

- **Multi-language Support**: Transcription and subtitle generation
- **A/B Testing**: Thumbnail variations for optimization
- **Performance Insights**: Content optimization recommendations
- **Sentiment Analysis**: Audience engagement tracking
- **Copyright Detection**: Automated DMCA compliance

## Architecture

```
AI Content Enhancement System
├── content-enhancement.ts      # Main orchestrator service
├── thumbnail-generation.ts     # Thumbnail creation and analysis
├── content-quality-analyzer.ts # Quality assessment and suggestions
├── scene-detection.ts          # Video scene analysis
├── advanced-content-analysis.ts # Advanced AI features
└── transcription-service.ts    # Speech-to-text processing
```

## Usage

### Basic Video Processing

```typescript
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'

const metadata = await aiContentEnhancement.processUploadedVideo(
  'video-123',
  '/path/to/video.mp4',
  'user-456'
)

console.log('Generated metadata:', metadata)
```

### Thumbnail Generation

```typescript
import { thumbnailGenerator } from '@/lib/ai/thumbnail-generation'

const thumbnails = await thumbnailGenerator.generateThumbnails(
  'video-123',
  '/path/to/video.mp4',
  {
    count: 5,
    width: 1280,
    height: 720,
    quality: 85
  }
)
```

### Quality Analysis

```typescript
import { contentQualityAnalyzer } from '@/lib/ai/content-quality-analyzer'

const analysis = await contentQualityAnalyzer.analyzeContent(
  'video-123',
  '/path/to/video.mp4',
  metadata
)

console.log('Quality score:', analysis.overall)
console.log('Suggestions:', analysis.suggestions)
```

### Recommendations

```typescript
const recommendations = await aiContentEnhancement.generateRecommendations(
  'user-456',
  'current-video-123',
  10
)
```

## API Endpoints

### POST /api/ai/content-enhancement

Process video with comprehensive AI enhancement.

**Request:**
```json
{
  "videoId": "video-123",
  "videoPath": "/path/to/video.mp4",
  "options": {
    "generateThumbnails": true,
    "generateMetadata": true,
    "analyzeQuality": true,
    "generateRecommendations": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-123",
    "metadata": { ... },
    "thumbnails": [ ... ],
    "qualityAnalysis": { ... }
  }
}
```

### POST /api/ai/content-enhancement?action=thumbnails

Generate thumbnails only.

### POST /api/ai/content-enhancement?action=quality

Analyze content quality only.

### GET /api/ai/recommendations

Get personalized recommendations.

## Components

### ContentEnhancementPanel

React component for video enhancement UI.

```tsx
import { ContentEnhancementPanel } from '@/components/ai/content-enhancement-panel'

<ContentEnhancementPanel
  videoId="video-123"
  videoPath="/path/to/video.mp4"
  onEnhancementComplete={(data) => console.log(data)}
/>
```

### RecommendationEngine

AI-powered recommendation display.

```tsx
import { RecommendationEngine } from '@/components/ai/recommendation-engine'

<RecommendationEngine
  currentVideoId="video-123"
  limit={6}
  showReason={true}
/>
```

## Configuration

### Environment Variables

```env
# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Google Cloud Storage
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_ADVANCED_AI=true
```

### Service Configuration

```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  thumbnails: {
    defaultCount: 5,
    maxCount: 10,
    defaultQuality: 85,
    supportedFormats: ['jpeg', 'png', 'webp']
  },
  quality: {
    thresholds: {
      excellent: 0.9,
      good: 0.7,
      fair: 0.5,
      poor: 0.3
    }
  },
  recommendations: {
    maxRecommendations: 50,
    defaultLimit: 10,
    confidenceThreshold: 0.6
  }
}
```

## Quality Metrics

### Technical Quality
- Video resolution, bitrate, frame rate
- Audio quality and encoding
- Compression efficiency

### Engagement Metrics
- Content pacing and structure
- Visual interest and composition
- Thumbnail appeal and effectiveness

### Accessibility Score
- Caption availability
- Audio descriptions
- Visual contrast and readability

### SEO Optimization
- Title optimization (40-70 characters)
- Description quality (100-300 characters)
- Tag relevance and diversity
- Thumbnail SEO factors

## Performance

### Benchmarks
- Thumbnail generation: < 30 seconds for 5 thumbnails
- Metadata generation: < 10 seconds
- Quality analysis: < 15 seconds
- Recommendations: < 5 seconds

### Optimization
- Parallel processing for multiple AI tasks
- Caching for repeated operations
- Progressive enhancement for large files
- Fallback mechanisms for service failures

## Testing

### Unit Tests
```bash
pnpm test tests/unit/ai/content-enhancement-simple.test.ts
```

### Integration Tests
```bash
pnpm test tests/integration/ai/
```

### Load Testing
```bash
pnpm test:load tests/load/ai-processing.test.ts
```

## Monitoring

### Metrics Tracked
- Processing success/failure rates
- Average processing times
- AI confidence scores
- User engagement with AI-generated content

### Alerts
- Processing failures > 5%
- Average processing time > 60 seconds
- AI confidence scores < 0.5
- Storage quota approaching limits

## Security

### Data Protection
- Temporary file cleanup after processing
- Secure API key management
- Input validation and sanitization
- Rate limiting for API endpoints

### Privacy Compliance
- No permanent storage of video content
- Anonymized analytics data
- GDPR-compliant data handling
- User consent for AI processing

## Troubleshooting

### Common Issues

**Processing Failures**
- Check video format compatibility
- Verify storage permissions
- Validate API key configuration

**Low Quality Scores**
- Review video technical specifications
- Check audio quality settings
- Validate metadata completeness

**Slow Processing**
- Monitor system resources
- Check network connectivity
- Review file size limits

### Debug Mode

```typescript
// Enable debug logging
process.env.AI_DEBUG = 'true'

// Detailed error reporting
const result = await aiContentEnhancement.processUploadedVideo(
  videoId,
  videoPath,
  userId,
  { debug: true }
)
```

## Roadmap

### Upcoming Features
- Real-time processing for live streams
- Advanced scene detection with ML models
- Multi-language content analysis
- Custom AI model training
- Enhanced recommendation algorithms

### Performance Improvements
- GPU acceleration for video processing
- Distributed processing for large files
- Advanced caching strategies
- Real-time quality monitoring

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider performance implications
5. Ensure security compliance

## License

This AI content enhancement system is part of the StreamVault platform and follows the same licensing terms.