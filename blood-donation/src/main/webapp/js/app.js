// ===== DATA STORE (localStorage) =====
const DONORS_KEY   = 'bdms_donors';
const REQUESTS_KEY = 'bdms_requests';
const NOTIFS_KEY   = 'bdms_notifications';

function loadData(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ===== SEED SAMPLE DATA =====
function seedSampleData() {
  if (loadData(DONORS_KEY).length === 0) {
    const sampleDonors = [
      { id: 1, name: 'Kamal Perera',    age: 28, blood: 'O+',  phone: '+94 71 234 5678', location: 'Colombo',     email: 'kamal@example.com',  date: '2026-01-15' },
      { id: 2, name: 'Nimal Silva',     age: 35, blood: 'A+',  phone: '+94 77 345 6789', location: 'Kandy',       email: '',                   date: '2026-02-10' },
      { id: 3, name: 'Priya Rajapaksa', age: 24, blood: 'B+',  phone: '+94 76 456 7890', location: 'Galle',       email: 'priya@example.com',  date: '2026-01-28' },
      { id: 4, name: 'Saman Fernando',  age: 42, blood: 'AB+', phone: '+94 70 567 8901', location: 'Colombo',     email: '',                   date: '2026-03-05' },
      { id: 5, name: 'Amara Dissanayake',age:31, blood: 'O-',  phone: '+94 72 678 9012', location: 'Gampaha',     email: 'amara@example.com',  date: '2026-02-20' },
      { id: 6, name: 'Ravi Kumar',      age: 27, blood: 'B-',  phone: '+94 75 789 0123', location: 'Jaffna',      email: '',                   date: '2026-03-12' },
      { id: 7, name: 'Dilani Wijesinghe',age:33, blood: 'A-',  phone: '+94 78 890 1234', location: 'Colombo',     email: 'dilani@example.com', date: '2026-01-08' },
      { id: 8, name: 'Suresh Nair',     age: 29, blood: 'AB-', phone: '+94 71 901 2345', location: 'Trincomalee', email: '',                   date: '2026-03-18' },
    ];
    saveData(DONORS_KEY, sampleDonors);
  }

  if (loadData(REQUESTS_KEY).length === 0) {
    const sampleRequests = [
      { id: 1, hospital: 'Colombo National Hospital', blood: 'O+',  location: 'Colombo', contact: '+94 11 269 1111', level: 'critical', units: 3, date: '2026-04-29', time: '08:30' },
      { id: 2, hospital: 'Kandy Teaching Hospital',   blood: 'A+',  location: 'Kandy',   contact: '+94 81 222 2222', level: 'urgent',   units: 2, date: '2026-04-29', time: '10:15' },
      { id: 3, hospital: 'Karapitiya Hospital',       blood: 'B-',  location: 'Galle',   contact: '+94 91 222 3333', level: 'normal',   units: 1, date: '2026-04-28', time: '14:00' },
    ];
    saveData(REQUESTS_KEY, sampleRequests);
  }

  if (loadData(NOTIFS_KEY).length === 0) {
    const sampleNotifs = [
      { id: 1, type: 'emergency', icon: '🚨', title: 'Emergency: O+ Blood Needed', msg: 'Colombo National Hospital urgently needs O+ blood. 3 units required.', time: '2 hours ago', read: false },
      { id: 2, type: 'hospital',  icon: '🏥', title: 'New Request: Kandy Hospital', msg: 'Kandy Teaching Hospital posted a request for A+ blood (2 units).', time: '4 hours ago', read: false },
      { id: 3, type: 'reminder',  icon: '💉', title: 'Donation Reminder', msg: 'It has been 3 months since your last donation. You are eligible to donate again!', time: '1 day ago', read: true },
      { id: 4, type: 'hospital',  icon: '🏥', title: 'Request Fulfilled', msg: 'Thank you! The B+ blood request from Galle Hospital has been fulfilled.', time: '2 days ago', read: true },
    ];
    saveData(NOTIFS_KEY, sampleNotifs);
  }
}

// ===== STATS COUNTER ANIMATION =====
function animateCounter(id, target, duration = 1500) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); }
    else { el.textContent = Math.floor(start); }
  }, 16);
}

