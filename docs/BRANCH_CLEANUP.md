# Repository Branch Cleanup Documentation

## Overview

This document outlines the process for cleaning up automated branches in the StreamVault repository while preserving core development branches. The cleanup removes temporary branches created by automated tools like GitHub Copilot and Dependabot.

## Current Branch Analysis

### Branches to KEEP ✅

These branches are essential for the development workflow and will be preserved:

- **`main`** - Production branch (protected)
- **`develop`** - Development integration branch (protected) 
- **`feature/core-data-models`** - Feature branch following naming convention
- **`feature/user-role-subscription-management`** - Feature branch following naming convention

### Branches to DELETE ❌

#### Copilot Fix Branches (7 branches)
These are temporary fix branches created by GitHub Copilot:

- `copilot/fix-06ef2563-ce2d-4b70-b01a-d533df188be3`
- `copilot/fix-8a03ff1c-4a49-4d6f-8835-7457a87464cd`
- `copilot/fix-33` 
- `copilot/fix-355d6657-5491-43dd-863f-5bee4d8f800c`
- `copilot/fix-36970bec-efc1-4b94-abe8-09848689704f`
- `copilot/fix-70076d86-ceb9-485c-afec-cc3f1b556f51`
- `copilot/fix-a39421c3-9572-4e68-a767-3c131542228e`

#### Dependabot Branches (6 branches)
These are dependency update branches created by Dependabot:

- `dependabot/github_actions/github-actions-a331d3ec2d`
- `dependabot/npm_and_yarn/auth-9213ea3448`
- `dependabot/npm_and_yarn/devtools-2943226e2f`
- `dependabot/npm_and_yarn/lint-staged-16.1.5`
- `dependabot/npm_and_yarn/lucide-react-0.541.0`
- `dependabot/npm_and_yarn/react-2781313775`

#### Other Automated Branches (1 branch)
- `merge/copilot-integration` - Likely an old merge branch

**Total branches to delete: 14**

## Cleanup Methods

### Method 1: Automated Script (Recommended)

Use the provided cleanup script for safe, automated branch deletion:

```bash
# Navigate to repository root
cd /path/to/streamvault

# Run in dry-run mode first to see what would be deleted
./scripts/cleanup-branches.sh --dry-run

# Review the output, then run the actual cleanup
./scripts/cleanup-branches.sh --force
```

#### Script Features

- **Safety checks**: Prevents deletion of protected branches
- **Dry-run mode**: Preview changes before execution
- **Automatic switching**: Moves off branches before deletion
- **Comprehensive logging**: Detailed output for each operation
- **Error handling**: Graceful failure handling
- **Remote sync**: Fetches latest remote state before cleanup

### Method 2: Manual Cleanup

If you prefer manual control, follow these steps:

#### Prerequisites
```bash
# Ensure you're on a safe branch
git checkout main
git pull origin main

# Fetch all remote branches
git fetch --all --prune
```

#### Delete Remote Branches
```bash
# Copilot branches
git push origin --delete copilot/fix-06ef2563-ce2d-4b70-b01a-d533df188be3
git push origin --delete copilot/fix-8a03ff1c-4a49-4d6f-8835-7457a87464cd
git push origin --delete copilot/fix-33
git push origin --delete copilot/fix-355d6657-5491-43dd-863f-5bee4d8f800c
git push origin --delete copilot/fix-36970bec-efc1-4b94-abe8-09848689704f
git push origin --delete copilot/fix-70076d86-ceb9-485c-afec-cc3f1b556f51
git push origin --delete copilot/fix-a39421c3-9572-4e68-a767-3c131542228e

# Dependabot branches
git push origin --delete dependabot/github_actions/github-actions-a331d3ec2d
git push origin --delete dependabot/npm_and_yarn/auth-9213ea3448
git push origin --delete dependabot/npm_and_yarn/devtools-2943226e2f
git push origin --delete dependabot/npm_and_yarn/lint-staged-16.1.5
git push origin --delete dependabot/npm_and_yarn/lucide-react-0.541.0
git push origin --delete dependabot/npm_and_yarn/react-2781313775

# Other automated branches
git push origin --delete merge/copilot-integration
```

