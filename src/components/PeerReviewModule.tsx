import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Lock, Plus, Trash2, UserPlus } from 'lucide-react';
import {
  ANNOTATION_SEVERITY_LABELS,
  calculateOverallScore,
  DEFAULT_RUBRIC_SCORES,
  flattenAnnotationsBySection,
  MANUSCRIPT_SECTION_LABELS,
  MANUSCRIPT_SECTIONS,
  RECOMMENDATION_LABELS,
  RUBRIC_CRITERIA,
  RUBRIC_SCALE_LABELS,
  summarizePeerReviews,
  validatePeerReviewInput,
} from '../domain/peerReview';
import type {
  AnnotationSeverity,
  Manuscript,
  ManuscriptSectionKey,
  PeerReview,
  PeerReviewAnnotation,
  ReviewRecommendation,
  RubricCriterionKey,
  RubricScores,
  UserProfile,
} from '../domain/types';

interface PeerReviewModuleProps {
  manuscript: Manuscript;
  currentUser: UserProfile;
  reviews: PeerReview[];
  assignableReviewers: UserProfile[];
  canManageReviewers: boolean;
  canSubmitReview: boolean;
  busy?: boolean;
  onAssignReviewers: (reviewerIds: string[]) => Promise<void>;
  onSaveReview: (
    payload: Omit<PeerReview, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => Promise<void>;
  onValidationError?: (message: string) => void;
}

const SEVERITY_TEXT_CLASSES: Record<AnnotationSeverity, string> = {
  commendation: 'text-teal-700 dark:text-teal-300',
  minor_suggestion: 'text-sky-700 dark:text-sky-300',
  major_issue: 'text-amber-700 dark:text-amber-300',
  required_correction: 'text-red-700 dark:text-red-300',
};

const RECOMMENDATION_TEXT_CLASSES: Record<ReviewRecommendation, string> = {
  accept: 'text-teal-700 dark:text-teal-300',
  minor_revision: 'text-sky-700 dark:text-sky-300',
  major_revision: 'text-amber-700 dark:text-amber-300',
  reject: 'text-red-700 dark:text-red-300',
};

export function PeerReviewModule({
  manuscript,
  currentUser,
  reviews,
  assignableReviewers,
  canManageReviewers,
  canSubmitReview,
  busy = false,
  onAssignReviewers,
  onSaveReview,
  onValidationError,
}: PeerReviewModuleProps) {
  const existingOwnReview = useMemo(
    () => reviews.find((r) => r.reviewerId === currentUser.uid),
    [reviews, currentUser.uid],
  );

  const [activeTab, setActiveTab] = useState<'mine' | 'reviews' | 'annotations'>(() => {
    if (!canManageReviewers && canSubmitReview) return 'mine';
    return reviews.length > 0 ? 'reviews' : 'mine';
  });

  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [rubricScores, setRubricScores] = useState<RubricScores>({ ...DEFAULT_RUBRIC_SCORES });
  const [recommendation, setRecommendation] = useState<ReviewRecommendation>('minor_revision');
  const [summaryFeedback, setSummaryFeedback] = useState('');
  const [confidentialNote, setConfidentialNote] = useState('');
  const [annotations, setAnnotations] = useState<PeerReviewAnnotation[]>([]);

  // Section annotation draft fields
  const [annSection, setAnnSection] = useState<ManuscriptSectionKey>('methodology');
  const [annLocation, setAnnLocation] = useState('');
  const [annSeverity, setAnnSeverity] = useState<AnnotationSeverity>('minor_suggestion');
  const [annComment, setAnnComment] = useState('');

  // Section filter in "Annotations by Section" tab
  const [sectionFilter, setSectionFilter] = useState<ManuscriptSectionKey | 'all'>('all');

  useEffect(() => {
    if (existingOwnReview) {
      setRubricScores({ ...existingOwnReview.rubricScores });
      setRecommendation(existingOwnReview.recommendation);
      setSummaryFeedback(existingOwnReview.summaryFeedback);
      setConfidentialNote(existingOwnReview.confidentialEditorNote || '');
      setAnnotations(existingOwnReview.annotations || []);
    } else {
      setRubricScores({ ...DEFAULT_RUBRIC_SCORES });
      setRecommendation('minor_revision');
      setSummaryFeedback('');
      setConfidentialNote('');
      setAnnotations([]);
    }
  }, [existingOwnReview]);

  const assignedReviewerIds = manuscript.assignedReviewerIds || [];
  const reviewerLookup = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const u of assignableReviewers) {
      map.set(u.uid, u);
    }
    if (currentUser) {
      map.set(currentUser.uid, currentUser);
    }
    return map;
  }, [assignableReviewers, currentUser]);

  const unAssignedCandidates = useMemo(
    () =>
      assignableReviewers.filter(
        (u) => u.uid !== manuscript.authorId && !assignedReviewerIds.includes(u.uid),
      ),
    [assignableReviewers, assignedReviewerIds, manuscript.authorId],
  );

  useEffect(() => {
    if (unAssignedCandidates.length > 0 && !unAssignedCandidates.some((c) => c.uid === selectedCandidateId)) {
      setSelectedCandidateId(unAssignedCandidates[0].uid);
    } else if (unAssignedCandidates.length === 0) {
      setSelectedCandidateId('');
    }
  }, [unAssignedCandidates, selectedCandidateId]);

  const summary = useMemo(() => summarizePeerReviews(reviews), [reviews]);
  const flattenedAnnotations = useMemo(
    () => flattenAnnotationsBySection(reviews, sectionFilter),
    [reviews, sectionFilter],
  );
  const liveOverallScore = calculateOverallScore(rubricScores);

  const handleAssignCandidate = async () => {
    if (!selectedCandidateId) return;
    await onAssignReviewers([...assignedReviewerIds, selectedCandidateId]);
  };

  const handleRemoveReviewer = async (uid: string) => {
    await onAssignReviewers(assignedReviewerIds.filter((id) => id !== uid));
  };

  const handleScoreChange = (criterion: RubricCriterionKey, value: number) => {
    setRubricScores((prev) => ({
      ...prev,
      [criterion]: value,
    }));
  };

  const handleAddAnnotation = () => {
    const trimmed = annComment.trim();
    if (!trimmed) {
      onValidationError?.('Enter feedback text before adding a section annotation.');
      return;
    }
    if (annotations.length >= 30) {
      onValidationError?.('A peer review may contain at most 30 section annotations.');
      return;
    }
    const next: PeerReviewAnnotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      section: annSection,
      locationRef: annLocation.trim() || undefined,
      severity: annSeverity,
      comment: trimmed,
    };
    setAnnotations((prev) => [...prev, next]);
    setAnnLocation('');
    setAnnComment('');
  };

  const handleRemoveAnnotation = (annId: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== annId));
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    const check = validatePeerReviewInput({
      rubricScores,
      summaryFeedback,
      annotations,
      status,
    });
    if (!check.valid) {
      onValidationError?.(check.error || 'Please complete all required review fields.');
      return;
    }

    await onSaveReview({
      id: existingOwnReview?.id,
      manuscriptId: manuscript.id,
      manuscriptAuthorId: manuscript.authorId,
      reviewerId: currentUser.uid,
      reviewerName: currentUser.displayName,
      reviewerAffiliation: currentUser.affiliation || '',
      recommendation,
      rubricScores,
      overallScore: liveOverallScore,
      summaryFeedback: summaryFeedback.trim(),
      confidentialEditorNote: confidentialNote.trim() || undefined,
      annotations,
      status,
    });
  };

  return (
    <section
      aria-labelledby="peer-review-heading"
      className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
            <h2 id="peer-review-heading" className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Peer Review &amp; Rubric Assessment
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Selected reviewers evaluate manuscript criteria on a 1–5 rubric and record structured annotations on specific sections.
          </p>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {assignedReviewerIds.length}
          </span>{' '}
          reviewer{assignedReviewerIds.length === 1 ? '' : 's'} assigned
        </div>
      </div>

      {/* Reviewer Assignment Roster */}
      <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Selected Peer Reviewers
          </span>
          {canManageReviewers && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="assign-reviewer-select" className="sr-only">
                Select reviewer to assign
              </label>
              <select
                id="assign-reviewer-select"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                disabled={busy || unAssignedCandidates.length === 0}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 sm:min-w-[240px] max-w-sm"
              >
                {unAssignedCandidates.length === 0 ? (
                  <option value="">All eligible reviewers assigned</option>
                ) : (
                  unAssignedCandidates.map((candidate) => (
                    <option key={candidate.uid} value={candidate.uid}>
                      {candidate.displayName}
                      {candidate.roles.includes('reviewer') ? ' · Reviewer' : ' · Staff'}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                disabled={busy || !selectedCandidateId}
                onClick={() => void handleAssignCandidate()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white hover:bg-[#193055] dark:bg-[#0F766E] dark:hover:bg-[#115E59] disabled:opacity-40 whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Assign Reviewer</span>
              </button>
            </div>
          )}
        </div>

        {assignedReviewerIds.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No external peer reviewers assigned yet.
          </p>
        ) : canManageReviewers ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assignedReviewerIds.map((uid) => {
              const profile = reviewerLookup.get(uid);
              const reviewForUid = reviews.find((r) => r.reviewerId === uid);
              const displayName = profile?.displayName || (uid === currentUser.uid ? currentUser.displayName : uid);
              const affiliation = profile?.affiliation;
              return (
                <div
                  key={uid}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {displayName}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 truncate">
                      {affiliation ? `${affiliation} · ` : ''}
                      {reviewForUid
                        ? reviewForUid.status === 'submitted'
                          ? `Submitted (${reviewForUid.overallScore.toFixed(1)}/5)`
                          : 'Draft in progress'
                        : 'Assigned · Pending review'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemoveReviewer(uid)}
                    aria-label={`Remove ${displayName}`}
                    className="text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-1.5 py-1 rounded shrink-0"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assignedReviewerIds.includes(currentUser.uid) && (
              <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.displayName} (You)
                </p>
                <p className="text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.affiliation ? `${currentUser.affiliation} · ` : ''}
                  {existingOwnReview
                    ? existingOwnReview.status === 'submitted'
                      ? `Submitted (${existingOwnReview.overallScore.toFixed(1)}/5)`
                      : 'Draft in progress'
                    : 'Assigned · Pending review'}
                </p>
              </div>
            )}
            {assignedReviewerIds.filter((uid) => uid !== currentUser.uid).length > 0 && (
              <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs flex flex-col justify-center">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Fellow Peer Reviewers (Confidential)
                </p>
                <p className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {assignedReviewerIds.filter((uid) => uid !== currentUser.uid).length} additional reviewer
                  {assignedReviewerIds.filter((uid) => uid !== currentUser.uid).length === 1 ? '' : 's'} assigned
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aggregate Rubric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-stone-200 dark:border-slate-800 py-3.5 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Submitted Reviews</span>
          <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white tabular-nums">
            {summary.submittedCount}
            {summary.draftCount > 0 && (
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                (+{summary.draftCount} draft)
              </span>
            )}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Mean Rubric Score</span>
          <p className="mt-0.5 text-base font-semibold text-[#0F766E] dark:text-teal-300 tabular-nums">
            {summary.averageOverallScore !== null ? `${summary.averageOverallScore.toFixed(1)} / 5.0` : '—'}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Section Annotations</span>
          <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white tabular-nums">
            {summary.totalAnnotations}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Editorial Consensus</span>
          <p className="mt-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            {summary.submittedCount === 0
              ? 'Awaiting submissions'
              : (Object.entries(summary.recommendationCounts) as [ReviewRecommendation, number][])
                  .filter(([, count]) => count > 0)
                  .map(([rec, count]) => `${count} ${RECOMMENDATION_LABELS[rec]}`)
                  .join(' · ')}
          </p>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Peer review views"
        className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-slate-800"
      >
        {canSubmitReview && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mine'}
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'mine'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {existingOwnReview ? 'Edit Your Peer Review' : 'Write Peer Review'}
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reviews'}
          onClick={() => setActiveTab('reviews')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors tabular-nums ${
            activeTab === 'reviews'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Reviews ({reviews.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'annotations'}
          onClick={() => setActiveTab('annotations')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors tabular-nums ${
            activeTab === 'annotations'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Annotations by Section ({summary.totalAnnotations})
        </button>
      </div>

      {/* TAB 1: Write / Edit Your Peer Review */}
      {activeTab === 'mine' && canSubmitReview && (
        <div className="space-y-6">
          {/* Structured Rubric Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  1. Structured Evaluation Rubric
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Score each dimension from 1 (Major Deficiencies) to 5 (Exemplary).
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Computed Average
                </span>
                <span className="font-mono text-sm font-semibold text-[#0F766E] dark:text-teal-300 tabular-nums">
                  {liveOverallScore.toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            <div className="divide-y divide-stone-200 dark:divide-slate-800 rounded-lg border border-stone-200 dark:border-slate-800">
              {RUBRIC_CRITERIA.map((criterion) => {
                const currentScore = rubricScores[criterion.key];
                return (
                  <div
                    key={criterion.key}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {criterion.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {criterion.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        role="group"
                        aria-label={`${criterion.label} score`}
                        className="inline-flex rounded-lg border border-stone-300 dark:border-slate-700 overflow-hidden"
                      >
                        {[1, 2, 3, 4, 5].map((val) => {
                          const selected = currentScore === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              aria-pressed={selected}
                              aria-label={`${criterion.label}: ${val} — ${RUBRIC_SCALE_LABELS[val]}`}
                              title={`${val} — ${RUBRIC_SCALE_LABELS[val]}`}
                              onClick={() => handleScoreChange(criterion.key, val)}
                              className={`w-8 h-8 text-xs font-mono font-semibold transition-colors border-r last:border-r-0 border-stone-300 dark:border-slate-700 ${
                                selected
                                  ? 'bg-[#0F1E36] text-white dark:bg-[#0F766E]'
                                  : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-28 text-xs text-slate-600 dark:text-slate-300 hidden md:inline">
                        {RUBRIC_SCALE_LABELS[currentScore]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section-Specific Structured Annotations Builder */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                2. Section-Targeted Annotations ({annotations.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pin actionable observations, citations checks, or commendations to exact manuscript sections.
              </p>
            </div>

            <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/60 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="pr-ann-section" className="block text-xs font-semibold mb-1">
                    Manuscript Section
                  </label>
                  <select
                    id="pr-ann-section"
                    value={annSection}
                    onChange={(e) => setAnnSection(e.target.value as ManuscriptSectionKey)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {MANUSCRIPT_SECTIONS.map((sec) => (
                      <option key={sec.key} value={sec.key}>
                        {sec.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pr-ann-location" className="block text-xs font-semibold mb-1">
                    Page / Location Ref (Optional)
                  </label>
                  <input
                    id="pr-ann-location"
                    value={annLocation}
                    onChange={(e) => setAnnLocation(e.target.value)}
                    placeholder="e.g. Ch. 3, p. 42 or Table 2"
                    maxLength={120}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="pr-ann-severity" className="block text-xs font-semibold mb-1">
                    Annotation Type
                  </label>
                  <select
                    id="pr-ann-severity"
                    value={annSeverity}
                    onChange={(e) => setAnnSeverity(e.target.value as AnnotationSeverity)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {(Object.entries(ANNOTATION_SEVERITY_LABELS) as [AnnotationSeverity, string][]).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pr-ann-comment" className="block text-xs font-semibold mb-1">
                  Section Feedback
                </label>
                <textarea
                  id="pr-ann-comment"
                  rows={2}
                  value={annComment}
                  onChange={(e) => setAnnComment(e.target.value)}
                  placeholder="Describe the issue, evidence gap, or strength within this section..."
                  maxLength={1500}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAddAnnotation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#0F1E36] text-[#0F1E36] dark:border-teal-500 dark:text-teal-300 hover:bg-[#0F1E36] hover:text-white dark:hover:bg-[#0F766E] dark:hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section Annotation</span>
                </button>
              </div>
            </div>

            {annotations.length > 0 && (
              <div className="divide-y divide-stone-200 dark:divide-slate-800 rounded-lg border border-stone-200 dark:border-slate-800">
                {annotations.map((ann) => (
                  <div key={ann.id} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {MANUSCRIPT_SECTION_LABELS[ann.section]}
                        </span>
                        {ann.locationRef && (
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            · {ann.locationRef}
                          </span>
                        )}
                        <span className={`font-semibold ${SEVERITY_TEXT_CLASSES[ann.severity]}`}>
                          · {ANNOTATION_SEVERITY_LABELS[ann.severity]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {ann.comment}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnnotation(ann.id)}
                      aria-label={`Delete annotation for ${MANUSCRIPT_SECTION_LABELS[ann.section]}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Synthesis & Editorial Recommendation */}
          <div className="space-y-4 pt-2 border-t border-stone-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              3. Synthesis Feedback &amp; Recommendation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pr-recommendation" className="block text-xs font-semibold mb-1">
                  Editorial Recommendation
                </label>
                <select
                  id="pr-recommendation"
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as ReviewRecommendation)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                >
                  {(Object.entries(RECOMMENDATION_LABELS) as [ReviewRecommendation, string][]).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="pr-summary" className="block text-xs font-semibold mb-1">
                Synthesis Summary Feedback
              </label>
              <textarea
                id="pr-summary"
                rows={3}
                value={summaryFeedback}
                onChange={(e) => setSummaryFeedback(e.target.value)}
                placeholder="Provide an overall scholarly evaluation synthesizing strengths, required revisions, and publication readiness..."
                maxLength={5000}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>

            <div>
              <label htmlFor="pr-confidential" className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                <span>Confidential Note to Editorial Desk (Optional — Hidden from Author)</span>
              </label>
              <textarea
                id="pr-confidential"
                rows={2}
                value={confidentialNote}
                onChange={(e) => setConfidentialNote(e.target.value)}
                placeholder="Private remarks for the handling editor (e.g., ethics concern, scope fit)..."
                maxLength={2000}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {existingOwnReview?.status === 'submitted'
                  ? 'Your review is currently submitted. Updating and resubmitting refreshes the editorial record.'
                  : existingOwnReview?.status === 'draft'
                    ? 'Draft saved privately until you submit.'
                    : 'Save progress as a draft or submit your completed peer review.'}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSave('draft')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSave('submitted')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{existingOwnReview?.status === 'submitted' ? 'Update Submitted Review' : 'Submit Peer Review'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Visible Submitted & Draft Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-lg border border-stone-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No peer reviews have been recorded for this manuscript yet.
            </div>
          ) : (
            reviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-lg border border-stone-200 dark:border-slate-800 p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {rev.reviewerName}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        · {rev.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                      <span className={`text-xs font-semibold ${RECOMMENDATION_TEXT_CLASSES[rev.recommendation]}`}>
                        · {RECOMMENDATION_LABELS[rev.recommendation]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {rev.reviewerAffiliation ? `${rev.reviewerAffiliation} · ` : ''}
                      Updated {new Date(rev.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Overall Score
                    </span>
                    <span className="font-mono text-base font-semibold text-[#0F766E] dark:text-teal-300 tabular-nums">
                      {rev.overallScore.toFixed(1)} / 5.0
                    </span>
                  </div>
                </div>

                {/* Criterion Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200 dark:border-slate-800 rounded-lg p-3">
                  {RUBRIC_CRITERIA.map((criterion) => (
                    <div key={criterion.key}>
                      <span className="text-slate-500 dark:text-slate-400 block truncate">
                        {criterion.label.split('&')[0].trim()}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                        {rev.rubricScores[criterion.key]} / 5
                      </span>
                    </div>
                  ))}
                </div>

                {rev.summaryFeedback && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rev.summaryFeedback}
                  </p>
                )}

                {rev.confidentialEditorNote && (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 text-xs">
                    <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confidential Note to Editorial Desk</span>
                    </p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{rev.confidentialEditorNote}</p>
                  </div>
                )}

                {rev.annotations.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 dark:border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Section Annotations ({rev.annotations.length})
                    </p>
                    <div className="divide-y divide-stone-200 dark:divide-slate-800">
                      {rev.annotations.map((ann) => (
                        <div key={ann.id} className="py-2 text-xs space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {MANUSCRIPT_SECTION_LABELS[ann.section]}
                            </span>
                            {ann.locationRef && (
                              <span className="font-mono text-slate-500">· {ann.locationRef}</span>
                            )}
                            <span className={`font-semibold ${SEVERITY_TEXT_CLASSES[ann.severity]}`}>
                              · {ANNOTATION_SEVERITY_LABELS[ann.severity]}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-sm">{ann.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Section-Grouped Annotations Explorer */}
      {activeTab === 'annotations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSectionFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors tabular-nums ${
                sectionFilter === 'all'
                  ? 'border-[#0F1E36] bg-[#0F1E36] text-white dark:border-[#0F766E] dark:bg-[#0F766E]'
                  : 'border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              All Sections ({summary.totalAnnotations})
            </button>
            {MANUSCRIPT_SECTIONS.map((sec) => {
              const count = summary.sectionAnnotationCounts[sec.key] || 0;
              if (count === 0 && sectionFilter !== sec.key) return null;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setSectionFilter(sec.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors tabular-nums ${
                    sectionFilter === sec.key
                      ? 'border-[#0F1E36] bg-[#0F1E36] text-white dark:border-[#0F766E] dark:bg-[#0F766E]'
                      : 'border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {sec.shortLabel} ({count})
                </button>
              );
            })}
          </div>

          {flattenedAnnotations.length === 0 ? (
            <div className="rounded-lg border border-stone-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No annotations recorded for this section filter.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-slate-800 rounded-lg border border-stone-200 dark:border-slate-800">
              {flattenedAnnotations.map((item) => (
                <div key={`${item.reviewId}_${item.id}`} className="p-4 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {MANUSCRIPT_SECTION_LABELS[item.section]}
                      </span>
                      {item.locationRef && (
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          · {item.locationRef}
                        </span>
                      )}
                      <span className={`font-semibold ${SEVERITY_TEXT_CLASSES[item.severity]}`}>
                        · {ANNOTATION_SEVERITY_LABELS[item.severity]}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.reviewerName}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
