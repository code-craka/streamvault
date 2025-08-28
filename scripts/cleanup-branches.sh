#!/bin/bash

# StreamVault Repository Branch Cleanup Script
# This script removes automated branches while preserving core development branches
# 
# Usage: ./scripts/cleanup-branches.sh [--dry-run] [--force]
#   --dry-run: Show what would be deleted without actually deleting
#   --force: Skip confirmation prompts
#
# Author: GitHub Copilot
# Date: $(date)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [--force]"
            echo "  --dry-run: Show what would be deleted without actually deleting"
            echo "  --force: Skip confirmation prompts"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Branches to keep (protected branches and important feature branches)
BRANCHES_TO_KEEP=(
    "main"
    "develop"
    "feature/core-data-models"
    "feature/user-role-subscription-management"
)

# Automated branches to delete
COPILOT_BRANCHES=(
    "copilot/fix-06ef2563-ce2d-4b70-b01a-d533df188be3"
    "copilot/fix-8a03ff1c-4a49-4d6f-8835-7457a87464cd"
    "copilot/fix-33"
    "copilot/fix-355d6657-5491-43dd-863f-5bee4d8f800c"
    "copilot/fix-36970bec-efc1-4b94-abe8-09848689704f"
    "copilot/fix-70076d86-ceb9-485c-afec-cc3f1b556f51"
    "copilot/fix-a39421c3-9572-4e68-a767-3c131542228e"
)

DEPENDABOT_BRANCHES=(
    "dependabot/github_actions/github-actions-a331d3ec2d"
    "dependabot/npm_and_yarn/auth-9213ea3448"
    "dependabot/npm_and_yarn/devtools-2943226e2f"
    "dependabot/npm_and_yarn/lint-staged-16.1.5"
    "dependabot/npm_and_yarn/lucide-react-0.541.0"
    "dependabot/npm_and_yarn/react-2781313775"
)

OTHER_AUTOMATED_BRANCHES=(
    "merge/copilot-integration"
)

# Combine all branches to delete
ALL_BRANCHES_TO_DELETE=("${COPILOT_BRANCHES[@]}" "${DEPENDABOT_BRANCHES[@]}" "${OTHER_AUTOMATED_BRANCHES[@]}")

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a branch exists locally
branch_exists_local() {
    git branch --list "$1" | grep -q "$1"
}

# Function to check if a branch exists on remote
branch_exists_remote() {
    git ls-remote --heads origin "$1" | grep -q "$1"
}

