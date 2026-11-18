import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { publicAuthorProfiles } from '../../domain/publications';
import { useAuth } from '../../context/AuthContext';
import { SAMPLE_JOURNALS, SAMPLE_PUBLIC_AUTHORS, SAMPLE_PUBLICATIONS } from '../../data/seedData';
import type { AcademicJournal, PublicAuthorProfile, PublicationRecord } from '../../domain/types';

export function JournalsPage() {
  const { repo } = useAuth();
  const [journals, setJournals] = useState<AcademicJournal[]>(SAMPLE_JOURNALS);

  useEffect(() => {
    repo.listJournals().then(setJournals).catch(() => {});
  }, [repo]);

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">
                Academic Journals
              </h1>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Scholarly journals operate under independent editorial oversight with configurable
                single-anonymous, double-anonymous, or open peer-review models.
              </p>
            </div>
            <Link
              to="/dashboard/submit?type=journal_submission"
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000] whitespace-nowrap shrink-0"
            >
              Submit Research Paper
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journals.map((jrn) => (
              <div
                key={jrn.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {jrn.discipline}{jrn.isSample ? ' · Sample Journal' : ''}
                </div>
                <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white">
                  {jrn.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                  {jrn.description}
                </p>
                <dl className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Review Model</dt>
                    <dd className="font-medium capitalize text-slate-900 dark:text-white">
                      {jrn.reviewModel.replace(/_/g, '-')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">ISSN Status</dt>
                    <dd className="font-mono text-slate-800 dark:text-slate-200">
                      {jrn.issn || 'Unassigned'}
                    </dd>
                  </div>
                  {jrn.sections && jrn.sections.length > 0 && (
                    <div className="pt-1">
                      <dt className="text-slate-500">Sections</dt>
                      <dd className="mt-1 text-slate-700 dark:text-slate-300">
                        {jrn.sections.join(' · ')}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function AuthorsPage() {
  const { repo } = useAuth();
  const [authors, setAuthors] = useState<PublicAuthorProfile[]>(SAMPLE_PUBLIC_AUTHORS);
  const [publications, setPublications] = useState<PublicationRecord[]>(SAMPLE_PUBLICATIONS);
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState('all');
  const [sort, setSort] = useState<'az' | 'za' | 'most'>('az');

  useEffect(() => {
    let active = true;
    Promise.all([
      repo.listPublicAuthors().catch(() => [] as PublicAuthorProfile[]),
      repo.listPublishedCatalogue().catch(() => [] as PublicationRecord[]),
    ]).then(([authorList, catalogue]) => {
      if (!active) return;
      setAuthors(publicAuthorProfiles(authorList));
      setPublications(catalogue.filter((pub) => pub.releaseStatus === 'published'));
    });
    return () => { active = false; };
  }, [repo]);

  const disciplines = Array.from(new Set(authors.map((author) => author.discipline).filter((x): x is string => Boolean(x)))).sort();
  const countWorks = (uid: string) => publications.filter((pub) => pub.releaseStatus === 'published' && pub.authorId === uid).length;
  const visible = authors
    .filter((author) => discipline === 'all' || author.discipline === discipline)
    .filter((author) => [author.displayName, author.affiliation, author.discipline, author.bio].filter(Boolean).join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
    .sort((a, b) => {
      if (sort === 'most') return countWorks(b.uid) - countWorks(a.uid) || a.displayName.localeCompare(b.displayName);
      return sort === 'za' ? b.displayName.localeCompare(a.displayName) : a.displayName.localeCompare(b.displayName);
    });

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase font-semibold tracking-widest text-[#946000] dark:text-amber-400">The people behind the publications</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">Meet Our Authors & Researchers</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300">
            Explore publicly shared contributor biographies and their released publications. Private accounts and unpublished manuscripts are not displayed.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-[#F8F3EB] dark:bg-slate-900">
            <label className="text-xs font-semibold">Find a contributor
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, institution or field..." className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
            </label>
            <label className="text-xs font-semibold">Discipline
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
                <option value="all">All disciplines</option>
                {disciplines.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
                <option value="az">Name A–Z</option><option value="za">Name Z–A</option><option value="most">Most published works</option>
              </select>
            </label>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{visible.length} contributor{visible.length === 1 ? '' : 's'} found</p>
          {visible.length === 0 ? (
            <div className="mt-5 p-12 text-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">No matching public profiles.</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((author) => (
                <Link key={author.uid} to={`/authors/${encodeURIComponent(author.uid)}`}
                  className="group rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-[#946000] transition-colors flex flex-col">
                  <div className="flex items-start gap-4">
                    <div aria-hidden="true" className="w-14 h-14 shrink-0 rounded-full border border-[#D9B36A] bg-[#F1E8DC] dark:bg-slate-800 text-[#946000] dark:text-amber-400 flex items-center justify-center font-serif font-semibold text-xl">
                      {author.displayName.trim().charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-[#946000] dark:text-amber-400">{author.discipline || 'Contributor'}{author.isSample ? ' · Sample Profile' : ''}</p>
                      <h2 className="mt-1 font-serif text-xl font-semibold text-[#22170D] dark:text-white group-hover:underline">{author.displayName}</h2>
                    </div>
                  </div>
                  {author.affiliation && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{author.affiliation}</p>}
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-4">{author.bio || 'View contributor profile and publicly released works.'}</p>
                  <div className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{countWorks(author.uid)} public work{countWorks(author.uid) === 1 ? '' : 's'}</span>
                    <span className="font-semibold text-[#946000] dark:text-amber-400">View profile →</span>
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
