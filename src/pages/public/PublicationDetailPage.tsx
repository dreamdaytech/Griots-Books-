import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CoverImage } from '../../components/CoverImage';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import type { PublicationRecord } from '../../domain/types';

export function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { repo } = useAuth();
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    repo
      .getPublicationById(id)
      .then((rec) => {
        if (rec && rec.releaseStatus === 'published') setPublication(rec);
        else setPublication(null);
      })
      .catch(() => setPublication(null))
      .finally(() => setLoading(false));
  }, [id, repo]);

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/catalogue"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#22170D]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalogue</span>
        </Link>

        {loading ? (
          <div className="mt-8 h-80 rounded-xl bg-stone-200 dark:bg-slate-800 animate-pulse" />
        ) : !publication ? (
          <div className="mt-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
            <h1 className="font-serif text-2xl font-semibold">Publication Not Available</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This record either does not exist or has not been released to the public catalogue.
            </p>
          </div>
        ) : (
          <article className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800">
                <CoverImage
                  src={publication.coverUrl}
                  alt={publication.title}
                  title={publication.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="md:col-span-8">
              <p className="text-xs font-medium uppercase tracking-wider text-[#946000] dark:text-amber-400">
                {publication.category || publication.publicationType}
                {publication.isSample ? ' · Sample Catalogue Record' : ''}
              </p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white leading-tight">
                {publication.title}
              </h1>
              {publication.subtitle && (
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-300 font-serif italic">
                  {publication.subtitle}
                </p>
              )}
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                By {publication.authorName}
              </p>

              <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-stone-200 dark:border-slate-800 text-xs">
                <div>
                  <dt className="text-slate-500">Format</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-white capitalize">
                    {publication.format === 'both' ? 'Digital & Print' : publication.format}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Access</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-white tabular-nums">
                    {publication.accessType === 'free'
                      ? 'Open / Free Access'
                      : `${publication.currency || 'USD'} ${publication.price}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Identifier Status</dt>
                  <dd className="mt-1 font-mono text-slate-900 dark:text-white">
                    {publication.isbn || publication.doi || publication.issn || (publication.identifierStatus || 'Unassigned').replace(/_/g, ' ')}
                  </dd>
                </div>
              </dl>

              <div className="mt-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Synopsis & Abstract</h2>
                <p className="mt-2 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-prose">
                  {publication.abstract}
                </p>
              </div>

              {publication.excerpt && (
                <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Reading Excerpt
                  </h2>
                  <div className="mt-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 max-w-prose">
                    {publication.excerpt}
                  </div>
                </div>
              )}
            </div>
          </article>
        )}
      </div>
    </PublicLayout>
  );
}
