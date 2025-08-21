# StreamVault

A modern, aesthetic live streaming platform with subscription-based monetization and enterprise-grade features.

## 🚀 Features

- **Live Streaming**: Professional quality broadcasting with RTMP ingest and HLS delivery
- **VOD Management**: Secure video-on-demand with signed URLs and content protection
- **Subscription Monetization**: Tiered plans (Basic $9.99, Premium $19.99, Pro $29.99)
- **Real-time Engagement**: Advanced chat system with AI moderation and custom emotes
- **AI Enhancement**: Automated content processing, thumbnails, and recommendations
- **Enterprise Features**: White-label customization, comprehensive APIs, and multi-tenancy

## 🛠️ Tech Stack

- **Framework**: Next.js 15.0.1 with App Router
- **Language**: TypeScript with 100% type coverage
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Authentication**: Clerk with OAuth (Google, GitHub, Discord)
- **Database**: Firebase Firestore
- **Storage**: Google Cloud Storage with signed URLs
- **Payments**: Stripe with subscription management
- **Streaming**: HLS.js with adaptive bitrate
- **AI**: Content moderation and enhancement
- **Testing**: Jest + Playwright

## 📁 Project Structure

```
streamvault/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── ui/                # shadcn/ui components
│   ├── auth/              # Authentication components
│   ├── player/            # Video player components
│   └── chat/              # Chat system components
├── lib/                   # Utility functions and services
│   ├── auth/              # Authentication utilities
│   ├── streaming/         # Streaming services
│   ├── storage/           # GCS and file management
│   └── stripe/            # Payment processing
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/code-craka/streamvault.git
cd streamvault
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Fill in your actual values in .env.local
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

### Development
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Lint code
pnpm format       # Format code with Prettier
pnpm type-check   # TypeScript type checking
```

### Testing
```bash
pnpm test         # Run unit tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage
pnpm test:e2e     # Run E2E tests with Playwright
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Core
NEXT_PUBLIC_APP_URL=http://localhost:3000
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
```

### Git Hooks

The project uses Husky for git hooks:
- **pre-commit**: Runs linting and type checking
- **commit-msg**: Validates commit message format (conventional commits)

## 🏗️ Architecture

### Core Services

- **Authentication**: Clerk-based auth with role management
- **Streaming**: RTMP ingest → HLS transcoding → CDN delivery
- **Storage**: Google Cloud Storage with 15-minute signed URLs
- **Real-time**: Firebase Firestore for chat and live updates
- **Payments**: Stripe subscriptions with webhook handling
- **AI**: Content moderation, thumbnails, and recommendations

### Performance Targets

- **Page Load**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **API Response**: < 100ms for authenticated requests
- **Video Start**: < 3 seconds for HLS initialization
- **Chat Delivery**: < 500ms end-to-end
- **Uptime**: 99.9% availability SLA

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm test:e2e
```

### Coverage Requirements
- Minimum 80% code coverage
- All critical paths must be tested
- Integration tests for API endpoints

## 🚀 Deployment

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Setup
1. Configure production environment variables
2. Set up Google Cloud Storage bucket
3. Configure Stripe webhooks
4. Set up Firebase project
5. Configure Clerk production instance

## 📊 Monitoring

- **Performance**: Core Web Vitals tracking
- **Errors**: Automated error reporting
- **Analytics**: User engagement metrics
- **Uptime**: 99.9% availability monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: https://github.com/code-craka/streamvault.git
- **Documentation**: [Coming Soon]
- **API Docs**: [Coming Soon]
- **Support**: [Coming Soon]

---

Built with ❤️ by the StreamVault Team