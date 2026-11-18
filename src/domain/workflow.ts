import type {
  ManuscriptStatus,
  PublicationType,
  PublishingService,
  UserProfile,
} from './types';
import { canAccessEditorialWorkspace, canReleasePublication } from './rbac';

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  book: 'Book',
  general_article: 'General Article',
  academic_research: 'Academic Research Article',
  journal_submission: 'Journal Submission',
  conference_paper: 'Conference Paper',
  thesis_dissertation: 'Thesis / Dissertation',
  research_report: 'Research Report',
  other: 'Other Publication',
};

export const ACADEMIC_PUBLICATION_TYPES: PublicationType[] = [
  'academic_research',
  'journal_submission',
  'conference_paper',
  'thesis_dissertation',
  'research_report',
];

export const STATUS_LABELS: Record<ManuscriptStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_initial_review: 'Under Initial Review',
  assessment_completed: 'Assessment Completed',
  quotation_pending: 'Quotation Pending',
  awaiting_payment: 'Awaiting Payment',
  editing_in_progress: 'Editing in Progress',
  author_revision_required: 'Author Revision Required',
  formatting_in_progress: 'Formatting in Progress',
  awaiting_proof_approval: 'Awaiting Proof Approval',
  approved_for_publication: 'Approved for Publication',
  published: 'Published',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  cancelled: 'Cancelled',
};

export const STATUS_TONE: Record<ManuscriptStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral',
  submitted: 'info',
  under_initial_review: 'info',
  assessment_completed: 'info',
  quotation_pending: 'warning',
  awaiting_payment: 'warning',
  editing_in_progress: 'info',
  author_revision_required: 'warning',
  formatting_in_progress: 'info',
  awaiting_proof_approval: 'warning',
  approved_for_publication: 'success',
  published: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
  cancelled: 'danger',
};

const TERMINAL_STATUSES: ManuscriptStatus[] = ['published', 'rejected', 'withdrawn', 'cancelled'];

const BASE_EDITORIAL_TRANSITIONS: Record<ManuscriptStatus, ManuscriptStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_initial_review', 'author_revision_required', 'rejected', 'withdrawn'],
  under_initial_review: ['assessment_completed', 'author_revision_required', 'editing_in_progress', 'rejected'],
  assessment_completed: ['quotation_pending', 'editing_in_progress', 'author_revision_required', 'approved_for_publication', 'rejected'],
  quotation_pending: ['awaiting_payment', 'editing_in_progress', 'cancelled'],
  awaiting_payment: ['editing_in_progress', 'formatting_in_progress', 'cancelled'],
  editing_in_progress: ['author_revision_required', 'formatting_in_progress', 'awaiting_proof_approval'],
  author_revision_required: ['submitted', 'under_initial_review', 'withdrawn'],
  formatting_in_progress: ['awaiting_proof_approval', 'approved_for_publication'],
  awaiting_proof_approval: ['approved_for_publication', 'formatting_in_progress', 'author_revision_required'],
  approved_for_publication: ['published'],
  published: [],
  rejected: [],
  withdrawn: [],
  cancelled: [],
};

const ACADEMIC_OVERRIDES: Partial<Record<ManuscriptStatus, ManuscriptStatus[]>> = {
  // Academic works require peer/editorial assessment before editing/publication and skip commercial quotation gates unless requested
  submitted: ['under_initial_review', 'author_revision_required', 'rejected', 'withdrawn'],
  under_initial_review: ['assessment_completed', 'author_revision_required', 'rejected'],
  assessment_completed: ['author_revision_required', 'editing_in_progress', 'formatting_in_progress', 'approved_for_publication', 'rejected'],
};

