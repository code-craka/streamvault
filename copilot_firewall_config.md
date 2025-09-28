# GitHub Copilot Firewall Configuration for StreamVault

This document provides configuration guidance for the GitHub Copilot coding agent firewall to ensure StreamVault's development workflow runs smoothly while maintaining security.

## Overview

GitHub Copilot coding agent uses an outbound firewall by default to reduce data exfiltration risk. The firewall blocks network requests to external services unless explicitly allowed through an allowlist.

## Configuration Location

Configure the firewall in your GitHub repository:
- **Path**: Repository Settings → Code & automation → Copilot → coding agent
- **Access**: Repository admin permissions required

## Recommended Settings for StreamVault

### Basic Configuration
- **Enable firewall**: ✅ ON (recommended for security)
- **Recommended allowlist**: ✅ ON (includes common developer tools)  
- **Custom allowlist**: Add StreamVault-specific services only

### StreamVault Custom Allowlist

#### Authentication Services
- **Clerk Authentication**:
  - Domain: `clerk.com`
  - Domain: `*.clerk.accounts.dev`
  - Domain: `*.clerk.dev`

#### Video Streaming & CDN
- **Cloudflare Stream API** (prefer narrow URLs):
  - URL: `https://api.cloudflare.com/client/v4/accounts/<YOUR_ACCOUNT_ID>/stream/`
  - Alternative broader: Domain: `api.cloudflare.com`
- **Video Playback CDN**:
  - Domain: `videodelivery.net`
  - Domain: `*.cloudflare.com` (for additional CDN endpoints)

#### Payment Processing  
- **Stripe API** (use test keys in CI/CD):
  - Domain: `api.stripe.com`
  - Domain: `checkout.stripe.com`
  - Domain: `js.stripe.com`

#### Database & Storage
- **Google Firebase/Firestore**:
  - Domain: `firestore.googleapis.com`
  - Domain: `firebase.googleapis.com`
  - Domain: `storage.googleapis.com`
- **Google Cloud APIs**:
  - Domain: `*.googleapis.com` (broader, use with caution)

#### Development & Monitoring
- **Package Registries**:
  - Domain: `registry.npmjs.org` (for pnpm/npm)
  - Domain: `cdn.jsdelivr.net` (CDN for packages)
  - Domain: `unpkg.com` (alternative CDN)
- **Fonts & Assets**:
  - Domain: `fonts.googleapis.com`
  - Domain: `fonts.gstatic.com`

#### Optional Services (add as needed)
- **AI Services** (if using):
  - Domain: `api.openai.com`
  - Domain: `generativelanguage.googleapis.com` (Google AI)
- **Analytics** (if implementing):
  - Domain: `www.googletagmanager.com`
  - Domain: `analytics.google.com`

## Firewall Behavior

### When Requests are Blocked
- Copilot will add a warning comment to PRs indicating:
  - The blocked domain/URL
  - The specific command that attempted the request
  - Suggested allowlist additions

### Monitoring and Refinement  
1. **Monitor PR comments** for blocked request warnings
2. **Evaluate necessity** of each blocked service
3. **Add minimal allowlist entries** for legitimate services
4. **Avoid overly broad domains** when possible

## Security Best Practices

### Allowlist Management
- ✅ **Use specific URLs** over broad domains when possible
- ✅ **Regular review** of allowlist entries
- ✅ **Remove unused entries** during maintenance
- ❌ **Avoid wildcards** unless absolutely necessary

### Environment Considerations
- **Development**: More permissive for productivity
- **CI/CD**: Minimal allowlist for build/test requirements  
- **Production**: Not applicable (firewall affects Copilot only)

### API Key Security
- ✅ **Use test/sandbox keys** in CI/CD environments
- ✅ **Rotate keys regularly** according to service recommendations
- ❌ **Never commit real API keys** to version control

## Troubleshooting Common Issues

### Build Failures Due to Blocked Requests
**Symptoms**: CI/CD workflows fail with network errors
**Solution**: Check Copilot comments for blocked domains, add to allowlist

### Package Installation Issues  
**Symptoms**: `pnpm install` or similar commands fail
**Solution**: Ensure `registry.npmjs.org` is in allowlist

### Firebase/Database Connection Issues
**Symptoms**: Database operations fail during Copilot analysis
**Solution**: Add Firebase/Google Cloud domains to allowlist

### Stripe Webhook Testing Issues
**Symptoms**: Payment integration tests fail
**Solution**: Add Stripe domains and ensure test keys are used

## Alternative: Disabling the Firewall

**⚠️ Not Recommended for StreamVault**

To disable the firewall entirely:
- Toggle "Enable firewall" to OFF in repository settings
- This allows unrestricted network access but increases security risks
- Consider this only for private repositories with trusted contributors

## Advanced Configuration

### Larger Runners
- **Default**: GitHub-hosted Ubuntu runners supported
- **Larger runners**: Provision in Settings → Actions → Runners → Larger runners
- **Configuration**: Update `runs-on` label in `.github/workflows/copilot-setup-steps.yml`

### Git LFS Support
- **Enabled by default** in our setup workflow
- **Configuration**: `lfs: true` in checkout action
- **Purpose**: Ensures large files are available to Copilot

### Webhook Configuration  
When Copilot firewall blocks requests, consider configuring webhooks for:
- Real-time allowlist updates
- Automated PR comment responses
- Integration with monitoring tools

## Monitoring and Maintenance

### Regular Review Schedule
- **Weekly**: Check for new blocked request warnings
- **Monthly**: Review and cleanup allowlist entries  
- **Quarterly**: Audit security and update documentation

### Metrics to Track
- Number of blocked requests per week
- Build failure rate due to network issues
- Developer productivity impact
- Security incident prevention

### Documentation Updates
Keep this document current with:
- New service integrations
- Changed API endpoints  
- Updated security requirements
- Lessons learned from blocked requests

---

## Support

For firewall configuration issues:

1. **Check GitHub Actions logs** for specific error messages
2. **Review Copilot PR comments** for blocked request details  
3. **Contact repository maintainers** for allowlist updates
4. **Reference GitHub Copilot documentation** for advanced configuration

---

**Last updated**: Always review and update when adding new external service integrations to StreamVault.