import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PortalLayout } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import type {
  EditorialComment,
  Manuscript,
  ManuscriptHistory,
  ManuscriptVersion,
  ServiceQuotation,
} from '../../domain/types';
import { PUBLICATION_TYPE_LABELS, validateFileUploadMeta } from '../../domain/workflow';

export function ManuscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, repo, getIdToken, downloadPrivateFile } = useAuth();
  const { notify } = usePlatform();

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [comments, setComments] = useState<EditorialComment[]>([]);
  const [history, setHistory] = useState<ManuscriptHistory[]>([]);
  const [quotations, setQuotations] = useState<ServiceQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  const [revFile, setRevFile] = useState<File | null>(null);
  const [revNotes, setRevNotes] = useState('');
  const [resubmitOnUpload, setResubmitOnUpload] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmProof, setConfirmProof] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setAccessError('');
    try {
      const ms = await repo.getManuscriptById(id, user);
      if (!ms) {
        setAccessError('Manuscript not found.');
        setLoading(false);
        return;
      }
      setManuscript(ms);
      const [vList, cList, hList, qList] = await Promise.all([
        repo.listManuscriptVersions(id, user),
        repo.listManuscriptComments(id, user),
        repo.listManuscriptHistory(id, user),
        repo.listQuotationsForActor(user),
      ]);
      setVersions(vList);
      setComments(cList);
      setHistory(hList);
      setQuotations(qList.filter((q) => q.manuscriptId === id));
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Access denied or unable to load manuscript.');
    } finally {
      setLoading(false);
    }
  }, [id, repo, user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleRevisionUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manuscript || !user || !revFile) return;
    const validation = validateFileUploadMeta({
      name: revFile.name,
      type: revFile.type,
      size: revFile.size,
    });
    if (!validation.valid) {
      notify(validation.error || 'Invalid file.', 'error');
      return;
    }
    setUploading(true);
    try {
      const token = await getIdToken();
      await repo.addManuscriptVersion(
        manuscript,
        revFile,
        revNotes || 'Author revised manuscript upload',
        user,
        token,
      );
      if (manuscript.status === 'author_revision_required' && resubmitOnUpload) {
        await repo.transitionManuscriptStatus(
          manuscript,
          'submitted',
          'Author uploaded revised manuscript and resubmitted for editorial review.',
          user,
        );
      }
      setRevFile(null);
      setRevNotes('');
      notify('New manuscript version uploaded and preserved in history.', 'success');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Revision upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manuscript || !user || !replyText.trim()) return;
    try {
      await repo.addManuscriptComment(
        manuscript,
        {
          manuscriptId: manuscript.id,
          manuscriptAuthorId: manuscript.authorId,
          authorId: user.uid,
          authorName: user.displayName,
          authorRole: 'author',
          visibility: 'author_visible',
          commentType: 'proof_feedback',
          body: replyText.trim(),
        },
        user,
      );
      setReplyText('');
      notify('Response posted to editorial thread.', 'success');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not post reply.', 'error');
    }
  };

  const handleTransition = async (next: Manuscript['status'], note: string) => {
    if (!manuscript || !user) return;
    try {
      await repo.transitionManuscriptStatus(manuscript, next, note, user);
      notify(`Status updated to ${next.replace(/_/g, ' ')}.`, 'success');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Status update failed.', 'error');
    }
  };

  if (loading) {
    return (
      <PortalLayout title="Loading Manuscript..." breadcrumb="Author Workspace">
        <div className="h-64 rounded-xl bg-stone-200 dark:bg-slate-800 animate-pulse" />
      </PortalLayout>
    );
  }

  if (accessError || !manuscript) {
    return (
      <PortalLayout title="Access Restricted" breadcrumb="Author Workspace">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-8 text-center">
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Cannot Access Manuscript
          </h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{accessError}</p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white"
          >
            Return to Dashboard
          </Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      title={manuscript.title}
      breadcrumb={`Manuscripts / ${manuscript.referenceNumber}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge status={manuscript.status} />
          {manuscript.status === 'draft' && (
            <Link
              to={`/dashboard/submit?draftId=${manuscript.id}`}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E]"
            >
              Resume Draft
            </Link>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Manuscript Info */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Submission Overview
            </h2>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-slate-500">Reference</dt>
                <dd className="mt-0.5 font-mono font-semibold">{manuscript.referenceNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="mt-0.5 font-medium">{PUBLICATION_TYPE_LABELS[manuscript.publicationType]}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Assigned Editor</dt>
                <dd className="mt-0.5 font-medium">{manuscript.assignedEditorName || 'Pending Assignment'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Word / Page Count</dt>
                <dd className="mt-0.5 tabular-nums">
                  {(manuscript.wordCount || 0).toLocaleString()} words · {manuscript.pageCount || 0} pages
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Format Preference</dt>
                <dd className="mt-0.5 capitalize">{(manuscript.publicationPreference || 'consultation').replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Active Version</dt>
                <dd className="mt-0.5 font-mono">v{manuscript.currentVersionNumber}</dd>
              </div>
            </dl>
            {manuscript.abstract && (
              <div className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-500">Abstract / Synopsis</h3>
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {manuscript.abstract}
                </p>
              </div>
            )}
          </section>

          {/* Action Prompts */}
          {manuscript.status === 'awaiting_proof_approval' && (
            <section className="rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-teal-950 dark:text-teal-100">
                  Final Proof Approval Requested
                </h2>
                <p className="mt-1 text-xs text-teal-800 dark:text-teal-200">
                  Review the latest formatted file version below and approve it for publication release.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmProof(true)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white whitespace-nowrap shrink-0"
              >
                Approve Final Proof
              </button>
            </section>
          )}

          {/* File Versions & Upload Revision */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Document Versions (Private Storage)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              All uploaded revisions are retained in chronological history and downloadable only by authorized users.
            </p>

            <div className="mt-4 divide-y divide-stone-200 dark:divide-slate-800">
              {versions.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">No file versions uploaded yet.</p>
              ) : (
                versions.map((ver) => (
                  <div key={ver.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        <span className="font-mono text-xs mr-2 text-[#0F766E]">v{ver.versionNumber}</span>
                        {ver.fileName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Uploaded by {ver.uploadedByName || 'User'} on {new Date(ver.createdAt).toLocaleString()} · {(ver.sizeBytes / 1024).toFixed(1)} KB
                        {ver.notes ? ` · ${ver.notes}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        downloadPrivateFile(manuscript.id, ver.storageKey, ver.fileName).catch((err) =>
                          notify(err instanceof Error ? err.message : 'Download error', 'error'),
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download v{ver.versionNumber}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {!['published', 'rejected', 'withdrawn', 'cancelled'].includes(manuscript.status) && (
              <form onSubmit={handleRevisionUpload} className="mt-6 pt-5 border-t border-stone-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Upload Revised Manuscript Version
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rev-file" className="block text-xs font-medium mb-1">
                      Revised File (PDF / DOCX)
                    </label>
                    <input
                      id="rev-file"
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md"
                      onChange={(e) => setRevFile(e.target.files?.[0] || null)}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-stone-100 file:text-slate-800 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="rev-notes" className="block text-xs font-medium mb-1">
                      Revision Summary
                    </label>
                    <input
                      id="rev-notes"
                      value={revNotes}
                      onChange={(e) => setRevNotes(e.target.value)}
                      placeholder="Describe changes made in this revision"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    />
                  </div>
                </div>
                {manuscript.status === 'author_revision_required' && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={resubmitOnUpload}
                      onChange={(e) => setResubmitOnUpload(e.target.checked)}
                    />
                    <span>Automatically resubmit manuscript for review after uploading</span>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={!revFile || uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E] disabled:opacity-40"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload New Version'}</span>
                </button>
              </form>
            )}
          </section>

          {/* Author-Visible Editorial Feedback */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Editorial Feedback & Correspondence
            </h2>
            <div className="mt-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">No editorial messages posted yet.</p>
              ) : (
                comments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {cmt.authorName} · {cmt.commentType.replace(/_/g, ' ')}
                      </span>
                      <span className="tabular-nums">{new Date(cmt.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {cmt.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleReply} className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2">
              <label htmlFor="author-reply" className="block text-xs font-semibold">
                Reply to Editorial Team
              </label>
              <textarea
                id="author-reply"
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add a clarification or response to editorial comments..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Post Response
              </button>
            </form>
          </section>
        </div>

        {/* Right Sidebar: Quotations & Activity */}
        <div className="lg:col-span-4 space-y-6">
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Service Quotations
              </h2>
              <Link to="/dashboard/services" className="text-xs font-semibold text-[#0F766E] hover:underline">
                Request Service
              </Link>
            </div>
            {quotations.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No service quotations linked yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {quotations.map((q) => (
                  <div key={q.id} className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="capitalize">{q.status}</span>
                      <span className="tabular-nums">
                        {q.currency} {(q.confirmedAmount ?? q.estimatedAmount ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-500">{q.serviceIds.length} service(s)</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Project Activity History
            </h2>
            <ol className="mt-4 space-y-3 border-l border-stone-200 dark:border-slate-700 pl-4">
              {history.map((h) => (
                <li key={h.id} className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">{h.action}</p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{h.details}</p>
                  <p className="text-slate-400 mt-0.5 tabular-nums">
                    {h.actorName} · {new Date(h.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {!['published', 'rejected', 'withdrawn', 'cancelled'].includes(manuscript.status) && (
            <button
              type="button"
              onClick={() => setConfirmWithdraw(true)}
              className="w-full py-2 text-xs font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Withdraw Manuscript
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmProof}
        title="Approve Final Proof?"
        description="Confirming proof approval moves this manuscript to Approved for Publication so a Publishing Manager can release it."
        confirmLabel="Approve Proof"
        onConfirm={() => {
          setConfirmProof(false);
          void handleTransition('approved_for_publication', 'Author approved final formatted proof.');
        }}
        onCancel={() => setConfirmProof(false)}
      />

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw Manuscript?"
        description="Withdrawing a manuscript halts active editorial review. Previous history remains archived."
        confirmLabel="Withdraw Submission"
        destructive
        onConfirm={() => {
          setConfirmWithdraw(false);
          void handleTransition('withdrawn', 'Withdrawn by author.');
        }}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </PortalLayout>
  );
}
