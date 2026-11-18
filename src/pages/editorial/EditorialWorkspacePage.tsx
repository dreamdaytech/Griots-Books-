import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, type TableColumn } from '../../components/DataTable';
import { PortalLayout } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { canAccessEditorialWorkspace } from '../../domain/rbac';
import type { Manuscript } from '../../domain/types';
import { PUBLICATION_TYPE_LABELS } from '../../domain/workflow';

export function EditorialWorkspacePage() {
  const { user, repo } = useAuth();
  const navigate = useNavigate();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);

  const authorized = canAccessEditorialWorkspace(user);

  useEffect(() => {
    if (!user || !authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    repo
      .listManuscriptsForActor(user)
      .then(setManuscripts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authorized, repo, user]);

  if (!authorized) {
    return (
      <PortalLayout title="Access Denied" breadcrumb="Editorial Desk">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-8 text-center">
          <h2 className="font-serif text-xl font-semibold">Editorial Authorization Required</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This workspace is restricted to authorized Editors, Managing Editors, Proofreaders,
            Designers, and Platform Administrators.
          </p>
        </div>
      </PortalLayout>
    );
  }

  const columns: TableColumn<Manuscript>[] = [
    {
      key: 'ref',
      label: 'Reference',
      sortValue: (m) => m.referenceNumber,
      render: (m) => <span className="font-mono text-xs">{m.referenceNumber}</span>,
    },
    {
      key: 'title',
      label: 'Manuscript',
      sortValue: (m) => m.title,
      render: (m) => (
        <div>
          <Link
            to={`/editorial/manuscripts/${m.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-slate-900 dark:text-white hover:text-[#0F766E] hover:underline"
          >
            {m.title}
          </Link>
          <p className="text-xs text-slate-500">
            {m.authorName} · {PUBLICATION_TYPE_LABELS[m.publicationType]}
          </p>
        </div>
      ),
    },
    {
      key: 'editor',
      label: 'Assigned Editor',
      render: (m) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {m.assignedEditorName || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Stage',
      sortValue: (m) => m.status,
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'updated',
      label: 'Updated',
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
    <PortalLayout title="Editorial Queue" breadcrumb="Editorial Desk">
      <DataTable
        data={manuscripts}
        columns={columns}
        keyExtractor={(m) => m.id}
        loading={loading}
        searchPlaceholder="Filter by reference, title, author, or category..."
        searchFilter={(m, q) =>
          `${m.referenceNumber} ${m.title} ${m.authorName} ${m.category || ''}`
            .toLowerCase()
            .includes(q)
        }
        filterOptions={[
          { label: 'All Submissions', value: 'all' },
          { label: 'Submitted', value: 'submitted' },
          { label: 'Under Review', value: 'under_initial_review' },
          { label: 'Revision Requested', value: 'author_revision_required' },
          { label: 'Approved', value: 'approved_for_publication' },
        ]}
        filterMatcher={(m, val) => m.status === val}
        emptyTitle="No submissions in queue"
        emptyDescription="Submitted manuscripts will appear here for editorial triage and assessment."
        onRowClick={(m) => navigate(`/editorial/manuscripts/${m.id}`)}
      />
    </PortalLayout>
  );
}
