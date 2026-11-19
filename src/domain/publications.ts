import type { PublicationRecord, PublicAuthorProfile } from './types';

export type CatalogueSort = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'author_asc';

export interface CatalogueFilters {
  query: string;
  type: string;
  category: string;
  language: string;
  format: string;
  access: string;
  sort: CatalogueSort;
}

/**
 * Public catalogue helpers are pure so we can test filtering without a database.
 * Never consume manuscript records or unreleased publication records here.
 */
export function publicAuthorProfiles(profiles: PublicAuthorProfile[]): PublicAuthorProfile[] {
  // A published book may identify its author without automatically exposing account-profile data.
  return profiles.filter((author) => author.isPublic === true);
}

export function publicPublications(records: PublicationRecord[]): PublicationRecord[] {
  return records.filter((publication) => publication.releaseStatus === 'published');
}

export function publicationYear(publication: PublicationRecord): number | null {
  if (Number.isInteger(publication.publicationYear) && Number(publication.publicationYear) >= 1400) {
    return Number(publication.publicationYear);
  }
  const parsed = publication.publishedAt ? new Date(publication.publishedAt).getFullYear() : NaN;
  return Number.isFinite(parsed) && parsed >= 1400 ? parsed : null;
}

export function publicationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    book: 'Book',
    general_article: 'Article',
    academic_research: 'Academic Research',
    journal_submission: 'Journal Article',
    conference_paper: 'Conference Paper',
    thesis_dissertation: 'Thesis / Dissertation',
    research_report: 'Research Report',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

export function approvedPublicPreview(publication: PublicationRecord): string | null {
  if (publication.releaseStatus !== 'published' || publication.previewEnabled !== true) return null;
  return publication.excerpt?.trim() || null;
}

export function parseListInput(input: string, limit = 20, maxItem = 160): string[] {
  return Array.from(new Set(input.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean)))
    .slice(0, limit)
    .map((x) => x.slice(0, maxItem));
}

export function sanitisePublicationPreview(input: string, approved: boolean): string {
  // Text previews are approved manually and never sourced from a private uploaded document.
  return approved ? input.trim().slice(0, 12000) : '';
}

export function filterCatalogue(
  records: PublicationRecord[],
  filters: CatalogueFilters,
): PublicationRecord[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const sorted = publicPublications(records).filter((publication) => {
    if (filters.type !== 'all') {
      const type = filters.type === 'article' ? 'general_article' : filters.type;
      if (publication.publicationType !== type) return false;
    }
    if (filters.format !== 'all' && publication.format !== filters.format && publication.format !== 'both') return false;
    if (filters.access !== 'all' && publication.accessType !== filters.access) return false;
    if (filters.language !== 'all' && publication.language !== filters.language) return false;
    if (filters.category !== 'all' && publication.category !== filters.category &&
        !publication.subjects?.includes(filters.category)) return false;
    if (query) {
      const hay = [
        publication.title, publication.subtitle, publication.authorName,
        publication.category, publication.abstract, publication.language,
        publication.imprint, publication.series, ...(publication.subjects || []),
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  sorted.sort((a, b) => {
    if (filters.sort === 'title_asc') return a.title.localeCompare(b.title);
    if (filters.sort === 'title_desc') return b.title.localeCompare(a.title);
    if (filters.sort === 'author_asc') return a.authorName.localeCompare(b.authorName);
    const dateA = a.publishedAt ? Date.parse(a.publishedAt) || 0 : 0;
    const dateB = b.publishedAt ? Date.parse(b.publishedAt) || 0 : 0;
    const delta = filters.sort === 'oldest' ? dateA - dateB : dateB - dateA;
    return delta || a.title.localeCompare(b.title);
  });
  return sorted;
}

export function relatedPublications(
  publication: PublicationRecord,
  records: PublicationRecord[],
  count = 3,
): PublicationRecord[] {
  const candidateList = publicPublications(records).filter((item) => item.id !== publication.id);
  return candidateList.map((item) => {
    let score = 0;
    if (publication.series && item.series && item.series === publication.series) score += 4;
    if (publication.category && item.category && item.category === publication.category) score += 2;
    if (publication.authorId && item.authorId === publication.authorId) score += 1;
    if (publication.subjects?.some((subject) => item.subjects?.includes(subject))) score += 1;
    return { item, score };
  }).filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, count).map((x) => x.item);
}