function updateStats() {
  const donors   = loadData(DONORS_KEY).length;
  const requests = loadData(REQUESTS_KEY).length;
  animateCounter('stat-donors',   donors);
  animateCounter('stat-requests', requests);
  animateCounter('stat-saved',    Math.floor(donors * 2.3));
}

// ===== DONOR REGISTRATION =====
function registerDonor(e) {
  e.preventDefault();
  const donor = {
    id:       Date.now(),
    name:     document.getElementById('dName').value.trim(),
    age:      parseInt(document.getElementById('dAge').value),
    blood:    document.getElementById('dBlood').value,
    phone:    document.getElementById('dPhone').value.trim(),
    location: document.getElementById('dLocation').value,
    email:    document.getElementById('dEmail').value.trim(),
    date:     new Date().toISOString().split('T')[0],
  };

  const donors = loadData(DONORS_KEY);
  donors.push(donor);
  saveData(DONORS_KEY, donors);

  // Add notification
  addNotification({
    type: 'hospital',
    icon: '✅',
    title: 'New Donor Registered',
    msg: `${donor.name} (${donor.blood}) from ${donor.location} has joined the network.`,
    time: 'Just now',
    read: false,
  });

  document.getElementById('donorForm').reset();
  showToast(t('toast_registered'), 'success');
  updateStats();
  renderNotifications();
}

// ===== DONOR SEARCH =====
function searchDonors() {
  const blood    = document.getElementById('sBlood').value;
  const location = document.getElementById('sLocation').value;
  const donors   = loadData(DONORS_KEY);

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
  if (donors.length === 0) {
    container.innerHTML = `<div class="no-results"><span style="font-size:2.5rem">🔍</span><p>${t('no_donors')}</p></div>`;
    return;
  }
  container.innerHTML = donors.map(d => `
    <div class="donor-card">
      <span class="donor-blood">${d.blood}</span>
      <div class="donor-name">${escHtml(d.name)}</div>
      <div class="donor-info">📍 ${escHtml(d.location)} &nbsp;|&nbsp; 🎂 ${d.age} yrs</div>
      <div class="donor-info">📅 Registered: ${d.date}</div>
      <button class="donor-contact-btn" onclick="showDonorContact(${d.id})">${t('contact_donor')}</button>
    </div>
  `).join('');
}

function showDonorContact(id) {
  const donor = loadData(DONORS_KEY).find(d => d.id === id);
  if (!donor) return;
  document.getElementById('modalContent').innerHTML = `
    <h3>🩸 ${t('contact_donor')}</h3>
    <p><span class="modal-label">Name</span><br/><strong>${escHtml(donor.name)}</strong></p>
    <p><span class="modal-label">Blood Group</span><br/><strong style="color:var(--red);font-size:1.2rem">${donor.blood}</strong></p>
    <p><span class="modal-label">Location</span><br/>${escHtml(donor.location)}</p>
    <p><span class="modal-label">Phone</span><br/><a href="tel:${donor.phone}" style="color:var(--red);font-weight:700">${donor.phone}</a></p>
    ${donor.email ? `<p><span class="modal-label">Email</span><br/><a href="mailto:${donor.email}" style="color:var(--red)">${donor.email}</a></p>` : ''}
    <p style="margin-top:1rem;font-size:0.8rem;color:var(--text-muted)">Please be respectful when contacting donors.</p>
  `;
  openModal();
  showToast(t('toast_respond'), 'info');
}

