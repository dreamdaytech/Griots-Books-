import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Lock, Upload } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PortalLayout } from '../../components/PortalLayout';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { canAccessEditorialWorkspace } from '../../domain/rbac';
import type {
  CommentType,
  CommentVisibility,
  EditorialComment,
  Manuscript,
  ManuscriptHistory,
  ManuscriptStatus,
  ManuscriptVersion,
} from '../../domain/types';
import {
  getAllowedTransitions,
  PUBLICATION_TYPE_LABELS,
  STATUS_LABELS,
  validateFileUploadMeta,
} from '../../domain/workflow';

export function EditorialReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, repo, getIdToken, downloadPrivateFile } = useAuth();
  const { notify } = usePlatform();

  const authorized = canAccessEditorialWorkspace(user);

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [comments, setComments] = useState<EditorialComment[]>([]);
  const [history, setHistory] = useState<ManuscriptHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Editorial actions
  const [nextStatus, setNextStatus] = useState<ManuscriptStatus | ''>('');
  const [transitionNote, setTransitionNote] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>('author_visible');
  const [commentType, setCommentType] = useState<CommentType>('assessment');

  const [editedFile, setEditedFile] = useState<File | null>(null);
  const [editedNotes, setEditedNotes] = useState('Editorial marked-up / formatted proof');
  const [busy, setBusy] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!id || !user || !authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ms = await repo.getManuscriptById(id, user);
      setManuscript(ms);
      if (ms) {
        const [v, c, h] = await Promise.all([
          repo.listManuscriptVersions(id, user),
          repo.listManuscriptComments(id, user),
          repo.listManuscriptHistory(id, user),
        ]);
        setVersions(v);
        setComments(c);
        setHistory(h);
        const allowed = getAllowedTransitions(ms.status, ms.publicationType, user, ms.authorId);
        setNextStatus(allowed[0] || '');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to load manuscript.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authorized, id, notify, repo, user]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  if (!authorized) {
    return (
      <PortalLayout title="Access Denied" breadcrumb="Editorial Desk">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">
            Editorial staff role required to review submissions.
          </p>
        </div>
      </PortalLayout>
    );
  }

  if (loading) {
    return (
      <PortalLayout title="Loading Review..." breadcrumb="Editorial Desk">
        <div className="h-64 rounded-xl bg-stone-200 dark:bg-slate-800 animate-pulse" />
      </PortalLayout>
    );
  }

  if (!manuscript || !user) {
    return (
      <PortalLayout title="Manuscript Not Found" breadcrumb="Editorial Desk">
        <Link to="/editorial" className="text-sm text-[#0F766E] underline">
          Back to Editorial Queue
        </Link>
      </PortalLayout>
    );
  }

  const allowedTransitions = getAllowedTransitions(
    manuscript.status,
    manuscript.publicationType,
    user,
    manuscript.authorId,
  );

  const executeTransition = async (target: ManuscriptStatus) => {
    setBusy(true);
    try {
      await repo.transitionManuscriptStatus(manuscript, target, transitionNote, user);
      setTransitionNote('');
      notify(`Workflow transitioned to ${STATUS_LABELS[target]}.`, 'success');
      await loadWorkspace();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Transition blocked.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStatus) return;
    if (nextStatus === 'rejected') {
      setConfirmReject(true);
      return;
    }
    void executeTransition(nextStatus);
  };

  const handleAssignSelf = async () => {
    setBusy(true);
    try {
      await repo.assignEditor(manuscript, user.uid, user.displayName, user);
      notify('Assigned as handling editor.', 'success');
      await loadWorkspace();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Assignment failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setBusy(true);
    try {
      await repo.addManuscriptComment(
        manuscript,
        {
          manuscriptId: manuscript.id,
          manuscriptAuthorId: manuscript.authorId,
          authorId: user.uid,
          authorName: user.displayName,
          authorRole: user.roles[0],
          visibility,
          commentType,
          body: commentBody.trim(),
        },
        user,
      );
      setCommentBody('');
      notify(
        visibility === 'author_visible'
          ? 'Feedback sent and author notified.'
          : 'Confidential editorial note recorded.',
        'success',
      );
      await loadWorkspace();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not record comment.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadEdited = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedFile) return;
    const check = validateFileUploadMeta({
      name: editedFile.name,
      type: editedFile.type,
      size: editedFile.size,
    });
    if (!check.valid) {
      notify(check.error || 'Invalid file.', 'error');
      return;
    }
    setBusy(true);
    try {
      const token = await getIdToken();
      await repo.addManuscriptVersion(manuscript, editedFile, editedNotes, user, token);
      setEditedFile(null);
      notify('Edited version uploaded and logged.', 'success');
      await loadWorkspace();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalLayout
      title={manuscript.title}
      breadcrumb={`Editorial Desk / ${manuscript.referenceNumber}`}
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge status={manuscript.status} />
          {manuscript.assignedEditorId !== user.uid && (
            <button
              type="button"
              disabled={busy}
              onClick={handleAssignSelf}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Assign to Me
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata & Academic Declarations */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Author</span>
                <p className="font-semibold mt-0.5">{manuscript.authorName}</p>
              </div>
              <div>
                <span className="text-slate-500">Type</span>
                <p className="font-medium mt-0.5">{PUBLICATION_TYPE_LABELS[manuscript.publicationType]}</p>
              </div>
              <div>
                <span className="text-slate-500">Handling Editor</span>
                <p className="font-medium mt-0.5">{manuscript.assignedEditorName || 'Unassigned'}</p>
              </div>
            </div>
            {manuscript.abstract && (
              <div className="pt-3 border-t border-stone-200 dark:border-slate-800">
                <h2 className="text-xs font-semibold text-slate-500">Abstract / Synopsis</h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {manuscript.abstract}
                </p>
              </div>
            )}
            {(manuscript.ethicsDeclaration || manuscript.conflictOfInterest || manuscript.fundingInfo) && (
              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {manuscript.ethicsDeclaration && (
                  <div>
                    <span className="font-semibold text-slate-500">Ethics Declaration:</span>
                    <p className="mt-0.5">{manuscript.ethicsDeclaration}</p>
                  </div>
                )}
                {manuscript.conflictOfInterest && (
                  <div>
                    <span className="font-semibold text-slate-500">Conflicts of Interest:</span>
                    <p className="mt-0.5">{manuscript.conflictOfInterest}</p>
                  </div>
                )}
                {manuscript.fundingInfo && (
                  <div>
                    <span className="font-semibold text-slate-500">Funding:</span>
                    <p className="mt-0.5">{manuscript.fundingInfo}</p>
                  </div>
                )}
                {manuscript.dataAvailability && (
                  <div>
                    <span className="font-semibold text-slate-500">Data Availability:</span>
                    <p className="mt-0.5">{manuscript.dataAvailability}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Document Versions */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-serif text-lg font-semibold">Manuscript Files & Editorial Uploads</h2>
            <div className="mt-3 divide-y divide-stone-200 dark:divide-slate-800">
              {versions.map((ver) => (
                <div key={ver.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      <span className="font-mono text-xs text-[#0F766E] mr-2">v{ver.versionNumber}</span>
                      {ver.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ver.uploadedByName} · {new Date(ver.createdAt).toLocaleString()}
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleUploadEdited} className="mt-4 pt-4 border-t border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="ed-upload" className="block text-xs font-semibold mb-1">
                  Upload Edited / Typeset Version
                </label>
                <input
                  id="ed-upload"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => setEditedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-stone-300 file:bg-stone-100 file:text-slate-800 dark:file:border-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                />
              </div>
              <input
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                aria-label="Edited file notes"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
              <button
                type="submit"
                disabled={!editedFile || busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E] disabled:opacity-40 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </form>
          </section>

          {/* Editorial Assessment & Confidential Notes */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-serif text-lg font-semibold">
              Assessments, Author Feedback & Internal Notes
            </h2>
            <form onSubmit={handlePostComment} className="mt-4 space-y-3 p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cmt-vis" className="block text-xs font-semibold mb-1">
                    Visibility Scope
                  </label>
                  <select
                    id="cmt-vis"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as CommentVisibility)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="author_visible">Visible to Author & Editorial Team</option>
                    <option value="internal_editorial">Confidential Internal Note (Staff Only)</option>
                    <option value="confidential_review">Confidential Peer-Review (Staff Only)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="cmt-type" className="block text-xs font-semibold mb-1">
                    Note Type
                  </label>
                  <select
                    id="cmt-type"
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as CommentType)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="assessment">Editorial Assessment</option>
                    <option value="revision_request">Revision Request</option>
                    <option value="editorial_note">Internal Editorial Note</option>
                    <option value="proof_feedback">Proofing Feedback</option>
                  </select>
                </div>
              </div>
              <textarea
                rows={3}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write assessment, revision instructions, or confidential editorial note..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="submit"
                disabled={!commentBody.trim() || busy}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white dark:bg-[#0F766E] disabled:opacity-40"
              >
                Record Note
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {comments.map((c) => {
                const isInternal = c.visibility !== 'author_visible';
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-lg border ${
                      isInternal
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30'
                        : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold flex items-center gap-1.5">
                        {isInternal && <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />}
                        {c.authorName} · {c.commentType.replace(/_/g, ' ')}
                        {isInternal ? ' (Confidential — Hidden from Author)' : ' (Author-Visible)'}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{c.body}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Workflow Transition & History */}
        <div className="lg:col-span-4 space-y-6">
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Workflow Status Transition
            </h2>
            {allowedTransitions.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No further transitions are available from "{STATUS_LABELS[manuscript.status]}" for your role.
              </p>
            ) : (
              <form onSubmit={handleStatusSubmit} className="mt-3 space-y-3">
                <div>
                  <label htmlFor="wf-next" className="block text-xs font-medium mb-1">
                    Next Permitted Stage
                  </label>
                  <select
                    id="wf-next"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as ManuscriptStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  >
                    {allowedTransitions.map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="wf-note" className="block text-xs font-medium mb-1">
                    Decision / Transition Note
                  </label>
                  <textarea
                    id="wf-note"
                    rows={2}
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder="Reason for status change (notifies author)..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || !nextStatus}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-40"
                >
                  Apply Status Transition
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Audit History
            </h2>
            <ol className="mt-4 space-y-3 border-l border-stone-200 dark:border-slate-700 pl-4">
              {history.map((h) => (
                <li key={h.id} className="text-xs">
                  <p className="font-semibold">{h.action}</p>
                  <p className="text-slate-600 dark:text-slate-300">{h.details}</p>
                  <p className="text-slate-400 tabular-nums">
                    {h.actorName} · {new Date(h.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject Manuscript?"
        description="Rejecting a manuscript places it in a terminal rejected state and notifies the submitting author."
        confirmLabel="Confirm Rejection"
        destructive
        onConfirm={() => {
          setConfirmReject(false);
          void executeTransition('rejected');
        }}
        onCancel={() => setConfirmReject(false)}
      />
    </PortalLayout>
  );
}
