import type {
  AcademicJournal,
  AuditLog,
  EditorialComment,
  Manuscript,
  ManuscriptHistory,
  ManuscriptVersion,
  NotificationItem,
  PlatformSettings,
  PublicAuthorProfile,
  PublicationRecord,
  PublishingService,
  ServiceQuotation,
  UserProfile,
} from '../domain/types';

/**
 * Clean repository abstraction separating presentation & business logic
 * from the underlying persistence engine (Firebase Firestore in Phase 1;
 * ready for PostgreSQL / Supabase adapter in future phases).
 */
export interface IPublishingRepository {
  // Public Catalogue & Settings
  getSettings(): Promise<PlatformSettings>;
  updateSettings(settings: Partial<PlatformSettings>, actor: UserProfile): Promise<PlatformSettings>;
  listPublishedCatalogue(): Promise<PublicationRecord[]>;
  getPublicationById(id: string): Promise<PublicationRecord | null>;
  listActiveServices(): Promise<PublishingService[]>;
  listAllServices(): Promise<PublishingService[]>;
  saveService(service: Partial<PublishingService> & { name: string }, actor: UserProfile): Promise<PublishingService>;
  listJournals(): Promise<AcademicJournal[]>;
  saveJournal(journal: Partial<AcademicJournal> & { title: string }, actor: UserProfile): Promise<AcademicJournal>;
  listPublicAuthors(): Promise<PublicAuthorProfile[]>;

  // Users & Roles
  getUserProfile(uid: string): Promise<UserProfile | null>;
  upsertOwnProfile(profile: UserProfile): Promise<UserProfile>;
  listAllUsers(): Promise<UserProfile[]>;
  updateUserRolesAndStatus(
    targetUid: string,
    updates: Pick<UserProfile, 'roles' | 'accountStatus'>,
    actor: UserProfile,
  ): Promise<UserProfile>;

  // Manuscripts & Versions
  listManuscriptsForActor(actor: UserProfile): Promise<Manuscript[]>;
  getManuscriptById(id: string, actor: UserProfile): Promise<Manuscript | null>;
  saveManuscript(manuscript: Manuscript, actor: UserProfile, actionLabel: string): Promise<Manuscript>;
  listManuscriptVersions(manuscriptId: string, actor: UserProfile): Promise<ManuscriptVersion[]>;
  addManuscriptVersion(
    manuscript: Manuscript,
    file: File,
    notes: string,
    actor: UserProfile,
    authToken: string | null,
  ): Promise<ManuscriptVersion>;
  getVersionDownloadUrl(manuscriptId: string, storageKey: string): string;

  // Editorial Comments & History
  listManuscriptComments(manuscriptId: string, actor: UserProfile): Promise<EditorialComment[]>;
  addManuscriptComment(
    manuscript: Manuscript,
    comment: Omit<EditorialComment, 'id' | 'createdAt'>,
    actor: UserProfile,
  ): Promise<EditorialComment>;
  listManuscriptHistory(manuscriptId: string, actor: UserProfile): Promise<ManuscriptHistory[]>;
  transitionManuscriptStatus(
    manuscript: Manuscript,
    nextStatus: Manuscript['status'],
    note: string,
    actor: UserProfile,
  ): Promise<Manuscript>;
  assignEditor(
    manuscript: Manuscript,
    editorId: string,
    editorName: string,
    actor: UserProfile,
  ): Promise<Manuscript>;

  // Quotations & Orders
  listQuotationsForActor(actor: UserProfile): Promise<ServiceQuotation[]>;
  createQuotationRequest(
    input: { manuscriptId: string; manuscriptTitle: string; serviceIds: string[]; notes: string; estimatedAmount: number; currency: string },
    actor: UserProfile,
  ): Promise<ServiceQuotation>;
  updateQuotation(
    id: string,
    updates: Partial<Pick<ServiceQuotation, 'status' | 'estimatedAmount' | 'confirmedAmount' | 'notes'>>,
    actor: UserProfile,
  ): Promise<ServiceQuotation>;

  // Publications Management (Manager / Admin)
  listAllPublications(actor: UserProfile): Promise<PublicationRecord[]>;
  savePublication(publication: Partial<PublicationRecord> & { title: string }, actor: UserProfile): Promise<PublicationRecord>;

  // Notifications & Audit Logs
  listNotifications(userId: string): Promise<NotificationItem[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<void>;
  listAuditLogs(actor: UserProfile): Promise<AuditLog[]>;
}