// ===== DONATION REQUESTS =====
function postRequest(e) {
  e.preventDefault();
  const req = {
    id:       Date.now(),
    hospital: document.getElementById('rHospital').value.trim(),
    blood:    document.getElementById('rBlood').value,
    location: document.getElementById('rLocation').value,
    contact:  document.getElementById('rContact').value.trim(),
    level:    document.getElementById('rLevel').value,
    units:    parseInt(document.getElementById('rUnits').value),
    date:     new Date().toISOString().split('T')[0],
    time:     new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }),
  };

  const requests = loadData(REQUESTS_KEY);
  requests.unshift(req);
  saveData(REQUESTS_KEY, requests);

  // Add notification
  const levelLabel = { critical: '🚨 CRITICAL', urgent: '⚠️ URGENT', normal: '📋 Normal' }[req.level];
  addNotification({
    type: req.level === 'critical' ? 'emergency' : 'hospital',
    icon: req.level === 'critical' ? '🚨' : '🏥',
    title: `${levelLabel}: ${req.blood} Blood Needed`,
    msg: `${req.hospital} in ${req.location} needs ${req.units} unit(s) of ${req.blood} blood.`,
    time: 'Just now',
    read: false,
  });

  document.getElementById('requestForm').reset();
  resetReqDropdowns();
  showToast(t('toast_request'), 'success');
  renderRequests();
  renderNotifications();
  updateStats();
}

