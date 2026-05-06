#!/bin/bash
# Build script: Minify assets and compute content hashes
# Usage: ./build.sh
# Minifies new Phase 4 CSS/JS sources, updates manifest
# Preserves source files (.20260430g) for git tracking

set -e

echo "🔨 Minifying and versioning assets..."

# Minify new JavaScript sources (esbuild)
echo "  Minifying JS files..."
npx esbuild debrief-touch-feedback.20260430g.js \
  --minify \
  --target=es2020 \
  --outfile=debrief-touch-feedback.minified.tmp

# Minify CSS (remove comments and extra whitespace)
echo "  Minifying CSS..."
sed -e 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' -e 's/  */ /g' -e 's/ *{ */{/g' -e 's/ *} */}/g' \
  debrief-viewer.20260430g.css > debrief-viewer.minified.tmp

# Compute content hashes from minified versions
echo "  Computing content hashes..."
HASH_CSS=$(echo -n "$(cat debrief-viewer.minified.tmp)" | md5sum | cut -c1-8)
HASH_TOUCH_FB=$(echo -n "$(cat debrief-touch-feedback.minified.tmp)" | md5sum | cut -c1-8)

echo "  CSS hash:         $HASH_CSS"
echo "  Touch FB hash:    $HASH_TOUCH_FB"

# Rename minified files with hashes (keep source files intact)
mv debrief-viewer.minified.tmp debrief-viewer.$HASH_CSS.css
mv debrief-touch-feedback.minified.tmp debrief-touch-feedback.$HASH_TOUCH_FB.js

echo "  ✅ Files renamed with hashes"

# Generate manifest file with timestamps (includes existing hashed assets)
cat > deploy-manifest.json <<EOF
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "assets": {
    "css": "debrief-viewer.$HASH_CSS.css",
    "js": "debrief-viewer.36c808a4.js",
    "touchFeedback": "debrief-touch-feedback.$HASH_TOUCH_FB.js",
    "fallback": "login-fallback.92d54de8.js"
  }
}
EOF

echo "  ✅ Created deploy-manifest.json"
echo "📦 Build complete: CSS=$HASH_CSS, Touch=$HASH_TOUCH_FB (minified)"
