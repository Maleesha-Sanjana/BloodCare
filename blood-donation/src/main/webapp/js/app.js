async function updateStats() {
  if (typeof window.refreshHomeStats === 'function') {
    await window.refreshHomeStats();
  }
}

// ===== DONOR SEARCH =====
function searchDonors() {
  const bloodEl    = document.getElementById('sBlood');
  const locationEl = document.getElementById('sLocation');
  if (!bloodEl || !locationEl) return;

  const blood    = bloodEl.value;
  const location = locationEl.value;
  const donors   = window.getDonors();

  const filtered = donors.filter(d => {
    return (!blood    || d.blood    === blood) &&
           (!location || d.location === location);
  });

  renderDonorResults(filtered);
}

function quickSearch(blood) {
  document.getElementById('sBlood').value = blood;
  document.getElementById('sLocation').value = '';
  document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
  setTimeout(searchDonors, 400);
}

function renderDonorResults(donors) {
  const container = document.getElementById('searchResults');
  if (!container) return;
  if (donors.length === 0) {
    container.innerHTML = `<div class="no-results"><span style="font-size:2.5rem">🔍</span><p>${t('no_donors')}</p></div>`;
    return;
  }
  container.innerHTML = donors.map(d => `
    <div class="donor-card">
      <span class="donor-blood">${d.blood}</span>
      <div class="donor-name">${escHtml(d.name)}</div>
      <div class="donor-info">📍 ${escHtml(d.location)} &nbsp;|&nbsp; 🎂 ${d.age || '—'} yrs</div>
      <div class="donor-info">📅 Registered: ${d.date || '—'}</div>
      <button class="donor-contact-btn" onclick="showDonorContact('${d.id}')">${t('contact_donor')}</button>
    </div>
  `).join('');
}

function showDonorContact(id) {
  const donor = window.getDonors().find(d => d.id === id);
  if (!donor) return;
  document.getElementById('modalContent').innerHTML = `
    <h3>🩸 ${t('contact_donor')}</h3>
    <p><span class="modal-label">Name</span><br/><strong>${escHtml(donor.name)}</strong></p>
    <p><span class="modal-label">Blood Group</span><br/><strong style="color:var(--red);font-size:1.2rem">${donor.blood}</strong></p>
    <p><span class="modal-label">Location</span><br/>${escHtml(donor.location)}</p>
    <p><span class="modal-label">Phone</span><br/><a href="tel:${donor.phone}" style="color:var(--red);font-weight:700">${donor.phone || '—'}</a></p>
    ${donor.email ? `<p><span class="modal-label">Email</span><br/><a href="mailto:${donor.email}" style="color:var(--red)">${donor.email}</a></p>` : ''}
    <p style="margin-top:1rem;font-size:0.8rem;color:var(--text-muted)">Please be respectful when contacting donors.</p>
  `;
  openModal();
  showToast(t('toast_respond'), 'info');
}

// ===== DONATION REQUESTS =====
function clearRequestLocation() {
  const lat = document.getElementById('rLat');
  const lng = document.getElementById('rLng');
  const status = document.getElementById('locationStatus');
  if (lat) lat.value = '';
  if (lng) lng.value = '';
  if (status) {
    status.textContent = '';
    status.className = 'location-status';
  }
}

