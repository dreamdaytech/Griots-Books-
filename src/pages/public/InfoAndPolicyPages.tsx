import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { usePlatform } from '../../context/PlatformContext';
import { ASSET_IMAGES, PUBLIC_FAQS } from '../../data/seedData';
import { CoverImage } from '../../components/CoverImage';

export function AboutPage() {
  const { settings } = usePlatform();
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-medium uppercase tracking-widest text-[#0F766E]">About the Press</p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-[#0F1E36] dark:text-white">
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
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E]"
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
          <p className="text-xs font-medium uppercase tracking-widest text-[#0F766E]">
            {academic ? 'Academic & Research Submissions' : 'Author Guidelines'}
          </p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-[#0F1E36] dark:text-white">
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
              className="inline-flex px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E]"
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
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F1E36] dark:text-white">
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
            <h1 className="font-serif text-3xl font-semibold text-[#0F1E36] dark:text-white">
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
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#0F1E36] text-white hover:bg-[#193055] dark:bg-[#0F766E] disabled:opacity-50"
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

const POLICY_COPY: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy (Draft Template — Pending Owner Approval)',
    body: [
      'DRAFT NOTICE: This document is a working policy placeholder awaiting legal review and approval by the platform owner.',
      'User account emails, institutional affiliations, and private manuscript files are isolated by strict role-based access rules and are never exposed in public catalogue queries.',
      'Confidential editorial notes and peer-review assessments are restricted exclusively to authorized editorial personnel.',
    ],
  },
  terms: {
    title: 'Terms and Conditions (Draft Template — Pending Owner Approval)',
    body: [
      'DRAFT NOTICE: Replace this draft with jurisdiction-specific publishing terms approved by legal counsel prior to commercial launch.',
      'Authors submitting manuscripts warrant that the submitted work is original or that they hold sufficient rights to authorize editorial assessment and requested production services.',
      'Service quotations distinguish non-binding estimates from confirmed production orders and verified payments.',
    ],
  },
  copyright: {
    title: 'Copyright and Licensing Policies (Draft Template — Pending Owner Approval)',
    body: [
      'DRAFT NOTICE: Licensing options (exclusive publishing agreement, non-exclusive distribution, or Creative Commons open access) must be finalized by the platform owner.',
      'Submitting a manuscript for assessment does not transfer copyright unless a formal publishing agreement is executed.',
    ],
  },
  editorial: {
    title: 'Editorial and Peer Review Policies',
    body: [
      'All editorial decisions rest with authorized Editors, Managing Editors, and Editors-in-Chief.',
      'Academic submissions support single-anonymous, double-anonymous, or open peer-review configurations depending on journal policy.',
      'Commercial editing, formatting, and design fees are completely independent of editorial acceptance decisions.',
    ],
  },
};

export function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const policy = (slug && POLICY_COPY[slug]) || POLICY_COPY.editorial;

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-semibold text-[#0F1E36] dark:text-white">
            {policy.title}
          </h1>
          <div className="mt-6 space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            {policy.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
