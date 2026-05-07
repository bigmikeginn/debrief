#!/bin/bash
# Build script: Minify assets and compute content hashes
# Usage: ./build.sh
# Minifies new Phase 4 CSS/JS sources, updates manifest
# Preserves source files (.20260430g) for git tracking

set -e

echo "🔨 Minifying and versioning assets..."

# Minify JavaScript sources (esbuild)
echo "  Minifying JS files..."
npx esbuild debrief-viewer.20260430g.js \
  --minify \
  --target=es2020 \
  --outfile=debrief-viewer.minified.tmp

npx esbuild debrief-touch-feedback.20260430g.js \
  --minify \
  --target=es2020 \
  --outfile=debrief-touch-feedback.minified.tmp

# Minify CSS (remove comments and extra whitespace)
echo "  Minifying CSS..."
sed -e 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' -e 's/  */ /g' -e 's/ *{ */{/g' -e 's/ *} */}/g' \
  debrief-viewer.20260430g.css > debrief-viewer.css.minified.tmp

# Compute content hashes from minified versions
echo "  Computing content hashes..."
HASH_JS=$(echo -n "$(cat debrief-viewer.minified.tmp)" | md5sum | cut -c1-8)
HASH_CSS=$(echo -n "$(cat debrief-viewer.css.minified.tmp)" | md5sum | cut -c1-8)
HASH_TOUCH_FB=$(echo -n "$(cat debrief-touch-feedback.minified.tmp)" | md5sum | cut -c1-8)

echo "  JS hash:          $HASH_JS"
echo "  CSS hash:         $HASH_CSS"
echo "  Touch FB hash:    $HASH_TOUCH_FB"

# Rename minified files with hashes (keep source files intact)
mv debrief-viewer.minified.tmp debrief-viewer.$HASH_JS.js
mv debrief-viewer.css.minified.tmp debrief-viewer.$HASH_CSS.css
mv debrief-touch-feedback.minified.tmp debrief-touch-feedback.$HASH_TOUCH_FB.js

echo "  ✅ Files renamed with hashes"

# Generate manifest file with timestamps (includes fallback asset)
cat > deploy-manifest.json <<EOF
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "assets": {
    "css": "debrief-viewer.$HASH_CSS.css",
    "js": "debrief-viewer.$HASH_JS.js",
    "touchFeedback": "debrief-touch-feedback.$HASH_TOUCH_FB.js",
    "fallback": "login-fallback.92d54de8.js"
  }
}
EOF

echo "  ✅ Created deploy-manifest.json"
echo "📦 Build complete: JS=$HASH_JS, CSS=$HASH_CSS, Touch=$HASH_TOUCH_FB (minified)"
