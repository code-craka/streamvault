# GitHub Repository Administration Guide

This guide provides step-by-step instructions for repository administrators to configure GitHub settings, security features, and Copilot integration for the StreamVault project.

## 🔧 Initial Repository Setup

### Prerequisites

- Repository admin access
- GitHub organization admin privileges
- GitHub Copilot organization subscription

### Required Permissions

Ensure the following permissions are enabled:

- Repository administration
- GitHub Actions access
- Security feature management
- Branch protection rule management
- Copilot organization settings

---

## 🤖 GitHub Copilot Organization Settings

### Step 1: Enable Copilot for Organization

1. **Navigate to Organization Settings**

   ```
   https://github.com/organizations/[org-name]/settings/copilot
   ```

2. **Enable Copilot Features**
   - ✅ Enable GitHub Copilot
   - ✅ Enable Copilot Chat
   - ✅ Enable Copilot Pull Request Summaries
   - ✅ Enable Copilot Code Review
   - ✅ Allow auto-completion suggestions

3. **Configure User Access**

   ```
   User permissions: Selected teams and users
   ✅ Add all developers to Copilot access
   ✅ Enable for external collaborators (if needed)
   ```

4. **Set Content Exclusions**
   ```
   Repositories to exclude: (none for StreamVault)
   File patterns to exclude:
   - *.env*
   - *.key
   - *.pem
   - secrets/*
   ```

### Step 2: Repository-Specific Copilot Settings

1. **Navigate to Repository Settings**

   ```
   https://github.com/code-craka/streamvault/settings
   ```

2. **Enable Copilot Features**
   - Go to "Code security and analysis"
   - ✅ Enable "GitHub Copilot autofix"
   - ✅ Enable "Copilot code review"
   - ✅ Enable "Copilot chat in IDE"

3. **Configure Code Review Settings**
   ```
   Auto-review: Enabled
   Comment threshold: Medium
   Auto-fix capability: Enabled
   Security scanning: Enabled
   ```

---

## 🔒 Security Feature Configuration

### Step 1: Code Scanning (CodeQL)

1. **Navigate to Security Tab**

   ```
   https://github.com/code-craka/streamvault/security
   ```

2. **Enable CodeQL Analysis**

   ```
   ✅ Code scanning alerts
   ✅ CodeQL analysis
   Query suite: security-extended
   Languages: JavaScript/TypeScript
   Frequency: On push and PR
   ```

3. **Configure Advanced Settings**
   ```yaml
   # In .github/workflows/ci.yml (already configured)
   - name: 'Initialize CodeQL'
     uses: github/codeql-action/init@v3
     with:
       languages: 'javascript'
       queries: security-extended,security-and-quality
   ```

### Step 2: Secret Scanning

1. **Enable Secret Scanning**

   ```
   Settings → Code security and analysis
   ✅ Secret scanning
   ✅ Push protection
   ✅ Validity checks
   ```

2. **Configure Custom Patterns**

   ```regex
   # Add custom secret patterns for StreamVault
   Stripe keys: sk_live_[a-zA-Z0-9]{24}
   Clerk keys: clerk_[a-zA-Z0-9]{32}
   Firebase keys: AIza[a-zA-Z0-9]{35}
   JWT secrets: [a-zA-Z0-9]{32,}
   ```

3. **Set Up Notifications**
   ```
   ✅ Email notifications for secret detection
   ✅ Web notifications
   ✅ Slack integration (if configured)
   ```

### Step 3: Dependency Scanning

1. **Enable Dependabot**

   ```
   Settings → Code security and analysis
   ✅ Dependency graph
   ✅ Dependabot alerts
   ✅ Dependabot security updates
   ```

2. **Configure Dependabot (already done via dependabot.yml)**

   ```yaml
   # Verify configuration in .github/dependabot.yml
   # Groups related packages
   # Weekly security updates
   # Auto-merge for patches
   ```

3. **Set Alert Preferences**
   ```
   Severity: High and Critical
   ✅ Auto-dismiss low severity
   ✅ Email notifications
   ✅ Web notifications
   ```

---

## 🛡️ Branch Protection Configuration

### Step 1: Import Ruleset

1. **Navigate to Repository Rules**

   ```
   Settings → Rules → Rulesets
   ```

2. **Import Main Branch Protection**

   ```
   Click "Import a ruleset"
   Upload: .github/rulesets/main-branch-protection.json
   ✅ Activate ruleset
   ```

3. **Verify Ruleset Settings**
   ```
   Target branches: main, staging
   ✅ Restrict deletions
   ✅ Restrict force pushes
   ✅ Require pull request reviews (2 approvers)
   ✅ Require status checks
   ✅ Require linear history
   ```

### Step 2: Required Status Checks

Ensure these checks are required before merge:

```
✅ Code Quality
✅ Unit Tests
✅ Build Validation
✅ Security Scanning
✅ AI Code Review
✅ E2E Tests (for main branch)
```

### Step 3: Review Requirements

Configure review requirements:

```
Required reviewers: 2
✅ Dismiss stale reviews
✅ Require code owner review
✅ Require review from CODEOWNERS
✅ Require conversation resolution
```

---

## ⚙️ GitHub Actions Configuration

### Step 1: Workflow Permissions

1. **Configure Action Permissions**

   ```
   Settings → Actions → General

   Actions permissions: Allow all actions and reusable workflows

   Workflow permissions:
   ✅ Read and write permissions
   ✅ Allow GitHub Actions to create and approve pull requests
   ```

2. **Set Environment Protection**

   ```
   Settings → Environments

   Environment: staging
   ✅ Required reviewers: @code-craka
   ✅ Wait timer: 0 minutes
   ✅ Environment secrets configured

   Environment: production
   ✅ Required reviewers: @code-craka
   ✅ Wait timer: 5 minutes
   ✅ Environment secrets configured
   ```

