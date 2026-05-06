#!/bin/bash
# Deployment script: Build, cleanup old versions, and deploy to Vercel
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Step 1: Build with content hashes
echo ""
echo "Step 1: Building assets..."
./build.sh

# Step 2: Clean up old versioned files (keep only current version)
echo ""
echo "Step 2: Cleaning up old versions..."

# Get the current hashes from manifest
CSS_HASH=$(jq -r '.assets.css' deploy-manifest.json | sed 's/.*\.\([a-f0-9]*\)\.css/\1/')
JS_HASH=$(jq -r '.assets.js' deploy-manifest.json | sed 's/.*\.\([a-f0-9]*\)\.js/\1/')
FALLBACK_HASH=$(jq -r '.assets.fallback' deploy-manifest.json | sed 's/.*\.\([a-f0-9]*\)\.js/\1/')

# Remove old versioned files (but keep the ones we just built)
find . -maxdepth 1 -name 'debrief-viewer.[a-f0-9]*.js' ! -name "debrief-viewer.$JS_HASH.js" -delete 2>/dev/null || true
find . -maxdepth 1 -name 'debrief-viewer.[a-f0-9]*.css' ! -name "debrief-viewer.$CSS_HASH.css" -delete 2>/dev/null || true
find . -maxdepth 1 -name 'login-fallback.[a-f0-9]*.js' ! -name "login-fallback.$FALLBACK_HASH.js" -delete 2>/dev/null || true

echo "  ✅ Old versions cleaned up"

# Step 3: Deploy to Vercel
echo ""
echo "Step 3: Deploying to Vercel..."
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo "📦 Deployed version:"
echo "   CSS:      debrief-viewer.$CSS_HASH.css"
echo "   JS:       debrief-viewer.$JS_HASH.js"
echo "   Fallback: login-fallback.$FALLBACK_HASH.js"
