import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  canAccessAdminConsole,
  canAccessEditorialWorkspace,
  canAccessPeerReviewWorkspace,
  canManageReviewers,
  canReleasePublication,
  canSubmitPeerReview,
  canViewManuscript,
  filterVisibleComments,
} from '../domain/rbac';
import {
  calculateOverallScore,
  clampRubricScore,
  filterVisiblePeerReviews,
  validatePeerReviewInput,
} from '../domain/peerReview';
import type {
  AcademicJournal,
  AuditLog,
  EditorialComment,
  Manuscript,
  ManuscriptHistory,
  ManuscriptVersion,
  NotificationItem,
  PeerReview,
  PeerReviewAnnotation,
  PlatformSettings,
  PublicAuthorProfile,
  PublicationRecord,
  PublishingService,
  ServiceQuotation,
  UserProfile,
} from '../domain/types';
import { canTransitionStatus } from '../domain/workflow';
import { db, handleFirestoreError, OperationType } from './firebaseClient';
import type { IPublishingRepository } from './repository';
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_SERVICES,
  SAMPLE_JOURNALS,
  SAMPLE_PUBLIC_AUTHORS,
  SAMPLE_PUBLICATIONS,
} from './seedData';

function tsToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function clamp(str: string | undefined, max: number): string {
  return (str ?? '').trim().slice(0, max);
}

