// Auth check: only allow owner
const OWNER_USER_ID = localStorage.getItem('owner_id') || 'owner-uuid-placeholder';
const CURRENT_USER_ID = localStorage.getItem('user_id') || null;

// Redirect if not owner
if (CURRENT_USER_ID !== OWNER_USER_ID && OWNER_USER_ID !== 'owner-uuid-placeholder') {
  document.body.innerHTML = '<div style="padding: 2rem; color: #d32f2f; font-family: system-ui;"><h2>Access Denied</h2><p>Analytics are only available to the app owner.</p></div>';
  throw new Error('Unauthorized access to analytics');
}

// Date range defaults (last 30 days)
const today = new Date();
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// Initialize date inputs
document.getElementById('startDate').value = formatDate(thirtyDaysAgo);
document.getElementById('endDate').value = formatDate(today);

// Update date range text
function updateDateRange() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  document.getElementById('dateRange').textContent = `${start} to ${end}`;
}

updateDateRange();

// Fetch analytics data from Supabase edge function
async function loadAnalytics() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  // Show loading state
  document.querySelectorAll('.metric-value').forEach(el => {
    if (el.textContent === '-') el.innerHTML = '<span class="loading">Loading...</span>';
  });

  try {
    const response = await fetch('/functions/v1/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` },
      body: JSON.stringify({ startDate, endDate })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();

    // Populate Overview section
    document.getElementById('totalUsers').textContent = formatNumber(data.overview.total_users);
    document.getElementById('activeUsers7d').textContent = formatNumber(data.overview.active_users_7d);
    document.getElementById('totalDebriefs').textContent = formatNumber(data.overview.total_debriefs);
    document.getElementById('parseSuccessRate').textContent = `${data.overview.parse_success_rate}%`;
    document.getElementById('avgParseConfidence').textContent = `${Math.round(data.overview.avg_parse_confidence * 100)}%`;

    // Populate User Metrics
    document.getElementById('newUsers').textContent = formatNumber(data.userMetrics.new_users);
    document.getElementById('freePlanCount').textContent = formatNumber(data.userMetrics.free_count || 0);
    document.getElementById('proPlanCount').textContent = formatNumber(data.userMetrics.pro_count || 0);
    document.getElementById('avgDebriefs').textContent = (data.userMetrics.avg_debriefs || 0).toFixed(1);

    // Populate Feature Adoption
    document.getElementById('sharingEnabled').textContent = formatNumber(data.sharing.sharing_users);
    document.getElementById('avgSharesPerUser').textContent = (data.sharing.avg_shares_per_sharer || 0).toFixed(2);
    document.getElementById('favoritesUsed').textContent = formatNumber(data.favorites.users_with_favorites);
    document.getElementById('avgFavorites').textContent = (data.favorites.avg_favorites_per_user || 0).toFixed(2);

    // Populate Engagement
    document.getElementById('repeatUsers').textContent = formatNumber(data.engagement.repeat_users);
    document.getElementById('dailyActive').textContent = formatNumber(data.engagement.daily_active || 0);
    document.getElementById('medianDebriefs').textContent = (data.engagement.median_debriefs || 0).toFixed(1);
    document.getElementById('avgDebriefRepeat').textContent = data.engagement.repeat_users > 0
      ? (data.overview.total_debriefs / data.engagement.repeat_users).toFixed(1)
      : '0';

    // Populate Conversion Funnel
    const signups = data.funnel.signups || 1; // Avoid division by zero
    document.getElementById('funnelSignups').textContent = formatNumber(signups);
    document.getElementById('funnelFirstDebrief').textContent = `${formatNumber(data.funnel.first_debrief)} (${Math.round(100 * (data.funnel.first_debrief || 0) / signups)}%)`;
    document.getElementById('funnelShared').textContent = `${formatNumber(data.funnel.shared)} (${Math.round(100 * (data.funnel.shared || 0) / signups)}%)`;
    document.getElementById('funnelUpgraded').textContent = `${formatNumber(data.funnel.upgraded_pro)} (${Math.round(100 * (data.funnel.upgraded_pro || 0) / signups)}%)`;

    // Populate Quality & Cost
    document.getElementById('parseFailures').textContent = formatNumber(data.quality.parse_failures);
    document.getElementById('needsReview').textContent = formatNumber(data.quality.needs_review);
    document.getElementById('totalTokens').textContent = ((data.cost.total_tokens || 0) / 1_000_000).toFixed(1) + 'M';
    document.getElementById('totalCost').textContent = `$${(data.cost.total_cost || 0).toFixed(2)}`;
    document.getElementById('costPerDebrief').textContent = data.overview.total_debriefs > 0
      ? `$${((data.cost.total_cost || 0) / data.overview.total_debriefs).toFixed(4)}`
      : '$0';

    updateDateRange();
  } catch (error) {
    console.error('Analytics load error:', error);
    document.querySelectorAll('.metric-value').forEach(el => {
      if (el.textContent.includes('Loading')) {
        el.innerHTML = '<span class="error">Error</span>';
      }
    });
  }
}

function formatNumber(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function exportCSV() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;

  const rows = [
    ['Analytics Export', ''],
    ['Date Range', `${start} to ${end}`],
    [],
    ['Overview', ''],
    ['Total Users', document.getElementById('totalUsers').textContent],
    ['Active Users (7d)', document.getElementById('activeUsers7d').textContent],
    ['Total Debriefs', document.getElementById('totalDebriefs').textContent],
    ['Parse Success Rate', document.getElementById('parseSuccessRate').textContent],
    ['Avg Parse Confidence', document.getElementById('avgParseConfidence').textContent],
    [],
    ['User Metrics', ''],
    ['New Users', document.getElementById('newUsers').textContent],
    ['Free Plan', document.getElementById('freePlanCount').textContent],
    ['Pro Plan', document.getElementById('proPlanCount').textContent],
    ['Avg Debriefs / User', document.getElementById('avgDebriefs').textContent],
    [],
    ['Feature Adoption', ''],
    ['Users Sharing', document.getElementById('sharingEnabled').textContent],
    ['Avg Shares / Sharer', document.getElementById('avgSharesPerUser').textContent],
    ['Users with Favorites', document.getElementById('favoritesUsed').textContent],
    ['Avg Favorites / User', document.getElementById('avgFavorites').textContent],
    [],
    ['Engagement', ''],
    ['Repeat Users', document.getElementById('repeatUsers').textContent],
    ['Daily Active Users', document.getElementById('dailyActive').textContent],
    ['Median Debriefs / User', document.getElementById('medianDebriefs').textContent],
    [],
    ['Conversion Funnel', ''],
    ['Signups', document.getElementById('funnelSignups').textContent],
    ['First Debrief', document.getElementById('funnelFirstDebrief').textContent],
    ['Shared', document.getElementById('funnelShared').textContent],
    ['Pro Upgrade', document.getElementById('funnelUpgraded').textContent],
    [],
    ['Quality & Cost', ''],
    ['Parse Failures', document.getElementById('parseFailures').textContent],
    ['Needs Review', document.getElementById('needsReview').textContent],
    ['Total Tokens', document.getElementById('totalTokens').textContent],
    ['Total LLM Cost', document.getElementById('totalCost').textContent],
    ['Avg Cost / Debrief', document.getElementById('costPerDebrief').textContent],
  ];

  const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debrief-analytics-${start}-to-${end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Load on page load
window.addEventListener('DOMContentLoaded', loadAnalytics);
