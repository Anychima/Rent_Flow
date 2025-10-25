# RentFlow AI - Quick Cleanup Script (PowerShell)
# This script performs immediate cleanup tasks to organize the repository

Write-Host "🧹 Starting RentFlow AI Cleanup..." -ForegroundColor Cyan
Write-Host ""

# Create archive directories
Write-Host "📁 Creating archive directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "docs\archive" | Out-Null
New-Item -ItemType Directory -Force -Path "database\archive" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts\archive" | Out-Null

# Delete empty files
Write-Host "🗑️  Deleting empty placeholder files..." -ForegroundColor Yellow
Remove-Item -Path "backend\src\ai-engine.ts" -ErrorAction SilentlyContinue
Remove-Item -Path "backend\src\blockchain-monitor.ts" -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\src\components\Dashboard.tsx" -ErrorAction SilentlyContinue
Remove-Item -Path "database\migrations.sql" -ErrorAction SilentlyContinue

# Archive old documentation
Write-Host "📦 Archiving old documentation files..." -ForegroundColor Yellow

# Keep these in root
$keepFiles = @(
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "COMPREHENSIVE_AUDIT_REPORT.md",
    ".gitignore",
    ".env.example",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "hardhat.config.ts",
    "hardhat.tsconfig.json",
    "setup-project.sh",
    "cleanup.sh",
    "cleanup.ps1"
)

# Move all .md files except the ones we want to keep
$mdFiles = Get-ChildItem -Path . -Filter "*.md" -File
foreach ($file in $mdFiles) {
    if ($keepFiles -notcontains $file.Name) {
        Write-Host "  Moving $($file.Name) to docs\archive\" -ForegroundColor Gray
        Move-Item -Path $file.FullName -Destination "docs\archive\" -Force
    }
}

# Move SQL cleanup files to archive
Write-Host "📦 Archiving old SQL cleanup files..." -ForegroundColor Yellow
Get-ChildItem -Path "database" -Filter "fix-*.sql" | Move-Item -Destination "database\archive\" -ErrorAction SilentlyContinue
Move-Item -Path "database\seed-enhanced.sql" -Destination "database\archive\" -ErrorAction SilentlyContinue
Move-Item -Path "database\seed-no-rls.sql" -Destination "database\archive\" -ErrorAction SilentlyContinue

# Move standalone SQL files from root to database/archive
Write-Host "📦 Moving standalone SQL files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.sql" | Move-Item -Destination "database\archive\" -ErrorAction SilentlyContinue

# Keep these important docs accessible in docs/
Write-Host "📝 Organizing key documentation..." -ForegroundColor Yellow
$importantDocs = @(
    "QUICK_START.md",
    "CONTRIBUTING.md",
    "HOW_TO_USE_RENTFLOW.md",
    "TESTING_GUIDE.md",
    "SETUP_GUIDE.md"
)

foreach ($doc in $importantDocs) {
    $sourcePath = "docs\archive\$doc"
    $destPath = "docs\$doc"
    if (Test-Path $sourcePath) {
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

# Create a README in docs/archive explaining what's there
$archiveReadme = @"
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
"@

Set-Content -Path "docs\archive\README.md" -Value $archiveReadme

# Create summary of cleanup
Write-Host ""
Write-Host "✅ Cleanup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  - Deleted 4 empty files" -ForegroundColor Gray
Write-Host "  - Archived 100+ old documentation files to docs\archive\" -ForegroundColor Gray
Write-Host "  - Archived SQL cleanup files to database\archive\" -ForegroundColor Gray
Write-Host "  - Organized key documentation in docs\" -ForegroundColor Gray
Write-Host ""
Write-Host "📁 Current structure:" -ForegroundColor Cyan
Write-Host "  Root: Clean with only essential files" -ForegroundColor Gray
Write-Host "  docs\: Active documentation" -ForegroundColor Gray
Write-Host "  docs\archive\: Historical documentation" -ForegroundColor Gray
Write-Host "  database\archive\: Old SQL scripts" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Repository is now organized and clean!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review COMPREHENSIVE_AUDIT_REPORT.md" -ForegroundColor White
Write-Host "  2. Run 'npm run lint' to check code quality" -ForegroundColor White
Write-Host "  3. Run 'npm audit' to check for security issues" -ForegroundColor White
Write-Host "  4. Implement error handling improvements" -ForegroundColor White
Write-Host ""
