import type {
  AcademicJournal,
  AuditLog,
  EditorialComment,
  Manuscript,
  ManuscriptHistory,
  ManuscriptVersion,
  NotificationItem,
  PeerReview,
  PlatformSettings,
  PublicAuthorProfile,
  PublicationRecord,
  PublishingService,
  ServiceQuotation,
  UserProfile,
} from '../domain/types';
import type { IPublishingRepository } from './repository';

/**
 * Server-backed Demo Sandbox repository communicating with Express /api/sandbox/*
 * so that evaluation journeys run against real backend validation, private file storage,
 * and disk-persisted state without modifying live Firebase production collections.
 */
export class SandboxRepository implements IPublishingRepository {
  private getHeaders(actorUid?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (actorUid) {
      headers['x-sandbox-uid'] = actorUid;
    }
    return headers;
  }

  private async request<T>(url: string, options: RequestInit = {}, actorUid?: string): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(actorUid),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  }

  async getSettings(): Promise<PlatformSettings> {
    return this.request<PlatformSettings>('/api/sandbox/settings');
  }

  async updateSettings(settings: Partial<PlatformSettings>, actor: UserProfile): Promise<PlatformSettings> {
    return this.request<PlatformSettings>(
      '/api/sandbox/settings',
      { method: 'PUT', body: JSON.stringify(settings) },
      actor.uid,
    );
  }

  async listPublishedCatalogue(): Promise<PublicationRecord[]> {
    return this.request<PublicationRecord[]>('/api/sandbox/publications/public');
  }

  async getPublicationById(id: string): Promise<PublicationRecord | null> {
    try {
      return await this.request<PublicationRecord>(`/api/sandbox/publications/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  async listActiveServices(): Promise<PublishingService[]> {
    const all = await this.request<PublishingService[]>('/api/sandbox/services');
    return all.filter((s) => s.active);
  }

  async listAllServices(): Promise<PublishingService[]> {
    return this.request<PublishingService[]>('/api/sandbox/services');
  }

  async saveService(
    service: Partial<PublishingService> & { name: string },
    actor: UserProfile,
  ): Promise<PublishingService> {
    return this.request<PublishingService>(
      '/api/sandbox/services',
      { method: 'POST', body: JSON.stringify(service) },
      actor.uid,
    );
  }

  async listJournals(): Promise<AcademicJournal[]> {
    return this.request<AcademicJournal[]>('/api/sandbox/journals');
  }

  async saveJournal(
    journal: Partial<AcademicJournal> & { title: string },
    actor: UserProfile,
  ): Promise<AcademicJournal> {
    return this.request<AcademicJournal>(
      '/api/sandbox/journals',
      { method: 'POST', body: JSON.stringify(journal) },
      actor.uid,
    );
  }

  async listPublicAuthors(): Promise<PublicAuthorProfile[]> {
    return this.request<PublicAuthorProfile[]>('/api/sandbox/authors/public');
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      return await this.request<UserProfile>(`/api/sandbox/users/${encodeURIComponent(uid)}`, {}, uid);
    } catch {
      return null;
    }
  }

  async upsertOwnProfile(profile: UserProfile): Promise<UserProfile> {
    return this.request<UserProfile>(
      `/api/sandbox/users/${encodeURIComponent(profile.uid)}`,
      { method: 'PUT', body: JSON.stringify(profile) },
      profile.uid,
    );
  }

  async listAllUsers(): Promise<UserProfile[]> {
    return this.request<UserProfile[]>('/api/sandbox/users', {}, 'sandbox_admin');
  }

  async updateUserRolesAndStatus(
    targetUid: string,
    updates: Pick<UserProfile, 'roles' | 'accountStatus'>,
    actor: UserProfile,
  ): Promise<UserProfile> {
    return this.request<UserProfile>(
      `/api/sandbox/users/${encodeURIComponent(targetUid)}/roles`,
      { method: 'PATCH', body: JSON.stringify(updates) },
      actor.uid,
    );
  }

  async listManuscriptsForActor(actor: UserProfile): Promise<Manuscript[]> {
    return this.request<Manuscript[]>('/api/sandbox/manuscripts', {}, actor.uid);
  }

  async getManuscriptById(id: string, actor: UserProfile): Promise<Manuscript | null> {
    return this.request<Manuscript>(`/api/sandbox/manuscripts/${encodeURIComponent(id)}`, {}, actor.uid);
  }

  async saveManuscript(manuscript: Manuscript, actor: UserProfile, actionLabel: string): Promise<Manuscript> {
    return this.request<Manuscript>(
      '/api/sandbox/manuscripts',
      { method: 'POST', body: JSON.stringify({ manuscript, actionLabel }) },
      actor.uid,
    );
  }

  async listManuscriptVersions(manuscriptId: string, actor: UserProfile): Promise<ManuscriptVersion[]> {
    return this.request<ManuscriptVersion[]>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscriptId)}/versions`,
      {},
      actor.uid,
    );
  }

  async addManuscriptVersion(
    manuscript: Manuscript,
    file: File,
    notes: string,
    actor: UserProfile,
  ): Promise<ManuscriptVersion> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('manuscriptId', manuscript.id);
    formData.append('notes', notes);

    const res = await fetch('/api/sandbox/files/upload', {
      method: 'POST',
      headers: {
        'x-sandbox-uid': actor.uid,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json() as Promise<ManuscriptVersion>;
  }

  getVersionDownloadUrl(manuscriptId: string, storageKey: string): string {
    return `/api/files/download/${encodeURIComponent(manuscriptId)}/${encodeURIComponent(storageKey)}`;
  }

  async listManuscriptComments(manuscriptId: string, actor: UserProfile): Promise<EditorialComment[]> {
    return this.request<EditorialComment[]>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscriptId)}/comments`,
      {},
      actor.uid,
    );
  }

  async addManuscriptComment(
    manuscript: Manuscript,
    comment: Omit<EditorialComment, 'id' | 'createdAt'>,
    actor: UserProfile,
  ): Promise<EditorialComment> {
    return this.request<EditorialComment>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscript.id)}/comments`,
      { method: 'POST', body: JSON.stringify(comment) },
      actor.uid,
    );
  }

  async listManuscriptHistory(manuscriptId: string, actor: UserProfile): Promise<ManuscriptHistory[]> {
    return this.request<ManuscriptHistory[]>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscriptId)}/history`,
      {},
      actor.uid,
    );
  }

  async transitionManuscriptStatus(
    manuscript: Manuscript,
    nextStatus: Manuscript['status'],
    note: string,
    actor: UserProfile,
  ): Promise<Manuscript> {
    return this.request<Manuscript>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscript.id)}/transition`,
      { method: 'POST', body: JSON.stringify({ nextStatus, note }) },
      actor.uid,
    );
  }

  async assignEditor(
    manuscript: Manuscript,
    editorId: string,
    editorName: string,
    actor: UserProfile,
  ): Promise<Manuscript> {
    return this.request<Manuscript>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscript.id)}/assign-editor`,
      { method: 'POST', body: JSON.stringify({ editorId, editorName }) },
      actor.uid,
    );
  }

  async listAssignableReviewers(actor: UserProfile): Promise<UserProfile[]> {
    return this.request<UserProfile[]>('/api/sandbox/reviewers', {}, actor.uid);
  }

  async assignReviewers(
    manuscript: Manuscript,
    reviewerIds: string[],
    actor: UserProfile,
  ): Promise<Manuscript> {
    return this.request<Manuscript>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscript.id)}/assign-reviewers`,
      { method: 'POST', body: JSON.stringify({ reviewerIds }) },
      actor.uid,
    );
  }

  async listPeerReviews(manuscriptId: string, actor: UserProfile): Promise<PeerReview[]> {
    return this.request<PeerReview[]>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscriptId)}/reviews`,
      {},
      actor.uid,
    );
  }

  async savePeerReview(
    manuscript: Manuscript,
    review: Omit<PeerReview, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    actor: UserProfile,
  ): Promise<PeerReview> {
    return this.request<PeerReview>(
      `/api/sandbox/manuscripts/${encodeURIComponent(manuscript.id)}/reviews`,
      { method: 'POST', body: JSON.stringify(review) },
      actor.uid,
    );
  }

  async listQuotationsForActor(actor: UserProfile): Promise<ServiceQuotation[]> {
    return this.request<ServiceQuotation[]>('/api/sandbox/quotations', {}, actor.uid);
  }

  async createQuotationRequest(
    input: { manuscriptId: string; manuscriptTitle: string; serviceIds: string[]; notes: string; estimatedAmount: number; currency: string },
    actor: UserProfile,
  ): Promise<ServiceQuotation> {
    return this.request<ServiceQuotation>(
      '/api/sandbox/quotations',
      { method: 'POST', body: JSON.stringify(input) },
      actor.uid,
    );
  }

  async updateQuotation(
    id: string,
    updates: Partial<Pick<ServiceQuotation, 'status' | 'estimatedAmount' | 'confirmedAmount' | 'notes'>>,
    actor: UserProfile,
  ): Promise<ServiceQuotation> {
    return this.request<ServiceQuotation>(
      `/api/sandbox/quotations/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(updates) },
      actor.uid,
    );
  }

  async listAllPublications(actor: UserProfile): Promise<PublicationRecord[]> {
    return this.request<PublicationRecord[]>('/api/sandbox/publications', {}, actor.uid);
  }

  async savePublication(
    publication: Partial<PublicationRecord> & { title: string },
    actor: UserProfile,
  ): Promise<PublicationRecord> {
    return this.request<PublicationRecord>(
      '/api/sandbox/publications',
      { method: 'POST', body: JSON.stringify(publication) },
      actor.uid,
    );
  }

  async listNotifications(userId: string): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('/api/sandbox/notifications', {}, userId);
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    await this.request(
      `/api/sandbox/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'PATCH' },
      userId,
    );
  }

  async listAuditLogs(actor: UserProfile): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/api/sandbox/audit-logs', {}, actor.uid);
  }
}
