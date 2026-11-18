import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CoverImage } from '../../components/CoverImage';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { SAMPLE_PUBLICATIONS } from '../../data/seedData';
import type { PublicationRecord } from '../../domain/types';

export function CataloguePage() {
  const { repo } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [publications, setPublications] = useState<PublicationRecord[]>(SAMPLE_PUBLICATIONS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [formatFilter, setFormatFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    repo
      .listPublishedCatalogue()
      .then((list) => setPublications(list.filter((p) => p.releaseStatus === 'published')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repo]);

  const filtered = useMemo(() => {
    return publications.filter((pub) => {
      if (typeFilter !== 'all') {
        if (typeFilter === 'article' && pub.publicationType !== 'general_article') return false;
        if (typeFilter !== 'article' && pub.publicationType !== typeFilter) return false;
      }
      if (formatFilter !== 'all' && pub.format !== formatFilter && pub.format !== 'both') {
        return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${pub.title} ${pub.authorName} ${pub.category || ''} ${pub.abstract || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [formatFilter, publications, query, typeFilter]);

  const handleTypeSelect = (val: string) => {
    setTypeFilter(val);
    if (val === 'all') searchParams.delete('type');
    else searchParams.set('type', val);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F1E36] dark:text-white">
              Public Publication Catalogue
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Only works formally approved and released by an authorized Publishing Manager appear
              here. Drafts and manuscripts under review remain strictly confidential.
            </p>
          </div>

          <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, author, category, or abstract..."
                aria-label="Search publication catalogue"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-200/70 dark:bg-slate-800">
                {[
                  { value: 'all', label: 'All Works' },
                  { value: 'book', label: 'Books' },
                  { value: 'general_article', label: 'Articles' },
                  { value: 'academic_research', label: 'Research' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleTypeSelect(tab.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                      typeFilter === tab.value
                        ? 'bg-white dark:bg-slate-900 text-[#0F1E36] dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                aria-label="Filter by format"
                className="px-3 py-2 text-xs font-medium rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="all">All Formats</option>
                <option value="digital">Digital</option>
                <option value="print">Print</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 rounded-xl bg-stone-200/60 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 text-center py-16 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-lg font-medium text-slate-900 dark:text-white">No matching publications</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try clearing your search or switching publication type filters.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((pub) => (
                <Link
                  key={pub.id}
                  to={`/catalogue/${pub.id}`}
                  className="group flex flex-col rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-[#0F766E] transition-colors"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-stone-100 dark:bg-slate-800">
                    <CoverImage
                      src={pub.coverUrl}
                      alt={pub.title}
                      title={pub.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {pub.category || pub.publicationType} · {pub.accessType === 'free' ? 'Open Access' : `${pub.currency || 'USD'} ${pub.price}`}
                      {pub.isSample ? ' · Sample Record' : ''}
                    </div>
                    <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white leading-snug">
                      {pub.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{pub.authorName}</p>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-3 flex-1">
                      {pub.abstract}
                    </p>
                    <div className="mt-4 pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>{pub.isbn || pub.doi || 'Identifier Pending'}</span>
                      <span className="font-sans font-semibold text-[#0F766E]">View Edition →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