export function getAllowedTransitions(
  currentStatus: ManuscriptStatus,
  publicationType: PublicationType,
  actor: UserProfile,
  manuscriptAuthorId: string,
): ManuscriptStatus[] {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return [];
  }

  const isEditorial = canAccessEditorialWorkspace(actor);
  const isAuthor = actor.uid === manuscriptAuthorId;
  const isAcademic = ACADEMIC_PUBLICATION_TYPES.includes(publicationType);

  if (isEditorial) {
    const map = isAcademic
      ? { ...BASE_EDITORIAL_TRANSITIONS, ...ACADEMIC_OVERRIDES }
      : BASE_EDITORIAL_TRANSITIONS;
    const candidates = map[currentStatus] || [];
    return candidates.filter((next) => {
      if (next === 'published') return canReleasePublication(actor);
      return true;
    });
  }

  if (isAuthor) {
    if (currentStatus === 'draft') return ['submitted', 'withdrawn'];
    if (currentStatus === 'author_revision_required') return ['submitted', 'withdrawn'];
    if (currentStatus === 'awaiting_proof_approval') return ['approved_for_publication', 'author_revision_required'];
    if (currentStatus === 'submitted' || currentStatus === 'quotation_pending') return ['withdrawn'];
  }

  return [];
}

export function canTransitionStatus(
  from: ManuscriptStatus,
  to: ManuscriptStatus,
  publicationType: PublicationType,
  actor: UserProfile,
  manuscriptAuthorId: string,
): { allowed: boolean; reason?: string } {
  if (from === to) {
    return { allowed: false, reason: 'Manuscript is already in this status.' };
  }
  const allowedNext = getAllowedTransitions(from, publicationType, actor, manuscriptAuthorId);
  if (!allowedNext.includes(to)) {
    return {
      allowed: false,
      reason: `Transition from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[to]}" is not permitted for your role or publication type.`,
    };
  }
  return { allowed: true };
}

export function generateReferenceNumber(year = new Date().getFullYear(), sequence?: number): string {
  const seq = sequence ?? Math.floor(1000 + Math.random() * 9000);
  const padded = String(seq).padStart(4, '0');
  return `MS-${year}-${padded}`;
}

export const ALLOWED_MANUSCRIPT_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'];
export const ALLOWED_MANUSCRIPT_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
];
export const MAX_MANUSCRIPT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateFileUploadMeta(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  const lower = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_MANUSCRIPT_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasAllowedExt) {
    return {
      valid: false,
      error: `Unsupported file extension. Allowed formats: ${ALLOWED_MANUSCRIPT_EXTENSIONS.join(', ')}`,
    };
  }
  if (file.type && !ALLOWED_MANUSCRIPT_MIMES.includes(file.type)) {
    // Allow empty browser MIME fallback when extension is valid, reject explicit disallowed MIMEs
    return {
      valid: false,
      error: `Unsupported MIME type (${file.type}). Upload a valid PDF, DOCX, DOC, TXT, or Markdown document.`,
    };
  }
  if (file.size <= 0) {
    return { valid: false, error: 'Uploaded file cannot be empty.' };
  }
  if (file.size > MAX_MANUSCRIPT_FILE_BYTES) {
    return { valid: false, error: 'File exceeds the 25 MB upload limit.' };
  }
  return { valid: true };
}

export function calculateQuotationEstimate(
  services: PublishingService[],
  wordCount = 0,
  pageCount = 0,
): { estimatedTotal: number; currency: string; hasCustomQuote: boolean } {
  let total = 0;
  let hasCustomQuote = false;
  const currency = services[0]?.currency || 'USD';

  for (const srv of services) {
    if (srv.pricingMethod === 'flat_fee') {
      total += srv.basePrice;
    } else if (srv.pricingMethod === 'per_word') {
      total += srv.basePrice * Math.max(wordCount, 1000);
    } else if (srv.pricingMethod === 'per_page') {
      total += srv.basePrice * Math.max(pageCount, 20);
    } else {
      hasCustomQuote = true;
      total += srv.basePrice;
    }
  }

  return {
    estimatedTotal: Math.round(total * 100) / 100,
    currency,
    hasCustomQuote,
  };
}
