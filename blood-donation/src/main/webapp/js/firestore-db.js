// ===== FIRESTORE DATA LAYER =====
const COLLECTIONS = {
  DONORS: 'donors',
  REQUESTS: 'requests',
  NOTIFICATIONS: 'notifications',
  META: 'meta',
};

let donorsCache = [];
let requestsCache = [];
let notificationsCache = [];
let firestoreReady = false;
const pollTimers = {};
const pollListeners = { donors: [], requests: [], notifications: [] };
const POLL_MS = 8000;

function addPollListener(key, fn) {
  if (typeof fn !== 'function') return;
  if (!pollListeners[key].includes(fn)) pollListeners[key].push(fn);
}

function notifyPollListeners(key, data) {
  pollListeners[key].forEach(fn => {
    try { fn(data); } catch (err) { console.error(`${key} listener:`, err); }
  });
}

const SAMPLE_DONORS = [
  { name: 'Kamal Perera',     age: 28, blood: 'O+',  phone: '+94 71 234 5678', location: 'Colombo',     email: 'kamal@example.com',  donations: 12, date: '2026-01-15' },
  { name: 'Nimal Silva',      age: 35, blood: 'A+',  phone: '+94 77 345 6789', location: 'Kandy',       email: '',                   donations: 9,  date: '2026-02-10' },
  { name: 'Priya Rajapaksa',  age: 24, blood: 'B+',  phone: '+94 76 456 7890', location: 'Galle',       email: 'priya@example.com',  donations: 10, date: '2026-01-28' },
  { name: 'Saman Fernando',   age: 42, blood: 'AB+', phone: '+94 70 567 8901', location: 'Colombo',     email: '',                   donations: 4,  date: '2026-03-05' },
  { name: 'Amara Dissanayake',age: 31, blood: 'O-',  phone: '+94 72 678 9012', location: 'Gampaha',     email: 'amara@example.com',  donations: 7,  date: '2026-02-20' },
  { name: 'Ravi Kumar',       age: 27, blood: 'B-',  phone: '+94 75 789 0123', location: 'Jaffna',      email: '',                   donations: 6,  date: '2026-03-12' },
  { name: 'Dilani Wijesinghe',age: 33, blood: 'A-',  phone: '+94 78 890 1234', location: 'Colombo',     email: 'dilani@example.com', donations: 5,  date: '2026-01-08' },
  { name: 'Suresh Nair',      age: 29, blood: 'AB-', phone: '+94 71 901 2345', location: 'Trincomalee', email: '',                   donations: 3,  date: '2026-03-18' },
];

const SAMPLE_REQUESTS = [
  { hospital: 'Colombo National Hospital', blood: 'O+', location: 'Colombo', contact: '+94 11 269 1111', level: 'critical', units: 3, date: '2026-04-29', time: '08:30', lat: 6.9147, lng: 79.8613 },
  { hospital: 'Kandy Teaching Hospital',   blood: 'A+', location: 'Kandy',   contact: '+94 81 222 2222', level: 'urgent',   units: 2, date: '2026-04-29', time: '10:15', lat: 7.2914, lng: 80.6368 },
  { hospital: 'Karapitiya Hospital',       blood: 'B-', location: 'Galle',   contact: '+94 91 222 3333', level: 'normal',   units: 1, date: '2026-04-28', time: '14:00', lat: 6.0580, lng: 80.2175 },
];

const SAMPLE_NOTIFICATIONS = [
  { type: 'emergency', icon: '🚨', title: 'Emergency: O+ Blood Needed', msg: 'Colombo National Hospital urgently needs O+ blood. 3 units required.', time: '2 hours ago', read: false },
  { type: 'hospital',  icon: '🏥', title: 'New Request: Kandy Hospital', msg: 'Kandy Teaching Hospital posted a request for A+ blood (2 units).', time: '4 hours ago', read: false },
  { type: 'reminder',  icon: '💉', title: 'Donation Reminder', msg: 'It has been 3 months since your last donation. You are eligible to donate again!', time: '1 day ago', read: true },
  { type: 'hospital',  icon: '🏥', title: 'Request Fulfilled', msg: 'Thank you! The B+ blood request from Galle Hospital has been fulfilled.', time: '2 days ago', read: true },
];

