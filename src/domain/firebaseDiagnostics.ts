import type { FirestoreSettings } from 'firebase/firestore';

export type CompatFirestoreSettings = FirestoreSettings & {
  useFetchStreams?: boolean;
};

export interface FirestoreRestHealthResult {
  configured: boolean;
  reachable: boolean;
  reason: 'ok' | 'permission_denied' | 'database_not_found' | 'invalid_config' | 'unreachable';
}

export function buildFirestoreTransportSettings(): CompatFirestoreSettings {
  return {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 8,
    },
    useFetchStreams: false,
  };
}

export function isOfflineFirestoreError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { message?: unknown; code?: unknown };
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';
  const code = typeof record.code === 'string' ? record.code.toLowerCase() : '';
  return message.includes('the client is offline') || code === 'unavailable';
}

export function buildFirestoreRestHealthUrl(
  projectId: string,
  databaseId: string,
  apiKey: string,
): string {
  const safeProject = encodeURIComponent(projectId);
  const safeDb = encodeURIComponent(databaseId || '(default)');
  const safeKey = encodeURIComponent(apiKey);
  return `https://firestore.googleapis.com/v1/projects/${safeProject}/databases/${safeDb}/documents/settings/global?key=${safeKey}`;
}

export function classifyFirestoreRestResponse(
  status: number,
  bodyText: string,
): FirestoreRestHealthResult {
  const lower = bodyText.toLowerCase();

  if (status === 200) {
    return { configured: true, reachable: true, reason: 'ok' };
  }

  if (status === 403) {
    if (lower.includes('api key not valid') || lower.includes('api_key_invalid')) {
      return { configured: false, reachable: true, reason: 'invalid_config' };
    }
    return { configured: true, reachable: true, reason: 'permission_denied' };
  }

  if (status === 404) {
    if (lower.includes('database') && lower.includes('does not exist')) {
      return { configured: false, reachable: true, reason: 'database_not_found' };
    }
    return { configured: true, reachable: true, reason: 'ok' };
  }

  if (status === 400) {
    return { configured: false, reachable: true, reason: 'invalid_config' };
  }

  if (status === 401) {
    return { configured: true, reachable: true, reason: 'permission_denied' };
  }

  return { configured: false, reachable: false, reason: 'unreachable' };
}
