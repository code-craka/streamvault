# Automatic Code Review Setup Guide

This guide explains how to enable GitHub Copilot's automatic code review feature for the StreamVault repository.

## 🎯 Overview

GitHub Copilot automatic code review provides:
- Automated pull request reviews
- Security vulnerability detection and fixes
- Code quality suggestions
- Performance optimizations
- Best practices enforcement

## ⚙️ Repository Configuration

### 1. Enable GitHub Copilot
1. Go to repository Settings → General → Features
2. Enable "GitHub Copilot" if not already enabled
3. Ensure your organization has a Copilot subscription

### 2. Configure Repository Rules
1. Navigate to Settings → Rules → Rulesets
2. Create a new ruleset or import `.github/rulesets/main-branch-protection.json`
3. Apply the ruleset to `main` and `staging` branches

### 3. Set Up Branch Protection
1. Go to Settings → Branches
2. Add branch protection rule for `main`:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Required status checks: `test`, `security`, `build`
   - Require branches to be up to date before merging
   - Require linear history

### 4. Configure Copilot Settings
1. Go to Settings → Code security and analysis
2. Enable "Copilot autofix" for:
   - Security vulnerabilities
   - Code quality issues
   - Dependency vulnerabilities

### 5. Enable Security Features
1. Navigate to Settings → Security → Code scanning
2. Enable CodeQL analysis
3. Set up secret scanning alerts
4. Configure dependency scanning

## 🔧 Workflow Configuration

The following workflows are automatically configured:

### CI Pipeline (`ci.yml`)
- Runs on every push and pull request
- Executes linting, testing, and building
- Required for merge approval

### Copilot Autofix (`copilot-autofix.yml`)
- Runs automatically for security fixes
- Creates PRs for vulnerability patches
- Provides automated code reviews

### Dependabot (`dependabot.yml`)
- Weekly dependency updates
- Automatic security updates
- Grouped updates for related packages

## 🚀 Usage

### For Developers
1. Create feature branches as usual
2. Push changes and create pull requests
3. Copilot will automatically review your PR
4. Address any suggestions before requesting human review
5. All CI checks must pass before merging

### For Reviewers
1. Check Copilot's automated review comments
2. Verify that suggestions have been addressed
3. Focus human review on business logic and architecture
4. Approve when all checks pass

## 📋 Pull Request Checklist

Use the provided PR template which includes:
- Automatic review status verification
- Security checklist
- Testing requirements
- Documentation updates

## 🔍 Monitoring

### View Automated Reviews
- Check the "Files changed" tab in any PR
- Look for Copilot review comments
- Monitor the Actions tab for workflow results

### Security Alerts
- Go to Security → Code scanning alerts
- Review dependency alerts
- Check secret scanning results

## 🛠️ Troubleshooting

### Common Issues

**Copilot not reviewing PRs:**
- Verify Copilot is enabled for the repository
- Check that the user has Copilot access
- Ensure workflows have proper permissions

**Status checks failing:**
- Review Actions logs for detailed errors
- Check that all required dependencies are installed
- Verify environment variables are properly set

**Autofix not working:**
- Confirm autofix is enabled in repository settings
- Check that the workflow has write permissions
- Verify the target branch allows automated commits

## 📞 Support

For issues with the automatic code review setup:
1. Check the GitHub Actions logs
2. Review the repository settings
3. Contact the repository administrators
4. Refer to GitHub's Copilot documentation

## 🔗 References

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Repository Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)