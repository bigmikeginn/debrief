# Phase 4E: Multi-Breakpoint Testing Guide

**Date:** 2026-05-06  
**Status:** In Progress  
**Scope:** Comprehensive mobile testing across 7 breakpoints

---

## Testing Overview

Phase 4E validates that all Phase 4A–4D mobile optimizations work correctly across different device sizes and screen orientations. Testing should cover:

- Visual layout and spacing
- Touch target sizing (44-48px minimum)
- Form input usability
- Typography readability
- Modal and drawer positioning
- Analytics dashboard display
- Keyboard handling (iOS)

---

## Breakpoint Testing Matrix

### 1. **375px — Extra Small Phone (iPhone SE, iPhone 12 Mini)**

**Devices:** iPhone SE, iPhone 12 mini, some Android phones

**CSS Breakpoints Hit:** 430px, 680px, 720px, 980px, 1120px

#### Layout Tests
- [ ] Shell/container padding is appropriate (0.9rem on <430px breakpoint)
- [ ] No horizontal scrolling at any viewport width
- [ ] Grid columns are single column
- [ ] Content fits within safe viewport

#### Interactive Elements
- [ ] All buttons have min-height of 2.75rem (44px) or more
- [ ] Button text is readable (font-size ≥ 0.8rem)
- [ ] Form inputs have min-height 2.75rem with padding
- [ ] Input font-size is 16px (prevents iOS zoom)
- [ ] Checkboxes/radio buttons are at least 1.25rem

#### Text & Typography
- [ ] Headings scale with `clamp()` and remain readable
- [ ] Body text is at least 0.85rem
- [ ] No text overflow or awkward line breaks
- [ ] Line heights are adequate (1.4+)

#### Modals & Drawers
- [ ] Modal width is `calc(100vw - 0.75rem)` at 375px
- [ ] Modal fits on screen with proper scrolling
- [ ] Close button is easily tappable
- [ ] Drawer slides in from right and fits viewport

#### Forms
- [ ] Debrief input textarea has min-height 6rem
- [ ] All form labels have adequate spacing
- [ ] Character counter is visible below textarea
- [ ] Error messages fit without overflow

#### Navigation
- [ ] Drawer opens/closes smoothly
- [ ] Timeline list items have proper padding (0.65rem)
- [ ] Entry item buttons are tappable (min 2.75rem)

---

### 2. **430px — Small Phone (iPhone 11, Most Android Phones)**

**Devices:** iPhone 11, iPhone 12, iPhone 13, Galaxy S21, Pixel 6

**CSS Breakpoints Hit:** 680px, 720px, 980px, 1120px

#### Layout Tests
- [ ] This is the primary <430px optimization breakpoint
- [ ] Spacing is balanced (0.9rem padding on containers)
- [ ] Grid gaps reduced (0.35-0.75rem depending on element)
- [ ] Single column layouts active

#### Interactive Elements
- [ ] Buttons styled with 2.75rem min-height at this size
- [ ] Touch targets have clear visual feedback
- [ ] Hover states work on touch (opacity changes)
- [ ] Focus rings are visible (2px outline)

#### Typography
- [ ] H1: `clamp(1.5rem, 4vw, 2rem)` responsive sizing
- [ ] H2: `clamp(1rem, 3.5vw, 1.25rem)`
- [ ] Body: `clamp(0.9rem, 2.2vw, 1rem)`
- [ ] All text readable and proportional

#### Forms & Submission
- [ ] Modal textarea has min-height 6rem
- [ ] Submit button is full-width
- [ ] Character counter positioned correctly
- [ ] Error messages display inline or in toast

#### Detail Panel
- [ ] Summary card padding is 0.75rem
- [ ] Detail actions stack properly
- [ ] Back to timeline button appears
- [ ] Scrolling is smooth (momentum scrolling enabled)

---

### 3. **520px — Large Phone / Small Tablet (iPhone 14 Plus, Tablets in Portrait)**

**Devices:** iPhone 14 Plus, Galaxy Tab S7 (portrait), iPad mini (portrait)

**CSS Breakpoints Hit:** 680px, 720px, 980px, 1120px

#### Layout Tests
- [ ] Single column still active
- [ ] More breathing room than 430px
- [ ] No unexpected layout shifts

#### Readability
- [ ] Typography scales appropriately
- [ ] Form inputs have proper padding
- [ ] List items have adequate height (min 2.75rem)

