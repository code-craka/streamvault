#!/bin/bash

# One-time manual branch cleanup commands
# This script provides the exact commands needed to manually delete all automated branches
# Use this if you prefer manual control over the automated script

echo "=== StreamVault Branch Cleanup Commands ==="
echo "Copy and paste these commands to manually clean up branches:"
echo ""

echo "# 1. Switch to safe branch and fetch latest"
echo "git checkout main"
echo "git pull origin main"
echo "git fetch --all --prune"
echo ""

echo "# 2. Delete Copilot fix branches"
echo "git push origin --delete copilot/fix-06ef2563-ce2d-4b70-b01a-d533df188be3"
echo "git push origin --delete copilot/fix-8a03ff1c-4a49-4d6f-8835-7457a87464cd"
echo "git push origin --delete copilot/fix-33"
echo "git push origin --delete copilot/fix-355d6657-5491-43dd-863f-5bee4d8f800c"
echo "git push origin --delete copilot/fix-36970bec-efc1-4b94-abe8-09848689704f"
echo "git push origin --delete copilot/fix-70076d86-ceb9-485c-afec-cc3f1b556f51"
echo "git push origin --delete copilot/fix-a39421c3-9572-4e68-a767-3c131542228e"
echo ""

echo "# 3. Delete Dependabot branches"
echo "git push origin --delete dependabot/github_actions/github-actions-a331d3ec2d"
echo "git push origin --delete dependabot/npm_and_yarn/auth-9213ea3448"
echo "git push origin --delete dependabot/npm_and_yarn/devtools-2943226e2f"
echo "git push origin --delete dependabot/npm_and_yarn/lint-staged-16.1.5"
echo "git push origin --delete dependabot/npm_and_yarn/lucide-react-0.541.0"
echo "git push origin --delete dependabot/npm_and_yarn/react-2781313775"
echo ""

echo "# 4. Delete other automated branches"
echo "git push origin --delete merge/copilot-integration"
echo ""

echo "# 5. Clean up local tracking references"
echo "git remote prune origin"
echo ""

echo "# 6. Verify cleanup (should only show main, develop, and feature branches)"
echo "git branch -r"
echo ""

echo "=== Total branches to delete: 14 ==="
echo "- 7 Copilot fix branches"
echo "- 6 Dependabot branches" 
echo "- 1 other automated branch"
echo ""
echo "Branches to KEEP: main, develop, feature/core-data-models, feature/user-role-subscription-management"