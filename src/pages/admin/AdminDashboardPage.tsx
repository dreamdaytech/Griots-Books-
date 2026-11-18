import React, { useCallback, useEffect, useState } from 'react';
import { DataTable, type TableColumn } from '../../components/DataTable';
import { PortalLayout } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { ALL_ROLES, canAccessAdminConsole, canReleasePublication } from '../../domain/rbac';
import type {
  AcademicJournal,
  AuditLog,
  Manuscript,
  PeerReviewModel,
  PricingMethod,
  PublicationRecord,
  PublishingService,
  ServiceQuotation,
  UserProfile,
  UserRole,
} from '../../domain/types';

type AdminTab =
  | 'overview'
  | 'services'
  | 'publications'
  | 'quotations'
  | 'journals'
  | 'users'
  | 'audit'
  | 'settings';

export function AdminDashboardPage() {
  const { user, repo } = useAuth();
  const { settings, setSettings, notify } = usePlatform();

  const isAdmin = canAccessAdminConsole(user);
  const isManager = canReleasePublication(user);
  const authorized = isAdmin || isManager;

  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [services, setServices] = useState<PublishingService[]>([]);
  const [quotations, setQuotations] = useState<ServiceQuotation[]>([]);
  const [journals, setJournals] = useState<AcademicJournal[]>([]);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Service Form
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState('Copyediting');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvMethod, setSrvMethod] = useState<PricingMethod>('flat_fee');
  const [srvPrice, setSrvPrice] = useState<number>(350);
  const [srvTurnaround, setSrvTurnaround] = useState('7 business days');

  // Journal Form
  const [jrnTitle, setJrnTitle] = useState('');
  const [jrnDiscipline, setJrnDiscipline] = useState('');
  const [jrnReviewModel, setJrnReviewModel] = useState<PeerReviewModel>('double_anonymous');
  const [jrnIssn, setJrnIssn] = useState('');

  // Publication Release Form
  const [pubTitle, setPubTitle] = useState('');
  const [pubAuthorName, setPubAuthorName] = useState('');
  const [pubAuthorId, setPubAuthorId] = useState('');
  const [pubManuscriptId, setPubManuscriptId] = useState('');
  const [pubType, setPubType] = useState('book');
  const [pubFormat, setPubFormat] = useState<'digital' | 'print' | 'both'>('digital');
  const [pubAccess, setPubAccess] = useState<'free' | 'paid'>('free');
  const [pubPrice, setPubPrice] = useState<number>(0);
  const [pubIsbn, setPubIsbn] = useState('');
  const [pubDoi, setPubDoi] = useState('');
  const [pubAbstract, setPubAbstract] = useState('');

  // Platform Settings Form
  const [cfgName, setCfgName] = useState(settings.platformName);
  const [cfgTagline, setCfgTagline] = useState(settings.tagline || '');
  const [cfgPrimary, setCfgPrimary] = useState(settings.primaryColor);
  const [cfgAccent, setCfgAccent] = useState(settings.accentColor);
  const [cfgEmail, setCfgEmail] = useState(settings.contactEmail || '');
  const [cfgPhone, setCfgPhone] = useState(settings.contactPhone || '');
  const [cfgAddress, setCfgAddress] = useState(settings.businessAddress || '');
  const [cfgAi, setCfgAi] = useState(Boolean(settings.aiAssistanceEnabled));

  const loadAdminData = useCallback(async () => {
    if (!user || !authorized) return;
    const [msList, srvList, qtList, jrnList, pubList] = await Promise.all([
      repo.listManuscriptsForActor(user).catch(() => [] as Manuscript[]),
      repo.listAllServices().catch(() => [] as PublishingService[]),
      repo.listQuotationsForActor(user).catch(() => [] as ServiceQuotation[]),
      repo.listJournals().catch(() => [] as AcademicJournal[]),
      repo.listAllPublications(user).catch(() => [] as PublicationRecord[]),
    ]);
    setManuscripts(msList);
    setServices(srvList);
    setQuotations(qtList);
    setJournals(jrnList);
    setPublications(pubList);

    if (isAdmin) {
      const [uList, aList] = await Promise.all([
        repo.listAllUsers().catch(() => [] as UserProfile[]),
        repo.listAuditLogs(user).catch(() => [] as AuditLog[]),
      ]);
      setUsers(uList);
      setAuditLogs(aList);
    }
  }, [authorized, isAdmin, repo, user]);

  useEffect(() => {
    setCfgName(settings.platformName);
    setCfgTagline(settings.tagline || '');
    setCfgPrimary(settings.primaryColor);
    setCfgAccent(settings.accentColor);
    setCfgEmail(settings.contactEmail || '');
    setCfgPhone(settings.contactPhone || '');
    setCfgAddress(settings.businessAddress || '');
    setCfgAi(Boolean(settings.aiAssistanceEnabled));
  }, [settings]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  if (!authorized || !user) {
    return (
      <PortalLayout title="Access Denied" breadcrumb="Administration">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-8 text-center">
          <h2 className="font-serif text-xl font-semibold">Administrator Access Required</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This console is strictly restricted to Platform Administrators, Super Administrators, and Publishing Managers.
          </p>
        </div>
      </PortalLayout>
    );
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName.trim()) return;
    try {
      await repo.saveService(
        {
          name: srvName.trim(),
          category: srvCategory,
          description: srvDesc.trim() || 'Professional publishing service.',
          pricingMethod: srvMethod,
          basePrice: Number(srvPrice) || 0,
          currency: 'USD',
          estimatedTurnaround: srvTurnaround,
          active: true,
        },
        user,
      );
      setSrvName('');
      setSrvDesc('');
      notify('Publishing service saved.', 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create service.', 'error');
    }
  };

  const handleToggleService = async (srv: PublishingService) => {
    try {
      await repo.saveService({ ...srv, active: !srv.active }, user);
      notify(`Service ${srv.active ? 'deactivated' : 'activated'}.`, 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error');
    }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jrnTitle.trim()) return;
    try {
      await repo.saveJournal(
        {
          title: jrnTitle.trim(),
          discipline: jrnDiscipline.trim() || 'Interdisciplinary',
          reviewModel: jrnReviewModel,
          issn: jrnIssn.trim(),
          identifierStatus: jrnIssn.trim() ? 'verified' : 'unassigned',
          active: true,
          isSample: false,
        },
        user,
      );
      setJrnTitle('');
      setJrnDiscipline('');
      setJrnIssn('');
      notify('Academic journal saved.', 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save journal.', 'error');
    }
  };

  const handlePrefillFromManuscript = (ms: Manuscript) => {
    setPubManuscriptId(ms.id);
    setPubTitle(ms.title);
    setPubAuthorName(ms.authorName);
    setPubAuthorId(ms.authorId);
    setPubType(ms.publicationType);
    setPubAbstract(ms.abstract || '');
  };

  const handleSavePublication = async (releaseStatus: 'approved' | 'published') => {
    if (!pubTitle.trim()) {
      notify('Publication title is required.', 'error');
      return;
    }
    try {
      await repo.savePublication(
        {
          manuscriptId: pubManuscriptId || undefined,
          authorId: pubAuthorId || user.uid,
          authorName: pubAuthorName || user.displayName,
          title: pubTitle.trim(),
          publicationType: pubType,
          format: pubFormat,
          accessType: pubAccess,
          price: Number(pubPrice) || 0,
          currency: 'USD',
          isbn: pubIsbn.trim(),
          doi: pubDoi.trim(),
          identifierStatus: pubIsbn.trim() || pubDoi.trim() ? 'verified' : 'unassigned',
          abstract: pubAbstract.trim(),
          releaseStatus,
          isSample: false,
        },
        user,
      );
      setPubTitle('');
      setPubAbstract('');
      setPubManuscriptId('');
      setPubIsbn('');
      setPubDoi('');
      notify(
        releaseStatus === 'published'
          ? 'Publication released to Public Catalogue!'
          : 'Publication record saved as Approved.',
        'success',
      );
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save publication.', 'error');
    }
  };

  const handleReleaseExisting = async (pub: PublicationRecord) => {
    try {
      await repo.savePublication({ ...pub, releaseStatus: 'published' }, user);
      notify(`"${pub.title}" released to Public Catalogue.`, 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Release failed.', 'error');
    }
  };

  const handleUpdateUserRole = async (target: UserProfile, role: UserRole) => {
    const nextRoles = target.roles.includes(role)
      ? target.roles.filter((r) => r !== role)
      : [...target.roles, role];
    if (nextRoles.length === 0) return;
    try {
      await repo.updateUserRolesAndStatus(
        target.uid,
        { roles: nextRoles, accountStatus: target.accountStatus },
        user,
      );
      notify(`Updated roles for ${target.displayName}.`, 'success');
      await loadAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Role update failed.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await repo.updateSettings(
        {
          platformName: cfgName.trim(),
          tagline: cfgTagline.trim(),
          primaryColor: cfgPrimary.trim(),
          accentColor: cfgAccent.trim(),
          contactEmail: cfgEmail.trim(),
          contactPhone: cfgPhone.trim(),
          businessAddress: cfgAddress.trim(),
          aiAssistanceEnabled: cfgAi,
        },
        user,
      );
      setSettings(updated);
      notify('Platform branding and contact settings updated.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update settings.', 'error');
    }
  };

  const approvedReady = manuscripts.filter((m) => m.status === 'approved_for_publication');

  const logColumns: TableColumn<AuditLog>[] = [
    {
      key: 'time',
      label: 'Timestamp',
      sortValue: (l) => l.createdAt,
      render: (l) => (
        <span className="text-xs font-mono tabular-nums">
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actor',
      label: 'Actor',
      render: (l) => <span className="text-xs font-medium">{l.actorName || l.actorId}</span>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (l) => <span className="text-xs font-mono">{l.action}</span>,
    },
    {
      key: 'summary',
      label: 'Summary',
      render: (l) => <span className="text-xs text-slate-600 dark:text-slate-300">{l.summary}</span>,
    },
  ];

  return (
    <PortalLayout title="Platform Administration Console" breadcrumb="Administration & Catalogue Control">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 border-b border-stone-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'publications', label: 'Publications & Identifiers' },
          ...(isAdmin
            ? [
                { id: 'services', label: 'Publishing Services' },
                { id: 'quotations', label: 'Quotations & Orders' },
                { id: 'journals', label: 'Academic Journals' },
                { id: 'users', label: 'Users & Roles' },
                { id: 'audit', label: 'Audit Logs' },
                { id: 'settings', label: 'Platform Settings' },
              ]
            : []),
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as AdminTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              tab === item.id
                ? 'bg-[#22170D] text-white dark:bg-[#946000]'
                : 'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Registered Users', val: users.length },
              { label: 'Total Manuscripts', val: manuscripts.length },
              { label: 'Under Review', val: manuscripts.filter((m) => m.status === 'under_initial_review' || m.status === 'submitted').length },
              { label: 'Approved Ready', val: approvedReady.length },
              { label: 'Published Catalogue', val: publications.filter((p) => p.releaseStatus === 'published').length },
              { label: 'Active Services', val: services.filter((s) => s.active).length },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-2xl font-serif font-semibold tabular-nums">{kpi.val}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Manuscript Pipeline Snapshot</h2>
            <div className="divide-y divide-stone-200 dark:divide-slate-800">
              {manuscripts.slice(0, 6).map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">
                      <span className="font-mono text-xs text-slate-500 mr-2">{m.referenceNumber}</span>
                      {m.title}
                    </p>
                    <p className="text-xs text-slate-500">{m.authorName}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Services Management */}
      {tab === 'services' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleCreateService}
            className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 h-fit"
          >
            <h2 className="font-serif text-xl font-semibold">Create Publishing Service</h2>
            <div>
              <label htmlFor="srv-name" className="block text-xs font-semibold mb-1">Service Name *</label>
              <input
                id="srv-name"
                required
                value={srvName}
                onChange={(e) => setSrvName(e.target.value)}
                placeholder="e.g. Academic Indexing & Metadata Prep"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="srv-cat" className="block text-xs font-semibold mb-1">Category</label>
                <select
                  id="srv-cat"
                  value={srvCategory}
                  onChange={(e) => setSrvCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                >
                  {[
                    'Manuscript Evaluation',
                    'Developmental Editing',
                    'Copyediting',
                    'Line Editing',
                    'Proofreading',
                    'Book Formatting',
                    'Cover Design',
                    'ISBN Assistance',
                    'DOI Registration Assistance',
                    'Printing',
                    'Academic Editorial Support',
                  ].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="srv-method" className="block text-xs font-semibold mb-1">Pricing Method</label>
                <select
                  id="srv-method"
                  value={srvMethod}
                  onChange={(e) => setSrvMethod(e.target.value as PricingMethod)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                >
                  <option value="flat_fee">Flat Fee</option>
                  <option value="per_word">Per Word</option>
                  <option value="per_page">Per Page</option>
                  <option value="custom_quote">Custom Quote</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="srv-price" className="block text-xs font-semibold mb-1">Base Price (USD)</label>
                <input
                  id="srv-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={srvPrice}
                  onChange={(e) => setSrvPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="srv-turn" className="block text-xs font-semibold mb-1">Turnaround</label>
                <input
                  id="srv-turn"
                  value={srvTurnaround}
                  onChange={(e) => setSrvTurnaround(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>
            </div>
            <div>
              <label htmlFor="srv-desc" className="block text-xs font-semibold mb-1">Description</label>
              <textarea
                id="srv-desc"
                rows={3}
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
            >
              Add Publishing Service
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.category} · {s.currency} {s.basePrice} ({s.pricingMethod.replace(/_/g, ' ')}) · {s.active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleService(s)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-slate-700"
                >
                  {s.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications & Identifiers */}
      {tab === 'publications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-serif text-xl font-semibold">Prepare / Release Catalogue Edition</h2>
            <p className="text-xs text-slate-500">
              Only enter verified ISBN, ISSN, or DOI strings issued by authorized agencies. Never fabricate unverified identifiers.
            </p>

            {approvedReady.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5">Approved Manuscripts Ready for Release:</p>
                <div className="space-y-1.5">
                  {approvedReady.map((ms) => (
                    <button
                      key={ms.id}
                      type="button"
                      onClick={() => handlePrefillFromManuscript(ms)}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30 hover:border-[#946000]"
                    >
                      <span className="font-mono">{ms.referenceNumber}</span> — {ms.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label htmlFor="pub-title" className="block text-xs font-semibold mb-1">Publication Title *</label>
                <input
                  id="pub-title"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pub-author" className="block text-xs font-semibold mb-1">Author Name</label>
                  <input
                    id="pub-author"
                    value={pubAuthorName}
                    onChange={(e) => setPubAuthorName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="pub-format" className="block text-xs font-semibold mb-1">Format</label>
                  <select
                    id="pub-format"
                    value={pubFormat}
                    onChange={(e) => setPubFormat(e.target.value as 'digital' | 'print' | 'both')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  >
                    <option value="digital">Digital</option>
                    <option value="print">Print</option>
                    <option value="both">Digital & Print</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pub-access" className="block text-xs font-semibold mb-1">Access</label>
                  <select
                    id="pub-access"
                    value={pubAccess}
                    onChange={(e) => setPubAccess(e.target.value as 'free' | 'paid')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  >
                    <option value="free">Free / Open Access</option>
                    <option value="paid">Paid Edition</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pub-price" className="block text-xs font-semibold mb-1">Price (USD)</label>
                  <input
                    id="pub-price"
                    type="number"
                    min={0}
                    value={pubPrice}
                    onChange={(e) => setPubPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pub-isbn" className="block text-xs font-semibold mb-1">Verified ISBN (Optional)</label>
                  <input
                    id="pub-isbn"
                    value={pubIsbn}
                    onChange={(e) => setPubIsbn(e.target.value)}
                    placeholder="Official registered ISBN"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="pub-doi" className="block text-xs font-semibold mb-1">Verified DOI (Optional)</label>
                  <input
                    id="pub-doi"
                    value={pubDoi}
                    onChange={(e) => setPubDoi(e.target.value)}
                    placeholder="10.xxxx/..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pub-abs" className="block text-xs font-semibold mb-1">Catalogue Description</label>
                <textarea
                  id="pub-abs"
                  rows={3}
                  value={pubAbstract}
                  onChange={(e) => setPubAbstract(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void handleSavePublication('approved')}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700"
                >
                  Save as Approved (Hidden)
                </button>
                <button
                  type="button"
                  onClick={() => void handleSavePublication('published')}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#946000] text-white"
                >
                  Release to Public Catalogue
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h3 className="font-serif text-lg font-semibold">Catalogue & Pre-Release Records</h3>
            {publications.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {p.title}{' '}
                    {p.isSample && <span className="text-xs font-normal text-amber-700">(Sample)</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.authorName} · Status: <strong className="capitalize">{p.releaseStatus}</strong> · {p.isbn || p.doi || 'No verified identifier'}
                  </p>
                </div>
                {p.releaseStatus !== 'published' && (
                  <button
                    type="button"
                    onClick={() => void handleReleaseExisting(p)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#946000] text-white shrink-0"
                  >
                    Release Publicly
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotations */}
      {tab === 'quotations' && isAdmin && (
        <div className="space-y-3">
          {quotations.length === 0 ? (
            <p className="text-sm text-slate-500">No service quotation requests yet.</p>
          ) : (
            quotations.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-sm">{q.manuscriptTitle || q.manuscriptId}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    Status: {q.status} · Estimate: {q.currency} {(q.estimatedAmount || 0).toLocaleString()}
                    {q.confirmedAmount !== undefined ? ` · Confirmed: ${q.currency} ${q.confirmedAmount}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      repo
                        .updateQuotation(
                          q.id,
                          { status: 'confirmed', confirmedAmount: q.estimatedAmount || 0 },
                          user,
                        )
                        .then(() => {
                          notify('Quotation confirmed.', 'success');
                          return loadAdminData();
                        })
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
                  >
                    Confirm Quote
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Academic Journals */}
      {tab === 'journals' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleCreateJournal}
            className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 h-fit"
          >
            <h2 className="font-serif text-xl font-semibold">Register Academic Journal</h2>
            <div>
              <label htmlFor="jrn-title" className="block text-xs font-semibold mb-1">Journal Title *</label>
              <input
                id="jrn-title"
                required
                value={jrnTitle}
                onChange={(e) => setJrnTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="jrn-disc" className="block text-xs font-semibold mb-1">Discipline</label>
              <input
                id="jrn-disc"
                value={jrnDiscipline}
                onChange={(e) => setJrnDiscipline(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="jrn-model" className="block text-xs font-semibold mb-1">Peer Review Model</label>
              <select
                id="jrn-model"
                value={jrnReviewModel}
                onChange={(e) => setJrnReviewModel(e.target.value as PeerReviewModel)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              >
                <option value="double_anonymous">Double-Anonymous</option>
                <option value="single_anonymous">Single-Anonymous</option>
                <option value="open">Open Peer Review</option>
              </select>
            </div>
            <div>
              <label htmlFor="jrn-issn" className="block text-xs font-semibold mb-1">Verified ISSN (Optional)</label>
              <input
                id="jrn-issn"
                value={jrnIssn}
                onChange={(e) => setJrnIssn(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
            >
              Save Journal Record
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {journals.map((j) => (
              <div key={j.id} className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="font-semibold text-sm">{j.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {j.discipline} · {j.reviewModel.replace(/_/g, '-')} · ISSN: {j.issn || 'Unassigned'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users & Roles */}
      {tab === 'users' && isAdmin && (
        <div className="space-y-4">
          {users.map((u) => (
            <div
              key={u.uid}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{u.displayName}</p>
                  <p className="text-xs text-slate-500">{u.email} · Status: {u.accountStatus}</p>
                </div>
                <select
                  aria-label={`Account status for ${u.displayName}`}
                  value={u.accountStatus}
                  onChange={(e) =>
                    repo
                      .updateUserRolesAndStatus(
                        u.uid,
                        { roles: u.roles, accountStatus: e.target.value as UserProfile['accountStatus'] },
                        user,
                      )
                      .then(() => loadAdminData())
                  }
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="mt-3 pt-3 border-t border-stone-200 dark:border-slate-800 flex flex-wrap gap-2">
                {ALL_ROLES.filter((r) => r.value !== 'visitor').map((r) => {
                  const has = u.roles.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => void handleUpdateUserRole(u, r.value)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        has
                          ? 'bg-[#22170D] text-white border-[#22170D] dark:bg-[#946000] dark:border-[#946000]'
                          : 'border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs */}
      {tab === 'audit' && isAdmin && (
        <DataTable
          data={auditLogs}
          columns={logColumns}
          keyExtractor={(l) => l.id}
          searchPlaceholder="Search audit logs..."
          searchFilter={(l, q) =>
            `${l.actorName || ''} ${l.action} ${l.summary}`.toLowerCase().includes(q)
          }
          emptyTitle="No audit logs recorded"
          emptyDescription="Consequential workflow, role, and catalogue actions are logged automatically."
        />
      )}

      {/* Platform Settings */}
      {tab === 'settings' && isAdmin && (
        <form
          onSubmit={handleSaveSettings}
          className="max-w-2xl rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="font-serif text-xl font-semibold">Platform Branding & Configuration</h2>
          <div>
            <label htmlFor="cfg-name" className="block text-xs font-semibold mb-1">Platform Name</label>
            <input
              id="cfg-name"
              required
              value={cfgName}
              onChange={(e) => setCfgName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="cfg-tag" className="block text-xs font-semibold mb-1">Tagline</label>
            <input
              id="cfg-tag"
              value={cfgTagline}
              onChange={(e) => setCfgTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfg-prim" className="block text-xs font-semibold mb-1">Primary Color</label>
              <input
                id="cfg-prim"
                value={cfgPrimary}
                onChange={(e) => setCfgPrimary(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cfg-acc" className="block text-xs font-semibold mb-1">Accent Color</label>
              <input
                id="cfg-acc"
                value={cfgAccent}
                onChange={(e) => setCfgAccent(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfg-email" className="block text-xs font-semibold mb-1">Contact Email</label>
              <input
                id="cfg-email"
                value={cfgEmail}
                onChange={(e) => setCfgEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cfg-phone" className="block text-xs font-semibold mb-1">Contact Phone</label>
              <input
                id="cfg-phone"
                value={cfgPhone}
                onChange={(e) => setCfgPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cfg-addr" className="block text-xs font-semibold mb-1">Business Address</label>
            <input
              id="cfg-addr"
              value={cfgAddress}
              onChange={(e) => setCfgAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={cfgAi} onChange={(e) => setCfgAi(e.target.checked)} />
            <span>Enable optional advisory AI drafting assistance (server-side Gemini boundary)</span>
          </label>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
          >
            Save Platform Settings
          </button>
        </form>
      )}
    </PortalLayout>
  );
}
