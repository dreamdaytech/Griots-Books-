import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFirestoreRestHealthUrl,
  buildFirestoreTransportSettings,
  classifyFirestoreRestResponse,
  isOfflineFirestoreError,
} from './firebaseDiagnostics';

test('buildFirestoreTransportSettings disables fetch streams and configures bounded XHR long polling', () => {
  const settings = buildFirestoreTransportSettings();
  assert.equal(settings.experimentalForceLongPolling, true);
  assert.equal(settings.useFetchStreams, false);
  assert.ok(settings.experimentalLongPollingOptions?.timeoutSeconds !== undefined);
  assert.ok(
    settings.experimentalLongPollingOptions.timeoutSeconds >= 5 &&
      settings.experimentalLongPollingOptions.timeoutSeconds < 10,
    'Long polling timeout must be within SDK [5, 30] and below 10s OnlineStateTracker threshold',
  );
});

test('isOfflineFirestoreError detects offline message and unavailable code', () => {
  assert.equal(
    isOfflineFirestoreError(new Error('Failed to get document because the client is offline.')),
    true,
  );
  assert.equal(isOfflineFirestoreError({ code: 'unavailable', message: 'Network error' }), true);
  assert.equal(
    isOfflineFirestoreError(new Error('Missing or insufficient permissions.')),
    false,
  );
  assert.equal(isOfflineFirestoreError(null), false);
});

test('classifyFirestoreRestResponse distinguishes valid project/database from misconfiguration', () => {
  assert.deepEqual(classifyFirestoreRestResponse(200, '{}'), {
    configured: true,
    reachable: true,
    reason: 'ok',
  });
  assert.deepEqual(
    classifyFirestoreRestResponse(404, '{"error":{"status":"NOT_FOUND","message":"Document not found"}}'),
    {
      configured: true,
      reachable: true,
      reason: 'ok',
    },
  );
  assert.deepEqual(
    classifyFirestoreRestResponse(403, '{"error":{"status":"PERMISSION_DENIED"}}'),
    {
      configured: true,
      reachable: true,
      reason: 'permission_denied',
    },
  );
  assert.deepEqual(
    classifyFirestoreRestResponse(
      404,
      '{"error":{"status":"NOT_FOUND","message":"Database (default) does not exist"}}',
    ),
    {
      configured: false,
      reachable: true,
      reason: 'database_not_found',
    },
  );
  assert.deepEqual(
    classifyFirestoreRestResponse(400, '{"error":{"message":"API key not valid"}}'),
    {
      configured: false,
      reachable: true,
      reason: 'invalid_config',
    },
  );
});

test('buildFirestoreRestHealthUrl targets configured database and settings/global document', () => {
  const url = buildFirestoreRestHealthUrl('proj-1', 'db-custom', 'key-123');
  assert.equal(
    url,
    'https://firestore.googleapis.com/v1/projects/proj-1/databases/db-custom/documents/settings/global?key=key-123',
  );
});
