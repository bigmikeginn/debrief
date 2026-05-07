// Load versioned assets from manifest
// This script dynamically injects CSS and JS based on the deploy-manifest.json
(async () => {
  try {
    const manifest = await fetch('/deploy-manifest.json').then(r => r.json());
    const { css, js, fallback, touchFeedback } = manifest.assets;

    // Inject CSS
    if (css) {
      const linkCSS = document.createElement('link');
      linkCSS.rel = 'stylesheet';
      linkCSS.href = css;
      document.head.appendChild(linkCSS);
    }

    // Inject fallback JS (runs without module system)
    if (fallback) {
      const scriptFallback = document.createElement('script');
      scriptFallback.src = fallback;
      document.body.appendChild(scriptFallback);
    }

    // Inject main JS (ES module)
    if (js) {
      const scriptMain = document.createElement('script');
      scriptMain.type = 'module';
      scriptMain.src = js;
      document.body.appendChild(scriptMain);
    }

    // Inject touch feedback enhancement (runs after main JS loads)
    if (touchFeedback) {
      const scriptTouch = document.createElement('script');
      scriptTouch.src = touchFeedback;
      document.body.appendChild(scriptTouch);
    }
  } catch (error) {
    console.error('Failed to load asset manifest:', error);
    // Fallback: if manifest fails, try to load with .20260430g suffix (current version)
    // This allows graceful degradation if deploy-manifest.json is not yet deployed
    const linkCSS = document.createElement('link');
    linkCSS.rel = 'stylesheet';
    linkCSS.href = 'debrief-viewer.0b9a3a06.css';
    document.head.appendChild(linkCSS);

    const scriptFallback = document.createElement('script');
    scriptFallback.src = 'login-fallback.92d54de8.js';
    document.body.appendChild(scriptFallback);

    const scriptMain = document.createElement('script');
    scriptMain.type = 'module';
    scriptMain.src = 'debrief-viewer.eaae7f54.js';
    document.body.appendChild(scriptMain);

    const scriptTouch = document.createElement('script');
    scriptTouch.src = 'debrief-touch-feedback.a700bae0.js';
    document.body.appendChild(scriptTouch);
  }
})();
