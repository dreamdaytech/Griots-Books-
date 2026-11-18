import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import { DataTable, type TableColumn } from '../../components/DataTable';
import { EditorialProgressBar } from '../../components/EditorialProgressBar';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { Manuscript, NotificationItem } from '../../domain/types';
import { getEditorialProgress, PUBLICATION_TYPE_LABELS } from '../../domain/workflow';

export function AuthorDashboardPage({ manuscriptsOnly = false }: { manuscriptsOnly?: boolean }) {
  const { user, repo } = useAuth();
  const navigate = useNavigate();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      repo.listManuscriptsForActor(user),
      repo.listNotifications(user.uid).catch(() => [] as NotificationItem[]),
    ])
      .then(([msList, ntfList]) => {
        setManuscripts(msList.filter((m) => m.authorId === user.uid));
        setNotifications(ntfList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repo, user]);

  const metrics = useMemo(() => {
    const drafts = manuscripts.filter((m) => m.status === 'draft').length;
    const underReview = manuscripts.filter((m) =>
      ['submitted', 'under_initial_review', 'assessment_completed', 'editing_in_progress', 'formatting_in_progress'].includes(m.status),
    ).length;
    const revisionReq = manuscripts.filter((m) =>
      ['author_revision_required', 'awaiting_proof_approval'].includes(m.status),
    ).length;
    const approvedOrPub = manuscripts.filter((m) =>
      ['approved_for_publication', 'published'].includes(m.status),
    ).length;
    return {
      total: manuscripts.length,
      drafts,
      underReview,
      revisionReq,
      approvedOrPub,
    };
  }, [manuscripts]);

  const columns: TableColumn<Manuscript>[] = [
    {
      key: 'ref',
      label: 'Reference',
      sortValue: (m) => m.referenceNumber,
      render: (m) => (
        <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
          {m.referenceNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Manuscript Title',
      sortValue: (m) => m.title,
      render: (m) => (
        <div>
          <Link
            to={`/dashboard/manuscripts/${m.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-slate-900 dark:text-white hover:text-[#0F766E] hover:underline"
          >
            {m.title}
          </Link>
          <p className="text-xs text-slate-500">
            {PUBLICATION_TYPE_LABELS[m.publicationType]} · v{m.currentVersionNumber}
          </p>
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Editorial Workflow',
      sortValue: (m) => getEditorialProgress(m.status).percent,
      render: (m) => <EditorialProgressBar status={m.status} />,
    },
    {
      key: 'updated',
      label: 'Last Updated',
      align: 'right',
      sortValue: (m) => m.updatedAt,
      render: (m) => (
        <span className="text-xs text-slate-500 tabular-nums">
          {new Date(m.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <PortalLayout
      title={manuscriptsOnly ? 'My Manuscripts' : `Welcome, ${user?.displayName || 'Author'}`}
      breadcrumb="Author & Researcher Workspace"
      actions={
        <Link
          to="/dashboard/submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white hover:bg-[#193055] dark:bg-[#0F766E] whitespace-nowrap"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>New Submission</span>
        </Link>
      }
    >
      {!manuscriptsOnly && (
        <div className="space-y-8 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Submissions', value: metrics.total },
              { label: 'Drafts', value: metrics.drafts },
              { label: 'In Review / Editing', value: metrics.underReview },
              { label: 'Action Required', value: metrics.revisionReq },
              { label: 'Approved & Published', value: metrics.approvedOrPub },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-serif font-semibold text-slate-900 dark:text-white tabular-nums">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {metrics.revisionReq > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 p-4 text-sm text-amber-950 dark:text-amber-200 flex items-center justify-between gap-4">
              <span>
                You have <strong>{metrics.revisionReq}</strong> manuscript(s) awaiting your revision upload or proof approval.
              </span>
              <Link to="/dashboard/manuscripts" className="text-xs font-semibold underline whitespace-nowrap">
                Review Action Items
              </Link>
            </div>
          )}

          {notifications.filter((n) => !n.read).length > 0 && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent Notifications
                </h2>
                <Link to="/dashboard/notifications" className="text-xs font-medium text-[#0F766E] hover:underline">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-stone-200 dark:divide-slate-800">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="py-2.5 flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{n.message}</p>
                    </div>
                    {n.link && (
                      <Link to={n.link} className="text-xs font-semibold text-[#0F766E] whitespace-nowrap">
                        Open
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Your Manuscripts
          </h2>
        </div>
        <DataTable
          data={manuscripts}
          columns={columns}
          keyExtractor={(m) => m.id}
          loading={loading}
          searchPlaceholder="Search by title or reference (e.g. MS-2026)..."
          searchFilter={(m, q) =>
            m.title.toLowerCase().includes(q) || m.referenceNumber.toLowerCase().includes(q)
          }
          filterOptions={[
            { label: 'All', value: 'all' },
            { label: 'Drafts', value: 'draft' },
            { label: 'In Review', value: 'review' },
            { label: 'Revision Required', value: 'author_revision_required' },
            { label: 'Accepted', value: 'approved_for_publication' },
            { label: 'Published', value: 'published' },
          ]}
          filterMatcher={(m, val) => {
            if (val === 'review') {
              return [
                'submitted',
                'under_initial_review',
                'assessment_completed',
                'editing_in_progress',
                'formatting_in_progress',
              ].includes(m.status);
            }
            return m.status === val;
          }}
          emptyTitle="No manuscripts yet"
          emptyDescription="Start a new book, article, or academic research submission using our guided 6-step wizard."
          emptyAction={
            <Link
              to="/dashboard/submit"
              className="inline-flex px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E]"
            >
              Submit First Manuscript
            </Link>
          }
          onRowClick={(m) => navigate(`/dashboard/manuscripts/${m.id}`)}
        />
      </div>
    </PortalLayout>
  );
}
