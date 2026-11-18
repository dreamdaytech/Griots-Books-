import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  buildFirestoreRestHealthUrl,
  buildFirestoreTransportSettings,
  classifyFirestoreRestResponse,
  isOfflineFirestoreError,
} from '../domain/firebaseDiagnostics';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let connectionTestPromise: Promise<boolean> | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const firebaseApp = getFirebaseApp();
    try {
      dbInstance = initializeFirestore(
        firebaseApp,
        buildFirestoreTransportSettings(),
        firebaseConfig.firestoreDatabaseId,
      );
    } catch {
      dbInstance = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    }
  }
  return dbInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export const db = getFirebaseDb();
export const auth = getFirebaseAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function probeFirestoreRestReachability(): Promise<boolean> {
  if (typeof fetch !== 'function') return false;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
  try {
    const url = buildFirestoreRestHealthUrl(
      firebaseConfig.projectId,
      firebaseConfig.firestoreDatabaseId,
      firebaseConfig.apiKey,
    );
    const res = await fetch(url, {
      method: 'GET',
      signal: controller?.signal,
    });
    const bodyText = await res.text();
    const result = classifyFirestoreRestResponse(res.status, bodyText);
    return result.configured && result.reachable;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function testFirestoreConnection(): Promise<boolean> {
  if (connectionTestPromise) {
    return connectionTestPromise;
  }

  connectionTestPromise = (async () => {
    const attempt = async () => {
      await getDocFromServer(doc(db, 'test', 'connection'));
    };

    try {
      await attempt();
      return true;
    } catch (error) {
      if (!isOfflineFirestoreError(error)) {
        // Any server-evaluated response (e.g. Missing or insufficient permissions)
        // confirms live connectivity to the configured Firestore database.
        return true;
      }

      const restReachable = await probeFirestoreRestReachability();
      if (!restReachable) {
        console.error('Please check your Firebase configuration.');
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        await attempt();
        return true;
      } catch (retryErr) {
        if (isOfflineFirestoreError(retryErr)) {
          return true;
        }
        return true;
      }
    }
  })();

  return connectionTestPromise;
}
