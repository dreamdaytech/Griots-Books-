import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookMarked,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandSignature } from './BrandSignature';
import { usePlatform } from '../context/PlatformContext';
import {
  canAccessAdminConsole,
  canAccessEditorialWorkspace,
  canAccessPeerReviewWorkspace,
  canReleasePublication,
} from '../domain/rbac';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export function PortalLayout({
  title,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, authMode, logout } = useAuth();
  const { settings, darkMode, toggleDarkMode } = usePlatform();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const authorNav: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/dashboard/manuscripts', label: 'My Manuscripts', icon: <FileText className="w-4 h-4" /> },
    { to: '/dashboard/submit', label: 'Submit Manuscript', icon: <FilePlus2 className="w-4 h-4" /> },
    { to: '/dashboard/services', label: 'Services & Quotes', icon: <Wrench className="w-4 h-4" /> },
    { to: '/dashboard/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { to: '/dashboard/profile', label: 'Profile & Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const isEditorialStaff = canAccessEditorialWorkspace(user);
  const editorialNav: NavItem[] = canAccessPeerReviewWorkspace(user)
    ? [
        {
          to: '/editorial',
          label: isEditorialStaff ? 'Editorial Queue' : 'Peer Review Queue',
          icon: <BookMarked className="w-4 h-4" />,
        },
      ]
    : [];

  const isAdmin = canAccessAdminConsole(user);
  const adminNav: NavItem[] =
    isAdmin || canReleasePublication(user)
      ? [
          {
            to: '/admin',
            label: isAdmin ? 'Administration' : 'Catalogue Releases',
            icon: <ShieldCheck className="w-4 h-4" />,
          },
        ]
      : [];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderLinks = (items: NavItem[]) =>
    items.map((item) => {
      const active =
        location.pathname === item.to ||
        (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            active
              ? 'bg-[#22170D] text-white dark:bg-[#946000]'
              : 'text-slate-700 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <div className="min-h-screen flex bg-[#F7F3EE] dark:bg-[#16110C] text-[#241A12] dark:text-[#F8F2EA]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-stone-200 dark:border-slate-800 bg-[#F1E8DC]/60 dark:bg-slate-950 shrink-0">
        <div className="h-16 px-5 flex items-center justify-between border-b border-stone-200 dark:border-slate-800">
          <Link
            to="/"
            className="flex min-w-0 items-center"
          >
            <BrandSignature name={settings.platformName} compact />
          </Link>
        </div>

        <nav aria-label="Portal Navigation" className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Author Workspace
            </p>
            <div className="space-y-1">{renderLinks(authorNav)}</div>
          </div>

          {editorialNav.length > 0 && (
            <div>
              <p className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isEditorialStaff ? 'Editorial Desk' : 'Peer Review Desk'}
              </p>
              <div className="space-y-1">{renderLinks(editorialNav)}</div>
            </div>
          )}

          {adminNav.length > 0 && (
            <div>
              <p className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Operations & Admin
              </p>
              <div className="space-y-1">{renderLinks(adminNav)}</div>
            </div>
          )}

          <div className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-1">
            <Link
              to="/catalogue"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Public Catalogue</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-stone-200 dark:border-slate-800">
          {user && (
            <div className="mb-3 px-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user.displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.roles.map((r) => r.replace(/_/g, ' ')).join(' · ')}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col p-4 z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-slate-800">
              <Link to="/" className="flex min-w-0 items-center">
                <BrandSignature name={settings.platformName} compact />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-5 flex-1">
              <div className="space-y-1">{renderLinks(authorNav)}</div>
              {editorialNav.length > 0 && <div className="space-y-1">{renderLinks(editorialNav)}</div>}
              {adminNav.length > 0 && <div className="space-y-1">{renderLinks(adminNav)}</div>}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-slate-700"
            >
              Sign Out
            </button>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {authMode === 'sandbox' && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 sm:px-6 py-2 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              Sample Evaluation Sandbox active — records persist on the evaluation server. Sign in with Google on the Auth page for live Firebase storage.
            </span>
            <Link to="/auth" className="font-semibold underline whitespace-nowrap">
              Switch Account
            </Link>
          </div>
        )}

        <header className="h-16 px-4 sm:px-8 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open workspace navigation"
              className="lg:hidden p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              {breadcrumb && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{breadcrumb}</p>
              )}
              <h1 className="text-lg sm:text-xl font-serif font-semibold text-slate-900 dark:text-white truncate">
                {title}
              </h1>
            </div>
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
