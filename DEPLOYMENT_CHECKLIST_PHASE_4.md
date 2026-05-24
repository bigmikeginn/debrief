# Phase 4 Deployment Checklist

**Commit:** 66a3aa2 (feat: Phase 4 - Comprehensive mobile polish & responsive design)  
**Status:** Ready for deployment  
**Date:** 2026-05-06

---

## Pre-Deployment Steps

### ✅ Code Changes Committed
- [x] `debrief-viewer.20260430g.css` — CSS source file created
- [x] `debrief-touch-feedback.20260430g.js` — Touch feedback source created
- [x] `analytics.html` — Mobile CSS optimizations applied
- [x] `.gitignore` — Updated to track new source files
- [x] Documentation — Testing guide and summary created
- [x] Git commit — All changes committed

### ⏳ Build & Minification (Run Locally)

**Step 1: Run build.sh**
```bash
cd "I:\My Drive\AI\Projects\Internal\BJJ Debrief"
bash build.sh
```

**Expected Output:**
```
🔨 Minifying and versioning assets...
  Minifying JS files...
  Minifying CSS...
  Computing content hashes...
  JS hash:       [8-char hash]
  CSS hash:      [8-char hash]
  Fallback hash: [8-char hash]
  ✅ Files renamed with hashes
  ✅ Created deploy-manifest.json
📦 Build complete: [hash] (minified)
```

**Files Generated:**
- `debrief-viewer.[hash].css` (minified from source)
- `debrief-touch-feedback.[hash].js` (minified from source)
- `debrief-viewer.36c808a4.js` (updated if changed)
- `deploy-manifest.json` (manifest with versioned filenames)

### ✅ Verify Build Output

After running `build.sh`:

```bash
# Check that versioned files exist
ls -la debrief-viewer.*.css debrief-viewer.*.js debrief-touch-feedback.*.js

# Verify manifest was created
cat deploy-manifest.json

# Should show:
# {
#   "timestamp": "2026-05-06T...",
#   "assets": {
#     "css": "debrief-viewer.[hash].css",
#     "js": "debrief-viewer.[hash].js",
#     "fallback": "login-fallback.[hash].js"
#   }
# }
```

### ✅ Test Locally (Optional but Recommended)

```bash
# Start local web server
python -m http.server 8000
# or: npx http-server

# Open browser to http://localhost:8000/viewer.html

# Test:
# - At different viewport widths (DevTools responsive mode)
# - Touch on mobile device if available
# - Form submission
# - Analytics page
```

---

## Deployment Steps

### Step 1: Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**
```bash
cd "I:\My Drive\AI\Projects\Internal\BJJ Debrief"
vercel --prod --yes
```

**Option B: Using npm script**
```bash
npm run deploy
```

**Expected Output:**
```
Vercel CLI ...
> Ready! Deployed to https://debrief-training.vercel.app
```

### Step 2: Verify Deployment

**Check deployment status:**
1. Visit https://debrief-training.vercel.app
2. Open DevTools (F12)
3. **Network Tab:**
   - Check that CSS is loaded from `debrief-viewer.[hash].css`
   - Check that manifest is loaded (should NOT be cached)
   - Verify cache headers:
     - Versioned files: `Cache-Control: public, max-age=31536000, immutable`
     - HTML/manifest: `Cache-Control: no-store, max-age=0`

4. **Console Tab:**
   - Should show no errors
   - Touch feedback initialization message (if debug enabled)

5. **Viewport Testing:**
   - Resize to 375px, 430px, 680px, 1120px
   - Verify layout adapts properly
   - Check for horizontal scrolling (should be none)

---

## Post-Deployment Verification

### Desktop (1120px+)
- [ ] Full layout displays correctly
- [ ] Sidebar/drawer works
- [ ] Detail panel visible alongside timeline
- [ ] All text readable
- [ ] Buttons have hover states

### Tablet (680px–1120px)
- [ ] Grid layout switches properly
- [ ] Detail view shows below timeline
- [ ] Drawer fits on screen
- [ ] Touch targets are comfortable

### Mobile (430px)
- [ ] Single column layout active
- [ ] Timeline and detail are in proper stack
- [ ] Submit button is full-width
- [ ] Form fields are properly sized (48px)
- [ ] No horizontal scrolling

### Form Submission
- [ ] New Debrief modal opens
- [ ] Textarea has character counter
- [ ] Submit button is full-width on mobile
- [ ] Success message displays
- [ ] Parsing status shows correctly

