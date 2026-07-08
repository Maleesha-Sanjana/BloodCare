const LEADERBOARD_MOCK = [
  { rank: 1, name: 'Kamal Perera',       blood: 'O+',  location: 'Colombo',      donations: 12 },
  { rank: 2, name: 'Priya Rajapaksa',    blood: 'B+',  location: 'Galle',        donations: 10 },
  { rank: 3, name: 'Nimal Silva',        blood: 'A+',  location: 'Kandy',        donations: 9 },
  { rank: 4, name: 'Amara Dissanayake',  blood: 'O-',  location: 'Gampaha',      donations: 7 },
  { rank: 5, name: 'Ravi Kumar',         blood: 'B-',  location: 'Jaffna',       donations: 6 },
  { rank: 6, name: 'Dilani Wijesinghe',  blood: 'A-',  location: 'Colombo',      donations: 5 },
  { rank: 7, name: 'Saman Fernando',     blood: 'AB+', location: 'Colombo',      donations: 4 },
  { rank: 8, name: 'Suresh Nair',        blood: 'AB-', location: 'Trincomalee',  donations: 3 },
];

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

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

function renderLeaderboard() {
  const container = document.getElementById('leaderboardList');
  if (!container) return;

  container.innerHTML = LEADERBOARD_MOCK.map(d => {
    const medal = RANK_MEDALS[d.rank] || '';
    const rankLabel = medal || `${d.rank}${getOrdinalSuffix(d.rank)}`;
    const rankClass = d.rank <= 3 ? `lb-rank-top lb-rank-${d.rank}` : 'lb-rank';
    return `
      <div class="leaderboard-card ${d.rank <= 3 ? 'lb-top-' + d.rank : ''}">
        <div class="${rankClass}">${rankLabel}</div>
        <div class="lb-info">
          <div class="lb-name">${escHtml(d.name)}</div>
          <div class="lb-meta">🩸 ${d.blood} &nbsp;|&nbsp; 📍 ${escHtml(d.location)}</div>
        </div>
        <div class="lb-donations">
          <span class="lb-donations-num">${d.donations}</span>
          <span class="lb-donations-label" data-i18n="lb_donations">donations</span>
        </div>
      </div>`;
  }).join('');

  applyTranslations();
}

document.addEventListener('DOMContentLoaded', renderLeaderboard);