### Step 2: Secrets Management

Configure repository secrets:

```
Settings → Secrets and variables → Actions

Repository secrets:
- CLERK_SECRET_KEY
- STRIPE_SECRET_KEY
- FIREBASE_SERVICE_ACCOUNT
- GCP_PROJECT_ID
- CODECOV_TOKEN (optional)
- SENTRY_DSN (optional)

Environment secrets (staging):
- Same as above with staging values

Environment secrets (production):
- Same as above with production values
```

### Step 3: Variables Configuration

Set up repository variables:

```
Repository variables:
- NODE_VERSION: "20"
- PNPM_VERSION: "8"
- NEXT_PUBLIC_APP_URL: "https://streamvault.app"
- GCS_BUCKET_NAME: "streamvault-videos"
```

---

## 🔧 Advanced Configuration

### Step 1: Custom Allowlist Configuration

Update the Copilot allowlist in `.github/copilot.json`:

```json
{
  "allowlist": {
    "external_domains": [
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "api.stripe.com",
      "checkout.stripe.com",
      "clerk.com",
      "firebase.googleapis.com",
      "storage.googleapis.com",
      "cloudflare.com"
    ]
  }
}
```

### Step 2: Firewall Configuration

If using GitHub Enterprise, configure firewall settings:

```bash
# Add to firewall allowlist
fonts.googleapis.com:443
fonts.gstatic.com:443
api.stripe.com:443
checkout.stripe.com:443
*.clerk.accounts.dev:443
*.googleapis.com:443
*.cloudflare.com:443
```

### Step 3: Webhook Configuration

Set up webhooks for external integrations:

```
Settings → Webhooks

Webhook URL: https://your-webhook-endpoint.com
Content type: application/json
✅ Active

Events to trigger:
✅ Pull requests
✅ Push
✅ Issues
✅ Pull request reviews
✅ Status checks
```

---

## 📊 Monitoring and Analytics

### Step 1: Enable Insights

1. **Repository Insights**

   ```
   Navigate to Insights tab
   ✅ Enable traffic analytics
   ✅ Enable dependency insights
   ✅ Enable security overview
   ```

2. **Action Usage Monitoring**
   ```
   Settings → Billing and plans
   Monitor Actions usage
   Set spending limits if needed
   ```

### Step 2: Set Up Notifications

Configure team notifications:

```
Settings → Notifications

Email notifications:
✅ Security alerts
✅ Dependabot alerts
✅ Failed workflow runs
✅ Pull request reviews

Slack integration (if available):
✅ Deploy notifications
✅ Security alerts
✅ PR status updates
```

### Step 3: Performance Monitoring

Track repository performance:

```
Weekly review checklist:
- [ ] Security alert resolution time
- [ ] PR review turnaround time
- [ ] CI/CD pipeline success rate
- [ ] Dependency update frequency
- [ ] Code quality metrics
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Copilot Not Working

**Symptoms**: No AI comments or suggestions
**Solutions**:

```bash
# Check organization settings
1. Verify Copilot is enabled for organization
2. Confirm user has Copilot access
3. Check repository-level Copilot settings
4. Verify workflow permissions
```

#### 2. Branch Protection Bypass

**Symptoms**: Code merged without required checks
**Solutions**:

```bash
# Review protection settings
1. Check ruleset is active
2. Verify no admin bypass rules
3. Confirm status checks are required
4. Review CODEOWNERS file
```

#### 3. Security Alerts Not Firing

**Symptoms**: No security notifications
**Solutions**:

```bash
# Verify security settings
1. Check secret scanning is enabled
2. Confirm CodeQL analysis is running
3. Verify notification settings
4. Check webhook configuration
```

#### 4. Actions Permission Issues

**Symptoms**: Workflows failing with permission errors
**Solutions**:

```bash
# Fix permission settings
1. Grant read/write permissions to Actions
2. Allow Actions to create PRs
3. Configure environment protection
4. Check secret access
```

### Emergency Procedures

#### Security Incident Response

```bash
1. Disable push protection temporarily if needed
2. Revoke compromised tokens immediately
3. Force push protection on all branches
4. Review all recent commits for secrets
5. Notify team and rotate credentials
```

#### CI/CD Pipeline Issues

```bash
1. Check workflow status and logs
2. Verify all required secrets are present
3. Test workflows in feature branch first
4. Gradually enable checks after fixes
5. Monitor for false positives
```

---

## 📅 Maintenance Schedule

### Weekly Tasks

- [ ] Review security alerts and resolve within 48 hours
- [ ] Check Dependabot PRs and merge security updates
- [ ] Monitor CI/CD pipeline performance
- [ ] Review failed workflow runs

### Monthly Tasks

- [ ] Audit repository access and permissions
- [ ] Review and update branch protection rules
- [ ] Check Copilot usage and effectiveness
- [ ] Update documentation as needed

### Quarterly Tasks

- [ ] Review and update security policies
- [ ] Audit webhook configurations
- [ ] Assess and update dependencies
- [ ] Review team access and roles

---

## 📞 Support and Escalation

### Internal Support

- **Primary Contact**: @code-craka
- **Security Issues**: Immediate Slack notification
- **Infrastructure Issues**: Create GitHub issue with "infrastructure" label

### External Support

- **GitHub Support**: For platform-level issues
- **Copilot Support**: For AI functionality problems
- **Third-party Integrations**: Vendor-specific support channels

### Documentation Updates

This guide should be updated whenever:

- New security features are added
- Organization policies change
- GitHub introduces new Copilot features
- Security requirements evolve

---

**🛡️ This administration guide ensures StreamVault maintains the highest standards of security, code quality, and development efficiency through proper GitHub configuration and Copilot integration.**