function fetchRequestLocation() {
  const btn = document.getElementById('fetchLocationBtn');
  const status = document.getElementById('locationStatus');

  if (!navigator.geolocation) {
    showToast('Geolocation is not supported on this browser.', 'error');
    return;
  }

  if (btn) btn.disabled = true;
  if (status) {
    status.textContent = t('req_gps_fetching');
    status.className = 'location-status loading';
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      document.getElementById('rLat').value = lat;
      document.getElementById('rLng').value = lng;
      if (status) {
        status.textContent = `✓ ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        status.className = 'location-status success';
      }
      if (btn) btn.disabled = false;
      showToast(t('req_gps_success'), 'success');
    },
    err => {
      console.error('Geolocation:', err);
      if (status) {
        status.textContent = t('req_gps_failed');
        status.className = 'location-status error';
      }
      if (btn) btn.disabled = false;
      showToast(t('req_gps_denied'), 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

async function postRequest(e) {
  e.preventDefault();
  const req = {
    hospital: document.getElementById('rHospital').value.trim(),
    blood:    document.getElementById('rBlood').value,
    location: document.getElementById('rLocation').value,
    contact:  document.getElementById('rContact').value.trim(),
    level:    document.getElementById('rLevel').value,
    units:    parseInt(document.getElementById('rUnits').value),
    date:     new Date().toISOString().split('T')[0],
    time:     new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }),
  };

  const lat = parseFloat(document.getElementById('rLat').value);
  const lng = parseFloat(document.getElementById('rLng').value);
  if (!isNaN(lat) && !isNaN(lng)) {
    req.lat = lat;
    req.lng = lng;
  }

  try {
    await window.addRequest(req);

    const levelLabel = { critical: '🚨 CRITICAL', urgent: '⚠️ URGENT', normal: '📋 Normal' }[req.level];
    await window.addNotification({
      type: req.level === 'critical' ? 'emergency' : 'hospital',
      icon: req.level === 'critical' ? '🚨' : '🏥',
      title: `${levelLabel}: ${req.blood} Blood Needed`,
      msg: `${req.hospital} in ${req.location} needs ${req.units} unit(s) of ${req.blood} blood.`,
      time: 'Just now',
      read: false,
    });

    document.getElementById('requestForm').reset();
    window.resetReqDropdowns();
    clearRequestLocation();
    showToast(t('toast_request'), 'success');
  } catch (err) {
    console.error('postRequest:', err);
    showToast('Failed to post request. Please try again.', 'error');
  }
}

function renderRequests() {
  const requests = window.getRequests();
  const container = document.getElementById('requestsList');
  if (!container) return;
  if (requests.length === 0) {
    container.innerHTML = `<div class="no-results"><p>No active requests.</p></div>`;
    return;
  }
  container.innerHTML = requests.map(r => `
    <div class="request-card ${r.level}">
      <div class="req-header">
        <span class="req-blood">${r.blood}</span>
        <span class="req-badge ${r.level}">${r.level.toUpperCase()}</span>
      </div>
      <div class="req-hospital">${escHtml(r.hospital)}</div>
      <div class="req-details">📍 ${escHtml(r.location)}${r.lat != null ? ' 📌' : ''} &nbsp;|&nbsp; 🩸 ${r.units} unit(s) &nbsp;|&nbsp; 📅 ${r.date} ${r.time}</div>
      <button class="req-respond-btn" onclick="respondToRequest('${r.id}')">${t('respond_request')}</button>
    </div>
  `).join('');
}

function respondToRequest(id) {
  const req = window.getRequests().find(r => r.id === id);
  if (!req) return;
  document.getElementById('modalContent').innerHTML = `
    <h3>🏥 ${t('respond_request')}</h3>
    <p><span class="modal-label">Hospital</span><br/><strong>${escHtml(req.hospital)}</strong></p>
    <p><span class="modal-label">Blood Group Needed</span><br/><strong style="color:var(--red);font-size:1.2rem">${req.blood}</strong></p>
    <p><span class="modal-label">Units Required</span><br/>${req.units}</p>
    <p><span class="modal-label">Location</span><br/>${escHtml(req.location)}</p>
    <p><span class="modal-label">Emergency Level</span><br/><span class="req-badge ${req.level}" style="display:inline-block">${req.level.toUpperCase()}</span></p>
    <p><span class="modal-label">Contact</span><br/><a href="tel:${req.contact}" style="color:var(--red);font-weight:700">${req.contact}</a></p>
    <p style="margin-top:1rem;font-size:0.8rem;color:var(--text-muted)">Call the hospital directly to confirm your donation.</p>
  `;
  openModal();
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// ===== MODAL =====
function openModal()  { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===== NAV TOGGLE =====
function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('open');
}

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  });
});

// ===== ACTIVE NAV HIGHLIGHT =====
function highlightNav() {
  const loggedIn = window.auth && window.auth.currentUser;
  const sections = loggedIn
    ? ['home', 'donorWelcome', 'requestMapSection', 'search', 'requests']
    : ['home', 'requestMapSection', 'search', 'requests'];
  const scrollY = window.scrollY + 80;
  sections.forEach(id => {
    const el = document.getElementById(id);
    const link = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (!el || !link) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    link.style.color = (scrollY >= top && scrollY < bottom) ? 'var(--red)' : '';
  });
}

window.addEventListener('scroll', highlightNav);

// ===== UTILITY =====
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== CUSTOM DROPDOWNS (handled in dropdowns.js) =====

function startAppListeners() {
  window.subscribeDonors(() => {
    searchDonors();
    updateStats();
  });
  window.subscribeRequests(() => {
    renderRequests();
    updateStats();
    if (typeof window.renderRequestMap === 'function') window.renderRequestMap();
  });
  if (typeof window.subscribeNotifications === 'function') {
    window.subscribeNotifications(() => {
      if (typeof window.renderNotifications === 'function') window.renderNotifications();
      if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
    });
  }
}

window.bootApp = function () {
  startAppListeners();
  if (document.getElementById('requestsList')) renderRequests();
  if (document.getElementById('searchResults')) searchDonors();
  if (typeof window.initNotificationUI === 'function') window.initNotificationUI();
  if (typeof window.initRequestMap === 'function') window.initRequestMap();
};

Object.assign(window, {
  quickSearch, searchDonors, postRequest, fetchRequestLocation, clearRequestLocation,
  showDonorContact, respondToRequest, showToast, openModal, closeModal, toggleMenu,
  renderRequests,
});
