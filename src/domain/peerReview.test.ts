import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOverallScore,
  filterVisiblePeerReviews,
  flattenAnnotationsBySection,
  summarizePeerReviews,
  validatePeerReviewInput,
} from './peerReview';
import { canAccessPeerReviewWorkspace, canManageReviewers, canSubmitPeerReview } from './rbac';
import type { PeerReview, UserProfile } from './types';

const now = '2026-11-18T12:00:00.000Z';

const editorUser: UserProfile = {
  uid: 'editor_1',
  email: 'editor@griotsbooks.example',
  displayName: 'Clara Holloway',
  roles: ['managing_editor'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const assignedReviewer: UserProfile = {
  uid: 'reviewer_1',
  email: 'reviewer1@griotsbooks.example',
  displayName: 'Dr. Samuel Adeyemi',
  roles: ['reviewer'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const unassignedReviewer: UserProfile = {
  uid: 'reviewer_2',
  email: 'reviewer2@griotsbooks.example',
  displayName: 'Dr. Hannah Cho',
  roles: ['reviewer'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const authorUser: UserProfile = {
  uid: 'author_1',
  email: 'author@griotsbooks.example',
  displayName: 'Elena Rostova',
  roles: ['author'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

test('calculateOverallScore and validatePeerReviewInput enforce 1-5 bounds and summary length', () => {
  assert.equal(
    calculateOverallScore({ originality: 5, rigor: 4, clarity: 4, citations: 5 }),
    4.5,
  );

  const invalidScore = validatePeerReviewInput({
    rubricScores: { originality: 6, rigor: 4, clarity: 4, citations: 4 },
    summaryFeedback: 'Solid manuscript overall.',
    annotations: [],
    status: 'submitted',
  });
  assert.equal(invalidScore.valid, false);

  const shortSummaryOnSubmit = validatePeerReviewInput({
    rubricScores: { originality: 4, rigor: 4, clarity: 4, citations: 4 },
    summaryFeedback: 'Too short',
    annotations: [],
    status: 'submitted',
  });
  assert.equal(shortSummaryOnSubmit.valid, false);

  const draftWithShortSummary = validatePeerReviewInput({
    rubricScores: { originality: 4, rigor: 4, clarity: 4, citations: 4 },
    summaryFeedback: '',
    annotations: [],
    status: 'draft',
  });
  assert.equal(draftWithShortSummary.valid, true);
});

test('summarizePeerReviews and flattenAnnotationsBySection aggregate submitted metrics and filter by section', () => {
  const reviews: PeerReview[] = [
    {
      id: 'rev_1',
      manuscriptId: 'ms_1',
      manuscriptAuthorId: 'author_1',
      reviewerId: 'reviewer_1',
      reviewerName: 'Dr. Samuel Adeyemi',
      recommendation: 'minor_revision',
      rubricScores: { originality: 5, rigor: 4, clarity: 4, citations: 3 },
      overallScore: 4,
      summaryFeedback: 'Strong contribution with minor methodological notes.',
      annotations: [
        {
          id: 'ann_1',
          section: 'methodology',
          locationRef: 'Section 3.2',
          severity: 'major_issue',
          comment: 'Clarify sample inclusion threshold.',
        },
        {
          id: 'ann_2',
          section: 'introduction',
          locationRef: 'p. 2',
          severity: 'commendation',
          comment: 'Clear framing of regional context.',
        },
      ],
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rev_2',
      manuscriptId: 'ms_1',
      manuscriptAuthorId: 'author_1',
      reviewerId: 'reviewer_2',
      reviewerName: 'Dr. Hannah Cho',
      recommendation: 'accept',
      rubricScores: { originality: 5, rigor: 5, clarity: 5, citations: 5 },
      overallScore: 5,
      summaryFeedback: 'Exemplary archival study ready for publication.',
      annotations: [
        {
          id: 'ann_3',
          section: 'methodology',
          severity: 'minor_suggestion',
          comment: 'Add brief table summarizing corpus size.',
        },
      ],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const summary = summarizePeerReviews(reviews);
  assert.equal(summary.submittedCount, 1);
  assert.equal(summary.draftCount, 1);
  assert.equal(summary.averageOverallScore, 4);
  assert.equal(summary.criterionAverages.originality, 5);
  assert.equal(summary.totalAnnotations, 3);
  assert.equal(summary.sectionAnnotationCounts.methodology, 2);
  assert.equal(summary.recommendationCounts.minor_revision, 1);

  const methodologyOnly = flattenAnnotationsBySection(reviews, 'methodology');
  assert.equal(methodologyOnly.length, 2);
  assert.equal(methodologyOnly[0].section, 'methodology');
});

test('Peer review RBAC restricts access to assigned reviewers and editorial staff', () => {
  const manuscript = {
    authorId: 'author_1',
    assignedReviewerIds: ['reviewer_1'],
  };

  assert.equal(canAccessPeerReviewWorkspace(assignedReviewer), true);
  assert.equal(canAccessPeerReviewWorkspace(authorUser), false);

  assert.equal(canManageReviewers(editorUser), true);
  assert.equal(canManageReviewers(assignedReviewer), false);

  assert.equal(canSubmitPeerReview(assignedReviewer, manuscript), true);
  assert.equal(canSubmitPeerReview(unassignedReviewer, manuscript), false);
  assert.equal(canSubmitPeerReview(authorUser, manuscript), false);

  const reviews: PeerReview[] = [
    {
      id: 'rev_1',
      manuscriptId: 'ms_1',
      manuscriptAuthorId: 'author_1',
      reviewerId: 'reviewer_1',
      reviewerName: 'Dr. Samuel Adeyemi',
      recommendation: 'minor_revision',
      rubricScores: { originality: 4, rigor: 4, clarity: 4, citations: 4 },
      overallScore: 4,
      summaryFeedback: 'Good work overall.',
      annotations: [],
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rev_2',
      manuscriptId: 'ms_1',
      manuscriptAuthorId: 'author_1',
      reviewerId: 'reviewer_2',
      reviewerName: 'Dr. Hannah Cho',
      recommendation: 'accept',
      rubricScores: { originality: 5, rigor: 5, clarity: 5, citations: 5 },
      overallScore: 5,
      summaryFeedback: 'Ready for publication.',
      annotations: [],
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Assigned reviewer only sees their own review; editorial staff see all
  assert.equal(filterVisiblePeerReviews(assignedReviewer, reviews).length, 1);
  assert.equal(filterVisiblePeerReviews(editorUser, reviews).length, 2);
  assert.equal(filterVisiblePeerReviews(authorUser, reviews).length, 0);
});
