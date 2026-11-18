import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Building2, GraduationCap } from 'lucide-react';
import { CoverImage } from '../../components/CoverImage';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { publicationTypeLabel, publicationYear, publicAuthorProfiles } from '../../domain/publications';
import type { PublicationRecord, PublicAuthorProfile } from '../../domain/types';

export function AuthorDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { repo } = useAuth();
  const [authors, setAuthors] = useState<PublicAuthorProfile[]>([]);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      repo.listPublicAuthors().catch(() => [] as PublicAuthorProfile[]),
      repo.listPublishedCatalogue().catch(() => [] as PublicationRecord[]),
    ]).then(([profiles, catalogue]) => {
      if (active) { setAuthors(publicAuthorProfiles(profiles)); setPublications(catalogue.filter((pub) => pub.releaseStatus === 'published')); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repo]);

  const author = useMemo(() => authors.find((item) => item.uid === uid) || null, [authors, uid]);
  const works = useMemo(() => publications.filter((pub) => pub.authorId === uid && pub.releaseStatus === 'published')
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')), [publications, uid]);
  const orcid = author?.orcid?.trim() || '';
  const validOrcid = /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/.test(orcid) && !author?.isSample;

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/authors" className="inline-flex items-center gap-2 text-sm font-semibold text-[#946000] dark:text-amber-400 hover:underline">
            <ArrowLeft className="w-4 h-4" /> All Authors & Researchers
          </Link>
          {loading ? (
            <div className="mt-8 h-64 rounded-xl bg-stone-200 dark:bg-slate-800 animate-pulse" />
          ) : !author ? (
            <div className="mt-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
              <h1 className="font-serif text-2xl font-semibold">Public Profile Not Available</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                The contributor has not made a public profile available here.
              </p>
            </div>
          ) : (
            <>
              <header className="mt-8 rounded-2xl border border-[#D9B36A]/40 bg-[#F8F3EB] dark:bg-slate-900 p-6 sm:p-10">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div aria-hidden="true" className="w-20 h-20 shrink-0 rounded-full border border-[#D9B36A] bg-[#F1E8DC] dark:bg-slate-800 text-[#946000] flex items-center justify-center font-serif text-4xl font-bold">
                    {author.displayName.trim().charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#946000] dark:text-amber-400">
                      {author.discipline || 'Author & Researcher'}{author.isSample ? ' · Sample Profile' : ''}
                    </p>
                    <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">{author.displayName}</h1>
                    {author.affiliation && <p className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Building2 className="w-4 h-4" />{author.affiliation}</p>}
                    {validOrcid && (
                      <a href={`https://orcid.org/${orcid}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-[#946000] dark:text-amber-400 hover:underline">
                        <GraduationCap className="w-4 h-4" /> ORCID provided: {orcid} <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                    <p className="mt-5 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-7 whitespace-pre-wrap break-words">
                      {author.bio || 'This contributor has not provided a biography yet.'}
                    </p>
                  </div>
                </div>
              </header>

              <div className="mt-12 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#22170D] dark:text-white">Published Works</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {works.length} publicly released publication{works.length === 1 ? '' : 's'} attributed to this contributor.
                  </p>
                </div>
                <BookOpen className="w-7 h-7 text-[#946000]" aria-hidden="true" />
              </div>
              {works.length === 0 ? (
                <div className="mt-6 p-10 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300">
                  No public works are linked to this profile yet. Private and unreleased manuscripts are never displayed.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {works.map((pub) => (
                    <Link key={pub.id} to={`/catalogue/${encodeURIComponent(pub.id)}`}
                      className="group flex gap-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-[#946000] transition-colors">
                      <div className="w-24 h-32 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-slate-800">
                        <CoverImage src={pub.coverUrl} alt={pub.title} title={pub.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide font-semibold text-[#946000] dark:text-amber-400">
                          {publicationTypeLabel(pub.publicationType)}{pub.isSample ? ' · Sample' : ''}
                        </p>
                        <h3 className="mt-2 font-serif text-lg font-semibold text-[#22170D] dark:text-white group-hover:underline">{pub.title}</h3>
                        {pub.subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{pub.subtitle}</p>}
                        <p className="mt-3 text-xs text-slate-500">{[pub.category, publicationYear(pub)].filter(Boolean).join(' · ')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
