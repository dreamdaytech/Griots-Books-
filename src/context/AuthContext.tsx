import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, testFirestoreConnection } from '../data/firebaseClient';
import { FirestoreRepository } from '../data/firestoreRepository';
import type { IPublishingRepository } from '../data/repository';
import { SandboxRepository } from '../data/sandboxRepository';
import { sanitizePublicRegistrationRoles } from '../domain/rbac';
import type { UserProfile, UserRole } from '../domain/types';
import { usePlatform } from './PlatformContext';

export type AuthMode = 'guest' | 'firebase' | 'sandbox';

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  authMode: AuthMode;
  authReady: boolean;
  repo: IPublishingRepository;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (input: {
    email: string;
    password: string;
    displayName: string;
    affiliation?: string;
    roleIntent?: UserRole;
  }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  enterSandboxSession: (sandboxUid: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  downloadPrivateFile: (manuscriptId: string, storageKey: string, fileName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SANDBOX_STORAGE_KEY = 'pp_sandbox_uid';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSettings, notify } = usePlatform();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('guest');
  const [authReady, setAuthReady] = useState<boolean>(false);

  const firestoreRepo = useMemo(() => new FirestoreRepository(), []);
  const sandboxRepo = useMemo(() => new SandboxRepository(), []);

  const repo: IPublishingRepository = useMemo(() => {
    return authMode === 'firebase' ? firestoreRepo : sandboxRepo;
  }, [authMode, firestoreRepo, sandboxRepo]);

  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  useEffect(() => {
    repo.getSettings().then((s) => setSettings(s)).catch(() => {});
  }, [repo, setSettings]);

  const hydrateFirebaseUser = useCallback(
    async (fbUser: FirebaseUser) => {
      try {
        let profile = await firestoreRepo.getUserProfile(fbUser.uid);
        if (!profile) {
          const now = new Date().toISOString();
          const draftProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Author',
            roles: ['author'],
            accountStatus: fbUser.emailVerified ? 'active' : 'pending_verification',
            createdAt: now,
            updatedAt: now,
          };
          if (fbUser.emailVerified) {
            profile = await firestoreRepo.upsertOwnProfile(draftProfile);
          } else {
            profile = draftProfile;
          }
        }
        setUser(profile);
        setAuthMode('firebase');
      } catch (err) {
        notify(
          err instanceof Error ? err.message : 'Could not load Firebase user profile.',
          'error',
        );
      }
    },
    [firestoreRepo, notify],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
        await hydrateFirebaseUser(fbUser);
        setAuthReady(true);
        return;
      }

      const savedSandboxUid = window.sessionStorage.getItem(SANDBOX_STORAGE_KEY);
      if (savedSandboxUid) {
        try {
          const sbUser = await sandboxRepo.getUserProfile(savedSandboxUid);
          if (sbUser) {
            setUser(sbUser);
            setAuthMode('sandbox');
            setAuthReady(true);
            return;
          }
        } catch {
          window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
        }
      }

      setUser(null);
      setAuthMode('guest');
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [hydrateFirebaseUser, sandboxRepo]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    await hydrateFirebaseUser(cred.user);
    notify('Signed in with Google.', 'success');
  }, [hydrateFirebaseUser, notify]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
      await hydrateFirebaseUser(cred.user);
      notify('Signed in successfully.', 'success');
    },
    [hydrateFirebaseUser, notify],
  );

  const registerWithEmail = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName: string;
      affiliation?: string;
      roleIntent?: UserRole;
    }) => {
      const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
      await updateProfile(cred.user, { displayName: input.displayName });
      await sendEmailVerification(cred.user);
      const safeRoles = sanitizePublicRegistrationRoles(
        input.roleIntent ? [input.roleIntent] : ['author'],
      );
      const now = new Date().toISOString();
      const pendingProfile: UserProfile = {
        uid: cred.user.uid,
        email: input.email,
        displayName: input.displayName,
        roles: safeRoles,
        accountStatus: 'pending_verification',
        affiliation: input.affiliation || '',
        createdAt: now,
        updatedAt: now,
      };
      setUser(pendingProfile);
      setAuthMode('firebase');
      notify('Account created. Please check your inbox to verify your email address.', 'info');
    },
    [notify],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      await sendPasswordResetEmail(auth, email);
      notify('Password reset instructions sent to your email address.', 'success');
    },
    [notify],
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
    notify('Verification email sent.', 'success');
  }, [notify]);

  const enterSandboxSession = useCallback(
    async (sandboxUid: string) => {
      const sbUser = await sandboxRepo.getUserProfile(sandboxUid);
      if (!sbUser) {
        throw new Error('Sample sandbox account not found.');
      }
      window.sessionStorage.setItem(SANDBOX_STORAGE_KEY, sandboxUid);
      setUser(sbUser);
      setAuthMode('sandbox');
      notify(`Entered sample evaluation workspace as ${sbUser.displayName}.`, 'info');
    },
    [notify, sandboxRepo],
  );

  const logout = useCallback(async () => {
    window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    if (auth.currentUser) {
      await signOut(auth);
    }
    setUser(null);
    setFirebaseUser(null);
    setAuthMode('guest');
    notify('Signed out.', 'info');
  }, [notify]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    if (authMode === 'firebase' && firebaseUser) {
      await hydrateFirebaseUser(firebaseUser);
    } else if (authMode === 'sandbox') {
      const updated = await sandboxRepo.getUserProfile(user.uid);
      if (updated) setUser(updated);
    }
  }, [authMode, firebaseUser, hydrateFirebaseUser, sandboxRepo, user]);

  const getIdToken = useCallback(async () => {
    if (authMode === 'firebase' && auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    return null;
  }, [authMode]);

  const downloadPrivateFile = useCallback(
    async (manuscriptId: string, storageKey: string, fileName: string) => {
      const url = repo.getVersionDownloadUrl(manuscriptId, storageKey);
      const headers: Record<string, string> = {};
      if (authMode === 'firebase' && auth.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      } else if (authMode === 'sandbox' && user) {
        headers['x-sandbox-uid'] = user.uid;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download forbidden or unavailable.' }));
        throw new Error(err.error || 'Authorized file download failed.');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    },
    [authMode, repo, user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        authMode,
        authReady,
        repo,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        requestPasswordReset,
        resendVerificationEmail,
        enterSandboxSession,
        logout,
        refreshProfile,
        getIdToken,
        downloadPrivateFile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
