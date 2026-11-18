import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessAdminConsole,
  canAccessEditorialWorkspace,
  canReleasePublication,
  canViewComment,
  canViewManuscript,
  filterVisibleComments,
  sanitizePublicRegistrationRoles,
} from './rbac';
import {
  calculateQuotationEstimate,
  canTransitionStatus,
  generateReferenceNumber,
  validateFileUploadMeta,
} from './workflow';
import type { EditorialComment, PublishingService, UserProfile } from './types';

const now = '2026-11-18T12:00:00.000Z';

const authorUser: UserProfile = {
  uid: 'author_1',
  email: 'author@example.edu',
  displayName: 'Dr. Elena Vance',
  roles: ['author', 'researcher'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const otherAuthor: UserProfile = {
  uid: 'author_2',
  email: 'other@example.edu',
  displayName: 'Marcus Chen',
  roles: ['author'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const editorUser: UserProfile = {
  uid: 'editor_1',
  email: 'editor@publishing.org',
  displayName: 'Clara Holloway',
  roles: ['editor'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const managerUser: UserProfile = {
  uid: 'manager_1',
  email: 'manager@publishing.org',
  displayName: 'Arthur Pendelton',
  roles: ['publishing_manager'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const adminUser: UserProfile = {
  uid: 'admin_1',
  email: 'admin@publishing.org',
  displayName: 'Platform Admin',
  roles: ['super_admin'],
  accountStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

test('Public registration blocks privileged role self-assignment', () => {
  assert.deepEqual(sanitizePublicRegistrationRoles(['super_admin', 'editor']), ['author']);
  assert.deepEqual(sanitizePublicRegistrationRoles(['researcher', 'platform_admin']), ['researcher']);
  assert.deepEqual(sanitizePublicRegistrationRoles(undefined), ['author']);
});

test('RBAC isolates cross-author manuscripts and admin consoles', () => {
  const manuscript = {
    authorId: 'author_1',
    assignedEditorId: 'editor_1',
    assignedReviewerIds: [],
  };
  assert.equal(canViewManuscript(authorUser, manuscript), true);
  assert.equal(canViewManuscript(otherAuthor, manuscript), false);
  assert.equal(canViewManuscript(editorUser, manuscript), true);

  assert.equal(canAccessEditorialWorkspace(authorUser), false);
  assert.equal(canAccessEditorialWorkspace(editorUser), true);
  assert.equal(canAccessAdminConsole(editorUser), false);
  assert.equal(canAccessAdminConsole(adminUser), true);
  assert.equal(canReleasePublication(editorUser), false);
  assert.equal(canReleasePublication(managerUser), true);
});

test('Internal editorial notes remain strictly confidential from manuscript author', () => {
  const comments: EditorialComment[] = [
    {
      id: 'c1',
      manuscriptId: 'ms1',
      manuscriptAuthorId: 'author_1',
      authorId: 'editor_1',
      authorName: 'Clara Holloway',
      visibility: 'author_visible',
      commentType: 'revision_request',
      body: 'Please expand Chapter 3 methodology.',
      createdAt: now,
    },
    {
      id: 'c2',
      manuscriptId: 'ms1',
      manuscriptAuthorId: 'author_1',
      authorId: 'editor_1',
      authorName: 'Clara Holloway',
      visibility: 'internal_editorial',
      commentType: 'editorial_note',
      body: 'Confidential: Check statistical claims with external reviewer.',
      createdAt: now,
    },
  ];

  assert.equal(canViewComment(authorUser, comments[0]), true);
  assert.equal(canViewComment(authorUser, comments[1]), false);
  assert.equal(filterVisibleComments(authorUser, comments).length, 1);
  assert.equal(filterVisibleComments(editorUser, comments).length, 2);
});

test('Workflow state machine enforces role & publication-type transitions', () => {
  // Author cannot jump directly from submitted to published
  const illegalJump = canTransitionStatus('submitted', 'published', 'book', authorUser, 'author_1');
  assert.equal(illegalJump.allowed, false);

  // Author can submit a draft
  const draftSubmit = canTransitionStatus('draft', 'submitted', 'book', authorUser, 'author_1');
  assert.equal(draftSubmit.allowed, true);

  // Editor can move submitted -> under_initial_review -> author_revision_required
  assert.equal(
    canTransitionStatus('submitted', 'under_initial_review', 'academic_research', editorUser, 'author_1').allowed,
    true,
  );
  assert.equal(
    canTransitionStatus('under_initial_review', 'author_revision_required', 'academic_research', editorUser, 'author_1').allowed,
    true,
  );

  // Regular editor cannot release directly to published; publishing manager can from approved_for_publication
  assert.equal(
    canTransitionStatus('approved_for_publication', 'published', 'book', editorUser, 'author_1').allowed,
    false,
  );
  assert.equal(
    canTransitionStatus('approved_for_publication', 'published', 'book', managerUser, 'author_1').allowed,
    true,
  );

  // Terminal status cannot transition
  assert.equal(
    canTransitionStatus('published', 'draft', 'book', adminUser, 'author_1').allowed,
    false,
  );
});

test('File upload validation enforces extensions, MIME types, and size bounds', () => {
  assert.equal(
    validateFileUploadMeta({ name: 'manuscript.pdf', type: 'application/pdf', size: 102400 }).valid,
    true,
  );
  assert.equal(
    validateFileUploadMeta({
      name: 'manuscript.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 250000,
    }).valid,
    true,
  );
  assert.equal(
    validateFileUploadMeta({ name: 'payload.exe', type: 'application/x-msdownload', size: 1024 }).valid,
    false,
  );
  assert.equal(
    validateFileUploadMeta({ name: 'empty.pdf', type: 'application/pdf', size: 0 }).valid,
    false,
  );
  assert.equal(
    validateFileUploadMeta({ name: 'huge.pdf', type: 'application/pdf', size: 30 * 1024 * 1024 }).valid,
    false,
  );
});

test('Reference number generator and quotation calculator work deterministically', () => {
  assert.equal(generateReferenceNumber(2026, 42), 'MS-2026-0042');
  const services: PublishingService[] = [
    {
      id: 's1',
      name: 'Copyediting',
      description: 'Line and copy edit',
      category: 'Copyediting',
      pricingMethod: 'per_word',
      basePrice: 0.03,
      currency: 'USD',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 's2',
      name: 'Book Formatting',
      description: 'Print & eBook layout',
      category: 'Book Formatting',
      pricingMethod: 'flat_fee',
      basePrice: 450,
      currency: 'USD',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const est = calculateQuotationEstimate(services, 20000, 120);
  assert.equal(est.estimatedTotal, 1050);
  assert.equal(est.currency, 'USD');
  assert.equal(est.hasCustomQuote, false);
});
