import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvedPublicPreview, filterCatalogue, parseListInput, publicAuthorProfiles,
  publicationTypeLabel, publicationYear, relatedPublications,
  sanitisePublicationPreview,
} from './publications';
import type { PublicationRecord } from './types';

const base: PublicationRecord = {
  id: 'published1', authorId: 'a', authorName: 'A Writer', title: 'Stories of Tomorrow',
  publicationType: 'book', category: 'Literature', format: 'both', accessType: 'paid',
  language: 'English', subjects: ['Fiction'], releaseStatus: 'published', isSample: false,
  publishedAt: '2026-10-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};
test('Only published works can enter public catalogue or related content', () => {
  const drafts = [{ ...base, id: 'draft', title: 'Top Secret', releaseStatus: 'approved' as const }];
  assert.deepEqual(
    filterCatalogue([base, ...drafts], {
      query: '', type: 'all', category: 'all', language: 'all', format: 'all', access: 'all', sort: 'newest',
    }).map((x) => x.id), ['published1'],
  );
  assert.deepEqual(relatedPublications(base, drafts), []);
});

test('Approved public preview is opt-in and denied for draft publications', () => {
  assert.equal(approvedPublicPreview({ ...base, excerpt: 'Confidential draft' }), null);
  assert.equal(approvedPublicPreview({ ...base, previewEnabled: true, excerpt: 'Approved excerpt' }), 'Approved excerpt');
  assert.equal(approvedPublicPreview({
    ...base, releaseStatus: 'approved', previewEnabled: true, excerpt: 'Still confidential',
  }), null);
  assert.equal(sanitisePublicationPreview('secret', false), '');
});

test('Catalogue search, facets, and format filtering respect published records', () => {
  const records = [
    base,
    { ...base, id: 'pub2', title: 'Research Studies', authorId: 'b', authorName: 'B Writer',
      category: 'Science', language: 'French', publicationType: 'academic_research', format: 'digital' as const,
      accessType: 'free' as const, publishedAt: '2025-01-01T00:00:00Z' },
  ];
  const filters = {
    query: 'tomorrow', type: 'book', category: 'Fiction', language: 'English',
    format: 'print', access: 'paid', sort: 'newest' as const,
  };
  assert.deepEqual(filterCatalogue(records, filters).map((x) => x.id), ['published1']);
  assert.deepEqual(filterCatalogue(records, { ...filters, format: 'digital', access: 'free' }), []);
  assert.deepEqual(filterCatalogue(records, { ...filters, query: '', type: 'all', category: 'all', language: 'all', format: 'all', access: 'all', sort: 'oldest' })
    .map((x) => x.id), ['pub2', 'published1']);
});

test('Metadata helpers do not invent years and return distinct lists', () => {
  assert.equal(publicationYear(base), 2026);
  assert.equal(publicationYear({ ...base, publishedAt: undefined }), null);
  assert.equal(publicationTypeLabel('general_article'), 'Article');
  assert.deepEqual(parseListInput('Fiction, History\nFiction'), ['Fiction', 'History']);
});

test('Public profile discovery requires explicit author opt-in', () => {
  const profiles = [
    { uid: 'private1', displayName: 'Private', bio: 'Confidential bio', isSample: false, updatedAt: '', isPublic: false },
    { uid: 'legacy', displayName: 'Legacy', bio: 'Previously auto-exposed', isSample: false, updatedAt: '' },
    { uid: 'public1', displayName: 'Public', bio: 'Approved', isSample: false, updatedAt: '', isPublic: true },
  ];
  assert.deepEqual(publicAuthorProfiles(profiles).map((p) => p.uid), ['public1']);
});
