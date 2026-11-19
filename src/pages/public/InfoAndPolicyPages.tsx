import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { usePlatform } from '../../context/PlatformContext';
import { ASSET_IMAGES, PUBLIC_FAQS } from '../../data/seedData';
import { CoverImage } from '../../components/CoverImage';
import {
  POLICY_DOCUMENTS, POLICY_LAST_REVIEWED, POLICY_REVIEW_VERSION, POLICY_SLUGS, isPolicySlug,
} from '../../domain/policyContent';

export function AboutPage() {
  const { settings } = usePlatform();
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-medium uppercase tracking-widest text-[#946000]">About the Press</p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">
              An integrated ecosystem for independent books and scholarly publishing.
            </h1>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {settings.platformName} is an independent publishing house and workflow platform built
              to serve authors, researchers, universities, and institutional editors. Every workflow
              separates confidential manuscript stewardship from commercial production services and
              publicly verified catalogue releases.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/dashboard/submit"
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
              >
                Submit a Manuscript
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-stone-300 dark:border-slate-700"
              >
                Contact Us
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800">
              <CoverImage
                src={ASSET_IMAGES.editorialStudio}
                alt="Editorial galley proofs and typesetting desk"
                title={settings.platformName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function GuidelinesPage({ academic = false }: { academic?: boolean }) {
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-[#946000]">
            {academic ? 'Academic & Research Submissions' : 'Author Guidelines'}
          </p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">
            {academic ? 'Academic & Journal Submission Guidelines' : 'Author Manuscript Guidelines'}
          </h1>
          <div className="mt-8 space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
                1. Accepted File Formats & Versioning
              </h2>
              <p className="mt-2">
                Submit manuscripts in DOCX, PDF, DOC, TXT, or Markdown up to 25 MB. Each revision
                uploaded during editorial review creates a preserved version rather than overwriting
                prior submissions.
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
                2. {academic ? 'Research Ethics, Coauthors & Declarations' : 'Metadata & Publication Preferences'}
              </h2>
              <p className="mt-2">
                {academic
                  ? 'Scholarly papers must list all coauthors with institutional affiliations, ethics approval statements, conflict-of-interest disclosures, funding sources, and data availability declarations.'
                  : 'Include a working title, synopsis, category, estimated word count, target readership, and whether you seek digital, print, or editorial-only services.'}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
                3. Editorial Independence
              </h2>
              <p className="mt-2">
                Editorial assessment and peer review decisions are made solely on intellectual and
                editorial merit. Requesting paid formatting or editing services never guarantees
                publication acceptance.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <Link
              to={academic ? '/dashboard/submit?type=academic_research' : '/dashboard/submit'}
              className="inline-flex px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
            >
              Launch Submission Wizard
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function FaqPage() {
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#22170D] dark:text-white">
            Help Center & Frequently Asked Questions
          </h1>
          <div className="mt-8 space-y-5">
            {PUBLIC_FAQS.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              >
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {item.question}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function ContactPage() {
  const { settings, notify } = usePlatform();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Manuscript Submission Inquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      notify('Please complete your name, email, and message.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error('Could not send inquiry.');
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
      notify('Inquiry received successfully.', 'success');
    } catch {
      notify('Failed to submit contact form.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <h1 className="font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
              Contact Editorial Office
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Contact details below are configurable by the platform owner in Administration Settings.
            </p>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-slate-500">Email</dt>
                <dd className="mt-1 text-slate-900 dark:text-white">{settings.contactEmail || 'Not configured'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">Telephone</dt>
                <dd className="mt-1 text-slate-900 dark:text-white">{settings.contactPhone || 'Not configured'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">Office</dt>
                <dd className="mt-1 text-slate-900 dark:text-white">{settings.businessAddress || 'Not configured'}</dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
            {submitted ? (
              <div className="py-8 text-center">
                <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                  Inquiry Recorded
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Thank you for writing. Your message has been logged for editorial review.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-5 px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000] disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}


export function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = usePlatform();

  if (!isPolicySlug(slug)) {
    return (
      <PublicLayout>
        <section className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-xs uppercase tracking-widest text-[#946000] font-semibold">404 · Policy not found</p>
          <h1 className="font-serif text-3xl mt-3 font-semibold text-[#22170D] dark:text-white">This policy page is not available</h1>
          <p className="text-sm mt-4 text-slate-600 dark:text-slate-300">Check the address or explore a governance document.</p>
          <Link to="/policies/privacy" className="mt-6 inline-flex px-5 py-2.5 rounded-lg bg-[#22170D] dark:bg-[#946000] text-white text-sm font-semibold">View Privacy Policy</Link>
        </section>
      </PublicLayout>
    );
  }

  const policy = POLICY_DOCUMENTS[slug];
  const contactEmail = settings.contactEmail?.trim() || '';
  const hasApprovedContact = Boolean(contactEmail && !contactEmail.endsWith('.example') && !contactEmail.includes('[Draft'));
  const related = POLICY_SLUGS.filter((other) => other !== slug);

  return (
    <PublicLayout>
      <article className="bg-[#F7F3EE] dark:bg-[#16110C]">
        <header className="border-b border-[#D9B36A]/40 bg-[#22170D] text-[#F8F2EA] print:bg-white print:text-black">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E5BA69] print:text-slate-700">
              Griots Books · Policies & Governance
            </p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">{policy.title}</h1>
            <p className="mt-3 max-w-3xl text-base sm:text-lg text-[#E8DDCB] print:text-slate-700">{policy.subtitle}</p>
            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-xs text-[#D4C5AF] print:text-slate-600">
              <div><dt className="font-semibold uppercase tracking-wider">Document</dt><dd className="mt-1">Review draft</dd></div>
              <div><dt className="font-semibold uppercase tracking-wider">Last reviewed</dt><dd className="mt-1">{POLICY_LAST_REVIEWED}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wider">Version</dt><dd className="mt-1 font-mono">{POLICY_REVIEW_VERSION}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wider">Effective date</dt><dd className="mt-1">Pending approval</dd></div>
            </dl>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-12">
          <div role="note" className="border-l-4 border-[#946000] bg-[#F1E8DC] dark:bg-[#322518] dark:border-[#D69B18] rounded-r-lg px-5 py-4 text-sm leading-relaxed text-[#382B1B] dark:text-[#F4E7D5] print:border print:bg-white">
            <strong className="block mb-1 font-semibold">Working draft — not yet approved or in effect</strong>
            These sections are proposed governance language for owner, editorial and legal review. Commercial terms, operator identity,
            privacy processes, governing law and implementation details must be verified before this document can become a final policy.
            This page does not replace a separately signed publishing or service agreement.
          </div>

          <div className="mt-9 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <aside className="lg:col-span-4 print:hidden">
              <nav aria-label={'Sections in ' + policy.title} className="lg:sticky lg:top-24 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-sm uppercase tracking-wide font-semibold text-[#22170D] dark:text-white">On this page</h2>
                <ol className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {policy.sections.map((section) => (
                    <li key={section.id}>
                      <a href={'#' + section.id} className="block py-1.5 hover:underline hover:text-[#946000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#946000]">
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="lg:col-span-8 min-w-0">
              <p className="text-base text-slate-700 dark:text-slate-200 leading-8">{policy.overview}</p>

              <div className="mt-9 space-y-11">
                {policy.sections.map((section) => (
                  <section id={section.id} key={section.id} aria-labelledby={'heading-' + section.id} className="scroll-mt-24 break-inside-avoid">
                    <h2 id={'heading-' + section.id} className="font-serif text-xl sm:text-2xl font-semibold text-[#22170D] dark:text-white leading-snug">
                      {section.heading}
                    </h2>
                    <div className="mt-4 space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-7">
                      {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                      {section.bullets && (
                        <ul className="list-disc pl-6 space-y-2 marker:text-[#946000]">
                          {section.bullets.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      )}
                      {section.note && <p className="rounded-lg border border-[#D9B36A]/40 bg-[#FAF7F0] dark:bg-slate-900 p-4 text-sm">{section.note}</p>}
                    </div>
                  </section>
                ))}
              </div>

              {policy.references && policy.references.length > 0 && (
                <section aria-labelledby="policy-references" className="mt-12 pt-6 border-t border-stone-200 dark:border-slate-800">
                  <h2 id="policy-references" className="text-lg font-semibold text-[#22170D] dark:text-white">Further reading</h2>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">External reference materials are not contractual provisions.</p>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    {policy.references.map((item) => (
                      <li key={item.url}><a className="text-[#946000] dark:text-amber-400 underline" href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a></li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="policy-contact" className="mt-12 rounded-xl border border-stone-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 print:bg-white">
                <h2 id="policy-contact" className="font-serif text-xl font-semibold text-[#22170D] dark:text-white">Questions or requests?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Contact the editorial office about this draft or an account, submission, rights or data-handling question.
                  Do not include passwords or private documents in your initial message.
                </p>
                {hasApprovedContact && (
                  <p className="mt-3 text-sm">
                    <a className="font-semibold text-[#946000] dark:text-amber-400 underline break-all" href={'mailto:' + contactEmail}>{contactEmail}</a>
                  </p>
                )}
                <Link to="/contact" className="mt-4 inline-flex px-4 py-2.5 rounded-lg bg-[#22170D] dark:bg-[#946000] text-white text-sm font-semibold print:hidden">Contact Editorial Office</Link>
              </section>

              <section aria-labelledby="related-policies" className="mt-10 pt-6 border-t border-stone-200 dark:border-slate-800 print:hidden">
                <h2 id="related-policies" className="text-lg font-semibold text-[#22170D] dark:text-white">Related policies</h2>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {related.map((key) => (
                    <li key={key}>
                      <Link to={'/policies/' + key} className="block rounded-lg border border-stone-300 dark:border-slate-700 p-4 text-sm font-medium hover:border-[#946000] hover:text-[#946000]">
                        {POLICY_DOCUMENTS[key].title} <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}
