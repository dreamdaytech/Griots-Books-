import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, FileText, GraduationCap, Layers, Printer, ShieldCheck, Stamp } from 'lucide-react';
import { CoverImage } from '../../components/CoverImage';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import {
  ASSET_IMAGES,
  PUBLIC_FAQS,
  PUBLISHING_PACKAGES,
  SAMPLE_JOURNALS,
  SAMPLE_PUBLICATIONS,
} from '../../data/seedData';
import type { AcademicJournal, PublicationRecord } from '../../domain/types';

export function HomePage() {
  const { repo } = useAuth();
  const { settings } = usePlatform();
  const [publications, setPublications] = useState<PublicationRecord[]>(SAMPLE_PUBLICATIONS);
  const [journals, setJournals] = useState<AcademicJournal[]>(SAMPLE_JOURNALS);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    repo.listPublishedCatalogue().then(setPublications).catch(() => {});
    repo.listJournals().then(setJournals).catch(() => {});
  }, [repo]);

  const featuredBooks = publications.filter((p) => p.publicationType !== 'general_article').slice(0, 3);
  const latestArticles = publications.filter((p) => p.publicationType === 'general_article').slice(0, 2);

  const serviceOverview = [
    {
      title: 'Publish a Book',
      desc: 'Full lifecycle support from manuscript evaluation and developmental editing to print and digital release.',
      to: '/publish-book',
      icon: <BookOpen className="w-5 h-5 text-[#946000]" />,
    },
    {
      title: 'Publish an Article',
      desc: 'Structured editorial screening, copyediting, and online publication with clean reading layouts.',
      to: '/publish-article',
      icon: <FileText className="w-5 h-5 text-[#946000]" />,
    },
    {
      title: 'Publish Research',
      desc: 'Dedicated academic workflow with coauthor affiliations, ethics declarations, and configurable peer review.',
      to: '/submit-research',
      icon: <GraduationCap className="w-5 h-5 text-[#946000]" />,
    },
    {
      title: 'Editing & Proofreading',
      desc: 'Developmental, line, and copyediting with tracked document version history and editorial notes.',
      to: '/services/editing',
      icon: <Layers className="w-5 h-5 text-[#946000]" />,
    },
    {
      title: 'Book Design & Formatting',
      desc: 'Print-ready interior typesetting, front matter, tables of contents, and bespoke cover composition.',
      to: '/services/design',
      icon: <Stamp className="w-5 h-5 text-[#946000]" />,
    },
    {
      title: 'ISBN, ISSN & DOI Management',
      desc: 'Transparent identifier application tracking and verified metadata registration records.',
      to: '/services/identifiers',
      icon: <ShieldCheck className="w-5 h-5 text-[#946000]" />,
    },
    {
      title: 'Printing & Distribution',
      desc: 'Pre-press specification coordination for paperback, hardcover, and digital catalogue distribution.',
      to: '/services/printing',
      icon: <Printer className="w-5 h-5 text-[#946000]" />,
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="border-b border-stone-200 dark:border-slate-800 bg-[#F7F3EE] dark:bg-[#16110C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-widest uppercase text-[#946000] dark:text-amber-400">
                Stories. Memory. Legacy.
              </p>
              <p className="mt-2 text-xs font-medium tracking-widest uppercase text-slate-500 dark:text-slate-300">Books · Articles · Academic Research</p>
              <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold leading-[1.12] tracking-tight text-[#22170D] dark:text-white">
                Every story deserves a lasting legacy.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {settings.platformName} unites private manuscript stewardship, transparent editorial
                assessment, scholarly peer-review governance, and professional book production in a
                single verifiable workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/dashboard/submit"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000] dark:hover:bg-[#734B00] transition-colors"
                >
                  <span>Submit a Manuscript</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/catalogue"
                  className="inline-flex items-center px-5 py-3 text-sm font-medium rounded-lg border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Browse Public Catalogue
                </Link>
              </div>
              <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                Private document storage · Versioned revisions · Role-isolated editorial review
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-900">
                <CoverImage
                  src={ASSET_IMAGES.heroAtelier}
                  alt="Editorial reading room and monograph shelves"
                  title={settings.platformName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 right-4 rounded-xl border border-[#D8BD7B] bg-[#F7F3EE]/95 p-2 shadow-lg shadow-black/10">
                  <img src="/brand/griots-books-logo.webp" alt="Griots Books — Stories. Memory. Legacy." className="w-20 sm:w-24 h-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 lg:py-20 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
                Publishing & Editorial Services
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
                Modular services for independent authors, research teams, and academic institutions.
                Commercial services never influence scholarly acceptance decisions.
              </p>
            </div>
            <Link
              to="/services"
              className="text-sm font-semibold text-[#946000] dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
            >
              View all services →
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceOverview.map((srv) => (
              <Link
                key={srv.title}
                to={srv.to}
                className="group rounded-xl border border-stone-200 dark:border-slate-800 bg-[#F7F3EE] dark:bg-slate-900 p-6 hover:border-[#946000] dark:hover:border-amber-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {srv.icon}
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#946000] transition-colors" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {srv.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {srv.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How Publishing Works */}
      <section className="py-16 lg:py-20 border-b border-stone-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
            How Publishing Works
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
            Every manuscript follows a traceable, role-verified workflow with preserved document
            history at each milestone.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                num: '01. Submission & Triage',
                desc: 'Complete the 6-step submission wizard, upload DOCX or PDF files privately, and receive a tracked manuscript reference.',
              },
              {
                num: '02. Editorial Assessment',
                desc: 'Assigned editors review scope, quality, and declarations—recording structured feedback and confidential review notes.',
              },
              {
                num: '03. Editing & Proofing',
                desc: 'Submit revised document versions, approve service quotations, and sign off on final formatted proofs.',
              },
              {
                num: '04. Catalogue Release',
                desc: 'Once approved and verified identifiers are recorded, a Publishing Manager releases the edition to the public catalogue.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="pt-4 border-t border-stone-300 dark:border-slate-700"
              >
                <h3 className="text-base font-semibold text-[#22170D] dark:text-white">
                  {step.num}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Sample Publications & Categories */}
      <section className="py-16 lg:py-20 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
                Featured Catalogue Releases
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Publicly released monographs and research works. Demonstration items are clearly marked as Sample records.
              </p>
            </div>
            <Link
              to="/catalogue"
              className="text-sm font-semibold text-[#946000] dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
            >
              Explore full catalogue →
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredBooks.map((pub) => (
              <Link
                key={pub.id}
                to={`/catalogue/${pub.id}`}
                className="group flex flex-col rounded-xl border border-stone-200 dark:border-slate-800 bg-[#F7F3EE] dark:bg-slate-900 overflow-hidden hover:border-stone-400 dark:hover:border-slate-600 transition-colors"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-stone-200 dark:bg-slate-800">
                  <CoverImage
                    src={pub.coverUrl}
                    alt={pub.title}
                    title={pub.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                    <span>{pub.category || 'Publication'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{pub.format === 'both' ? 'Digital & Print' : pub.format}</span>
                    {pub.isSample && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-800 dark:text-amber-300">Sample Record</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white leading-snug">
                    {pub.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{pub.authorName}</p>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 flex-1">
                    {pub.abstract}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Latest Articles & Academic Journals */}
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
                <h3 className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">
                  Latest Articles
                </h3>
                <Link to="/catalogue?type=general_article" className="text-xs font-semibold text-[#946000] hover:underline">
                  All articles →
                </Link>
              </div>
              <div className="divide-y divide-stone-200 dark:divide-slate-800">
                {latestArticles.map((art) => (
                  <Link key={art.id} to={`/catalogue/${art.id}`} className="block py-5 group">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {art.category} · {art.isSample ? 'Sample Article' : 'Published'}
                    </div>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white group-hover:text-[#946000] transition-colors">
                      {art.title}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {art.abstract}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
                <h3 className="font-serif text-2xl font-semibold text-[#22170D] dark:text-white">
                  Academic Journals
                </h3>
                <Link to="/journals" className="text-xs font-semibold text-[#946000] hover:underline">
                  View journals →
                </Link>
              </div>
              <div className="divide-y divide-stone-200 dark:divide-slate-800">
                {journals.slice(0, 3).map((jrn) => (
                  <div key={jrn.id} className="py-5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {jrn.discipline} · {jrn.reviewModel.replace(/_/g, '-')} peer review{jrn.isSample ? ' · Sample Journal' : ''}
                    </div>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                      {jrn.title}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {jrn.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publishing Packages */}
      <section className="py-16 lg:py-20 border-b border-stone-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
                Publishing Packages
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Transparent scope baselines confirmed through formal manuscript quotation.
              </p>
            </div>
            <Link to="/packages" className="text-sm font-semibold text-[#946000] hover:underline whitespace-nowrap shrink-0">
              Compare packages →
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {PUBLISHING_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col"
              >
                <p className="text-xs font-medium text-[#946000] dark:text-amber-400">{pkg.turnaround}</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                  {pkg.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{pkg.audience}</p>
                <p className="mt-4 text-sm font-semibold text-[#22170D] dark:text-slate-100 tabular-nums">
                  {pkg.priceLabel}
                </p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {pkg.summary}
                </p>
                <ul className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 flex-1">
                  {pkg.includedServices.map((s) => (
                    <li key={s}>· {s}</li>
                  ))}
                </ul>
                <Link
                  to="/dashboard/submit"
                  className="mt-6 inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold rounded-lg border border-[#22170D] text-[#22170D] dark:border-amber-500 dark:text-amber-300 hover:bg-[#22170D] hover:text-white dark:hover:bg-[#946000] dark:hover:text-white transition-colors"
                >
                  Start Submission with Package
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs & Call to Action */}
      <section className="py-16 lg:py-20 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <h2 className="font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="mt-6 divide-y divide-stone-200 dark:divide-slate-800 border-t border-b border-stone-200 dark:border-slate-800">
              {PUBLIC_FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full py-4 flex items-center justify-between gap-4 text-left text-sm sm:text-base font-medium text-slate-900 dark:text-white"
                    >
                      <span>{item.question}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </button>
                    {isOpen && (
                      <p className="pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-center rounded-xl border border-stone-200 dark:border-slate-800 bg-[#22170D] text-white p-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
              Ready to prepare your manuscript for publication?
            </h2>
            <p className="mt-3 text-sm text-slate-200 leading-relaxed">
              Create an author or researcher profile, upload your draft securely, and track every
              editorial assessment, revision, and quotation from one workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dashboard/submit"
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#946000] hover:bg-[#734B00] text-white transition-colors"
              >
                Submit Manuscript
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                Contact Editorial Desk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
