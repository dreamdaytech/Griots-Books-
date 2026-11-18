import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { SAMPLE_JOURNALS, SAMPLE_PUBLIC_AUTHORS } from '../../data/seedData';
import type { AcademicJournal, PublicAuthorProfile } from '../../domain/types';

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
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F1E36] dark:text-white">
                Academic Journals
              </h1>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Scholarly journals operate under independent editorial oversight with configurable
                single-anonymous, double-anonymous, or open peer-review models.
              </p>
            </div>
            <Link
              to="/dashboard/submit?type=journal_submission"
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#0F1E36] text-white hover:bg-[#193055] dark:bg-[#0F766E] whitespace-nowrap shrink-0"
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

  useEffect(() => {
    repo.listPublicAuthors().then(setAuthors).catch(() => {});
  }, [repo]);

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F1E36] dark:text-white">
              Authors & Researchers
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
              Public contributor profiles displaying institutional affiliations and scholarly fields
              without exposing private contact details.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authors.map((author) => (
              <div
                key={author.uid}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {author.discipline || 'Contributor'}{author.isSample ? ' · Sample Profile' : ''}
                </div>
                <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white">
                  {author.displayName}
                </h2>
                {author.affiliation && (
                  <p className="mt-1 text-xs font-medium text-[#0F766E] dark:text-teal-400">
                    {author.affiliation}
                  </p>
                )}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {author.bio || 'Registered author and contributor.'}
                </p>
                {author.orcid && (
                  <p className="mt-4 pt-3 border-t border-stone-200 dark:border-slate-800 text-xs font-mono text-slate-500">
                    ORCID: {author.orcid}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
