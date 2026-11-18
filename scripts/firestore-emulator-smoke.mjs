#!/usr/bin/env node
/**
 * Offline Firestore emulator smoke test for the named Griots Books database.
 * Tests deny-by-default access on unauthenticated requests.
 * No production credentials or Firebase API calls are used.
 */
import assert from 'node:assert/strict';

const databaseId = 'ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf';
const projectId = 'demo-griots-books';
const isTransition = process.env.GRIOTS_FIRESTORE_RULESET === 'transition';
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const root = `http://${host}/v1/projects/${projectId}/databases/${databaseId}/documents`;

async function check(name, path, expectedStatus, options = {}) {
  const response = await fetch(`${root}/${path}`, options);
  let responseText = '';
  try { responseText = (await response.text()).slice(0, 300); } catch {}
  assert.equal(response.status, expectedStatus,
    `${name}: expected HTTP ${expectedStatus}, got ${response.status}. ${responseText}`);
  console.log(`PASS: ${name} (${expectedStatus})`);
}

console.log(`Testing ${isTransition ? 'temporary compatibility' : 'final privacy'} rules for named emulator database ${databaseId}`);
await check(
  isTransition ? 'legacy author-list access during transition' : 'unauthenticated unfiltered private profile listing denied',
  'publicProfiles',
  isTransition ? 200 : 403,
);
await check('unfiltered publication listing denied', 'publications', 403);
await check('private manuscript listing denied', 'manuscripts', 403);
await check('unauthenticated publication write denied', 'publications', 403, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ fields: { title: { stringValue: 'unauthorized' } } }),
});
console.log('PASS: named-database rules compiled and unauthenticated access smoke tests succeeded.');
