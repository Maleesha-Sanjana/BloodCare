#!/usr/bin/env node
/**
 * Seed BloodCare Firestore with dummy data (uses client SDK + open rules).
 * Run: npm run seed   (from blood-donation/)
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes('--force');

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
  const requests = await getDocs(query(collection(db, 'requests'), limit(1)));
  return !donors.empty && !requests.empty;
}

async function seed() {
  if (!FORCE && await hasData()) {
    console.log('Already seeded. Use --force to add more dummy data.');
    process.exit(0);
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  data.donors.forEach(donor => {
    batch.set(doc(collection(db, 'donors')), { ...donor, createdAt: now });
  });

  data.requests.forEach(req => {
    batch.set(doc(collection(db, 'requests')), { ...req, createdAt: now });
  });

  data.notifications.forEach(notif => {
    batch.set(doc(collection(db, 'notifications')), { ...notif, createdAt: now });
  });

  batch.set(doc(db, 'meta', 'seeded'), {
    seeded: true,
    seededAt: now,
    source: 'cli',
  });

  await batch.commit();

  console.log(`Seeded bloodcare-5a516:`);
  console.log(`  ${data.donors.length} donors`);
  console.log(`  ${data.requests.length} requests`);
  console.log(`  ${data.notifications.length} notifications`);
  console.log('\nRefresh the app — home stats should show 8 donors, 3 requests.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
