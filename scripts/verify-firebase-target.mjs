#!/usr/bin/env node
/**
 * Griots Books deployment guard: run before any manual Firebase rules deployment.
 * No authenticated Firebase calls or deployments are performed by this script.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const expectedProject = 'subscription-tracker-92b0b';
const expectedDb = 'ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf';

const app = JSON.parse(readFileSync(resolve('firebase-applet-config.json'), 'utf8'));
const firebaseJson = JSON.parse(readFileSync(resolve('firebase.json'), 'utf8'));
const rulesConfigs = Array.isArray(firebaseJson.firestore) ? firebaseJson.firestore : [firebaseJson.firestore];
const ruleSource = readFileSync(resolve('firestore.rules'), 'utf8');

if (app.projectId !== expectedProject || app.firestoreDatabaseId !== expectedDb) {
  throw new Error('ABORT: application Firebase project/database identifiers do not match the reviewed Griots Books target.');
}
if (rulesConfigs.length !== 1 || rulesConfigs[0]?.database !== expectedDb || rulesConfigs[0]?.rules !== 'firestore.rules') {
  throw new Error('ABORT: firebase.json must target only the reviewed named database and firestore.rules.');
}
if (!existsSync(resolve(rulesConfigs[0].rules))) {
  throw new Error('ABORT: Firestore rules file is missing.');
}
if (!ruleSource.includes('match /publicProfiles/{userId}') || !ruleSource.includes('match /publications/{publicationId}') ||
    !ruleSource.includes("'previewEnabled'") || !ruleSource.includes("'isPublic'")) {
  throw new Error('ABORT: expected profile and publication rules are missing.');
}

const transitionConfig = JSON.parse(readFileSync(resolve('firebase.transition.json'), 'utf8'));
const transitionTargets = Array.isArray(transitionConfig.firestore) ? transitionConfig.firestore : [transitionConfig.firestore];
if (transitionTargets.length !== 1 || transitionTargets[0]?.database !== expectedDb ||
    transitionTargets[0]?.rules !== 'firestore.transition.rules') {
  throw new Error('ABORT: temporary deployment config targets an unexpected database or rules file.');
}
const bridgeRules = readFileSync(resolve('firestore.transition.rules'), 'utf8');
const protectedProfileRule = `    match /publicProfiles/{userId} {
      allow get: if isValidId(userId) && (
        (('isPublic' in existing()) && existing().isPublic == true) ||
        isOwner(userId) || isAdmin()
      );
      allow list: if (('isPublic' in resource.data) && resource.data.isPublic == true) || isAdmin();`;
const bridgeProfileRule = `    // TEMPORARY deployment bridge: preserve the current public author directory until
    // the new opt-in-aware client has been released. Remove this bridge immediately
    // after switching clients to the new guarded directory queries.
    // WARNING: This phase does NOT enforce profile opt-out privacy.
    match /publicProfiles/{userId} {
      allow get: if isValidId(userId);
      allow list: if true;`;
if (!ruleSource.includes(protectedProfileRule) || !bridgeRules.includes(bridgeProfileRule) ||
    bridgeRules !== ruleSource.replace(protectedProfileRule, bridgeProfileRule)) {
  throw new Error('ABORT: transitional Firestore rules contain changes beyond the intended public-profile bridge.');
}
console.log('Firebase target preflight passed: both deployment configs target the same single named database.');
console.log('Transitional rules differ from final rules only in public-profile get/list access.');
console.log('This does NOT confirm the deployed rules, database existence, region, or access permissions.');