#### Delete Local Branches (if they exist)
```bash
# Force delete local copies (use -D for force delete since these may have unmerged changes)
git branch -D copilot/fix-06ef2563-ce2d-4b70-b01a-d533df188be3 2>/dev/null || true
git branch -D copilot/fix-8a03ff1c-4a49-4d6f-8835-7457a87464cd 2>/dev/null || true
git branch -D copilot/fix-33 2>/dev/null || true
git branch -D copilot/fix-355d6657-5491-43dd-863f-5bee4d8f800c 2>/dev/null || true
git branch -D copilot/fix-36970bec-efc1-4b94-abe8-09848689704f 2>/dev/null || true
git branch -D copilot/fix-70076d86-ceb9-485c-afec-cc3f1b556f51 2>/dev/null || true
git branch -D copilot/fix-a39421c3-9572-4e68-a767-3c131542228e 2>/dev/null || true

# Dependabot branches
git branch -D dependabot/github_actions/github-actions-a331d3ec2d 2>/dev/null || true
git branch -D dependabot/npm_and_yarn/auth-9213ea3448 2>/dev/null || true
git branch -D dependabot/npm_and_yarn/devtools-2943226e2f 2>/dev/null || true
git branch -D dependabot/npm_and_yarn/lint-staged-16.1.5 2>/dev/null || true
git branch -D dependabot/npm_and_yarn/lucide-react-0.541.0 2>/dev/null || true
git branch -D dependabot/npm_and_yarn/react-2781313775 2>/dev/null || true

# Other branches
git branch -D merge/copilot-integration 2>/dev/null || true
```

## Verification

After cleanup, verify the results:

```bash
# List all remote branches
git branch -r

# Should only show:
# origin/main
# origin/develop 
# origin/feature/core-data-models
# origin/feature/user-role-subscription-management

# List local branches
git branch

# Clean up any remaining remote tracking references
git remote prune origin
```

## Safety Considerations

### Protected Branches
The following branches have branch protection rules and cannot be accidentally deleted:
- `main` 
- `develop`

### Pre-cleanup Checklist
- [ ] Verify no important work exists in automated branches
- [ ] Confirm all necessary changes have been merged to main/develop
- [ ] Take note of any custom commits in automated branches
- [ ] Ensure you have proper repository permissions
- [ ] Run cleanup script in dry-run mode first

### Recovery Options
If a branch is accidentally deleted:

1. **Check GitHub's branch restore feature** (available for 30 days)
2. **Restore from commit SHA** if you have the commit hash:
   ```bash
   git checkout -b branch-name <commit-sha>
   git push origin branch-name
   ```

## Post-Cleanup Actions

### Update Branch Protection Rules
Consider updating branch protection rules to prevent future accumulation of automated branches:

1. Configure Dependabot to create PRs instead of branches
2. Set up automatic deletion of merged branches
3. Add branch naming conventions to repository guidelines

### Documentation Updates
Update the following documents if needed:
- `CONTRIBUTING.md` - Branch naming conventions
- `README.md` - Development workflow
- `.github/PULL_REQUEST_TEMPLATE.md` - Branch cleanup reminders

## Monitoring

Set up monitoring to prevent future branch accumulation:

### GitHub Actions Workflow
Create a workflow to automatically clean up stale branches:

```yaml
name: Cleanup Stale Branches
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Delete merged branches
        run: |
          # Add automated cleanup logic here
```

### Regular Audits
Schedule monthly audits to review branch structure:
- Count of branches per type
- Age of unmerged branches  
- Identification of stale automated branches

## Troubleshooting

### Common Issues

**Permission Denied**
```bash
# Ensure you have proper permissions
git remote -v
# Verify you're using the correct remote URL and have push access
```

**Branch Not Found**
```bash
# Branch may have already been deleted
git fetch --all --prune
git branch -r | grep branch-name
```

**Cannot Delete Current Branch**
```bash
# Switch to a different branch first
git checkout main
# Then delete the target branch
```

**Force Push Required**
```bash
# Some automated branches may require force deletion
git branch -D branch-name
git push origin --delete branch-name --force
```

## Contact

For questions about this cleanup process:
- Review this documentation
- Check the cleanup script logs
- Consult the repository maintainers
- Create an issue in the repository

---

**Last Updated**: $(date)
**Script Location**: `scripts/cleanup-branches.sh`
**Related Issue**: #33