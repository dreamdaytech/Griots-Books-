import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/PublicLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AuthorDashboardPage } from './pages/author/AuthorDashboardPage';
import { AuthorServicesOrdersPage } from './pages/author/AuthorServicesOrdersPage';
import { ManuscriptDetailPage } from './pages/author/ManuscriptDetailPage';
import {
  NotificationsPage,
  ProfileSettingsPage,
} from './pages/author/ProfileAndNotificationsPages';
import { SubmissionWizardPage } from './pages/author/SubmissionWizardPage';
import { EditorialReviewPage } from './pages/editorial/EditorialReviewPage';
import { EditorialWorkspacePage } from './pages/editorial/EditorialWorkspacePage';
import { AuthPage } from './pages/public/AuthPage';
import { CataloguePage } from './pages/public/CataloguePage';
import { HomePage } from './pages/public/HomePage';
import {
  AboutPage,
  ContactPage,
  FaqPage,
  GuidelinesPage,
  PolicyPage,
} from './pages/public/InfoAndPolicyPages';
import { AuthorsPage, JournalsPage } from './pages/public/JournalsAndAuthorsPages';
import { PublicationDetailPage } from './pages/public/PublicationDetailPage';
import { PackagesPage, ServicesPage } from './pages/public/ServicesAndPackagesPages';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE] dark:bg-[#16110C] text-sm text-slate-600 dark:text-slate-300">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function NotFoundPage() {
  return (
    <PublicLayout>
      <section className="py-20 px-4 text-center max-w-xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#946000]">404</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#22170D] dark:text-white">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          The requested page or catalogue entry could not be located.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
          >
            Return Home
          </Link>
          <Link
            to="/catalogue"
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-stone-300 dark:border-slate-700"
          >
            Browse Catalogue
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PlatformProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Storefront & Publishing Information */}
              <Route path="/" element={<HomePage />} />
              <Route path="/catalogue" element={<CataloguePage />} />
              <Route path="/catalogue/:id" element={<PublicationDetailPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/editing" element={<ServicesPage focus="editing" />} />
              <Route path="/services/design" element={<ServicesPage focus="design" />} />
              <Route path="/services/identifiers" element={<ServicesPage focus="identifiers" />} />
              <Route path="/services/printing" element={<ServicesPage focus="printing" />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/publish-book" element={<ServicesPage focus="publish-book" />} />
              <Route path="/publish-article" element={<ServicesPage focus="publish-article" />} />
              <Route path="/submit-research" element={<ServicesPage focus="submit-research" />} />
              <Route path="/journals" element={<JournalsPage />} />
              <Route path="/authors" element={<AuthorsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/guidelines" element={<GuidelinesPage />} />
              <Route path="/academic-guidelines" element={<GuidelinesPage academic />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/policies/:slug" element={<PolicyPage />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Authenticated Author & Researcher Portal */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AuthorDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/manuscripts"
                element={
                  <ProtectedRoute>
                    <AuthorDashboardPage manuscriptsOnly />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/submit"
                element={
                  <ProtectedRoute>
                    <SubmissionWizardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/manuscripts/:id"
                element={
                  <ProtectedRoute>
                    <ManuscriptDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/services"
                element={
                  <ProtectedRoute>
                    <AuthorServicesOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/profile"
                element={
                  <ProtectedRoute>
                    <ProfileSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Editorial & Peer Review Workspace */}
              <Route
                path="/editorial"
                element={
                  <ProtectedRoute>
                    <EditorialWorkspacePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editorial/manuscripts/:id"
                element={
                  <ProtectedRoute>
                    <EditorialReviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Administration & Publishing Manager Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </PlatformProvider>
    </ErrorBoundary>
  );
}
