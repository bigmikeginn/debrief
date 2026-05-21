(function () {
  "use strict";

  const topSession = document.getElementById('topSession');
  const analyticsLink = document.getElementById('analyticsLink');

  function checkAnalyticsAccess() {
    const currentUser = localStorage.getItem('user_id') || null;
    const ownerUser = localStorage.getItem('owner_id') || null;

    if (analyticsLink && topSession && !topSession.classList.contains('hidden')) {
      analyticsLink.style.display = ownerUser && currentUser === ownerUser ? 'inline-flex' : 'none';
    }
  }

  window.addEventListener('storage', checkAnalyticsAccess);

  if (topSession) {
    const observer = new MutationObserver(checkAnalyticsAccess);
    observer.observe(topSession, { attributes: true, attributeFilter: ['class'] });
  }

  setTimeout(checkAnalyticsAccess, 100);
}());
