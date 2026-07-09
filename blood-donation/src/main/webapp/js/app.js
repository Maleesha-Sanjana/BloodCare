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
// GPS handled in gps.js (fetchRequestLocation, clearRequestLocation)

function getReqSelectValue(selectId, displayId) {
  const sel = document.getElementById(selectId);
  if (sel && sel.value && sel.value.trim()) return sel.value.trim();

  const display = (document.getElementById(displayId)?.textContent || '').trim();
  if (!display || display.startsWith('--')) return '';

  if (selectId === 'rLevel') {
    if (/critical/i.test(display)) return 'critical';
    if (/urgent/i.test(display)) return 'urgent';
    if (/normal/i.test(display)) return 'normal';
  }

  if (selectId === 'rBlood') {
    return display.replace(/\u2212/g, '-').trim();
  }

  return display.replace(/^📍\s*/, '').trim();
}

function hidePostSuccess() {
  const el = document.getElementById('postSuccessAlert');
  if (el) el.hidden = true;
}

function showPostSuccess(req) {
  const el = document.getElementById('postSuccessAlert');
  const title = document.getElementById('postSuccessTitle');
  const msg = document.getElementById('postSuccessMsg');
  if (el) {
    if (title) title.textContent = t('success_request_title');
    if (msg) msg.textContent = `${req.hospital} — ${req.blood} (${req.location}) ${t('success_saved_db')}`;
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
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
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.add('open');
    modal.style.zIndex = '10050';
  }
  showToast(message, 'success');
}

async function postRequest(e) {
  if (e) e.preventDefault();
  hidePostSuccess();

  const hospital = document.getElementById('rHospital')?.value.trim() || '';
  const blood    = getReqSelectValue('rBlood', 'rBloodValue');
  const location = getReqSelectValue('rLocation', 'rLocationValue');
  const contact  = document.getElementById('rContact')?.value.trim() || '';
  const level    = getReqSelectValue('rLevel', 'rLevelValue');
  const units    = parseInt(document.getElementById('rUnits')?.value, 10);

  if (!hospital || !blood || !location || !contact || !level || !units || units < 1) {
    showToast(t('req_form_incomplete'), 'error');
    return;
  }

  const submitBtn = document.querySelector('#requestForm button[type="submit"]');
  const prevBtnText = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = t('req_saving');
  }

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

  const lat = parseFloat(document.getElementById('rLat')?.value);
  const lng = parseFloat(document.getElementById('rLng')?.value);
  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    req.lat = lat;
    req.lng = lng;
  } else if (window.DISTRICT_COORDS?.[location]) {
    req.lat = window.DISTRICT_COORDS[location][0];
    req.lng = window.DISTRICT_COORDS[location][1];
  }

  try {
    if (typeof window.addRequest !== 'function') {
      throw new Error('Database not ready');
    }

    const requestId = await window.addRequest(req);
    req.id = requestId;

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
    if (typeof window.clearRequestLocation === 'function') window.clearRequestLocation();

    renderRequests();

    const gpsNote = req.lat != null
      ? `<p class="success-detail-row">📌 ${t('success_gps_pinned')}</p>`
      : '';

    showPostSuccess(req);
    showSuccessModal(
      t('success_request_title'),
      t('toast_request'),
      `<div class="success-details">
        <p class="success-detail-row"><strong>${escHtml(req.hospital)}</strong></p>
        <p class="success-detail-row">🩸 ${escHtml(req.blood)} &nbsp;|&nbsp; ${req.units} ${t('req_units').toLowerCase()}</p>
        <p class="success-detail-row">📍 ${escHtml(req.location)} &nbsp;|&nbsp; <span class="req-badge ${req.level}">${req.level.toUpperCase()}</span></p>
        ${gpsNote}
        <p class="success-detail-row muted">${t('success_saved_db')}</p>
      </div>`
    );

    if (typeof window.renderRequestMap === 'function') {
      window.renderRequestMap(null, { forceFit: true });
      setTimeout(() => {
        document.getElementById('requestMapSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  } catch (err) {
    console.error('postRequest:', err);
    showToast(err.message || t('req_post_failed'), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (prevBtnText) submitBtn.textContent = prevBtnText;
    }
  }
}

function initRequestForm() {
  const form = document.getElementById('requestForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  form.addEventListener('submit', postRequest);
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
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.zIndex = '';
  }
}

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
  if (typeof window.initGpsButton === 'function') window.initGpsButton();
  if (document.getElementById('requestsList')) renderRequests();
  if (document.getElementById('searchResults')) searchDonors();
  if (typeof window.initNotificationUI === 'function') window.initNotificationUI();
  if (typeof window.initRequestMap === 'function') window.initRequestMap();
};

Object.assign(window, {
  quickSearch, searchDonors, postRequest, hidePostSuccess,
  showDonorContact, respondToRequest, showSuccessModal, openModal, closeModal, toggleMenu,
  renderRequests,
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRequestForm);
} else {
  initRequestForm();
}