# Function to check if branch is protected
is_protected_branch() {
    local branch=$1
    for protected in "${BRANCHES_TO_KEEP[@]}"; do
        if [[ "$branch" == "$protected" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to safely delete a branch
delete_branch() {
    local branch=$1
    local branch_type=$2
    
    print_status $BLUE "Processing ${branch_type}: ${branch}"
    
    # Check if branch is protected
    if is_protected_branch "$branch"; then
        print_status $RED "ERROR: Branch '${branch}' is protected and will not be deleted!"
        return 1
    fi
    
    # Check if branch exists remotely
    if branch_exists_remote "$branch"; then
        if [[ "$DRY_RUN" == "true" ]]; then
            print_status $YELLOW "DRY RUN: Would delete remote branch: origin/${branch}"
        else
            print_status $GREEN "Deleting remote branch: origin/${branch}"
            if git push origin --delete "$branch"; then
                print_status $GREEN "✓ Successfully deleted remote branch: origin/${branch}"
            else
                print_status $RED "✗ Failed to delete remote branch: origin/${branch}"
                return 1
            fi
        fi
    else
        print_status $YELLOW "Remote branch origin/${branch} does not exist"
    fi
    
    # Check if branch exists locally
    if branch_exists_local "$branch"; then
        if [[ "$DRY_RUN" == "true" ]]; then
            print_status $YELLOW "DRY RUN: Would delete local branch: ${branch}"
        else
            print_status $GREEN "Deleting local branch: ${branch}"
            # Force delete to avoid issues with unmerged changes in automated branches
            if git branch -D "$branch"; then
                print_status $GREEN "✓ Successfully deleted local branch: ${branch}"
            else
                print_status $RED "✗ Failed to delete local branch: ${branch}"
                return 1
            fi
        fi
    else
        print_status $YELLOW "Local branch ${branch} does not exist"
    fi
    
    return 0
}

# Main cleanup function
cleanup_branches() {
    local category=$1
    shift
    local branches=("$@")
    
    print_status $BLUE "\n=== Cleaning up ${category} ==="
    
    for branch in "${branches[@]}"; do
        delete_branch "$branch" "$category"
        echo # Add spacing between branches
    done
}

# Pre-flight checks
preflight_checks() {
    print_status $BLUE "=== Pre-flight Checks ==="
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_status $RED "ERROR: Not in a git repository!"
        exit 1
    fi
    
    # Check if we have origin remote
    if ! git remote get-url origin > /dev/null 2>&1; then
        print_status $RED "ERROR: No 'origin' remote found!"
        exit 1
    fi
    
    # Fetch latest remote information
    print_status $BLUE "Fetching latest remote information..."
    git fetch --all --prune
    
    # Switch to main branch if we're on a branch that will be deleted
    current_branch=$(git branch --show-current)
    for branch_to_delete in "${ALL_BRANCHES_TO_DELETE[@]}"; do
        if [[ "$current_branch" == "$branch_to_delete" ]]; then
            print_status $YELLOW "Currently on branch '${current_branch}' which will be deleted."
            if [[ "$DRY_RUN" == "false" ]]; then
                print_status $BLUE "Switching to 'main' branch..."
                git checkout main
                git pull origin main
            else
                print_status $YELLOW "DRY RUN: Would switch to 'main' branch"
            fi
            break
        fi
    done
    
    print_status $GREEN "✓ Pre-flight checks completed"
}

# Summary function
show_summary() {
    local total_branches=${#ALL_BRANCHES_TO_DELETE[@]}
    local copilot_count=${#COPILOT_BRANCHES[@]}
    local dependabot_count=${#DEPENDABOT_BRANCHES[@]}
    local other_count=${#OTHER_AUTOMATED_BRANCHES[@]}
    
    print_status $BLUE "\n=== Cleanup Summary ==="
    print_status $BLUE "Total branches to process: ${total_branches}"
    print_status $BLUE "  - Copilot fix branches: ${copilot_count}"
    print_status $BLUE "  - Dependabot branches: ${dependabot_count}"
    print_status $BLUE "  - Other automated branches: ${other_count}"
    echo
    print_status $GREEN "Branches that will be KEPT:"
    for branch in "${BRANCHES_TO_KEEP[@]}"; do
        print_status $GREEN "  ✓ ${branch}"
    done
    echo
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status $YELLOW "DRY RUN MODE: No branches will actually be deleted"
    else
        print_status $RED "Branches that will be DELETED:"
        for branch in "${ALL_BRANCHES_TO_DELETE[@]}"; do
            print_status $RED "  ✗ ${branch}"
        done
    fi
}

# Confirmation function
confirm_deletion() {
    if [[ "$FORCE" == "true" || "$DRY_RUN" == "true" ]]; then
        return 0
    fi
    
    echo
    print_status $YELLOW "WARNING: This will permanently delete ${#ALL_BRANCHES_TO_DELETE[@]} branches!"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        print_status $YELLOW "Cleanup cancelled by user"
        exit 0
    fi
}

# Main execution
main() {
    print_status $BLUE "StreamVault Repository Branch Cleanup"
    print_status $BLUE "======================================"
    
    # Run pre-flight checks
    preflight_checks
    
    # Show summary
    show_summary
    
    # Confirm deletion
    confirm_deletion
    
    # Perform cleanup
    cleanup_branches "Copilot Fix Branches" "${COPILOT_BRANCHES[@]}"
    cleanup_branches "Dependabot Branches" "${DEPENDABOT_BRANCHES[@]}"
    cleanup_branches "Other Automated Branches" "${OTHER_AUTOMATED_BRANCHES[@]}"
    
    # Final summary
    print_status $GREEN "\n=== Cleanup Complete ==="
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status $YELLOW "DRY RUN: No actual changes were made"
        print_status $BLUE "To perform the actual cleanup, run: $0 --force"
    else
        print_status $GREEN "All automated branches have been successfully cleaned up!"
        print_status $BLUE "Remaining branches:"
        git branch -r | grep -E "(main|develop|feature/)" | sort
    fi
}

# Run main function
main "$@"