function docToObject(doc) {
  return { id: doc.id, ...doc.data() };
}

function donorKey(d) {
  if (d.uid) return `uid:${d.uid}`;
  const phone = (d.phone || '').replace(/\D/g, '');
  if (phone) return `phone:${phone}`;
  return `name:${d.name}|${d.blood}|${d.location}`;
}

function requestKey(r) {
  return `${r.hospital}|${r.blood}|${r.date}|${r.time}|${r.location}`;
}

function dedupeByKey(items, keyFn) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
      continue;
    }
    const preferNew = item.id?.startsWith('seed-') && !existing.id?.startsWith('seed-');
    if (preferNew || (item.donations || 0) > (existing.donations || 0)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

function dedupeDonors(donors) { return dedupeByKey(donors, donorKey); }
function dedupeRequests(requests) { return dedupeByKey(requests, requestKey); }

function notificationKey(n) {
  return `${n.type}|${n.title}|${n.msg}`;
}

function dedupeNotifications(items) { return dedupeByKey(items, notificationKey); }

function seedDonorId(donor) {
  const phone = (donor.phone || '').replace(/\D/g, '');
  return phone ? `seed-donor-${phone}` : `seed-donor-${donor.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function seedRequestId(req) {
  const slug = `${req.hospital}-${req.blood}-${req.date}-${req.time}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `seed-req-${slug}`;
}

function seedNotifId(notif) {
  const slug = `${notif.type}-${notif.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `seed-notif-${slug}`;
}

function sortDonors(donors) {
  return donors.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function sortByCreatedAt(items) {
  return items.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });
}

function getDonors()   { return donorsCache; }
function getRequests() { return requestsCache; }
function getNotifications() { return notificationsCache; }

function getDb() {
  return window.db;
}

async function seedFirestoreIfEmpty() {
  const db = getDb();
  if (!db) return;
  const donorsSnap = await db.collection(COLLECTIONS.DONORS).limit(1).get();
  if (!donorsSnap.empty) return;

  const batch = db.batch();
  const now = firebase.firestore.FieldValue.serverTimestamp();

  SAMPLE_DONORS.forEach(donor => {
    batch.set(db.collection(COLLECTIONS.DONORS).doc(seedDonorId(donor)), {
      ...donor, seed: true, createdAt: now,
    }, { merge: true });
  });
  SAMPLE_REQUESTS.forEach(req => {
    batch.set(db.collection(COLLECTIONS.REQUESTS).doc(seedRequestId(req)), {
      ...req, seed: true, createdAt: now,
    }, { merge: true });
  });
  SAMPLE_NOTIFICATIONS.forEach(notif => {
    batch.set(db.collection(COLLECTIONS.NOTIFICATIONS).doc(seedNotifId(notif)), {
      ...notif, seed: true, createdAt: now,
    }, { merge: true });
  });
  batch.set(db.collection(COLLECTIONS.META).doc('seeded'), {
    seeded: true,
    seededAt: now,
    source: 'client',
  });

  await batch.commit();
}

async function loadAllData() {
  const db = getDb();
  if (!db) return;

  const [donorsSnap, requestsSnap, notifsSnap] = await Promise.all([
    db.collection(COLLECTIONS.DONORS).get(),
    db.collection(COLLECTIONS.REQUESTS).get(),
    db.collection(COLLECTIONS.NOTIFICATIONS).get(),
  ]);

  donorsCache = sortDonors(dedupeDonors(donorsSnap.docs.map(docToObject)));
  requestsCache = sortByCreatedAt(dedupeRequests(requestsSnap.docs.map(docToObject)));
  notificationsCache = sortByCreatedAt(dedupeNotifications(notifsSnap.docs.map(docToObject))).slice(0, 50);
}

async function reloadNotifications() {
  const db = getDb();
  if (!db) return notificationsCache;
  const snap = await db.collection(COLLECTIONS.NOTIFICATIONS).get();
  notificationsCache = sortByCreatedAt(dedupeNotifications(snap.docs.map(docToObject))).slice(0, 50);
  return notificationsCache;
}

async function upsertUserProfile(user, role = 'donor') {
  if (!user) return role;
  const db = getDb();
  if (!db) return role;
  const ref = db.collection(COLLECTIONS.DONORS).doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    const existingRole = snap.data().role || 'donor';
    if (role === 'recipient' && existingRole === 'donor') {
      await ref.set({ role: 'recipient' }, { merge: true });
      return 'recipient';
    }
    return existingRole;
  }

  await ref.set({
    uid: user.uid,
    role,
    name: user.displayName || user.email.split('@')[0],
    email: user.email || '',
    age: null,
    blood: '',
    phone: '',
    location: '',
    donations: role === 'donor' ? 0 : null,
    date: new Date().toISOString().split('T')[0],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return role;
}

async function upsertDonorProfile(user) {
  return upsertUserProfile(user, 'donor');
}

async function addRequest(req) {
  const db = getDb();
  if (!db) throw new Error('Database not connected. Please refresh the page.');

  const payload = { ...req };
  if (payload.lat == null) delete payload.lat;
  if (payload.lng == null) delete payload.lng;

  const user = window.auth?.currentUser;
  if (user) {
    payload.uid = user.uid;
    if (user.email) payload.postedBy = user.email;
    if (user.displayName) payload.postedByName = user.displayName;
  }

  const ref = await db.collection(COLLECTIONS.REQUESTS).add({
    ...payload,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  const newReq = {
    id: ref.id,
    ...payload,
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
  };
  requestsCache = sortByCreatedAt(dedupeRequests([...requestsCache, newReq]));
  refreshRequests().catch(err => console.warn('Requests refresh after add:', err));
  return ref.id;
}

async function addNotification(notif) {
  const db = getDb();
  await db.collection(COLLECTIONS.NOTIFICATIONS).add({
    ...notif,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteNotification(id) {
  const db = getDb();
  await db.collection(COLLECTIONS.NOTIFICATIONS).doc(id).delete();
}

async function clearAllNotifications() {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.NOTIFICATIONS).get();
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

function rankLeaderboardDonors(donors) {
  return dedupeDonors(donors)
    .sort((a, b) => (b.donations || 0) - (a.donations || 0))
    .map((d, i) => ({ rank: i + 1, ...d }));
}

async function getLeaderboard() {
  const db = getDb();
  if (!db) return rankLeaderboardDonors(getDonors());
  const snap = await db.collection(COLLECTIONS.DONORS).get();
  return rankLeaderboardDonors(snap.docs.map(docToObject));
}

async function refreshDonors() {
  const db = getDb();
  if (!db) return;
  try {
    const snap = await db.collection(COLLECTIONS.DONORS).get();
    donorsCache = sortDonors(dedupeDonors(snap.docs.map(docToObject)));
    notifyPollListeners('donors', donorsCache);
  } catch (err) {
    console.error('Donors refresh:', err);
  }
}

async function refreshRequests() {
  const db = getDb();
  if (!db) return;
  try {
    const snap = await db.collection(COLLECTIONS.REQUESTS).get();
    requestsCache = sortByCreatedAt(dedupeRequests(snap.docs.map(docToObject)));
    notifyPollListeners('requests', requestsCache);
  } catch (err) {
    console.error('Requests refresh:', err);
  }
}

async function refreshNotifications() {
  const db = getDb();
  if (!db) return;
  try {
    const snap = await db.collection(COLLECTIONS.NOTIFICATIONS).get();
    notificationsCache = sortByCreatedAt(dedupeNotifications(snap.docs.map(docToObject))).slice(0, 50);
    notifyPollListeners('notifications', notificationsCache);
  } catch (err) {
    console.error('Notifications refresh:', err);
  }
}

function startPolling(key, refreshFn) {
  if (!pollTimers[key]) {
    refreshFn();
    pollTimers[key] = setInterval(refreshFn, POLL_MS);
  }
}

function subscribeDonors(onUpdate) {
  addPollListener('donors', onUpdate);
  if (onUpdate) onUpdate(donorsCache);
  startPolling('donors', refreshDonors);
}

function subscribeRequests(onUpdate) {
  addPollListener('requests', onUpdate);
  if (onUpdate) onUpdate(requestsCache);
  startPolling('requests', refreshRequests);
}

function subscribeNotifications(onUpdate) {
  addPollListener('notifications', onUpdate);
  if (onUpdate) onUpdate(notificationsCache);
  startPolling('notifications', refreshNotifications);
}

async function fetchStats() {
  const db = getDb();
  if (!db) return { donors: 0, requests: 0 };

  const [donorsSnap, requestsSnap] = await Promise.all([
    db.collection(COLLECTIONS.DONORS).get(),
    db.collection(COLLECTIONS.REQUESTS).get(),
  ]);

  const donors = dedupeDonors(donorsSnap.docs.map(docToObject));
  const requests = dedupeRequests(requestsSnap.docs.map(docToObject));
  return { donors: donors.length, requests: requests.length };
}

async function initFirestore(onReady) {
  const db = getDb();
  if (!db) {
    console.error('Firestore db not initialized');
    return;
  }

  if (firestoreReady) {
    if (onReady) onReady();
    return;
  }

  try {
    await seedFirestoreIfEmpty().catch(err => console.warn('Seed skipped:', err));
    await loadAllData();
    firestoreReady = true;
    if (onReady) onReady();
  } catch (err) {
    console.error('Firestore init failed:', err);
    firestoreReady = true;
    if (onReady) onReady();
    if (typeof showToast === 'function') {
      showToast('Could not connect to database. Please refresh.', 'error');
    }
  }
}

window.refreshRequests = refreshRequests;
window.getDonors = getDonors;
window.getRequests = getRequests;
window.getNotifications = getNotifications;
window.initFirestore = initFirestore;
window.fetchStats = fetchStats;
window.subscribeDonors = subscribeDonors;
window.subscribeRequests = subscribeRequests;
window.subscribeNotifications = subscribeNotifications;
window.addRequest = addRequest;
window.addNotification = addNotification;
window.deleteNotification = deleteNotification;
window.clearAllNotifications = clearAllNotifications;
window.getLeaderboard = getLeaderboard;
window.rankLeaderboardDonors = rankLeaderboardDonors;
window.reloadNotifications = reloadNotifications;
window.upsertUserProfile = upsertUserProfile;
window.upsertDonorProfile = upsertDonorProfile;

// ===== HOME STATS (load + count-up animation) =====
const counterTimers = {};

function animateCounter(id, target, duration = 1500) {
  const el = document.getElementById(id);
  if (!el) return;
  if (counterTimers[id]) clearInterval(counterTimers[id]);
  if (target <= 0) { el.textContent = '0'; return; }

  let current = 0;
  const step = target / (duration / 16);
  counterTimers[id] = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target;
      clearInterval(counterTimers[id]);
      delete counterTimers[id];
    } else {
      el.textContent = Math.max(1, Math.floor(current));
    }
  }, 16);
}

async function refreshHomeStats() {
  const db = getDb();
  if (!db) return;
  try {
    const stats = await fetchStats();
    animateCounter('stat-donors', stats.donors);
    animateCounter('stat-requests', stats.requests);
    animateCounter('stat-saved', Math.floor(stats.donors * 2.3));
  } catch (err) {
    console.error('refreshHomeStats:', err);
  }
}

window.animateCounter = animateCounter;
window.refreshHomeStats = refreshHomeStats;
window.updateStats = refreshHomeStats;

function startBloodCareApp() {
  initFirestore(async () => {
    await refreshHomeStats();
    if (typeof window.bootApp === 'function') window.bootApp();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.db) return;
  startBloodCareApp();
});

window.addEventListener('load', () => {
  if (window.db) refreshHomeStats();
});
