const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
let leaderboardInited = false;

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function renderLeaderboardRows(donors) {
  const container = document.getElementById('leaderboardList');
  if (!container) return;

  if (!donors.length) {
    container.innerHTML = `<div class="no-results"><p>${t('no_donors')}</p></div>`;
    return;
  }

  container.innerHTML = donors.map(d => {
    const medal = RANK_MEDALS[d.rank] || '';
    const rankLabel = medal || `${d.rank}${getOrdinalSuffix(d.rank)}`;
    const rankClass = d.rank <= 3 ? `lb-rank-top lb-rank-${d.rank}` : 'lb-rank';
    return `
      <div class="leaderboard-card ${d.rank <= 3 ? 'lb-top-' + d.rank : ''}">
        <div class="${rankClass}">${rankLabel}</div>
        <div class="lb-info">
          <div class="lb-name">${escHtml(d.name)}</div>
          <div class="lb-meta">🩸 ${d.blood || '—'} &nbsp;|&nbsp; 📍 ${escHtml(d.location || '—')}</div>
        </div>
        <div class="lb-donations">
          <span class="lb-donations-num">${d.donations || 0}</span>
          <span class="lb-donations-label" data-i18n="lb_donations">donations</span>
        </div>
      </div>`;
  }).join('');

  applyTranslations();
}

async function renderLeaderboard() {
  const container = document.getElementById('leaderboardList');
  if (!container) return;

  container.innerHTML = `<div class="no-results"><p>Loading leaderboard…</p></div>`;

  try {
    const donors = await window.getLeaderboard();
    renderLeaderboardRows(donors);
  } catch (err) {
    console.error('Leaderboard:', err);
    container.innerHTML = `<div class="no-results"><p>Could not load leaderboard. Please refresh.</p></div>`;
  }
}

function startLeaderboardListener() {
  if (typeof window.subscribeDonors !== 'function') return;
  window.subscribeDonors(donors => {
    const ranked = window.rankLeaderboardDonors
      ? window.rankLeaderboardDonors(donors)
      : donors;
    renderLeaderboardRows(ranked);
  });
}

function initLeaderboard() {
  if (leaderboardInited || !document.getElementById('leaderboardList')) return;
  leaderboardInited = true;
  renderLeaderboard();
  startLeaderboardListener();
}

window.initLeaderboard = initLeaderboard;
window.renderLeaderboard = renderLeaderboard;
