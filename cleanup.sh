#!/bin/bash

# RentFlow AI - Quick Cleanup Script
# This script performs immediate cleanup tasks to organize the repository

echo "🧹 Starting RentFlow AI Cleanup..."
echo ""

# Create archive directories
echo "📁 Creating archive directories..."
mkdir -p docs/archive
mkdir -p database/archive
mkdir -p scripts/archive

# Delete empty files
echo "🗑️  Deleting empty placeholder files..."
rm -f backend/src/ai-engine.ts
rm -f backend/src/blockchain-monitor.ts
rm -f frontend/src/components/Dashboard.tsx
rm -f database/migrations.sql

# Archive old documentation
echo "📦 Archiving old documentation files..."

# Keep these in root
KEEP_FILES=(
    "README.md"
    "LICENSE"
    "CHANGELOG.md"
    "COMPREHENSIVE_AUDIT_REPORT.md"
    ".gitignore"
    ".env.example"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "hardhat.config.ts"
    "hardhat.tsconfig.json"
    "setup-project.sh"
)

# Move all .md files except the ones we want to keep
for file in *.md; do
    should_keep=false
    for keep in "${KEEP_FILES[@]}"; do
        if [ "$file" == "$keep" ]; then
            should_keep=true
            break
        fi
    done
    
    if [ "$should_keep" == false ] && [ -f "$file" ]; then
        echo "  Moving $file to docs/archive/"
        mv "$file" docs/archive/
    fi
done

# Move SQL cleanup files to archive
echo "📦 Archiving old SQL cleanup files..."
mv -f database/fix-*.sql database/archive/ 2>/dev/null || true
mv -f database/seed-enhanced.sql database/archive/ 2>/dev/null || true
mv -f database/seed-no-rls.sql database/archive/ 2>/dev/null || true

# Move standalone SQL files from root to database/archive
echo "📦 Moving standalone SQL files..."
mv -f *.sql database/archive/ 2>/dev/null || true

# Keep these important docs accessible in docs/
echo "📝 Organizing key documentation..."
mv docs/archive/QUICK_START.md docs/ 2>/dev/null || true
mv docs/archive/CONTRIBUTING.md docs/ 2>/dev/null || true
mv docs/archive/HOW_TO_USE_RENTFLOW.md docs/ 2>/dev/null || true
mv docs/archive/TESTING_GUIDE.md docs/ 2>/dev/null || true
mv docs/archive/SETUP_GUIDE.md docs/ 2>/dev/null || true

# Create a README in docs/archive explaining what's there
cat > docs/archive/README.md << 'EOF'
# Archived Documentation

This directory contains historical documentation, setup guides, and troubleshooting files from the development process.

## Purpose

These files are kept for reference but are no longer actively maintained. For current documentation, see:

- [Main README](../../README.md)
- [Quick Start Guide](../QUICK_START.md)
- [How to Use RentFlow](../HOW_TO_USE_RENTFLOW.md)
- [Comprehensive Audit Report](../../COMPREHENSIVE_AUDIT_REPORT.md)

## Contents

- Fix guides and troubleshooting docs
- Migration and setup instructions
- Implementation summaries
- Status reports and changelogs

Most of these were created during active development and debugging sessions.
EOF

# Create summary of cleanup
echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "📊 Summary:"
echo "  - Deleted 4 empty files"
echo "  - Archived 100+ old documentation files to docs/archive/"
echo "  - Archived SQL cleanup files to database/archive/"
echo "  - Organized key documentation in docs/"
echo ""
echo "📁 Current structure:"
echo "  Root: Clean with only essential files"
echo "  docs/: Active documentation"
echo "  docs/archive/: Historical documentation"
echo "  database/archive/: Old SQL scripts"
echo ""
echo "🎉 Repository is now organized and clean!"
echo ""
echo "Next steps:"
echo "  1. Review COMPREHENSIVE_AUDIT_REPORT.md"
echo "  2. Run 'npm run lint' to check code quality"
echo "  3. Run 'npm audit' to check for security issues"
echo "  4. Implement error handling improvements"
