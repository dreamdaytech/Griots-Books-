import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandSignature, BRAND_LOGO_PATH } from './BrandSignature';
import { usePlatform } from '../context/PlatformContext';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings, darkMode, toggleDarkMode } = usePlatform();
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/catalogue', label: 'Catalogue' },
    { to: '/journals', label: 'Journals' },
    { to: '/services', label: 'Services' },
    { to: '/guidelines', label: 'Guidelines' },
    { to: '/about', label: 'About' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EE] dark:bg-[#16110C] text-[#241A12] dark:text-[#F8F2EA]">
      <header className="sticky top-0 z-40 h-16 border-b border-stone-200 dark:border-slate-800 bg-[#F7F3EE]/95 dark:bg-[#16110C]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Griots Books brand identity */}
          <Link to="/" aria-label={`${settings.platformName} homepage`} className="flex items-center min-w-0 shrink-0">
            <BrandSignature name={settings.platformName} />
          </Link>

          {/* Zone 2: 5 concise single-line text links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-4 lg:gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive(link.to)
                    ? 'border-[#946000] text-[#22170D] dark:text-white'
                    : 'border-transparent hover:text-[#22170D] dark:hover:text-white hover:border-stone-300 dark:hover:border-slate-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? '/dashboard' : '/auth'}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000] dark:hover:bg-[#734B00] transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Portal' : 'Sign In / Submit'}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-stone-200/60 dark:hover:bg-slate-800"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={user ? '/dashboard' : '/auth'}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-center bg-[#22170D] text-white dark:bg-[#946000]"
            >
              {user ? 'Open Portal' : 'Sign In / Submit'}
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200 dark:border-slate-800 bg-[#F1E8DC] dark:bg-slate-950 text-slate-700 dark:text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <Link to="/" className="inline-flex" aria-label={`${settings.platformName} homepage`}>
                <img src={BRAND_LOGO_PATH} alt={`${settings.platformName} — Stories. Memory. Legacy.`} className="w-36 h-auto rounded-md" loading="lazy" />
              </Link>
              <p className="mt-3 text-sm font-medium text-[#946000] dark:text-amber-300">Stories. Memory. Legacy.</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Publishing, editorial services, and research publication support.
              </p>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                {settings.contactEmail}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Publishing & Services
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/publish-book" className="hover:underline">Publish a Book</Link></li>
                <li><Link to="/publish-article" className="hover:underline">Publish an Article</Link></li>
                <li><Link to="/submit-research" className="hover:underline">Submit Research</Link></li>
                <li><Link to="/services/editing" className="hover:underline">Editing & Proofreading</Link></li>
                <li><Link to="/services/design" className="hover:underline">Book Formatting & Design</Link></li>
                <li><Link to="/services/identifiers" className="hover:underline">ISBN, ISSN & DOI Services</Link></li>
                <li><Link to="/services/printing" className="hover:underline">Printing & Distribution</Link></li>
                <li><Link to="/packages" className="hover:underline">Packages & Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Catalogue & Guidelines
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/catalogue?type=book" className="hover:underline">Books Catalogue</Link></li>
                <li><Link to="/catalogue?type=article" className="hover:underline">Articles Archive</Link></li>
                <li><Link to="/journals" className="hover:underline">Academic Journals</Link></li>
                <li><Link to="/authors" className="hover:underline">Authors & Researchers</Link></li>
                <li><Link to="/guidelines" className="hover:underline">Author Guidelines</Link></li>
                <li><Link to="/academic-guidelines" className="hover:underline">Academic Submission Guidelines</Link></li>
                <li><Link to="/faq" className="hover:underline">Help Center & FAQs</Link></li>
                <li><Link to="/contact" className="hover:underline">Contact Us</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Governance & Policies
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/policies/privacy" className="hover:underline">Privacy Policy (Draft)</Link></li>
                <li><Link to="/policies/terms" className="hover:underline">Terms & Conditions (Draft)</Link></li>
                <li><Link to="/policies/copyright" className="hover:underline">Copyright & Licensing (Draft)</Link></li>
                <li><Link to="/policies/editorial" className="hover:underline">Editorial & Peer Review Policy</Link></li>
              </ul>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-stone-300/70 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <p>© {new Date().getFullYear()} {settings.platformName}. Independent Publishing Ecosystem.</p>
            <p>Sample catalogue records and draft policies are explicitly labelled pending owner approval.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