function renderRequests() {
  const requests = loadData(REQUESTS_KEY);
  const container = document.getElementById('requestsList');
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
      <div class="req-details">📍 ${escHtml(r.location)} &nbsp;|&nbsp; 🩸 ${r.units} unit(s) &nbsp;|&nbsp; 📅 ${r.date} ${r.time}</div>
      <button class="req-respond-btn" onclick="respondToRequest(${r.id})">${t('respond_request')}</button>
    </div>
  `).join('');
}

function respondToRequest(id) {
  const req = loadData(REQUESTS_KEY).find(r => r.id === id);
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

// ===== NOTIFICATIONS =====
let currentFilter = 'all';

function addNotification(notif) {
  const notifs = loadData(NOTIFS_KEY);
  notifs.unshift({ id: Date.now(), ...notif });
  saveData(NOTIFS_KEY, notifs.slice(0, 50)); // keep max 50
}

function filterNotif(type) {
  currentFilter = type;
  document.querySelectorAll('.notif-controls .btn-outline').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  renderNotifications();
}

function renderNotifications() {
  const all = loadData(NOTIFS_KEY);
  const filtered = currentFilter === 'all' ? all : all.filter(n => n.type === currentFilter);
  const container = document.getElementById('notifList');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔔</div>
        <p>${t('no_notif')}</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(n => `
    <div class="notif-item ${n.type} ${n.read ? '' : 'unread'}" id="notif-${n.id}">
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-body">
        <div class="notif-title">${escHtml(n.title)}</div>
        <div class="notif-msg">${escHtml(n.msg)}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      <button class="notif-dismiss" onclick="dismissNotif(${n.id})" title="Dismiss">✕</button>
    </div>
  `).join('');
}

function dismissNotif(id) {
  const notifs = loadData(NOTIFS_KEY).filter(n => n.id !== id);
  saveData(NOTIFS_KEY, notifs);
  renderNotifications();
}

function clearNotifications() {
  saveData(NOTIFS_KEY, []);
  renderNotifications();
  showToast(t('toast_cleared'), 'info');
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
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

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  });
});

// ===== ACTIVE NAV HIGHLIGHT =====
function highlightNav() {
  const sections = ['home','register','search','requests','notifications'];
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

// ===== CUSTOM DROPDOWNS (Search section) =====
function toggleDropdown(which) {
  const wrap = document.getElementById(which + 'Wrap');
  const isOpen = wrap.classList.contains('open');
  // close all first
  document.querySelectorAll('.custom-select-wrap').forEach(w => w.classList.remove('open'));
  if (!isOpen) wrap.classList.add('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.custom-select-wrap')) {
    document.querySelectorAll('.custom-select-wrap').forEach(w => w.classList.remove('open'));
  }
});

function pickBlood(el, value, label) {
  // update hidden select
  document.getElementById('sBlood').value = value;
  // update trigger label
  document.getElementById('bloodValue').textContent = label;
  // toggle has-value
  const wrap = document.getElementById('bloodWrap');
  wrap.classList.toggle('has-value', value !== '');
  // mark selected
  document.querySelectorAll('#bloodDropdown .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  el.classList.add('cs-selected');
  el.querySelector('.cs-check').textContent = '✓';
  // close
  wrap.classList.remove('open');
}

function pickLocation(el, value, label) {
  document.getElementById('sLocation').value = value;
  document.getElementById('locationValue').textContent = label;
  const wrap = document.getElementById('locationWrap');
  wrap.classList.toggle('has-value', value !== '');
  document.querySelectorAll('#locationOptionsList .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  el.classList.add('cs-selected');
  el.querySelector('.cs-check').textContent = '✓';
  wrap.classList.remove('open');
  // clear search input
  const searchEl = document.querySelector('#locationDropdown .cs-search');
  if (searchEl) { searchEl.value = ''; filterLocationOptions(''); }
}

function filterLocationOptions(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#locationOptionsList .cs-option').forEach(o => {
    const text = o.textContent.toLowerCase();
    o.classList.toggle('cs-hidden', q !== '' && !text.includes(q));
  });
}

// ===== POST REQUEST FORM DROPDOWNS =====
function pickReqBlood(el, value, label) {
  document.getElementById('rBlood').value = value;
  document.getElementById('rBloodValue').textContent = label;
  const wrap = document.getElementById('rBloodWrap');
  wrap.classList.toggle('has-value', value !== '');
  document.querySelectorAll('#rBloodDropdown .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  el.classList.add('cs-selected');
  el.querySelector('.cs-check').textContent = '✓';
  wrap.classList.remove('open');
}

function pickReqLocation(el, value) {
  document.getElementById('rLocation').value = value;
  document.getElementById('rLocationValue').textContent = value;
  const wrap = document.getElementById('rLocationWrap');
  wrap.classList.toggle('has-value', value !== '');
  document.querySelectorAll('#rLocationOptionsList .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  el.classList.add('cs-selected');
  el.querySelector('.cs-check').textContent = '✓';
  wrap.classList.remove('open');
  const searchEl = document.querySelector('#rLocationDropdown .cs-search');
  if (searchEl) { searchEl.value = ''; filterReqLocationOptions(''); }
}

function filterReqLocationOptions(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#rLocationOptionsList .cs-option').forEach(o => {
    const text = o.textContent.toLowerCase();
    o.classList.toggle('cs-hidden', q !== '' && !text.includes(q));
  });
}

function pickReqLevel(el, value, label) {
  document.getElementById('rLevel').value = value;
  document.getElementById('rLevelValue').textContent = label;
  const wrap = document.getElementById('rLevelWrap');
  wrap.classList.remove('has-value', 'level-critical', 'level-urgent', 'level-normal');
  wrap.classList.add('has-value', 'level-' + value);
  document.querySelectorAll('#rLevelDropdown .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  el.classList.add('cs-selected');
  el.querySelector('.cs-check').textContent = '✓';
  wrap.classList.remove('open');
}

// Reset request form custom dropdowns after submit
function resetReqDropdowns() {
  // Blood
  document.getElementById('rBloodValue').textContent = '-- Select --';
  document.getElementById('rBloodWrap').classList.remove('has-value');
  document.querySelectorAll('#rBloodDropdown .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  // Location
  document.getElementById('rLocationValue').textContent = '-- Select District --';
  document.getElementById('rLocationWrap').classList.remove('has-value');
  document.querySelectorAll('#rLocationOptionsList .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
  // Level
  document.getElementById('rLevelValue').textContent = '-- Select --';
  const lw = document.getElementById('rLevelWrap');
  lw.classList.remove('has-value', 'level-critical', 'level-urgent', 'level-normal');
  document.querySelectorAll('#rLevelDropdown .cs-option').forEach(o => {
    o.classList.remove('cs-selected');
    o.querySelector('.cs-check').textContent = '';
  });
}


document.addEventListener('DOMContentLoaded', () => {
  seedSampleData();
  updateStats();
  renderRequests();
  renderNotifications();

  // Initial search shows all donors
  searchDonors();
});
