/**
 * Phase 4B: Enhanced Touch Targets & Interactive Elements
 *
 * Provides cross-device touch feedback, pointer event support, and mobile UX improvements
 * Load this file in addition to the main debrief-viewer.js
 */

// =====================================================================
// TOUCH FEEDBACK SYSTEM
// =====================================================================

/**
 * Add visual feedback for touch interactions
 * Uses opacity changes for tactile feedback without performance overhead
 */
function initTouchFeedback() {
  // Touch start: visual feedback
  document.addEventListener('touchstart', handleTouchStart, { passive: true });

  // Touch end: remove visual feedback
  document.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Touch cancel: clean up feedback
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
}

function handleTouchStart(event) {
  const target = event.target;

  // Check if this is an interactive element
  if (isInteractiveElement(target)) {
    target.style.opacity = '0.7';
    target.dataset.touchFeedback = 'active';
  }
}

function handleTouchEnd(event) {
  const target = event.target;

  if (target.dataset.touchFeedback === 'active') {
    target.style.opacity = '1';
    delete target.dataset.touchFeedback;
  }
}

function handleTouchCancel(event) {
  const target = event.target;

  if (target.dataset.touchFeedback === 'active') {
    target.style.opacity = '1';
    delete target.dataset.touchFeedback;
  }
}

/**
 * Determine if an element should receive touch feedback
 */
function isInteractiveElement(element) {
  if (!element || !(element instanceof HTMLElement)) return false;

  const tagName = element.tagName.toLowerCase();
  const classList = element.className.toLowerCase();

  // Check if element is a button or has button-like classes
  if (tagName === 'button' ||
      tagName === 'a' ||
      classList.includes('ghost') ||
      classList.includes('action') ||
      element.hasAttribute('role') && element.getAttribute('role') === 'button') {
    return true;
  }

  // Check parent for button wrapper
  const parent = element.closest('button, a, [role="button"]');
  return !!parent;
}

// =====================================================================
// POINTER EVENT SUPPORT (Modern Alternative to Click)
// =====================================================================

/**
 * Provide pointer event support for better cross-device handling
 * Falls back to click events for broader compatibility
 */
function initPointerEvents() {
  // Delegate pointer events for interactive elements
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  document.addEventListener('pointerup', handlePointerUp, { passive: true });
}

function handlePointerDown(event) {
  const target = event.target;

  // Only handle on touch and pen pointers
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    if (isInteractiveElement(target)) {
      target.dataset.pointerActive = 'true';
    }
  }
}

function handlePointerUp(event) {
  const target = event.target;

  if (target.dataset.pointerActive === 'true') {
    delete target.dataset.pointerActive;
  }
}

// =====================================================================
// KEYBOARD-AWARE LAYOUT (iOS SPECIFIC)
// =====================================================================

/**
 * Handle iOS keyboard visibility to prevent form elements from being hidden
 * When keyboard opens, scroll form into view
 */
function initKeyboardAwareness() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  if (!isIOS) return;

  const initialViewportHeight = window.innerHeight;
  let keyboardHeight = 0;

  window.addEventListener('resize', handleViewportResize);

  function handleViewportResize() {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;

    // If height decreased significantly, keyboard likely opened
    if (heightDifference > 50) {
      keyboardHeight = heightDifference;
      onKeyboardOpen();
    } else if (heightDifference < 50 && keyboardHeight > 0) {
      // Keyboard closed
      keyboardHeight = 0;
      onKeyboardClose();
    }
  }

  function onKeyboardOpen() {
    // Find active form element
    const activeElement = document.activeElement;

    if (activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.tagName === 'SELECT')) {

      // Scroll the form element into view, centered
      setTimeout(() => {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }

  function onKeyboardClose() {
    // Optional: restore scroll position
    // Implement if needed for specific use case
  }
}

// =====================================================================
// FORM INPUT ENHANCEMENTS
// =====================================================================

/**
 * Enhance form inputs for mobile usability
 */
function initFormEnhancements() {
  // Find all form inputs
  const inputs = document.querySelectorAll('input, textarea, select');

  inputs.forEach(input => {
    // Add input focus class for CSS styling
    input.addEventListener('focus', () => {
      input.classList.add('input-focused');
    });

    input.addEventListener('blur', () => {
      input.classList.remove('input-focused');
    });

    // Ensure minimum 16px font size (prevents iOS zoom)
    if (!input.style.fontSize || parseInt(input.style.fontSize) < 16) {
      input.style.fontSize = '16px';
    }
  });
}

// =====================================================================
// CHARACTER COUNTER (Optional)
// =====================================================================

/**
 * Add character counter to textarea elements with data-max-length attribute
 */
function initCharacterCounters() {
  const textareas = document.querySelectorAll('textarea[data-max-length]');

  textareas.forEach(textarea => {
    const maxLength = parseInt(textarea.dataset.maxLength);
    if (!maxLength) return;

    // Create counter element
    const counter = document.createElement('div');
    counter.className = 'char-count';
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-label', 'Character count');

    // Insert after textarea
    textarea.parentNode.insertBefore(counter, textarea.nextSibling);

    // Update counter on input
    const updateCounter = () => {
      const current = textarea.value.length;
      const remaining = maxLength - current;
      counter.textContent = `${current}/${maxLength}`;
      counter.classList.toggle('near-limit', remaining < 20);
    };

    textarea.addEventListener('input', updateCounter);
    updateCounter(); // Initial count
  });
}

// =====================================================================
// INITIALIZATION
// =====================================================================

/**
 * Initialize all Phase 4B enhancements
 */
function initPhase4B() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInitialization);
  } else {
    startInitialization();
  }

  function startInitialization() {
    initTouchFeedback();
    initPointerEvents();
    initKeyboardAwareness();
    initFormEnhancements();
    initCharacterCounters();

    // Log initialization (remove in production)
    if (window.__debriefDebug) {
      console.log('✓ Phase 4B: Touch feedback, pointer events, and mobile UX initialized');
    }
  }
}

// =====================================================================
// AUTO-START
// =====================================================================

// Start initialization immediately
initPhase4B();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initTouchFeedback,
    initPointerEvents,
    initKeyboardAwareness,
    initFormEnhancements,
    initCharacterCounters,
    initPhase4B
  };
}
