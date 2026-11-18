export type UserRole =
  | 'visitor'
  | 'author'
  | 'researcher'
  | 'institutional_admin'
  | 'editor'
  | 'managing_editor'
  | 'editor_in_chief'
  | 'reviewer'
  | 'proofreader'
  | 'designer'
  | 'publishing_manager'
  | 'printing_partner'
  | 'finance_officer'
  | 'platform_admin'
  | 'super_admin';

export type AccountStatus = 'active' | 'suspended' | 'pending_verification';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  accountStatus: AccountStatus;
  affiliation?: string;
  orcid?: string;
  bio?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAuthorProfile {
  uid: string;
  displayName: string;
  affiliation?: string;
  bio?: string;
  orcid?: string;
  discipline?: string;
  isSample: boolean;
  updatedAt: string;
}

export type PublicationType =
  | 'book'
  | 'general_article'
  | 'academic_research'
  | 'journal_submission'
  | 'conference_paper'
  | 'thesis_dissertation'
  | 'research_report'
  | 'other';

export type PublicationPreference =
  | 'digital_only'
  | 'print_only'
  | 'both'
  | 'editorial_only'
  | 'consultation';

export type ManuscriptStatus =
  | 'draft'
  | 'submitted'
  | 'under_initial_review'
  | 'assessment_completed'
  | 'quotation_pending'
  | 'awaiting_payment'
  | 'editing_in_progress'
  | 'author_revision_required'
  | 'formatting_in_progress'
  | 'awaiting_proof_approval'
  | 'approved_for_publication'
  | 'published'
  | 'rejected'
  | 'withdrawn'
  | 'cancelled';

export interface CoauthorInfo {
  name: string;
  email?: string;
  affiliation?: string;
  orcid?: string;
}

export interface Manuscript {
  id: string;
  referenceNumber: string;
  authorId: string;
  authorName: string;
  title: string;
  subtitle?: string;
  abstract?: string;
  publicationType: PublicationType;
  category?: string;
  discipline?: string;
  language?: string;
  keywords?: string[];
  targetAudience?: string;
  coauthors?: CoauthorInfo[];
  affiliation?: string;
  wordCount?: number;
  pageCount?: number;
  objectives?: string;
  requestedServices?: string[];
  publicationPreference?: PublicationPreference;
  status: ManuscriptStatus;
  assignedEditorId?: string;
  assignedEditorName?: string;
  assignedReviewerIds?: string[];
  journalId?: string;
  ethicsDeclaration?: string;
  conflictOfInterest?: string;
  fundingInfo?: string;
  dataAvailability?: string;
  declarationsAccepted: boolean;
  currentVersionNumber: number;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManuscriptVersion {
  id: string;
  manuscriptId: string;
  manuscriptAuthorId: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sha256?: string;
  uploadedBy: string;
  uploadedByName?: string;
  notes?: string;
  createdAt: string;
}

export type CommentVisibility =
  | 'author_visible'
  | 'internal_editorial'
  | 'confidential_review';

export type CommentType =
  | 'assessment'
  | 'revision_request'
  | 'editorial_note'
  | 'proof_feedback';

export interface EditorialComment {
  id: string;
  manuscriptId: string;
  manuscriptAuthorId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  visibility: CommentVisibility;
  commentType: CommentType;
  body: string;
  createdAt: string;
}

export interface ManuscriptHistory {
  id: string;
  manuscriptId: string;
  manuscriptAuthorId: string;
  actorId: string;
  actorName: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  details?: string;
  createdAt: string;
}

export type PricingMethod = 'flat_fee' | 'per_word' | 'per_page' | 'custom_quote';

export interface PublishingService {
  id: string;
  name: string;
  description: string;
  category: string;
  pricingMethod: PricingMethod;
  basePrice: number;
  currency: string;
  estimatedTurnaround?: string;
  requirements?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus =
  | 'requested'
  | 'estimated'
  | 'confirmed'
  | 'invoiced'
  | 'paid'
  | 'cancelled';

export interface ServiceQuotation {
  id: string;
  manuscriptId: string;
  manuscriptTitle?: string;
  authorId: string;
  serviceIds: string[];
  notes?: string;
  status: QuotationStatus;
  estimatedAmount?: number;
  confirmedAmount?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export type PeerReviewModel = 'single_anonymous' | 'double_anonymous' | 'open';
export type IdentifierStatus = 'unassigned' | 'pending_registration' | 'verified';

export interface AcademicJournal {
  id: string;
  title: string;
  issn?: string;
  identifierStatus?: IdentifierStatus;
  description?: string;
  discipline: string;
  reviewModel: PeerReviewModel;
  editorInChief?: string;
  sections?: string[];
  active: boolean;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicationFormat = 'digital' | 'print' | 'both';
export type AccessType = 'free' | 'paid';
export type ReleaseStatus = 'approved' | 'published' | 'archived';

export interface PublicationRecord {
  id: string;
  manuscriptId?: string;
  authorId: string;
  authorName: string;
  title: string;
  subtitle?: string;
  abstract?: string;
  publicationType: string;
  category?: string;
  format: PublicationFormat;
  accessType: AccessType;
  price?: number;
  currency?: string;
  isbn?: string;
  issn?: string;
  doi?: string;
  identifierStatus?: IdentifierStatus;
  coverUrl?: string;
  excerpt?: string;
  releaseStatus: ReleaseStatus;
  isSample: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName?: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  tagline?: string;
  primaryColor: string;
  accentColor: string;
  contactEmail?: string;
  contactPhone?: string;
  businessAddress?: string;
  aiAssistanceEnabled?: boolean;
  updatedAt: string;
}

export interface PublishingPackage {
  id: string;
  name: string;
  audience: string;
  summary: string;
  priceLabel: string;
  turnaround: string;
  includedServices: string[];
  deliverables: string[];
}
