import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPolicySlug, POLICY_DOCUMENTS, POLICY_SLUGS, POLICY_REVIEW_VERSION,
  POLICY_APPROVAL_STATUS, POLICY_LAST_REVIEWED,
} from './policyContent';

test('Only known governance policy routes resolve', () => {
  for (const slug of POLICY_SLUGS) assert.equal(isPolicySlug(slug), true);
  assert.equal(isPolicySlug('unknown'), false);
  assert.equal(isPolicySlug(undefined), false);
  assert.equal(isPolicySlug('__proto__'), false);
});

test('Every policy is substantial, internally anchored and marked pending approval', () => {
  assert.equal(POLICY_APPROVAL_STATUS, 'pending-owner-and-legal-review');
  assert.match(POLICY_REVIEW_VERSION, /^draft-/);
  assert.ok(POLICY_LAST_REVIEWED.length > 0);
  assert.equal(POLICY_SLUGS.length, 4);
  for (const slug of POLICY_SLUGS) {
    const policy = POLICY_DOCUMENTS[slug];
    assert.equal(policy.slug, slug);
    assert.ok(policy.title.length >= 5);
    assert.ok(policy.overview.length >= 60);
    assert.ok(policy.sections.length >= 9, slug + ' must contain meaningful sections');
    const ids = policy.sections.map(section => section.id);
    assert.equal(new Set(ids).size, ids.length, slug + ' has duplicate section anchors');
    for (const section of policy.sections) {
      assert.match(section.id, /^[a-z][a-z-]+$/);
      assert.ok(section.heading.length > 5);
      assert.ok(section.paragraphs.length >= 1);
      assert.ok(section.paragraphs.every(para => para.length >= 35));
    }
  }
});

test('Drafts address critical privacy, copyright and editorial areas', () => {
  const joined = (slug: keyof typeof POLICY_DOCUMENTS) =>
    POLICY_DOCUMENTS[slug].sections.flatMap(section => [
      section.heading, ...section.paragraphs, ...(section.bullets || [])
    ]).join(' ').toLowerCase();
  for (const phrase of ['firebase', 'manuscripts', 'consent', 'retention', 'cookies', 'contact']) {
    assert.ok(joined('privacy').includes(phrase), phrase);
  }
  for (const phrase of ['quotation', 'refund', 'submission', 'liability', 'agreement']) {
    assert.ok(joined('terms').includes(phrase), phrase);
  }
  for (const phrase of ['copyright', 'third-party', 'creative commons', 'rights', 'excerpts']) {
    assert.ok(joined('copyright').includes(phrase), phrase);
  }
  for (const phrase of ['conflicts of interest', 'peer', 'plagiarism', 'corrections', 'ai']) {
    assert.ok(joined('editorial').includes(phrase), phrase);
  }
});

test('References use approved external HTTPS targets only', () => {
  for (const policy of Object.values(POLICY_DOCUMENTS)) {
    for (const item of policy.references || []) {
      const uri = new URL(item.url);
      assert.equal(uri.protocol, 'https:');
      assert.ok(['creativecommons.org', 'www.wipo.int', 'doi.org'].includes(uri.hostname));
    }
  }
});
