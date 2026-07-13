#!/usr/bin/env node
/**
 * Seed BloodCare Firestore with dummy test data (stable IDs — no duplicates).
 *
 *   npm run seed        — seed only if empty
 *   npm run seed:reset  — dedupe + upsert canonical seed records
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import {
  donorDocId,
  requestDocId,
  notificationDocId,
} from './firestore-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESET = process.argv.includes('--reset');

const firebaseConfig = {
  apiKey:            'AIzaSyBMNkoovZcsUWR6lJmOBQS-DNUc1g7ZOG0',
  authDomain:        'bloodcare-5a516.firebaseapp.com',
  projectId:         'bloodcare-5a516',
  storageBucket:     'bloodcare-5a516.firebasestorage.app',
  messagingSenderId: '903309908627',
  appId:             '1:903309908627:web:f2a20203b3d3a03023cb66',
};

const data = JSON.parse(readFileSync(join(__dirname, 'seed-data.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function hasData() {
  const donors = await getDocs(query(collection(db, 'donors'), limit(1)));
  return !donors.empty;
}

async function seed() {
  if (!RESET && await hasData()) {
    console.log('Already seeded. Run: npm run dedupe  or  npm run seed:reset');
    process.exit(0);
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  data.donors.forEach(donor => {
    batch.set(doc(db, 'donors', donorDocId(donor)), {
      ...donor,
      seed: true,
      createdAt: now,
    }, { merge: true });
  });

  data.requests.forEach(req => {
    batch.set(doc(db, 'requests', requestDocId(req)), {
      ...req,
      seed: true,
      createdAt: now,
    }, { merge: true });
  });

  data.notifications.forEach(notif => {
    batch.set(doc(db, 'notifications', notificationDocId(notif)), {
      ...notif,
      seed: true,
      createdAt: now,
    }, { merge: true });
  });

  batch.set(doc(db, 'meta', 'seeded'), {
    seeded: true,
    seededAt: now,
    source: 'cli',
    version: 3,
  }, { merge: true });

  await batch.commit();

  console.log(`\n✅ Seeded bloodcare-5a516 (stable IDs — safe to re-run):`);
  console.log(`   ${data.donors.length} donors`);
  console.log(`   ${data.requests.length} requests`);
  console.log(`   ${data.notifications.length} notifications`);
  console.log('\n   Refresh http://localhost:5500/index.html');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
