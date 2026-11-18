import { canAccessEditorialWorkspace } from './rbac';
import type {
  AnnotationSeverity,
  ManuscriptSectionKey,
  PeerReview,
  PeerReviewAnnotation,
  ReviewRecommendation,
  RubricCriterionKey,
  RubricScores,
  UserProfile,
} from './types';

export interface ManuscriptSectionOption {
  key: ManuscriptSectionKey;
  label: string;
  shortLabel: string;
}

export const MANUSCRIPT_SECTIONS: ManuscriptSectionOption[] = [
  { key: 'title_abstract', label: 'Title & Abstract', shortLabel: 'Abstract' },
  { key: 'introduction', label: 'Introduction & Context', shortLabel: 'Introduction' },
  { key: 'literature_review', label: 'Literature & Scholarship', shortLabel: 'Literature' },
  { key: 'methodology', label: 'Methodology & Approach', shortLabel: 'Methodology' },
  { key: 'results_analysis', label: 'Findings & Analysis', shortLabel: 'Findings' },
  { key: 'discussion_conclusion', label: 'Discussion & Conclusion', shortLabel: 'Discussion' },
  { key: 'references_appendices', label: 'References & Appendices', shortLabel: 'References' },
  { key: 'overall_structure', label: 'Overall Structure & Prose', shortLabel: 'Structure' },
];

export const MANUSCRIPT_SECTION_LABELS: Record<ManuscriptSectionKey, string> = Object.fromEntries(
  MANUSCRIPT_SECTIONS.map((s) => [s.key, s.label]),
) as Record<ManuscriptSectionKey, string>;

export interface RubricCriterionMeta {
  key: RubricCriterionKey;
  label: string;
  description: string;
}

export const RUBRIC_CRITERIA: RubricCriterionMeta[] = [
  {
    key: 'originality',
    label: 'Originality & Contribution',
    description: 'Novelty of thesis, insights, and contribution to readers or scholarship.',
  },
  {
    key: 'rigor',
    label: 'Methodological & Analytical Rigor',
    description: 'Strength of evidence, analytical soundness, and coherence of argumentation.',
  },
  {
    key: 'clarity',
    label: 'Clarity, Structure & Prose',
    description: 'Logical flow across sections, readability, and editorial presentation.',
  },
  {
    key: 'citations',
    label: 'Citations, Ethics & Completeness',
    description: 'Attribution accuracy, ethical disclosures, and completeness of references.',
  },
];

export const RUBRIC_SCALE_LABELS: Record<number, string> = {
  1: 'Major Deficiencies',
  2: 'Below Standard',
  3: 'Satisfactory',
  4: 'Strong',
  5: 'Exemplary',
};

export const RECOMMENDATION_LABELS: Record<ReviewRecommendation, string> = {
  accept: 'Accept as Submitted',
  minor_revision: 'Minor Revisions',
  major_revision: 'Major Revisions',
  reject: 'Decline / Reject',
};

export const ANNOTATION_SEVERITY_LABELS: Record<AnnotationSeverity, string> = {
  commendation: 'Commendation',
  minor_suggestion: 'Minor Suggestion',
  major_issue: 'Major Issue',
  required_correction: 'Required Correction',
};

export const DEFAULT_RUBRIC_SCORES: RubricScores = {
  originality: 4,
  rigor: 4,
  clarity: 4,
  citations: 4,
};

