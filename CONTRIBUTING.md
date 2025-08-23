# Contributing to StreamVault

Thank you for your interest in contributing to StreamVault! This guide will help you get started with contributing to our modern live streaming platform.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@streamvault.app](mailto:conduct@streamvault.app).

## Getting Started

### Types of Contributions

We welcome many types of contributions:

- 🐛 **Bug Reports**: Help us identify and fix issues
- 🚀 **Feature Requests**: Suggest new features or improvements
- 💻 **Code Contributions**: Submit bug fixes or new features
- 📚 **Documentation**: Improve or add documentation
- 🎨 **Design**: UI/UX improvements and design assets
- 🧪 **Testing**: Add or improve tests
- 🌐 **Translations**: Help make StreamVault accessible globally

### Before You Start

1. **Check existing issues**: Look through [existing issues](https://github.com/code-craka/streamvault/issues) to see if your bug report or feature request already exists.

2. **Discuss major changes**: For significant changes, please open an issue first to discuss your approach with the maintainers.

3. **Read the documentation**: Familiarize yourself with our [Development Guide](docs/DEVELOPMENT.md) and [API Documentation](docs/API.md).

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (package manager)
- Git
- VS Code (recommended)

### Setup Steps

1. **Fork the repository**

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/streamvault.git
cd streamvault
```

2. **Add upstream remote**

```bash
git remote add upstream https://github.com/code-craka/streamvault.git
```

3. **Install dependencies**

```bash
pnpm install
```

4. **Set up environment**

```bash
cp .env.example .env.local
# Edit .env.local with your development credentials
```

5. **Start development server**

```bash
pnpm dev
```

6. **Verify setup**

- Open [http://localhost:3000](http://localhost:3000)
- Run tests: `pnpm test`
- Check linting: `pnpm lint`

## Contributing Guidelines

### Branch Naming

Use descriptive branch names with prefixes:

```bash
# Features
feature/user-authentication
feature/video-player-controls
feature/subscription-management

# Bug fixes
fix/video-playback-issue
fix/authentication-redirect
fix/mobile-responsive-layout

# Documentation
docs/api-endpoints
docs/deployment-guide
docs/contributing-guidelines

# Refactoring
refactor/auth-utilities
refactor/database-queries
refactor/component-structure

# Performance
perf/video-loading-optimization
perf/database-query-optimization

# Chores
chore/update-dependencies
chore/cleanup-unused-code
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

# Examples
feat: add user role management system
feat(auth): implement subscription tier validation
fix: resolve video playback stuttering issue
fix(api): handle edge case in stream creation
docs: add API endpoint documentation
docs(deployment): update production setup guide
style: format code with prettier
refactor: optimize database queries
test: add unit tests for auth utilities
chore: update dependencies
perf: improve video loading performance
ci: add automated testing pipeline
```

#### Commit Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **ci**: CI/CD pipeline changes
- **build**: Build system changes
- **revert**: Reverting previous commits

### Issue Templates

When creating issues, please use our templates:

#### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**

- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 22]
- Node.js version: [e.g. 18.17.0]

**Additional context**
Add any other context about the problem here.
```

#### Feature Request Template

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation considerations**

- Technical requirements
- Potential challenges
- Dependencies
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream**

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Create feature branch**

```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**

- Follow our coding standards
- Add tests for new functionality
- Update documentation if needed

4. **Test your changes**

```bash
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Check linting
pnpm lint

# Type checking
pnpm type-check

# Build check
pnpm build
```

5. **Commit your changes**

```bash
git add .
git commit -m "feat: add your feature description"
```

6. **Push to your fork**

```bash
git push origin feature/your-feature-name
```

### Pull Request Template

```markdown
## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Checklist

- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Related Issues

Closes #(issue number)
```

### Review Process

1. **Automated Checks**: All PRs must pass automated checks (tests, linting, type checking)

2. **Code Review**: At least one maintainer will review your PR

3. **Feedback**: Address any feedback or requested changes

4. **Approval**: Once approved, a maintainer will merge your PR

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid `any` type unless absolutely necessary
- Use strict mode settings

```typescript
// Good
interface UserProfile {
  id: string
  name: string
  email: string
  role: 'viewer' | 'streamer' | 'admin'
}

// Avoid
const user: any = { ... }
```

### React Components

- Use functional components with hooks
- Implement proper prop types
- Use meaningful component and prop names
- Include JSDoc comments for complex components

```typescript
// Good
interface UserCardProps {
  user: UserProfile
  onEdit?: (user: UserProfile) => void
  className?: string
}

/**
 * Displays user information in a card format
 */
export function UserCard({ user, onEdit, className }: UserCardProps) {
  // Component implementation
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use semantic HTML elements
- Ensure accessibility compliance

```typescript
// Good
<button
  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
  aria-label="Save changes"
>
  Save
</button>
```

### API Routes

- Use proper HTTP status codes
- Implement input validation with Zod
- Include error handling
- Add authentication checks

```typescript
// Good
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = schema.parse(body)

    // Implementation
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    // Error handling
  }
}
```

## Testing Requirements

### Unit Tests

- Write tests for all utility functions
- Test React components with React Testing Library
- Aim for 80%+ code coverage
- Use descriptive test names

```typescript
// Good
describe('hasRole utility', () => {
  it('should return true when user has exact role match', () => {
    expect(hasRole('streamer', 'streamer')).toBe(true)
  })

  it('should return true when user has higher role than required', () => {
    expect(hasRole('admin', 'streamer')).toBe(true)
  })
})
```

### E2E Tests

- Test critical user flows
- Use Page Object Model pattern
- Include accessibility testing
- Test on multiple browsers

```typescript
// Good
test('user can create and manage stream', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="create-stream-button"]')
  await page.fill('[name="title"]', 'Test Stream')
  await page.click('[type="submit"]')

  await expect(page.locator('[data-testid="stream-title"]')).toContainText(
    'Test Stream'
  )
})
```

### Test Organization

```
tests/
├── unit/                 # Unit tests
│   ├── components/       # Component tests
│   ├── lib/             # Utility function tests
│   └── hooks/           # Custom hook tests
├── integration/         # Integration tests
│   └── api/            # API route tests
└── e2e/                # End-to-end tests
    ├── auth.spec.ts    # Authentication flows
    ├── streaming.spec.ts # Streaming features
    └── subscription.spec.ts # Subscription flows
```

## Documentation

### Code Documentation

- Use JSDoc comments for functions and classes
- Include examples in documentation
- Document complex algorithms or business logic
- Keep comments up to date with code changes

````typescript
/**
 * Validates user permissions for a specific action
 *
 * @param user - The user object with role and subscription info
 * @param resource - The resource being accessed (e.g., 'stream', 'video')
 * @param action - The action being performed (e.g., 'create', 'read', 'update')
 * @param conditions - Additional conditions for permission checking
 * @returns True if user has permission, false otherwise
 *
 * @example
 * ```typescript
 * const canEdit = hasPermission(user, 'stream', 'update', { ownerId: user.id })
 * ```
 */
export function hasPermission(
  user: StreamVaultUser,
  resource: PermissionResource,
  action: PermissionAction,
  conditions?: Record<string, any>
): boolean {
  // Implementation
}
````

### README Updates

When adding new features, update relevant documentation:

- Update feature list in README.md
- Add new environment variables to .env.example
- Update API documentation if adding new endpoints
- Add usage examples for new components

## Community

### Communication Channels

- **GitHub Discussions**: For general questions and community discussions
- **GitHub Issues**: For bug reports and feature requests
- **Email**: [dev@streamvault.app](mailto:dev@streamvault.app) for private matters

### Getting Help

- Check existing documentation first
- Search through GitHub issues
- Ask questions in GitHub Discussions
- Join our community chat (link coming soon)

### Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes for significant contributions
- Annual contributor highlights

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Release Schedule

- **Patch releases**: As needed for critical bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: Quarterly for significant changes

### Changelog

All changes are documented in [CHANGELOG.md](CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/) format.

## Questions?

If you have questions about contributing, please:

1. Check this guide and other documentation
2. Search existing GitHub issues and discussions
3. Create a new GitHub Discussion for general questions
4. Email [dev@streamvault.app](mailto:dev@streamvault.app) for specific concerns

Thank you for contributing to StreamVault! 🚀
