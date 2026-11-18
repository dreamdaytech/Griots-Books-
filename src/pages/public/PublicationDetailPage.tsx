import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, FileText, LibraryBig, ShieldCheck } from 'lucide-react';
import { CoverImage } from '../../components/CoverImage';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { approvedPublicPreview, publicationTypeLabel, publicationYear, publicAuthorProfiles, relatedPublications } from '../../domain/publications';
import type { PublicationRecord, PublicAuthorProfile } from '../../domain/types';

function MetadataItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="py-3 border-b border-stone-200/80 dark:border-slate-800 min-w-0">
      <dt className="text-xs uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 break-words">{value}</dd>
    </div>
  );
}

export function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { repo } = useAuth();
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [related, setRelated] = useState<PublicationRecord[]>([]);
  const [publicAuthor, setPublicAuthor] = useState<PublicAuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setPublication(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    Promise.all([
      repo.getPublicationById(id),
      repo.listPublishedCatalogue().catch(() => [] as PublicationRecord[]),
      repo.listPublicAuthors().catch(() => [] as PublicAuthorProfile[]),
    ]).then(([record, catalogue, authors]) => {
      if (!active) return;
      const released = record?.releaseStatus === 'published' ? record : null;
      setPublication(released);
      setRelated(released ? relatedPublications(released, catalogue) : []);
      setPublicAuthor(released ? publicAuthorProfiles(authors).find((author) => author.uid === released.authorId) || null : null);
    }).catch(() => {
      if (active) { setPublication(null); setRelated([]); setPublicAuthor(null); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, repo]);

  const type = publication ? publicationTypeLabel(publication.publicationType) : '';
  const previewText = publication ? approvedPublicPreview(publication) : null;
  const articleLike = publication?.publicationType === 'general_article';
  const academicLike = publication ? ['academic_research', 'journal_submission', 'conference_paper', 'research_report'].includes(publication.publicationType) : false;
  const year = publication ? publicationYear(publication) : null;
  const doi = publication?.doi?.trim() || '';
  const validDoi = /^10\.\d{4,9}\/[^\s]+$/i.test(doi);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <Link to="/catalogue" className="inline-flex items-center gap-2 text-sm font-semibold text-[#946000] dark:text-amber-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Catalogue
        </Link>

        {loading ? (
          <div className="mt-8 h-96 rounded-xl bg-stone-200 dark:bg-slate-800 animate-pulse" />
        ) : !publication ? (
          <div className="mt-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
            <BookOpen className="w-10 h-10 text-[#946000] mx-auto" />
            <h1 className="mt-4 font-serif text-2xl font-semibold">Publication Not Available</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This work does not exist or has not been released to the public catalogue.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="md:col-span-4 xl:col-span-3">
                <div className="aspect-[3/4] max-w-sm rounded-xl overflow-hidden border border-[#D9B36A]/40 shadow-lg shadow-black/10 bg-stone-100 dark:bg-slate-800">
                  <CoverImage src={publication.coverUrl} alt={publication.title} title={publication.title}
                    className="w-full h-full object-cover" />
                </div>
                {publication.isSample && (
                  <p className="mt-3 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3">
                    Demonstration publication — not an actual title available for purchase.
                  </p>
                )}
              </div>

              <article className="md:col-span-8 xl:col-span-9 min-w-0">
                <p className="text-xs uppercase tracking-widest font-semibold text-[#946000] dark:text-amber-400">
                  {type}{publication.category ? ` · ${publication.category}` : ''}
                </p>
                <h1 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-[#22170D] dark:text-white">
                  {publication.title}
                </h1>
                {publication.subtitle && <p className="mt-3 text-lg sm:text-xl font-serif italic text-slate-600 dark:text-slate-300">{publication.subtitle}</p>}
                <p className="mt-5 text-base text-slate-700 dark:text-slate-200">
                  By{' '}
                  {publicAuthor ? (
                    <Link className="font-semibold text-[#946000] dark:text-amber-400 hover:underline"
                      to={`/authors/${encodeURIComponent(publicAuthor.uid)}`}>{publication.authorName}</Link>
                  ) : <span className="font-semibold">{publication.authorName}</span>}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F1E8DC] text-[#51350E] dark:bg-amber-950/60 dark:text-amber-300">
                    {publication.format === 'both' ? 'Digital & Print' : publication.format === 'print' ? 'Print Edition' : 'Digital Edition'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold border border-stone-300 dark:border-slate-700">
                    {publication.accessType === 'free' ? 'Free to read' : 'Paid publication'}
                  </span>
                  {year && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-stone-300 dark:border-slate-700">
                    <CalendarDays className="w-3 h-3" /> {year}
                  </span>}
                </div>

                <section className="mt-8 max-w-3xl" aria-labelledby="description-heading">
                  <h2 id="description-heading" className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">
                    {articleLike ? 'About This Article' : academicLike ? 'Abstract' : 'About This Book'}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-7 whitespace-pre-wrap">
                    {publication.abstract || 'A detailed description has not yet been supplied for this publication.'}
                  </p>
                </section>

                {previewText && (
                  <section className="mt-9 max-w-3xl" aria-labelledby="preview-heading">
                    <div className="flex items-center gap-2">
                      {articleLike ? <FileText className="w-5 h-5 text-[#946000]" /> : <BookOpen className="w-5 h-5 text-[#946000]" />}
                      <h2 id="preview-heading" className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">
                        {articleLike ? 'Approved Article Excerpt' : 'Read Inside — Approved Preview'}
                      </h2>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">This excerpt has been selected and approved for public display by the publishing team.</p>
                    <div className="mt-4 rounded-xl border border-[#D9B36A]/60 bg-[#FAF7F0] dark:bg-slate-900 p-6 sm:p-8">
                      <p className="font-serif text-base sm:text-lg leading-8 text-[#35271C] dark:text-slate-200 whitespace-pre-wrap break-words">{previewText}</p>
                    </div>
                  </section>
                )}

                {publication.tableOfContents && publication.tableOfContents.length > 0 && (
                  <section className="mt-9 max-w-3xl">
                    <h2 className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">Table of Contents</h2>
                    <ol className="mt-4 space-y-3">
                      {publication.tableOfContents.map((section, index) => (
                        <li key={index} className="flex gap-4 border-b border-stone-200 dark:border-slate-800 pb-3 text-sm">
                          <span className="font-mono text-[#946000] dark:text-amber-400">{String(index + 1).padStart(2, '0')}</span>
                          <span>{section}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <section className="mt-9 max-w-3xl">
                  <h2 className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">Publication Details</h2>
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <MetadataItem label="Format" value={publication.format === 'both' ? 'Digital and Print' : publication.format} />
                    <MetadataItem label="Publication year" value={year} />
                    <MetadataItem label="Language" value={publication.language} />
                    <MetadataItem label="Pages" value={publication.pageCount} />
                    <MetadataItem label="Edition" value={publication.edition} />
                    <MetadataItem label="Imprint" value={publication.imprint} />
                    <MetadataItem label="Book series" value={publication.series} />
                    <MetadataItem label="Category" value={publication.category} />
                    {publication.identifierStatus === 'verified' && <>
                      <MetadataItem label="ISBN" value={publication.isbn} />
                      <MetadataItem label="Print ISBN" value={publication.isbnPrint} />
                      <MetadataItem label="Digital ISBN" value={publication.isbnDigital} />
                      <MetadataItem label="ISSN" value={publication.issn} />
                      <MetadataItem label="DOI" value={publication.doi} />
                    </>}
                    <MetadataItem label="Identifier status" value={publication.identifierStatus?.replace(/_/g, ' ') || 'Unassigned'} />
                  </dl>
                  {validDoi && publication.identifierStatus === 'verified' && (
                    <a href={`https://doi.org/${encodeURI(doi)}`} target="_blank" rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-[#946000] dark:text-amber-400 hover:underline">
                      View DOI record <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                  {publication.subjects && publication.subjects.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {publication.subjects.map((subject) => (
                        <Link key={subject} to={`/catalogue?category=${encodeURIComponent(subject)}`}
                          className="rounded-full border border-stone-300 dark:border-slate-700 px-3 py-1 text-xs hover:border-[#946000]">{subject}</Link>
                      ))}
                    </div>
                  )}
                </section>

                {publicAuthor && (
                  <section className="mt-9 max-w-3xl rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <h2 className="font-serif text-xl font-semibold text-[#22170D] dark:text-white">About the Author</h2>
                    <p className="mt-2 font-semibold">{publicAuthor.displayName}</p>
                    {publicAuthor.affiliation && <p className="mt-1 text-xs text-[#946000] dark:text-amber-400">{publicAuthor.affiliation}</p>}
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{publicAuthor.bio || 'Explore the author’s published works.'}</p>
                    <Link to={`/authors/${encodeURIComponent(publicAuthor.uid)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#946000] dark:text-amber-400">
                      View author profile <ArrowRight className="w-4 h-4" />
                    </Link>
                  </section>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4" /> Only publicly released publication information is shown.
                  </span>
                  {publication.accessType === 'paid' && !publication.isSample && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Online checkout is not yet available. This listing is informational.</p>
                  )}
                </div>
              </article>
            </div>

            {related.length > 0 && (
              <section className="mt-16 pt-10 border-t border-stone-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <LibraryBig className="w-5 h-5 text-[#946000]" />
                  <h2 className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">You May Also Explore</h2>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {related.map((item) => (
                    <Link key={item.id} to={`/catalogue/${encodeURIComponent(item.id)}`}
                      className="group rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-[#946000] flex gap-4 p-3">
                      <div className="w-24 h-28 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        <CoverImage src={item.coverUrl} alt={item.title} title={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="text-xs font-semibold text-[#946000] dark:text-amber-400">{publicationTypeLabel(item.publicationType)}{item.isSample ? ' · Sample' : ''}</p>
                        <h3 className="mt-1 font-serif font-semibold text-sm sm:text-base group-hover:underline">{item.title}</h3>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.authorName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