### Analytics Page
- [ ] Controls stack on mobile
- [ ] Metrics display without overflow
- [ ] Grid changes from 1→2→3 columns as viewport widens

### Touch & Interaction
- [ ] Buttons show touch feedback (opacity change)
- [ ] Form inputs have 16px font (use DevTools to verify)
- [ ] Focus rings are visible
- [ ] Keyboard works on touch devices

---

## Rollback Plan

If deployment causes issues:

### Immediate Rollback
```bash
# Using Vercel CLI
vercel rollback

# Or: Go to Vercel dashboard
# → Project: debrief
# → Deployments
# → Click "Rollback" on previous successful deployment
```

### Remove Touch Feedback (If JS Issue)
Edit `viewer.html` and comment out the line:
```html
<!-- <script src="debrief-touch-feedback.*.js"></script> -->
```

### Revert CSS Changes (If Critical Issue)
Remove Phase 4B-4D CSS additions from `debrief-viewer.20260430g.css` and re-run `build.sh`

---

## Success Criteria

**Phase 4 deployment is complete when:**

- [x] Git commit 66a3aa2 is pushed
- [ ] `build.sh` runs successfully
- [ ] Vercel deployment succeeds
- [ ] Deployed site loads without errors
- [ ] All pages responsive at 375px, 430px, 680px, 1120px
- [ ] Touch feedback works on mobile
- [ ] Form inputs don't zoom on iOS
- [ ] No horizontal scrolling
- [ ] Analytics dashboard displays correctly
- [ ] Tests pass on Chrome DevTools at 7 breakpoints
- [ ] Tests pass on real device (iPhone or Android)

---

## Monitoring Post-Deployment

### Analytics to Track

In the Debrief analytics dashboard (after Phase 3 deploy), monitor:

1. **Mobile Engagement** (Week 1 post-deploy)
   - Mobile users: % of total
   - Mobile form submissions: increased?
   - Mobile share: increased?

2. **Performance Metrics**
   - Page load time on mobile
   - Time to interactive
   - CLS (Cumulative Layout Shift)

3. **User Behavior**
   - Session duration on mobile
   - Bounce rate on mobile
   - Feature adoption on mobile (sharing, favorites)

### Expected Improvements

- ✅ Mobile usability: Touch targets now 44-48px minimum
- ✅ Keyboard handling: iOS no longer zooms on input focus
- ✅ Typography: Responsive and readable at all sizes
- ✅ Forms: Better mobile experience with full-width buttons
- ✅ Touch feedback: Visual confirmation of interaction

---

## Support & Troubleshooting

### Issue: Build fails when running `build.sh`

**Solution:**
- Ensure esbuild is installed: `npm install esbuild`
- Check that minification tools are available
- Verify file paths are correct

### Issue: Versioned assets not loading after deploy

**Solution:**
- Clear browser cache: Cmd+Shift+R or Ctrl+Shift+R
- Verify `load-assets.js` is loading
- Check that `deploy-manifest.json` is accessible
- Ensure vercel.json cache headers are correct

### Issue: Touch feedback not working

**Solution:**
- Check that `debrief-touch-feedback.*.js` is loading
- Verify console for errors
- Test on actual touch device (DevTools simulation may not work)
- Ensure CSS transitions are not disabled

### Issue: iOS keyboard zooms on input focus

**Solution:**
- Verify all inputs have `font-size: 16px`
- Check that CSS rule is applied: `@supports (-webkit-touch-callout: none)`
- Clear site data and reload in Safari

---

## Documentation

**For developers working on this app:**

- See `PHASE_4_MOBILE_POLISH_SUMMARY.md` for overview of all Phase 4 changes
- See `PHASE_4E_TESTING_GUIDE.md` for comprehensive testing procedures
- Source files ready for editing:
  - `debrief-viewer.20260430g.css` (CSS source)
  - `debrief-touch-feedback.20260430g.js` (JavaScript source)

**For future phases:**
- Phase 4 CSS is optimized for mobile but not minified during editing
- Run `build.sh` to minify and version before deployment
- No additional build tools needed beyond esbuild
- All responsive design uses CSS media queries (no JS framework needed)

---

## Next Steps After Deployment

1. **Monitor metrics** for 1-2 weeks
2. **Gather user feedback** on mobile experience
3. **Plan Phase 5** based on analytics data
4. **Optimize further** if needed based on real usage

---

**Deployment is ready. Run `build.sh` and then `vercel --prod --yes` to deploy.**
