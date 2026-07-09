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
  if (lat) { lat.value = ''; lat.classList.remove('has-value', 'loading', 'error'); }
  if (lng) { lng.value = ''; lng.classList.remove('has-value', 'loading', 'error'); }
  if (status) {
    status.textContent = '';
    status.className = 'location-status';
  }
}

function setCoordFields(lat, lng, state) {
  const latEl = document.getElementById('rLat');
  const lngEl = document.getElementById('rLng');
  const cls = state === 'loading' ? 'loading' : state === 'error' ? 'error' : state === 'success' ? 'has-value' : '';
  [latEl, lngEl].forEach(el => {
    if (!el) return;
    el.classList.remove('has-value', 'loading', 'error');
    if (cls) el.classList.add(cls);
  });
  if (state === 'loading') {
    const msg = t('req_gps_fetching');
    if (latEl) latEl.value = msg;
    if (lngEl) lngEl.value = msg;
    return;
  }
  if (lat != null && lng != null) {
    if (latEl) latEl.value = Number(lat).toFixed(6);
    if (lngEl) lngEl.value = Number(lng).toFixed(6);
  }
}

function fetchRequestLocation() {
  const btn = document.getElementById('fetchLocationBtn');
  const status = document.getElementById('locationStatus');

  function setStatus(text, cls) {
    if (!status) return;
    status.textContent = text;
    status.className = 'location-status' + (cls ? ' ' + cls : '');
  }

  function applyCoords(lat, lng, label) {
    setCoordFields(lat, lng, 'success');
    setStatus(label || `✓ ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`, 'success');
    if (btn) btn.disabled = false;
    showToast(t('req_gps_success'), 'success');
  }

  function useDistrictFallback() {
    const district = document.getElementById('rLocation')?.value;
    const coords = district && window.DISTRICT_COORDS?.[district];
    if (!coords) return false;
    applyCoords(coords[0], coords[1], `✓ ${district} — ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`);
    showToast(t('req_gps_district_used').replace('{district}', district), 'info');
    return true;
  }

  function geoErrorMessage(err) {
    const codes = {
      1: t('req_gps_denied'),
      2: t('req_gps_unavailable'),
      3: t('req_gps_timeout'),
    };
    return codes[err?.code] || t('req_gps_failed');
  }

  function onGeoError(err) {
    console.error('Geolocation:', err);
    if (useDistrictFallback()) return;
    setCoordFields(null, null, 'error');
    const latEl = document.getElementById('rLat');
    const lngEl = document.getElementById('rLng');
    const errMsg = t('req_gps_failed');
    if (latEl) latEl.value = errMsg;
    if (lngEl) lngEl.value = errMsg;
    setStatus(geoErrorMessage(err), 'error');
    if (btn) btn.disabled = false;
    showToast(geoErrorMessage(err), 'error');
  }

  if (!navigator.geolocation) {
    if (!useDistrictFallback()) showToast(t('req_gps_unsupported'), 'error');
    return;
  }

  if (!window.isSecureContext) {
    if (!useDistrictFallback()) showToast(t('req_gps_secure'), 'error');
    return;
  }

  if (btn) btn.disabled = true;
  setCoordFields(null, null, 'loading');
  setStatus(t('req_gps_fetching'), 'loading');

  const tryLowAccuracy = () => {
    navigator.geolocation.getCurrentPosition(
      pos => applyCoords(pos.coords.latitude, pos.coords.longitude),
      err => onGeoError(err),
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 120000 }
    );
  };

  navigator.geolocation.getCurrentPosition(
    pos => applyCoords(pos.coords.latitude, pos.coords.longitude),
    () => tryLowAccuracy(),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function showSuccessModal(title, message, detailsHtml) {
  const content = document.getElementById('modalContent');
  if (!content) {
    showToast(message, 'success');
    return;
  }
  content.innerHTML = `
    <div class="success-modal-body">
      <div class="success-modal-icon">✅</div>
      <h3 class="success-modal-title">${escHtml(title)}</h3>
      <p class="success-modal-msg">${escHtml(message)}</p>
      ${detailsHtml || ''}
      <button type="button" class="btn btn-primary full-width success-modal-btn" onclick="closeModal()">${t('success_ok')}</button>
    </div>`;
  openModal();
  showToast(message, 'success');
}

async function postRequest(e) {
  e.preventDefault();

  const hospital = document.getElementById('rHospital').value.trim();
  const blood    = document.getElementById('rBlood').value;
  const location = document.getElementById('rLocation').value;
  const contact  = document.getElementById('rContact').value.trim();
  const level    = document.getElementById('rLevel').value;
  const units    = parseInt(document.getElementById('rUnits').value, 10);

  if (!hospital || !blood || !location || !contact || !level || !units) {
    showToast(t('req_form_incomplete'), 'error');
    return;
  }

  const submitBtn = document.querySelector('#requestForm button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  const req = {
    hospital,
    blood,
    location,
    contact,
    level,
    units,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }),
  };

  const lat = parseFloat(document.getElementById('rLat').value);
  const lng = parseFloat(document.getElementById('rLng').value);
  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    req.lat = lat;
    req.lng = lng;
  }

  try {
    await window.addRequest(req);

    try {
      const levelLabel = { critical: '🚨 CRITICAL', urgent: '⚠️ URGENT', normal: '📋 Normal' }[req.level];
      await window.addNotification({
        type: req.level === 'critical' ? 'emergency' : 'hospital',
        icon: req.level === 'critical' ? '🚨' : '🏥',
        title: `${levelLabel}: ${req.blood} Blood Needed`,
        msg: `${req.hospital} in ${req.location} needs ${req.units} unit(s) of ${req.blood} blood.`,
        time: 'Just now',
        read: false,
      });
    } catch (nErr) {
      console.warn('Notification skipped:', nErr);
    }

    document.getElementById('requestForm').reset();
    window.resetReqDropdowns();
    clearRequestLocation();

    const gpsNote = req.lat != null
      ? `<p class="success-detail-row">📌 ${t('success_gps_pinned')}</p>`
      : '';

    showSuccessModal(
      t('success_request_title'),
      t('toast_request'),
      `<div class="success-details">
        <p class="success-detail-row"><strong>${escHtml(req.hospital)}</strong></p>
        <p class="success-detail-row">🩸 ${escHtml(req.blood)} &nbsp;|&nbsp; ${req.units} ${t('req_units').toLowerCase()}</p>
        <p class="success-detail-row">📍 ${escHtml(req.location)} &nbsp;|&nbsp; <span class="req-badge ${req.level}">${req.level.toUpperCase()}</span></p>
        ${gpsNote}
      </div>`
    );

    if (typeof window.renderRequestMap === 'function') window.renderRequestMap();
  } catch (err) {
    console.error('postRequest:', err);
    showToast(t('req_post_failed'), 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
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
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 4500);
}

// Canonical toast for all scripts
window.showToast = showToast;

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
  initRequestForm();
  if (document.getElementById('requestsList')) renderRequests();
  if (document.getElementById('searchResults')) searchDonors();
  if (typeof window.initNotificationUI === 'function') window.initNotificationUI();
  if (typeof window.initRequestMap === 'function') window.initRequestMap();
};

Object.assign(window, {
  quickSearch, searchDonors, postRequest, fetchRequestLocation, clearRequestLocation,
  showDonorContact, respondToRequest, showSuccessModal, openModal, closeModal, toggleMenu,
  renderRequests,
});

function initRequestForm() {
  const gpsBtn = document.getElementById('fetchLocationBtn');
  if (gpsBtn && !gpsBtn.dataset.bound) {
    gpsBtn.dataset.bound = '1';
    gpsBtn.addEventListener('click', e => {
      e.preventDefault();
      fetchRequestLocation();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRequestForm);
} else {
  initRequestForm();
}
