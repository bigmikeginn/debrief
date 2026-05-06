#!/bin/bash
# Build script: Minify assets and compute content hashes
# Usage: ./build.sh
# Minifies JS with esbuild and CSS with sed, then hashes and renames bundles

set -e

echo "🔨 Minifying and versioning assets..."

# Minify JavaScript (esbuild)
echo "  Minifying JS files..."
npx esbuild debrief-viewer.20260430g.js \
  --minify \
  --target=es2020 \
  --outfile=debrief-viewer.20260430g.js.tmp && \
  mv debrief-viewer.20260430g.js.tmp debrief-viewer.20260430g.js

npx esbuild login-fallback.20260430g.js \
  --minify \
  --target=es2020 \
  --outfile=login-fallback.20260430g.js.tmp && \
  mv login-fallback.20260430g.js.tmp login-fallback.20260430g.js

# Minify CSS (remove comments and extra whitespace)
echo "  Minifying CSS..."
sed -e 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' -e 's/  */ /g' -e 's/ *{ */{/g' -e 's/ *} */}/g' \
  debrief-viewer.20260430g.css > debrief-viewer.20260430g.css.tmp && \
  mv debrief-viewer.20260430g.css.tmp debrief-viewer.20260430g.css

# Compute content hashes (first 8 characters of md5sum)
echo "  Computing content hashes..."
HASH_JS=$(echo -n "$(cat debrief-viewer.20260430g.js)" | md5sum | cut -c1-8)
HASH_CSS=$(echo -n "$(cat debrief-viewer.20260430g.css)" | md5sum | cut -c1-8)
HASH_FALLBACK=$(echo -n "$(cat login-fallback.20260430g.js)" | md5sum | cut -c1-8)

echo "  JS hash:       $HASH_JS"
echo "  CSS hash:      $HASH_CSS"
echo "  Fallback hash: $HASH_FALLBACK"

# Rename files with hashes
mv debrief-viewer.20260430g.js debrief-viewer.$HASH_JS.js
mv debrief-viewer.20260430g.css debrief-viewer.$HASH_CSS.css
mv login-fallback.20260430g.js login-fallback.$HASH_FALLBACK.js

echo "  ✅ Files renamed with hashes"

# Generate manifest file with timestamps
cat > deploy-manifest.json <<EOF
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "assets": {
    "css": "debrief-viewer.$HASH_CSS.css",
    "js": "debrief-viewer.$HASH_JS.js",
    "fallback": "login-fallback.$HASH_FALLBACK.js"
  }
}
EOF

echo "  ✅ Created deploy-manifest.json"
echo "📦 Build complete: $HASH_JS (minified)"
