import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_SERVICES, PUBLISHING_PACKAGES } from '../../data/seedData';
import type { PublishingService } from '../../domain/types';

export function ServicesPage({ focus }: { focus?: string }) {
  const { repo } = useAuth();
  const [services, setServices] = useState<PublishingService[]>(DEFAULT_SERVICES);

  useEffect(() => {
    repo.listActiveServices().then(setServices).catch(() => {});
  }, [repo]);

  const headings: Record<string, { title: string; subtitle: string }> = {
    editing: {
      title: 'Editing & Proofreading Services',
      subtitle: 'Developmental editing, copyediting, line polish, and final galley proofreading with preserved manuscript version history.',
    },
    design: {
      title: 'Book Formatting & Cover Design',
      subtitle: 'Interior typography, front-matter layout, table of contents engineering, eBook conversion, and bespoke cover design.',
    },
    identifiers: {
      title: 'ISBN, ISSN & DOI Services',
      subtitle: 'Structured identifier application tracking and agency metadata verification. We never fabricate unverified numbers.',
    },
    printing: {
      title: 'Printing & Distribution',
      subtitle: 'Paperback and hardcover print preparation, specification review, and coordinated printing partner quotes.',
    },
    'publish-book': {
      title: 'Publish a Book',
      subtitle: 'Complete editorial, design, identifier, and print/digital release pipeline for nonfiction, monographs, and literary works.',
    },
    'publish-article': {
      title: 'Publish an Article',
      subtitle: 'Efficient submission, copyediting, and open or metered digital publication for essays and general articles.',
    },
    'submit-research': {
      title: 'Submit Academic Research',
      subtitle: 'Dedicated academic pipeline supporting coauthors, institutional affiliations, ethics declarations, and peer-review models.',
    },
  };

  const activeHeading = (focus && headings[focus]) || {
    title: 'Our Publishing Services',
    subtitle: 'Configurable editorial, production, identifier, and print coordination services priced transparently by scope.',
  };

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">
              {activeHeading.title}
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeHeading.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dashboard/submit"
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000] transition-colors"
              >
                Submit a Manuscript
              </Link>
              <Link
                to="/dashboard/services"
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                Request Service Quotation
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col"
              >
                <p className="text-xs font-medium text-[#946000] dark:text-amber-400">
                  {srv.category}
                </p>
                <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white">
                  {srv.name}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                  {srv.description}
                </p>
                <dl className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Pricing Basis</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white tabular-nums">
                      {srv.pricingMethod === 'custom_quote'
                        ? 'Custom Quote'
                        : `${srv.currency} ${srv.basePrice} (${srv.pricingMethod.replace(/_/g, ' ')})`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Turnaround</dt>
                    <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                      {srv.estimatedTurnaround || 'By quote'}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function PackagesPage() {
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">
              Publishing Packages & Pricing
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Every quotation clearly separates estimated scope pricing from confirmed production
              invoices. Packages can be tailored inside your submission or quotation request.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {PUBLISHING_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 flex flex-col"
              >
                <p className="text-xs font-medium text-[#946000] dark:text-amber-400">
                  Estimated turnaround: {pkg.turnaround}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                  {pkg.name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{pkg.audience}</p>
                <p className="mt-4 text-lg font-semibold text-[#22170D] dark:text-white tabular-nums">
                  {pkg.priceLabel}
                </p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{pkg.summary}</p>
                <div className="mt-6 pt-5 border-t border-stone-200 dark:border-slate-800 flex-1 space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Included Services
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                      {pkg.includedServices.map((s) => (
                        <li key={s}>· {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Deliverables
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                      {pkg.deliverables.map((d) => (
                        <li key={d}>· {d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Link
                  to="/dashboard/submit"
                  className="mt-6 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000] transition-colors"
                >
                  Select & Submit Manuscript
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
