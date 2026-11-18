import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, FilterX, Search, SlidersHorizontal } from 'lucide-react';
import { CoverImage } from '../../components/CoverImage';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { SAMPLE_PUBLICATIONS } from '../../data/seedData';
import {
  filterCatalogue, publicationTypeLabel, publicationYear,
  type CatalogueSort,
} from '../../domain/publications';
import type { PublicationRecord } from '../../domain/types';

const PAGE_SIZE = 9;
const SELECT_CLASS = 'min-w-0 w-full px-3 py-2.5 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900';
const SORT_OPTIONS: { value: CatalogueSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
  { value: 'author_asc', label: 'Author A–Z' },
];

export function CataloguePage() {
  const { repo } = useAuth();
  const [params, setParams] = useSearchParams();
  const [publications, setPublications] = useState<PublicationRecord[]>(SAMPLE_PUBLICATIONS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    repo.listPublishedCatalogue()
      .then((list) => { if (active) setPublications(list.filter((p) => p.releaseStatus === 'published')); })
      .catch(() => { if (active) { setPublications([]); setLoadError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repo]);

  const query = params.get('q') || '';
  const typeParam = params.get('type') || 'all';
  const type = typeParam === 'article' ? 'general_article' : typeParam;
  const category = params.get('category') || 'all';
  const language = params.get('language') || 'all';
  const format = params.get('format') || 'all';
  const access = params.get('access') || 'all';
  const sortParam = params.get('sort') || 'newest';
  const sort: CatalogueSort = SORT_OPTIONS.some((opt) => opt.value === sortParam) ? sortParam as CatalogueSort : 'newest';
  const rawPage = Number(params.get('page') || 1);
  const currentPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all' || (key === 'sort' && value === 'newest')) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const allPublished = useMemo(() => publications.filter((pub) => pub.releaseStatus === 'published'), [publications]);
  const categories = useMemo(() => Array.from(new Set(allPublished.flatMap((pub) => [
    ...(pub.category ? [pub.category] : []), ...(pub.subjects || []),
  ]))).sort((a, b) => a.localeCompare(b)), [allPublished]);
  const languages = useMemo(() => Array.from(new Set(allPublished.map((pub) => pub.language).filter((x): x is string => Boolean(x)))).sort(), [allPublished]);
  const types = useMemo(() => Array.from(new Set(allPublished.map((pub) => pub.publicationType))).sort(), [allPublished]);
  const filtered = useMemo(() => filterCatalogue(publications, { query, type, category, language, format, access, sort }),
    [publications, query, type, category, language, format, access, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = Boolean(query || params.get('type') || params.get('category') || params.get('language') || params.get('format') || params.get('access'));

  const navigatePage = (page: number) => {
    const next = new URLSearchParams(params);
    if (page <= 1) next.delete('page'); else next.set('page', String(page));
    setParams(next, { replace: true });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.17em] font-semibold text-[#946000] dark:text-amber-400">Stories. Memory. Legacy.</p>
              <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-semibold text-[#22170D] dark:text-white">Explore Our Publications</h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Discover books, articles and scholarly publications. Only works released to the public catalogue are listed here; draft manuscripts remain private.
              </p>
            </div>
            <Link to="/publish-book" className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold bg-[#22170D] text-white dark:bg-[#946000]">
              Publish Your Story <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 rounded-xl border border-stone-200 dark:border-slate-800 bg-[#F8F3EB] dark:bg-slate-900 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input aria-label="Search published works" type="search" value={query} onChange={(e) => setFilter('q', e.target.value)}
                  placeholder="Search books, authors, topics or series..."
                  className="w-full pl-10 pr-3 py-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
              </div>
              <button type="button" onClick={() => setFiltersOpen((old) => !old)}
                aria-expanded={filtersOpen} aria-controls="catalogue-filters"
                className="inline-flex justify-center items-center gap-2 rounded-lg px-4 py-3 border border-stone-300 dark:border-slate-700 text-sm font-semibold">
                <SlidersHorizontal className="w-4 h-4" /> {filtersOpen ? 'Hide filters' : 'Show filters'}
              </button>
              {hasFilters && (
                <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#946000] dark:text-amber-300">
                  <FilterX className="w-4 h-4" /> Clear all
                </button>
              )}
            </div>

            {filtersOpen && (
              <div id="catalogue-filters" className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Publication type
                  <select aria-label="Publication type" value={type} onChange={(e) => setFilter('type', e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
                    <option value="all">All types</option>
                    {Array.from(new Set(['book', 'general_article', 'academic_research', ...types])).map((v) => (
                      <option key={v} value={v}>{publicationTypeLabel(v)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Subject / genre
                  <select aria-label="Subject or genre" value={category} onChange={(e) => setFilter('category', e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
                    <option value="all">All subjects</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Language
                  <select aria-label="Language" value={language} onChange={(e) => setFilter('language', e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
                    <option value="all">All languages</option>
                    {languages.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Format
                  <select aria-label="Publication format" value={format} onChange={(e) => setFilter('format', e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
                    <option value="all">All formats</option><option value="digital">Digital</option><option value="print">Print</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Access
                  <select aria-label="Access type" value={access} onChange={(e) => setFilter('access', e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
                    <option value="all">All access types</option><option value="free">Free to read</option><option value="paid">Paid</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Sort
                  <select aria-label="Sort publications" value={sort} onChange={(e) => setFilter('sort', e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300" role="status">
            <span>{loading ? 'Loading catalogue…' : `${filtered.length} publication${filtered.length === 1 ? '' : 's'} found`}</span>
            {!loading && filtered.length > 0 && <span>Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>}
          </div>

          {loading ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {[1, 2, 3].map((n) => <div key={n} className="h-80 rounded-xl bg-stone-200/70 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : loadError ? (
            <div className="mt-8 p-8 rounded-xl border border-red-200 dark:border-red-800">
              Could not load the catalogue. Please try again later.
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 text-center py-16 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <BookOpen className="w-8 h-8 text-[#946000] mx-auto mb-3" />
              <p className="text-lg font-semibold">No matching publications</p>
              <p className="mt-2 text-sm text-slate-500">Try another subject, search term or filter.</p>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {visible.map((pub) => (
                  <Link key={pub.id} to={`/catalogue/${encodeURIComponent(pub.id)}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#946000] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#946000]">
                    <div className="aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-slate-800">
                      <CoverImage src={pub.coverUrl} alt={pub.title} title={pub.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200" />
                    </div>
                    <div className="flex-1 flex flex-col p-5">
                      <p className="text-xs uppercase tracking-wider text-[#946000] dark:text-amber-400 font-semibold">
                        {publicationTypeLabel(pub.publicationType)}
                        {pub.isSample ? ' · Sample' : ''}
                      </p>
                      <h2 className="mt-2 font-serif text-xl font-semibold leading-snug text-[#22170D] dark:text-white">{pub.title}</h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{pub.authorName}</p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3 flex-1">{pub.abstract}</p>
                      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {[pub.category, pub.language, publicationYear(pub)].filter(Boolean).join(' · ') || 'Publication'}
                        </span>
                        <span className="font-semibold text-[#946000] dark:text-amber-400">View details →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {pageCount > 1 && (
                <nav aria-label="Catalogue pagination" className="mt-10 flex items-center justify-center gap-4">
                  <button type="button" disabled={safePage === 1} onClick={() => navigatePage(safePage - 1)}
                    className="px-4 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-sm disabled:opacity-40">Previous</button>
                  <span className="text-sm text-slate-600 dark:text-slate-300">Page {safePage} of {pageCount}</span>
                  <button type="button" disabled={safePage === pageCount} onClick={() => navigatePage(safePage + 1)}
                    className="px-4 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-sm disabled:opacity-40">Next</button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