export function clampRubricScore(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function calculateOverallScore(scores: RubricScores): number {
  const keys: RubricCriterionKey[] = ['originality', 'rigor', 'clarity', 'citations'];
  const total = keys.reduce((sum, key) => sum + clampRubricScore(scores[key]), 0);
  return Math.round((total / keys.length) * 10) / 10;
}

export interface PeerReviewValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePeerReviewInput(input: {
  rubricScores: RubricScores;
  summaryFeedback: string;
  annotations: PeerReviewAnnotation[];
  status: 'draft' | 'submitted';
}): PeerReviewValidationResult {
  const keys: RubricCriterionKey[] = ['originality', 'rigor', 'clarity', 'citations'];
  for (const key of keys) {
    const val = input.rubricScores[key];
    if (!Number.isInteger(val) || val < 1 || val > 5) {
      return { valid: false, error: `Rubric score for "${key}" must be an integer between 1 and 5.` };
    }
  }

  if (input.annotations.length > 30) {
    return { valid: false, error: 'A review may contain at most 30 section annotations.' };
  }

  for (const ann of input.annotations) {
    if (!ann.comment || ann.comment.trim().length === 0) {
      return { valid: false, error: 'Each section annotation must include feedback text.' };
    }
    if (ann.comment.trim().length > 1500) {
      return { valid: false, error: 'Each section annotation must be 1,500 characters or fewer.' };
    }
  }

  if (input.status === 'submitted' && input.summaryFeedback.trim().length < 10) {
    return {
      valid: false,
      error: 'Please provide at least 10 characters of summary feedback before submitting a peer review.',
    };
  }

  if (input.summaryFeedback.trim().length > 5000) {
    return { valid: false, error: 'Summary feedback must be 5,000 characters or fewer.' };
  }

  return { valid: true };
}

export interface PeerReviewAggregateSummary {
  submittedCount: number;
  draftCount: number;
  averageOverallScore: number | null;
  criterionAverages: Partial<Record<RubricCriterionKey, number>>;
  totalAnnotations: number;
  recommendationCounts: Record<ReviewRecommendation, number>;
  sectionAnnotationCounts: Partial<Record<ManuscriptSectionKey, number>>;
}

export function summarizePeerReviews(reviews: PeerReview[]): PeerReviewAggregateSummary {
  const submitted = reviews.filter((r) => r.status === 'submitted');
  const draftCount = reviews.length - submitted.length;

  const recommendationCounts: Record<ReviewRecommendation, number> = {
    accept: 0,
    minor_revision: 0,
    major_revision: 0,
    reject: 0,
  };

  const sectionAnnotationCounts: Partial<Record<ManuscriptSectionKey, number>> = {};
  let totalAnnotations = 0;

  for (const review of reviews) {
    for (const ann of review.annotations) {
      totalAnnotations += 1;
      sectionAnnotationCounts[ann.section] = (sectionAnnotationCounts[ann.section] || 0) + 1;
    }
  }

  if (submitted.length === 0) {
    return {
      submittedCount: 0,
      draftCount,
      averageOverallScore: null,
      criterionAverages: {},
      totalAnnotations,
      recommendationCounts,
      sectionAnnotationCounts,
    };
  }

  const criterionKeys: RubricCriterionKey[] = ['originality', 'rigor', 'clarity', 'citations'];
  const criterionTotals: Record<RubricCriterionKey, number> = {
    originality: 0,
    rigor: 0,
    clarity: 0,
    citations: 0,
  };

  let overallSum = 0;
  for (const r of submitted) {
    recommendationCounts[r.recommendation] += 1;
    overallSum += calculateOverallScore(r.rubricScores);
    for (const key of criterionKeys) {
      criterionTotals[key] += clampRubricScore(r.rubricScores[key]);
    }
  }

  const criterionAverages: Partial<Record<RubricCriterionKey, number>> = {};
  for (const key of criterionKeys) {
    criterionAverages[key] = Math.round((criterionTotals[key] / submitted.length) * 10) / 10;
  }

  return {
    submittedCount: submitted.length,
    draftCount,
    averageOverallScore: Math.round((overallSum / submitted.length) * 10) / 10,
    criterionAverages,
    totalAnnotations,
    recommendationCounts,
    sectionAnnotationCounts,
  };
}

export interface FlattenedSectionAnnotation extends PeerReviewAnnotation {
  reviewId: string;
  reviewerId: string;
  reviewerName: string;
  reviewStatus: PeerReview['status'];
  reviewUpdatedAt: string;
}

export function flattenAnnotationsBySection(
  reviews: PeerReview[],
  sectionFilter: ManuscriptSectionKey | 'all' = 'all',
): FlattenedSectionAnnotation[] {
  const list: FlattenedSectionAnnotation[] = [];
  for (const review of reviews) {
    for (const ann of review.annotations) {
      if (sectionFilter !== 'all' && ann.section !== sectionFilter) continue;
      list.push({
        ...ann,
        reviewId: review.id,
        reviewerId: review.reviewerId,
        reviewerName: review.reviewerName,
        reviewStatus: review.status,
        reviewUpdatedAt: review.updatedAt,
      });
    }
  }
  return list.sort((a, b) => b.reviewUpdatedAt.localeCompare(a.reviewUpdatedAt));
}

export function canViewPeerReview(
  user: UserProfile | null | undefined,
  review: Pick<PeerReview, 'reviewerId'>,
): boolean {
  if (!user || user.accountStatus === 'suspended') return false;
  if (canAccessEditorialWorkspace(user)) return true;
  return review.reviewerId === user.uid;
}

export function filterVisiblePeerReviews(
  user: UserProfile | null | undefined,
  reviews: PeerReview[],
): PeerReview[] {
  return reviews.filter((r) => canViewPeerReview(user, r));
}
