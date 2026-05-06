#!/bin/bash
# Build script: Compute content hashes and rename bundles
# Usage: ./build.sh

set -e

echo "🔨 Building with minification and content-hash versioning..."

# Minify JavaScript files
echo "  Minifying debrief-viewer.20260430g.js..."
npx esbuild debrief-viewer.20260430g.js --minify --outfile=debrief-viewer.20260430g.js.min 2>/dev/null
mv debrief-viewer.20260430g.js.min debrief-viewer.20260430g.js

echo "  Minifying login-fallback.20260430g.js..."
npx esbuild login-fallback.20260430g.js --minify --outfile=login-fallback.20260430g.js.min 2>/dev/null
mv login-fallback.20260430g.js.min login-fallback.20260430g.js

# Minify CSS (basic: remove comments and whitespace)
echo "  Minifying CSS..."
sed -e 's/\/\*[^*]*\*\+\([^/*][^*]*\*\+\)*\///g' -e 's/[[:space:]]*{/\{/g' -e 's/[[:space:]]*}/\}/g' -e 's/[[:space:]]*:[[:space:]]*/:/' -e 's/[[:space:]]*;[[:space:]]*/;/g' debrief-viewer.20260430g.css > debrief-viewer.20260430g.css.min
mv debrief-viewer.20260430g.css.min debrief-viewer.20260430g.css

# Compute content hashes (first 8 characters of md5sum)
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
echo "📦 Build complete: $HASH_JS"