function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export class FirestoreRepository implements IPublishingRepository {
  private async logAudit(
    actor: UserProfile,
    action: string,
    targetType: string,
    targetId: string,
    summary: string,
  ): Promise<void> {
    const id = createId('log');
    try {
      await setDoc(doc(db, 'auditLogs', id), {
        id,
        actorId: actor.uid,
        actorName: clamp(actor.displayName, 120),
        action: clamp(action, 120),
        targetType: clamp(targetType, 80),
        targetId: clamp(targetId, 128),
        summary: clamp(summary, 600),
        createdAt: serverTimestamp(),
      });
    } catch {
      // Audit logging should not crash user flow if offline/transient
    }
  }

  private async notifyUser(
    userId: string,
    title: string,
    message: string,
    link?: string,
  ): Promise<void> {
    const id = createId('ntf');
    try {
      await setDoc(doc(db, 'notifications', id), {
        id,
        userId,
        title: clamp(title, 160),
        message: clamp(message, 600),
        link: link ? clamp(link, 300) : '',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal notification failure
    }
  }

  async getSettings(): Promise<PlatformSettings> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (!snap.exists()) return DEFAULT_PLATFORM_SETTINGS;
      const d = snap.data();
      return {
        id: d.id,
        platformName: d.platformName || DEFAULT_PLATFORM_SETTINGS.platformName,
        tagline: d.tagline,
        primaryColor: d.primaryColor || '#0F1E36',
        accentColor: d.accentColor || '#0F766E',
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
        businessAddress: d.businessAddress,
        aiAssistanceEnabled: Boolean(d.aiAssistanceEnabled),
        updatedAt: tsToIso(d.updatedAt),
      };
    } catch (error) {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<PlatformSettings>, actor: UserProfile): Promise<PlatformSettings> {
    if (!canAccessAdminConsole(actor)) {
      throw new Error('Unauthorized: Admin permissions required to update platform settings.');
    }
    const current = await this.getSettings();
    const merged = {
      id: 'global',
      platformName: clamp(settings.platformName ?? current.platformName, 120) || 'Griots Books',
      tagline: clamp(settings.tagline ?? current.tagline, 200),
      primaryColor: clamp(settings.primaryColor ?? current.primaryColor, 20) || '#0F1E36',
      accentColor: clamp(settings.accentColor ?? current.accentColor, 20) || '#0F766E',
      contactEmail: clamp(settings.contactEmail ?? current.contactEmail, 200),
      contactPhone: clamp(settings.contactPhone ?? current.contactPhone, 60),
      businessAddress: clamp(settings.businessAddress ?? current.businessAddress, 300),
      aiAssistanceEnabled: settings.aiAssistanceEnabled ?? current.aiAssistanceEnabled ?? false,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'settings', 'global'), merged);
      await this.logAudit(actor, 'update_settings', 'settings', 'global', 'Updated platform brand and business settings.');
      return { ...merged, updatedAt: new Date().toISOString() };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  }

  async listPublishedCatalogue(): Promise<PublicationRecord[]> {
    try {
      const q = query(collection(db, 'publications'), where('releaseStatus', '==', 'published'));
      const snap = await getDocs(q);
      const rows = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...(d as PublicationRecord),
          publishedAt: d.publishedAt ? tsToIso(d.publishedAt) : undefined,
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      return rows.length > 0 ? rows : SAMPLE_PUBLICATIONS;
    } catch {
      return SAMPLE_PUBLICATIONS;
    }
  }

  async getPublicationById(id: string): Promise<PublicationRecord | null> {
    const sample = SAMPLE_PUBLICATIONS.find((p) => p.id === id);
    try {
      const snap = await getDoc(doc(db, 'publications', id));
      if (!snap.exists()) return sample ?? null;
      const d = snap.data();
      return {
        ...(d as PublicationRecord),
        publishedAt: d.publishedAt ? tsToIso(d.publishedAt) : undefined,
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      };
    } catch {
      return sample ?? null;
    }
  }

  async listActiveServices(): Promise<PublishingService[]> {
    try {
      const q = query(collection(db, 'services'), where('active', '==', true));
      const snap = await getDocs(q);
      const rows = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...(d as PublishingService),
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      return rows.length > 0 ? rows : DEFAULT_SERVICES;
    } catch {
      return DEFAULT_SERVICES;
    }
  }

  async listAllServices(): Promise<PublishingService[]> {
    try {
      const snap = await getDocs(collection(db, 'services'));
      const rows = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...(d as PublishingService),
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      return rows.length > 0 ? rows : DEFAULT_SERVICES;
    } catch {
      return DEFAULT_SERVICES;
    }
  }

  async saveService(
    service: Partial<PublishingService> & { name: string },
    actor: UserProfile,
  ): Promise<PublishingService> {
    if (!canAccessAdminConsole(actor)) {
      throw new Error('Unauthorized: Admin permissions required to manage services.');
    }
    const id = service.id || createId('srv');
    const existingSnap = await getDoc(doc(db, 'services', id));
    const payload = {
      id,
      name: clamp(service.name, 140),
      description: clamp(service.description || 'Professional publishing service.', 1500),
      category: clamp(service.category || 'Manuscript Evaluation', 80),
      pricingMethod: service.pricingMethod || 'flat_fee',
      basePrice: Number(service.basePrice ?? 0),
      currency: clamp(service.currency || 'USD', 10),
      estimatedTurnaround: clamp(service.estimatedTurnaround || '7-10 business days', 80),
      requirements: clamp(service.requirements || '', 500),
      active: service.active ?? true,
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'services', id), payload);
      await this.logAudit(
        actor,
        existingSnap.exists() ? 'update_service' : 'create_service',
        'services',
        id,
        `${existingSnap.exists() ? 'Updated' : 'Created'} service "${payload.name}"`,
      );
      const nowIso = new Date().toISOString();
      return {
        ...payload,
        createdAt: existingSnap.exists() ? tsToIso(existingSnap.data().createdAt) : nowIso,
        updatedAt: nowIso,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `services/${id}`);
    }
  }

  async listJournals(): Promise<AcademicJournal[]> {
    try {
      const q = query(collection(db, 'journals'), where('active', '==', true));
      const snap = await getDocs(q);
      const rows = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...(d as AcademicJournal),
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      return rows.length > 0 ? rows : SAMPLE_JOURNALS;
    } catch {
      return SAMPLE_JOURNALS;
    }
  }

  async saveJournal(
    journal: Partial<AcademicJournal> & { title: string },
    actor: UserProfile,
  ): Promise<AcademicJournal> {
    if (!canAccessAdminConsole(actor)) {
      throw new Error('Unauthorized: Admin permissions required.');
    }
    const id = journal.id || createId('jrn');
    const existingSnap = await getDoc(doc(db, 'journals', id));
    const payload = {
      id,
      title: clamp(journal.title, 200),
      issn: clamp(journal.issn || '', 40),
      identifierStatus: journal.identifierStatus || 'unassigned',
      description: clamp(journal.description || '', 2000),
      discipline: clamp(journal.discipline || 'Interdisciplinary', 120),
      reviewModel: journal.reviewModel || 'double_anonymous',
      editorInChief: clamp(journal.editorInChief || '', 120),
      sections: (journal.sections || []).slice(0, 25),
      active: journal.active ?? true,
      isSample: journal.isSample ?? false,
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'journals', id), payload);
      await this.logAudit(actor, 'save_journal', 'journals', id, `Saved journal "${payload.title}"`);
      const nowIso = new Date().toISOString();
      return {
        ...payload,
        createdAt: existingSnap.exists() ? tsToIso(existingSnap.data().createdAt) : nowIso,
        updatedAt: nowIso,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `journals/${id}`);
    }
  }

  async listPublicAuthors(): Promise<PublicAuthorProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'publicProfiles'));
      const rows = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...(d as PublicAuthorProfile),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      return rows.length > 0 ? rows : SAMPLE_PUBLIC_AUTHORS;
    } catch {
      return SAMPLE_PUBLIC_AUTHORS;
    }
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        ...(d as UserProfile),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  }

  async upsertOwnProfile(profile: UserProfile): Promise<UserProfile> {
    const ref = doc(db, 'users', profile.uid);
    const existingSnap = await getDoc(ref);
    try {
      if (!existingSnap.exists()) {
        const createData = {
          uid: profile.uid,
          email: clamp(profile.email, 254),
          displayName: clamp(profile.displayName, 120) || 'Author',
          roles: ['author'],
          accountStatus: 'active',
          affiliation: clamp(profile.affiliation, 200),
          orcid: clamp(profile.orcid, 40),
          bio: clamp(profile.bio, 2000),
          country: clamp(profile.country, 100),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, createData);
      } else {
        await updateDoc(ref, {
          displayName: clamp(profile.displayName, 120) || existingSnap.data().displayName,
          affiliation: clamp(profile.affiliation, 200),
          orcid: clamp(profile.orcid, 40),
          bio: clamp(profile.bio, 2000),
          country: clamp(profile.country, 100),
          updatedAt: serverTimestamp(),
        });
      }

      // Sync non-PII public author profile
      await setDoc(doc(db, 'publicProfiles', profile.uid), {
        uid: profile.uid,
        displayName: clamp(profile.displayName, 120) || 'Author',
        affiliation: clamp(profile.affiliation, 200),
        bio: clamp(profile.bio, 2000),
        orcid: clamp(profile.orcid, 40),
        isSample: false,
        updatedAt: serverTimestamp(),
      });

      const refreshed = await this.getUserProfile(profile.uid);
      return refreshed ?? profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
    }
  }

  async listAllUsers(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...(d as UserProfile),
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  }

  async updateUserRolesAndStatus(
    targetUid: string,
    updates: Pick<UserProfile, 'roles' | 'accountStatus'>,
    actor: UserProfile,
  ): Promise<UserProfile> {
    if (!canAccessAdminConsole(actor)) {
      throw new Error('Unauthorized: Admin permissions required to change user roles.');
    }
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        roles: updates.roles.slice(0, 8),
        accountStatus: updates.accountStatus,
        updatedAt: serverTimestamp(),
      });
      await this.logAudit(
        actor,
        'update_user_roles',
        'users',
        targetUid,
        `Updated roles to [${updates.roles.join(', ')}] and status to ${updates.accountStatus}`,
      );
      const updated = await this.getUserProfile(targetUid);
      if (!updated) throw new Error('User not found after update.');
      return updated;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  }

  async listManuscriptsForActor(actor: UserProfile): Promise<Manuscript[]> {
    try {
      const col = collection(db, 'manuscripts');
      if (canAccessEditorialWorkspace(actor)) {
        const snap = await getDocs(query(col, orderBy('updatedAt', 'desc')));
        return snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              ...(d as Manuscript),
              createdAt: tsToIso(d.createdAt),
              updatedAt: tsToIso(d.updatedAt),
            };
          })
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }

      const queries = [getDocs(query(col, where('authorId', '==', actor.uid)))];
      if (actor.roles.includes('reviewer')) {
        queries.push(getDocs(query(col, where('assignedReviewerIds', 'array-contains', actor.uid))));
      }
      const snaps = await Promise.all(queries);
      const map = new Map<string, Manuscript>();
      for (const snap of snaps) {
        for (const docSnap of snap.docs) {
          const d = docSnap.data();
          map.set(docSnap.id, {
            ...(d as Manuscript),
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'manuscripts');
    }
  }

  async getManuscriptById(id: string, actor: UserProfile): Promise<Manuscript | null> {
    try {
      const snap = await getDoc(doc(db, 'manuscripts', id));
      if (!snap.exists()) return null;
      const d = snap.data();
      const ms = {
        ...(d as Manuscript),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      };
      if (!canViewManuscript(actor, ms)) {
        throw new Error('Forbidden: You do not have permission to view this manuscript.');
      }
      return ms;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `manuscripts/${id}`);
    }
  }

  async saveManuscript(manuscript: Manuscript, actor: UserProfile, actionLabel: string): Promise<Manuscript> {
    const id = manuscript.id || createId('ms');
    const ref = doc(db, 'manuscripts', id);
    const existingSnap = await getDoc(ref);
    const nowIso = new Date().toISOString();

    const data: Record<string, unknown> = {
      id,
      referenceNumber: clamp(manuscript.referenceNumber, 40),
      authorId: existingSnap.exists() ? existingSnap.data().authorId : actor.uid,
      authorName: clamp(manuscript.authorName || actor.displayName, 120),
      title: clamp(manuscript.title, 300),
      subtitle: clamp(manuscript.subtitle, 300),
      abstract: clamp(manuscript.abstract, 8000),
      publicationType: manuscript.publicationType,
      category: clamp(manuscript.category, 120),
      discipline: clamp(manuscript.discipline, 120),
      language: clamp(manuscript.language || 'English', 60),
      keywords: (manuscript.keywords || []).slice(0, 20),
      targetAudience: clamp(manuscript.targetAudience, 200),
      coauthors: (manuscript.coauthors || []).slice(0, 30),
      affiliation: clamp(manuscript.affiliation, 200),
      wordCount: Math.max(0, Math.min(2000000, Math.round(manuscript.wordCount || 0))),
      pageCount: Math.max(0, Math.min(50000, Math.round(manuscript.pageCount || 0))),
      objectives: clamp(manuscript.objectives, 2000),
      requestedServices: (manuscript.requestedServices || []).slice(0, 25),
      publicationPreference: manuscript.publicationPreference || 'consultation',
      status: manuscript.status,
      journalId: clamp(manuscript.journalId, 128),
      ethicsDeclaration: clamp(manuscript.ethicsDeclaration, 1500),
      conflictOfInterest: clamp(manuscript.conflictOfInterest, 1000),
      fundingInfo: clamp(manuscript.fundingInfo, 1000),
      dataAvailability: clamp(manuscript.dataAvailability, 1000),
      declarationsAccepted: Boolean(manuscript.declarationsAccepted),
      currentVersionNumber: manuscript.currentVersionNumber || 0,
      isSample: Boolean(manuscript.isSample),
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(ref, data);
      const historyId = createId('hist');
      await setDoc(doc(db, 'manuscripts', id, 'history', historyId), {
        id: historyId,
        manuscriptId: id,
        manuscriptAuthorId: data.authorId,
        actorId: actor.uid,
        actorName: clamp(actor.displayName, 120),
        action: clamp(actionLabel, 120),
        fromStatus: existingSnap.exists() ? existingSnap.data().status : '',
        toStatus: manuscript.status,
        details: clamp(`${actionLabel} (${manuscript.referenceNumber})`, 1000),
        createdAt: serverTimestamp(),
      });
      await this.logAudit(actor, actionLabel, 'manuscripts', id, `${actionLabel}: ${manuscript.referenceNumber}`);
      return {
        ...manuscript,
        id,
        authorId: String(data.authorId),
        createdAt: existingSnap.exists() ? tsToIso(existingSnap.data().createdAt) : nowIso,
        updatedAt: nowIso,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `manuscripts/${id}`);
    }
  }

  async listManuscriptVersions(manuscriptId: string, actor: UserProfile): Promise<ManuscriptVersion[]> {
    try {
      const col = collection(db, 'manuscripts', manuscriptId, 'versions');
      if (canAccessEditorialWorkspace(actor)) {
        const snap = await getDocs(col);
        return snap.docs
          .map((d) => ({
            ...(d.data() as ManuscriptVersion),
            createdAt: tsToIso(d.data().createdAt),
          }))
          .sort((a, b) => b.versionNumber - a.versionNumber);
      }
      const queries = [getDocs(query(col, where('manuscriptAuthorId', '==', actor.uid)))];
      if (actor.roles.includes('reviewer')) {
        queries.push(getDocs(query(col, where('assignedReviewerIds', 'array-contains', actor.uid))));
      }
      const snaps = await Promise.all(queries);
      const map = new Map<string, ManuscriptVersion>();
      for (const snap of snaps) {
        for (const d of snap.docs) {
          map.set(d.id, {
            ...(d.data() as ManuscriptVersion),
            createdAt: tsToIso(d.data().createdAt),
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => b.versionNumber - a.versionNumber);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `manuscripts/${manuscriptId}/versions`);
    }
  }

  async addManuscriptVersion(
    manuscript: Manuscript,
    file: File,
    notes: string,
    actor: UserProfile,
    authToken: string | null,
  ): Promise<ManuscriptVersion> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('manuscriptId', manuscript.id);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Upload failed.' }));
      throw new Error(errBody.error || 'Private manuscript upload failed.');
    }

    const uploaded = (await res.json()) as {
      storageKey: string;
      sha256: string;
      sizeBytes: number;
      mimeType: string;
      fileName: string;
    };

    const existingVersions = await this.listManuscriptVersions(manuscript.id, actor);
    const nextVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
      : 1;
    const versionId = createId('ver');

    const payload = {
      id: versionId,
      manuscriptId: manuscript.id,
      manuscriptAuthorId: manuscript.authorId,
      assignedReviewerIds: (manuscript.assignedReviewerIds || []).slice(0, 15),
      versionNumber: nextVersion,
      fileName: clamp(uploaded.fileName, 255),
      mimeType: clamp(uploaded.mimeType, 120),
      sizeBytes: uploaded.sizeBytes,
      storageKey: clamp(uploaded.storageKey, 300),
      sha256: clamp(uploaded.sha256, 128),
      uploadedBy: actor.uid,
      uploadedByName: clamp(actor.displayName, 120),
      notes: clamp(notes, 1000),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'manuscripts', manuscript.id, 'versions', versionId), payload);
      await updateDoc(doc(db, 'manuscripts', manuscript.id), {
        currentVersionNumber: nextVersion,
        updatedAt: serverTimestamp(),
      });
      const historyId = createId('hist');
      await setDoc(doc(db, 'manuscripts', manuscript.id, 'history', historyId), {
        id: historyId,
        manuscriptId: manuscript.id,
        manuscriptAuthorId: manuscript.authorId,
        actorId: actor.uid,
        actorName: clamp(actor.displayName, 120),
        action: `Uploaded manuscript version v${nextVersion}`,
        details: clamp(`${uploaded.fileName}${notes ? ` — ${notes}` : ''}`, 1000),
        createdAt: serverTimestamp(),
      });
      return {
        ...payload,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `manuscripts/${manuscript.id}/versions/${versionId}`);
    }
  }

  getVersionDownloadUrl(manuscriptId: string, storageKey: string): string {
    return `/api/files/download/${encodeURIComponent(manuscriptId)}/${encodeURIComponent(storageKey)}`;
  }

  async listManuscriptComments(manuscriptId: string, actor: UserProfile): Promise<EditorialComment[]> {
    try {
      const col = collection(db, 'manuscripts', manuscriptId, 'comments');
      const targetQuery = canAccessEditorialWorkspace(actor)
        ? col
        : query(col, where('manuscriptAuthorId', '==', actor.uid), where('visibility', '==', 'author_visible'));
      const snap = await getDocs(targetQuery);
      const list = snap.docs
        .map((d) => ({
          ...(d.data() as EditorialComment),
          createdAt: tsToIso(d.data().createdAt),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return filterVisibleComments(actor, list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `manuscripts/${manuscriptId}/comments`);
    }
  }

  async addManuscriptComment(
    manuscript: Manuscript,
    comment: Omit<EditorialComment, 'id' | 'createdAt'>,
    actor: UserProfile,
  ): Promise<EditorialComment> {
    const id = createId('cmt');
    const payload = {
      id,
      manuscriptId: manuscript.id,
      manuscriptAuthorId: manuscript.authorId,
      authorId: actor.uid,
      authorName: clamp(actor.displayName, 120),
      authorRole: clamp(comment.authorRole || actor.roles[0] || 'author', 60),
      visibility: canAccessEditorialWorkspace(actor) ? comment.visibility : 'author_visible',
      commentType: comment.commentType,
      body: clamp(comment.body, 5000),
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'manuscripts', manuscript.id, 'comments', id), payload);
      if (payload.visibility === 'author_visible' && actor.uid !== manuscript.authorId) {
        await this.notifyUser(
          manuscript.authorId,
          `Editorial feedback on ${manuscript.referenceNumber}`,
          `${actor.displayName} posted a ${payload.commentType.replace('_', ' ')} on "${manuscript.title}".`,
          `/dashboard/manuscripts/${manuscript.id}`,
        );
      }
      return { ...payload, createdAt: new Date().toISOString() };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `manuscripts/${manuscript.id}/comments/${id}`);
    }
  }

  async listManuscriptHistory(manuscriptId: string, actor: UserProfile): Promise<ManuscriptHistory[]> {
    try {
      const col = collection(db, 'manuscripts', manuscriptId, 'history');
      const targetQuery = canAccessEditorialWorkspace(actor)
        ? col
        : query(col, where('manuscriptAuthorId', '==', actor.uid));
      const snap = await getDocs(targetQuery);
      return snap.docs
        .map((d) => ({
          ...(d.data() as ManuscriptHistory),
          createdAt: tsToIso(d.data().createdAt),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `manuscripts/${manuscriptId}/history`);
    }
  }

  async transitionManuscriptStatus(
    manuscript: Manuscript,
    nextStatus: Manuscript['status'],
    note: string,
    actor: UserProfile,
  ): Promise<Manuscript> {
    const check = canTransitionStatus(
      manuscript.status,
      nextStatus,
      manuscript.publicationType,
      actor,
      manuscript.authorId,
    );
    if (!check.allowed) {
      throw new Error(check.reason || 'Status transition not allowed.');
    }

    try {
      await updateDoc(doc(db, 'manuscripts', manuscript.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      const historyId = createId('hist');
      await setDoc(doc(db, 'manuscripts', manuscript.id, 'history', historyId), {
        id: historyId,
        manuscriptId: manuscript.id,
        manuscriptAuthorId: manuscript.authorId,
        actorId: actor.uid,
        actorName: clamp(actor.displayName, 120),
        action: 'Status transition',
        fromStatus: manuscript.status,
        toStatus: nextStatus,
        details: clamp(note || `Changed status from ${manuscript.status} to ${nextStatus}`, 1000),
        createdAt: serverTimestamp(),
      });
      if (actor.uid !== manuscript.authorId) {
        await this.notifyUser(
          manuscript.authorId,
          `Status updated: ${manuscript.referenceNumber}`,
          `Your manuscript "${manuscript.title}" moved to ${nextStatus.replace(/_/g, ' ')}.${note ? ` Note: ${note}` : ''}`,
          `/dashboard/manuscripts/${manuscript.id}`,
        );
      }
      await this.logAudit(
        actor,
        'transition_status',
        'manuscripts',
        manuscript.id,
        `Transitioned ${manuscript.referenceNumber} from ${manuscript.status} to ${nextStatus}`,
      );
      return {
        ...manuscript,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `manuscripts/${manuscript.id}`);
    }
  }

  async assignEditor(
    manuscript: Manuscript,
    editorId: string,
    editorName: string,
    actor: UserProfile,
  ): Promise<Manuscript> {
    if (!canAccessEditorialWorkspace(actor)) {
      throw new Error('Unauthorized: Editorial permissions required.');
    }
    try {
      await updateDoc(doc(db, 'manuscripts', manuscript.id), {
        assignedEditorId: clamp(editorId, 128),
        assignedEditorName: clamp(editorName, 120),
        updatedAt: serverTimestamp(),
      });
      const historyId = createId('hist');
      await setDoc(doc(db, 'manuscripts', manuscript.id, 'history', historyId), {
        id: historyId,
        manuscriptId: manuscript.id,
        manuscriptAuthorId: manuscript.authorId,
        actorId: actor.uid,
        actorName: clamp(actor.displayName, 120),
        action: 'Editor assigned',
        details: `Assigned ${editorName} as handling editor.`,
        createdAt: serverTimestamp(),
      });
      return {
        ...manuscript,
        assignedEditorId: editorId,
        assignedEditorName: editorName,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `manuscripts/${manuscript.id}`);
    }
  }

  async listAssignableReviewers(actor: UserProfile): Promise<UserProfile[]> {
    if (!canManageReviewers(actor)) {
      throw new Error('Unauthorized: Editorial permissions required to list reviewers.');
    }
    try {
      const all = await this.listAllUsers();
      return all
        .filter((u) => u.accountStatus === 'active')
        .sort((a, b) => {
          const aRev = a.roles.includes('reviewer') ? 0 : 1;
          const bRev = b.roles.includes('reviewer') ? 0 : 1;
          if (aRev !== bRev) return aRev - bRev;
          return a.displayName.localeCompare(b.displayName);
        });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  }

  async assignReviewers(
    manuscript: Manuscript,
    reviewerIds: string[],
    actor: UserProfile,
  ): Promise<Manuscript> {
    if (!canManageReviewers(actor)) {
      throw new Error('Unauthorized: Editorial permissions required to assign peer reviewers.');
    }
    const cleanIds = Array.from(
      new Set(reviewerIds.map((id) => clamp(id, 128)).filter((id) => id.length > 0 && id !== manuscript.authorId)),
    ).slice(0, 15);
    const previous = new Set(manuscript.assignedReviewerIds || []);
    const newlyAdded = cleanIds.filter((id) => !previous.has(id));

    try {
      await updateDoc(doc(db, 'manuscripts', manuscript.id), {
        assignedReviewerIds: cleanIds,
        updatedAt: serverTimestamp(),
      });
      // Sync assignedReviewerIds on manuscript file versions so reviewers can list files
      const verSnap = await getDocs(collection(db, 'manuscripts', manuscript.id, 'versions'));
      await Promise.all(
        verSnap.docs.map((verDoc) =>
          updateDoc(verDoc.ref, { assignedReviewerIds: cleanIds }),
        ),
      );

      const historyId = createId('hist');
      await setDoc(doc(db, 'manuscripts', manuscript.id, 'history', historyId), {
        id: historyId,
        manuscriptId: manuscript.id,
        manuscriptAuthorId: manuscript.authorId,
        actorId: actor.uid,
        actorName: clamp(actor.displayName, 120),
        action: 'Peer reviewers updated',
        details: `Assigned ${cleanIds.length} peer reviewer${cleanIds.length === 1 ? '' : 's'}.`,
        createdAt: serverTimestamp(),
      });

      await Promise.all(
        newlyAdded.map((reviewerId) =>
          this.notifyUser(
            reviewerId,
            `Peer review assignment: ${manuscript.referenceNumber}`,
            `${actor.displayName} assigned you to peer review "${manuscript.title}".`,
            `/editorial/manuscripts/${manuscript.id}`,
          ),
        ),
      );

      await this.logAudit(
        actor,
        'assign_reviewers',
        'manuscripts',
        manuscript.id,
        `Updated assigned reviewers (${cleanIds.length}) for ${manuscript.referenceNumber}`,
      );

      return {
        ...manuscript,
        assignedReviewerIds: cleanIds,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `manuscripts/${manuscript.id}`);
    }
  }

  async listPeerReviews(manuscriptId: string, actor: UserProfile): Promise<PeerReview[]> {
    if (!canAccessPeerReviewWorkspace(actor)) {
      throw new Error('Unauthorized: Editorial or Reviewer permissions required.');
    }
    try {
      const col = collection(db, 'manuscripts', manuscriptId, 'reviews');
      const targetQuery = canAccessEditorialWorkspace(actor)
        ? col
        : query(col, where('reviewerId', '==', actor.uid));
      const snap = await getDocs(targetQuery);
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as PeerReview),
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      return filterVisiblePeerReviews(actor, rows).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `manuscripts/${manuscriptId}/reviews`);
    }
  }

  async savePeerReview(
    manuscript: Manuscript,
    review: Omit<PeerReview, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    actor: UserProfile,
  ): Promise<PeerReview> {
    if (!canSubmitPeerReview(actor, manuscript)) {
      throw new Error('Forbidden: You are not assigned as a peer reviewer for this manuscript.');
    }
    const sanitizedAnnotations: PeerReviewAnnotation[] = (review.annotations || [])
      .slice(0, 30)
      .map((ann, index) => ({
        id: clamp(ann.id || `ann_${index + 1}`, 128),
        section: ann.section,
        locationRef: clamp(ann.locationRef, 120),
        severity: ann.severity,
        comment: clamp(ann.comment, 1500),
      }));

    const normalizedScores = {
      originality: clampRubricScore(review.rubricScores.originality),
      rigor: clampRubricScore(review.rubricScores.rigor),
      clarity: clampRubricScore(review.rubricScores.clarity),
      citations: clampRubricScore(review.rubricScores.citations),
    };

    const validation = validatePeerReviewInput({
      rubricScores: normalizedScores,
      summaryFeedback: review.summaryFeedback,
      annotations: sanitizedAnnotations,
      status: review.status,
    });
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid peer review submission.');
    }

    const reviewId = clamp(review.id || `rev_${actor.uid}`, 128);
    const ref = doc(db, 'manuscripts', manuscript.id, 'reviews', reviewId);
    const overallScore = calculateOverallScore(normalizedScores);

    try {
      const existingSnap = await getDoc(ref);
      const payload = {
        id: reviewId,
        manuscriptId: manuscript.id,
        manuscriptAuthorId: manuscript.authorId,
        reviewerId: actor.uid,
        reviewerName: clamp(actor.displayName, 120),
        reviewerAffiliation: clamp(actor.affiliation || '', 200),
        recommendation: review.recommendation,
        rubricScores: normalizedScores,
        overallScore,
        summaryFeedback: clamp(review.summaryFeedback, 5000),
        confidentialEditorNote: clamp(review.confidentialEditorNote || '', 2000),
        annotations: sanitizedAnnotations,
        status: review.status,
        createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);

      if (review.status === 'submitted' && manuscript.assignedEditorId && manuscript.assignedEditorId !== actor.uid) {
        await this.notifyUser(
          manuscript.assignedEditorId,
          `Peer review submitted: ${manuscript.referenceNumber}`,
          `${actor.displayName} submitted a peer review (${overallScore.toFixed(1)}/5) for "${manuscript.title}".`,
          `/editorial/manuscripts/${manuscript.id}`,
        );
      }

      const nowIso = new Date().toISOString();
      return {
        ...payload,
        createdAt: existingSnap.exists() ? tsToIso(existingSnap.data().createdAt) : nowIso,
        updatedAt: nowIso,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `manuscripts/${manuscript.id}/reviews/${reviewId}`);
    }
  }

  async listQuotationsForActor(actor: UserProfile): Promise<ServiceQuotation[]> {
    try {
      const col = collection(db, 'quotations');
      const q = canAccessEditorialWorkspace(actor) || canAccessAdminConsole(actor)
        ? col
        : query(col, where('authorId', '==', actor.uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({
          ...(d.data() as ServiceQuotation),
          createdAt: tsToIso(d.data().createdAt),
          updatedAt: tsToIso(d.data().updatedAt),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'quotations');
    }
  }

  async createQuotationRequest(
    input: { manuscriptId: string; manuscriptTitle: string; serviceIds: string[]; notes: string; estimatedAmount: number; currency: string },
    actor: UserProfile,
  ): Promise<ServiceQuotation> {
    const id = createId('qt');
    const payload = {
      id,
      manuscriptId: input.manuscriptId,
      manuscriptTitle: clamp(input.manuscriptTitle, 300),
      authorId: actor.uid,
      serviceIds: input.serviceIds.slice(0, 20),
      notes: clamp(input.notes, 2000),
      status: 'requested' as const,
      estimatedAmount: Number(input.estimatedAmount || 0),
      currency: clamp(input.currency || 'USD', 10),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'quotations', id), payload);
      await this.logAudit(actor, 'request_quotation', 'quotations', id, `Requested quotation for manuscript ${input.manuscriptId}`);
      const nowIso = new Date().toISOString();
      return { ...payload, createdAt: nowIso, updatedAt: nowIso };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `quotations/${id}`);
    }
  }

  async updateQuotation(
    id: string,
    updates: Partial<Pick<ServiceQuotation, 'status' | 'estimatedAmount' | 'confirmedAmount' | 'notes'>>,
    actor: UserProfile,
  ): Promise<ServiceQuotation> {
    try {
      const ref = doc(db, 'quotations', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Quotation not found.');
      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      await this.logAudit(actor, 'update_quotation', 'quotations', id, `Updated quotation status to ${updates.status || snap.data().status}`);
      const next = await getDoc(ref);
      const d = next.data()!;
      return {
        ...(d as ServiceQuotation),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotations/${id}`);
    }
  }

  async listAllPublications(actor: UserProfile): Promise<PublicationRecord[]> {
    if (!canReleasePublication(actor) && !canAccessAdminConsole(actor)) {
      throw new Error('Unauthorized: Publishing manager permissions required.');
    }
    try {
      const snap = await getDocs(collection(db, 'publications'));
      return snap.docs.map((d) => ({
        ...(d.data() as PublicationRecord),
        publishedAt: d.data().publishedAt ? tsToIso(d.data().publishedAt) : undefined,
        createdAt: tsToIso(d.data().createdAt),
        updatedAt: tsToIso(d.data().updatedAt),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'publications');
    }
  }

  async savePublication(
    publication: Partial<PublicationRecord> & { title: string },
    actor: UserProfile,
  ): Promise<PublicationRecord> {
    if (!canReleasePublication(actor)) {
      throw new Error('Unauthorized: Publishing Manager or Admin role required to manage catalogue releases.');
    }
    const id = publication.id || createId('pub');
    const ref = doc(db, 'publications', id);
    const existingSnap = await getDoc(ref);
    const releaseStatus = publication.releaseStatus || 'approved';
    const payload: Record<string, unknown> = {
      id,
      manuscriptId: clamp(publication.manuscriptId || '', 128),
      authorId: clamp(publication.authorId || actor.uid, 128),
      authorName: clamp(publication.authorName || actor.displayName, 120),
      title: clamp(publication.title, 300),
      subtitle: clamp(publication.subtitle || '', 300),
      abstract: clamp(publication.abstract || '', 8000),
      publicationType: clamp(publication.publicationType || 'book', 60),
      category: clamp(publication.category || 'General', 120),
      format: publication.format || 'digital',
      accessType: publication.accessType || 'free',
      price: Number(publication.price ?? 0),
      currency: clamp(publication.currency || 'USD', 10),
      isbn: clamp(publication.isbn || '', 40),
      issn: clamp(publication.issn || '', 40),
      doi: clamp(publication.doi || '', 120),
      identifierStatus: publication.identifierStatus || 'unassigned',
      coverUrl: clamp(publication.coverUrl || '', 500),
      excerpt: clamp(publication.excerpt || '', 12000),
      releaseStatus,
      isSample: Boolean(publication.isSample),
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (releaseStatus === 'published') {
      payload.publishedAt = serverTimestamp();
    } else if (existingSnap.exists() && existingSnap.data()?.publishedAt) {
      payload.publishedAt = existingSnap.data().publishedAt;
    }

    try {
      await setDoc(ref, payload);
      if (publication.manuscriptId && releaseStatus === 'published') {
        await updateDoc(doc(db, 'manuscripts', publication.manuscriptId), {
          status: 'published',
          updatedAt: serverTimestamp(),
        });
      }
      await this.logAudit(
        actor,
        'save_publication',
        'publications',
        id,
        `Saved publication "${payload.title}" (${releaseStatus})`,
      );
      const nowIso = new Date().toISOString();
      return {
        ...(payload as unknown as PublicationRecord),
        publishedAt: releaseStatus === 'published' ? nowIso : undefined,
        createdAt: existingSnap.exists() ? tsToIso(existingSnap.data().createdAt) : nowIso,
        updatedAt: nowIso,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `publications/${id}`);
    }
  }

  async listNotifications(userId: string): Promise<NotificationItem[]> {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({
          ...(d.data() as NotificationItem),
          createdAt: tsToIso(d.data().createdAt),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  }

  async listAuditLogs(actor: UserProfile): Promise<AuditLog[]> {
    if (!canAccessAdminConsole(actor)) {
      throw new Error('Unauthorized: Admin permissions required to view audit logs.');
    }
    try {
      const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        ...(d.data() as AuditLog),
        createdAt: tsToIso(d.data().createdAt),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  }
}
