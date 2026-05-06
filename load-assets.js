// Load versioned assets from manifest
// This script dynamically injects CSS and JS based on the deploy-manifest.json
(async () => {
  try {
    const manifest = await fetch('/deploy-manifest.json').then(r => r.json());
    const { css, js, fallback } = manifest.assets;

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
  } catch (error) {
    console.error('Failed to load asset manifest:', error);
    // Fallback: if manifest fails, try to load with .20260430g suffix (current version)
    // This allows graceful degradation if deploy-manifest.json is not yet deployed
    const linkCSS = document.createElement('link');
    linkCSS.rel = 'stylesheet';
    linkCSS.href = 'debrief-viewer.20260430g.css';
    document.head.appendChild(linkCSS);

    const scriptFallback = document.createElement('script');
    scriptFallback.src = 'login-fallback.20260430g.js';
    document.body.appendChild(scriptFallback);

    const scriptMain = document.createElement('script');
    scriptMain.type = 'module';
    scriptMain.src = 'debrief-viewer.20260430g.js';
    document.body.appendChild(scriptMain);
  }
})();
