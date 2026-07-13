#!/usr/bin/env node
/**
 * Remove duplicate Firestore records (keeps one per unique donor/request/notification).
 * Run: npm run dedupe
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { donorKey, requestKey, notificationKey } from './firestore-utils.mjs';

const firebaseConfig = {
  apiKey:            'AIzaSyBMNkoovZcsUWR6lJmOBQS-DNUc1g7ZOG0',
  authDomain:        'bloodcare-5a516.firebaseapp.com',
  projectId:         'bloodcare-5a516',
  storageBucket:     'bloodcare-5a516.firebasestorage.app',
  messagingSenderId: '903309908627',
  appId:             '1:903309908627:web:f2a20203b3d3a03023cb66',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function pickKeeper(docs, keyFn) {
  const groups = new Map();

  for (const doc of docs) {
    const data = doc.data();
    const key = keyFn(data);
    const list = groups.get(key) || [];
    list.push({ ref: doc.ref, data, id: doc.id });
    groups.set(key, list);
  }

  const toDelete = [];
  for (const [, list] of groups) {
    if (list.length <= 1) continue;

    list.sort((a, b) => {
      const aSeed = a.id.startsWith('seed-') ? 0 : 1;
      const bSeed = b.id.startsWith('seed-') ? 0 : 1;
      if (aSeed !== bSeed) return aSeed - bSeed;
      const ta = a.data.createdAt?.seconds || 0;
      const tb = b.data.createdAt?.seconds || 0;
      return ta - tb;
    });

    const [, ...dupes] = list;
    toDelete.push(...dupes.map(d => d.ref));
  }

  return toDelete;
}

async function deleteRefs(refs) {
  if (!refs.length) return 0;

  let deleted = 0;
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
    deleted += Math.min(400, refs.length - i);
  }
  return deleted;
}

async function dedupeCollection(name, keyFn) {
  const snap = await getDocs(collection(db, name));
  const refs = pickKeeper(snap.docs, keyFn);
  const deleted = await deleteRefs(refs);
  console.log(`  ${name}: ${snap.size} total → removed ${deleted} duplicates → ${snap.size - deleted} left`);
  return deleted;
}

async function main() {
  console.log('Deduplicating bloodcare-5a516…\n');
  let total = 0;
  total += await dedupeCollection('donors', donorKey);
  total += await dedupeCollection('requests', requestKey);
  total += await dedupeCollection('notifications', notificationKey);
  console.log(`\n✅ Done — removed ${total} duplicate records. Refresh the app.`);
}

main().catch(err => {
  console.error('Dedupe failed:', err.message);
  process.exit(1);
});
