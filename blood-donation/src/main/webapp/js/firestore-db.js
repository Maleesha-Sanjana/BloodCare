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
  { hospital: 'Colombo National Hospital', blood: 'O+', location: 'Colombo', contact: '+94 11 269 1111', level: 'critical', units: 3, date: '2026-04-29', time: '08:30' },
  { hospital: 'Kandy Teaching Hospital',   blood: 'A+', location: 'Kandy',   contact: '+94 81 222 2222', level: 'urgent',   units: 2, date: '2026-04-29', time: '10:15' },
  { hospital: 'Karapitiya Hospital',       blood: 'B-', location: 'Galle',   contact: '+94 91 222 3333', level: 'normal',   units: 1, date: '2026-04-28', time: '14:00' },
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
    batch.set(db.collection(COLLECTIONS.DONORS).doc(), { ...donor, createdAt: now });
  });
  SAMPLE_REQUESTS.forEach(req => {
    batch.set(db.collection(COLLECTIONS.REQUESTS).doc(), { ...req, createdAt: now });
  });
  SAMPLE_NOTIFICATIONS.forEach(notif => {
    batch.set(db.collection(COLLECTIONS.NOTIFICATIONS).doc(), { ...notif, createdAt: now });
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

  donorsCache = sortDonors(donorsSnap.docs.map(docToObject));
  requestsCache = sortByCreatedAt(requestsSnap.docs.map(docToObject));
  notificationsCache = sortByCreatedAt(notifsSnap.docs.map(docToObject)).slice(0, 50);
}

async function upsertDonorProfile(user) {
  if (!user) return;
  const db = getDb();
  if (!db) return;
  const ref = db.collection(COLLECTIONS.DONORS).doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return;

  await ref.set({
    uid: user.uid,
    name: user.displayName || user.email.split('@')[0],
    email: user.email || '',
    age: null,
    blood: '',
    phone: '',
    location: '',
    donations: 0,
    date: new Date().toISOString().split('T')[0],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function addRequest(req) {
  const db = getDb();
  const ref = await db.collection(COLLECTIONS.REQUESTS).add({
    ...req,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
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

async function getLeaderboard(limit = 10) {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.DONORS)
    .orderBy('donations', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((doc, i) => ({
    rank: i + 1,
    id: doc.id,
    ...doc.data(),
  }));
}

function subscribeDonors(onUpdate) {
  const db = getDb();
  if (!db) return;
  return db.collection(COLLECTIONS.DONORS)
    .onSnapshot(snap => {
      donorsCache = sortDonors(snap.docs.map(docToObject));
      if (onUpdate) onUpdate(donorsCache);
    }, err => console.error('Donors listener:', err));
}

function subscribeRequests(onUpdate) {
  const db = getDb();
  if (!db) return;
  return db.collection(COLLECTIONS.REQUESTS)
    .onSnapshot(snap => {
      requestsCache = sortByCreatedAt(snap.docs.map(docToObject));
      if (onUpdate) onUpdate(requestsCache);
    }, err => console.error('Requests listener:', err));
}

function subscribeNotifications(onUpdate) {
  const db = getDb();
  if (!db) return;
  return db.collection(COLLECTIONS.NOTIFICATIONS)
    .onSnapshot(snap => {
      notificationsCache = sortByCreatedAt(snap.docs.map(docToObject)).slice(0, 50);
      if (onUpdate) onUpdate(notificationsCache);
    }, err => console.error('Notifications listener:', err));
}

async function fetchStats() {
  const db = getDb();
  if (!db) return { donors: 0, requests: 0 };

  const [donorsSnap, requestsSnap] = await Promise.all([
    db.collection(COLLECTIONS.DONORS).get(),
    db.collection(COLLECTIONS.REQUESTS).get(),
  ]);

  return { donors: donorsSnap.size, requests: requestsSnap.size };
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
