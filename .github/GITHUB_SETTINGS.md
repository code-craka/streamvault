# GitHub Repository Settings Configuration

This document provides step-by-step instructions for enabling automatic code review features through the GitHub web interface.

## 🔧 Required GitHub Settings

### 1. Enable GitHub Copilot (Organization/Repository Level)

1. Go to **GitHub.com → Your Organization → Settings**
2. Navigate to **Code security and analysis**
3. Find **GitHub Copilot** section
4. Enable **Copilot autofix** for:
   - ✅ Security vulnerabilities
   - ✅ Code quality issues 
   - ✅ Dependency vulnerabilities

### 2. Configure Repository Rules

1. Go to **Repository → Settings → Rules → Rulesets**
2. Click **New ruleset**
3. Choose **Branch ruleset**
4. Use these settings:
   - **Name**: `Main Branch Protection`
   - **Enforcement status**: `Active`
   - **Target branches**: `main`, `staging`

#### Required Rules to Enable:
- ✅ **Restrict pushes that create files**
- ✅ **Restrict force pushes**
- ✅ **Require a pull request before merging**
  - Require approvals: `1`
  - Dismiss stale reviews when new commits are pushed: `Yes`
  - Require review from code owners: `No` (optional)
  - Require approval of the most recent reviewable push: `Yes`
- ✅ **Require status checks to pass**
  - Status checks: `test`, `security`, `build`
  - Require branches to be up to date before merging: `Yes`
- ✅ **Require linear history**
- ✅ **Block force pushes**

### 3. Enable Code Scanning

1. Go to **Repository → Security → Code scanning**
2. Set up **CodeQL analysis**:
   - Click **Set up CodeQL analysis**
   - Choose **Default setup** or **Advanced setup**
   - Languages: `JavaScript/TypeScript`
   - Query suite: `Default` + `Security-extended`

### 4. Configure Secret Scanning

1. Go to **Repository → Security → Secrets and variables → Secrets**
2. Enable **Secret scanning alerts**
3. Enable **Push protection** (prevents committing secrets)

### 5. Enable Dependency Management

1. Go to **Repository → Security → Dependabot**
2. Enable **Dependabot alerts**
3. Enable **Dependabot security updates**
4. Confirm **Dependabot version updates** (configured via `.github/dependabot.yml`)

### 6. Configure Branch Protection (Backup Method)

If rulesets are not available, use branch protection rules:

1. Go to **Repository → Settings → Branches**
2. Add rule for `main` branch:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require linear history
   - ✅ Include administrators

## 🤖 Verify Copilot Integration

### Test Automatic Reviews:
1. Create a test branch
2. Make a small code change
3. Open a pull request
4. Verify Copilot provides automated review comments

### Check Status Checks:
1. Confirm CI workflows run automatically
2. Verify all checks appear in PR status
3. Test that merging is blocked until checks pass

## 🔍 Monitoring and Maintenance

### Regular Checks:
- Review **Actions** tab for workflow runs
- Monitor **Security** tab for alerts
- Check **Insights → Dependency graph** for vulnerabilities
- Review Copilot suggestions and adoption

### Troubleshooting:
- If Copilot reviews don't appear: Check organization Copilot settings
- If status checks fail: Review Actions logs for errors
- If rulesets don't work: Fall back to branch protection rules

## 📞 Support Resources

- **GitHub Copilot**: [docs.github.com/copilot](https://docs.github.com/copilot)
- **Repository Rules**: [docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets)
- **Code Security**: [docs.github.com/code-security](https://docs.github.com/code-security)

---
*This configuration enables comprehensive automatic code review with GitHub Copilot for the StreamVault repository.*