#### Interaction
- [ ] All touch targets meet 44px minimum
- [ ] Buttons feel comfortable to tap
- [ ] Modals don't feel cramped

---

### 4. **680px — Tablet Portrait (iPad, Galaxy Tab)**

**Devices:** iPad (9.7"), iPad Air, Galaxy Tab S, most tablets in portrait

**CSS Breakpoints Hit:** Main breakpoint at 680px, 720px, 980px, 1120px

#### Layout Tests
- [ ] **720px breakpoint**: Content grid switches from 2-column to 1-column
- [ ] Detail panel still shows below list on portrait
- [ ] Navigation is readable

#### Forms
- [ ] Form fields have adequate width
- [ ] Labels and inputs are not cramped
- [ ] Modal is appropriately sized

#### Detail View
- [ ] Back-to-timeline button is visible
- [ ] Detail hero stacks properly
- [ ] All sections readable side-by-side or stacked

#### Drawer/Navigation
- [ ] Drawer width is appropriate
- [ ] Controls fit without excessive scrolling

---

### 5. **720px — Tablet Portrait / Landscape Threshold**

**Devices:** Tablet landscape transitions, smaller desktops

**CSS Breakpoints Hit:** 720px (major), 980px, 1120px

#### Layout Tests
- [ ] **Major breakpoint 720px**: Grid switches layout
- [ ] Content grid is now 1fr 1fr (2 columns) above this, 1fr below
- [ ] Detail actions change layout
- [ ] Details grid switches from 2-column to 1-column

#### Navigation
- [ ] Menu button behavior is correct
- [ ] Drawer fits when open
- [ ] Timeline list and detail view both visible (on wider devices)

#### Interactive Elements
- [ ] Buttons are comfortable (min 3rem on desktop, 2.75rem on mobile)
- [ ] Form inputs have adequate sizing

---

### 6. **980px — Tablet Landscape / Desktop**

**Devices:** iPad landscape, smaller laptops, desktops

**CSS Breakpoints Hit:** 980px (minor), 1120px

#### Layout Tests
- [ ] Content displays in comfortable 2-column layout
- [ ] List and detail visible side-by-side
- [ ] Navigation drawer can open without covering content

#### Spacing & Padding
- [ ] Padding is appropriate (1.2rem+ on desktop)
- [ ] Gaps between elements are balanced
- [ ] Whitespace is intentional

#### Typography
- [ ] Headings are at full size (no clamping)
- [ ] Body text is comfortable (16px+)
- [ ] Line lengths are readable (<70 characters preferred)

---

### 7. **1120px+ — Large Desktop**

**Devices:** Full-size desktops, large monitors

**CSS Breakpoints Hit:** None (all breakpoints inactive)

#### Layout Tests
- [ ] Full-width layout active
- [ ] Content is centered or has side margins
- [ ] Sidebar/drawer doesn't take excessive space
- [ ] Detail panel is spacious and readable

#### Spacing
- [ ] Padding/margins are generous
- [ ] Grid gaps are balanced
- [ ] Whitespace is intentional

#### Typography
- [ ] All text is readable at default (16px body)
- [ ] Line lengths are reasonable
- [ ] Headings are proportional

#### Modals
- [ ] Modals are centered and sized appropriately
- [ ] Not wider than necessary
- [ ] Easy to interact with

---

## Testing Checklist by Category

### Touch Target Verification (All Breakpoints)

- [ ] All buttons: min-height 44px (2.75rem) or 48px (3rem) for primary
- [ ] Form inputs: min-height 48px (3rem) with padding
- [ ] Checkboxes: min 1.25rem
- [ ] Links in drawers: min 44px clickable area
- [ ] No overlapping touch targets
- [ ] Spacing around targets: ≥4px between targets

### Form Usability (All Breakpoints)

- [ ] Input font-size is 16px on mobile (prevents zoom)
- [ ] Placeholder text is readable
- [ ] Focus states are clear (outline visible)
- [ ] Character counter is present on textarea
- [ ] Error messages are inline and visible
- [ ] Submit button is full-width on <680px
- [ ] Keyboard doesn't hide form fields on iOS
- [ ] Tab order is logical

### Typography (All Breakpoints)

- [ ] No text overflow at any breakpoint
- [ ] Font sizes scale proportionally with `clamp()`
- [ ] Line heights provide adequate spacing (≥1.4)
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Headings are distinct from body text
- [ ] Small text (labels, meta) is at least 0.75rem

### Navigation (All Breakpoints)

- [ ] Drawer opens/closes smoothly
- [ ] Back button is visible on detail view (<720px)
- [ ] Menu button is tappable (44px+ touch target)
- [ ] Navigation items are well-spaced
- [ ] Active state is clear (highlighted, colored)

### Modals & Overlays (All Breakpoints)

- [ ] Modal fits on screen without excessive scrolling
- [ ] Close button is accessible
- [ ] Modal header is clear
- [ ] Content scrolls if needed (momentum scroll on iOS)
- [ ] Backdrop blur is visible (not overwhelming)
- [ ] Overlay click closes modal

### Analytics Dashboard (600px, 800px, 1000px+)

- [ ] <600px: Controls stack vertically
- [ ] <600px: Grid is 1 column
- [ ] 600px-800px: Grid is 2 columns
- [ ] >800px: Grid is 3+ columns
- [ ] Date inputs are tappable (>44px)
- [ ] Metrics are readable without overflow
- [ ] Export button is accessible

### Performance Checks

- [ ] No layout shifts during load
- [ ] Images load and scale correctly
- [ ] Smooth scrolling (60fps target)
- [ ] Touch feedback is immediate (<100ms)
- [ ] No unexpected reflows/repaints

### iOS-Specific Tests

- [ ] Input font-size is 16px (prevent zoom)
- [ ] Keyboard doesn't hide form fields
- [ ] Momentum scrolling works (`-webkit-overflow-scrolling: touch`)
- [ ] Touch feedback is smooth (no lag)
- [ ] Safe area insets respected (notch/Dynamic Island)

### Android-Specific Tests

- [ ] Touch feedback feels responsive
- [ ] Drawer animation is smooth
- [ ] Form inputs work with Android keyboard
- [ ] No excessive memory usage
- [ ] Works on older Android versions (6.0+)

---

## Testing Tools & Methods

### Browser DevTools (Chrome/Firefox/Safari)

1. **Open DevTools** (F12 or Cmd+Option+I)
2. **Toggle Device Toolbar** (Ctrl+Shift+M or Cmd+Shift+M)
3. **Test each breakpoint:**
   - 375px (iPhone SE)
   - 430px (Galaxy S21)
   - 520px (iPhone 14 Plus)
   - 680px (iPad portrait)
   - 720px (Tablet landscape)
   - 980px (Large tablet/small desktop)
   - 1120px (Full desktop)

### Real Device Testing

Test on at least these devices:
- [ ] iPhone SE or similar (375px)
- [ ] iPhone 12/13/14 (390px)
- [ ] Android phone (430px)
- [ ] iPad mini (520px portrait)
- [ ] iPad (680px portrait, 1024px landscape)

### Network Throttling

Test with **Slow 3G** in DevTools:
- [ ] Assets load correctly
- [ ] Layout doesn't shift while loading
- [ ] Buttons remain tappable during load
- [ ] Error messages display if network fails

---

## Known Issues & Workarounds

### iOS Keyboard Zoom
**Issue:** iOS zooms input when focused on <16px font  
**Solution:** All inputs set to 16px minimum  
**Status:** ✅ Fixed

### Android Touch Lag
**Issue:** Some Android devices have delayed touch feedback  
**Solution:** Using `transition` on opacity (hardware accelerated)  
**Status:** ✅ Mitigated

### Momentum Scrolling
**Issue:** iOS scrolling feels laggy  
**Solution:** `-webkit-overflow-scrolling: touch` on scrollable containers  
**Status:** ✅ Applied

---

## Sign-Off Checklist

Once testing is complete across all 7 breakpoints, verify:

- [ ] No horizontal scrolling at any breakpoint
- [ ] All touch targets ≥44px
- [ ] Form inputs prevent iOS zoom
- [ ] Typography is readable everywhere
- [ ] No layout shifts during interaction
- [ ] Keyboard doesn't hide form fields (iOS)
- [ ] Modals/drawers fit on screen
- [ ] Analytics dashboard is usable on mobile
- [ ] Error/success messages are visible
- [ ] Loading states are clear

---

## Regression Testing

After Phase 4E sign-off, periodically re-test these breakpoints:
- [ ] After major UI changes
- [ ] Before production deployments
- [ ] When upgrading dependencies
- [ ] When adding new components

---

## Notes for Next AI

- Run tests on **real devices** before deploying to production
- Use **slow 3G network** to catch layout issues during load
- Test **landscape and portrait** orientations
- Verify **keyboard handling** on iOS specifically
- Check **performance** with DevTools throttling
