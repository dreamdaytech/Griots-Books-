import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import type { NotificationItem } from '../../domain/types';

export function ProfileSettingsPage() {
  const { user, firebaseUser, authMode, repo, refreshProfile, resendVerificationEmail } = useAuth();
  const { notify } = usePlatform();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [affiliation, setAffiliation] = useState(user?.affiliation || '');
  const [orcid, setOrcid] = useState(user?.orcid || '');
  const [country, setCountry] = useState(user?.country || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setAffiliation(user.affiliation || '');
    setOrcid(user.orcid || '');
    setCountry(user.country || '');
    setBio(user.bio || '');
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await repo.upsertOwnProfile({
        ...user,
        displayName: displayName.trim() || user.displayName,
        affiliation: affiliation.trim(),
        orcid: orcid.trim(),
        country: country.trim(),
        bio: bio.trim(),
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      notify('Author profile updated.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="Author Profile & Account Settings" breadcrumb="Author Workspace">
      <div className="max-w-3xl space-y-6">
        {authMode === 'firebase' && firebaseUser && !firebaseUser.emailVerified && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-800 p-4 text-sm text-amber-950 dark:text-amber-200 flex items-center justify-between gap-4">
            <span>
              Your email address is not yet verified. Verify your email before writing to live Firestore collections.
            </span>
            <button
              type="button"
              onClick={() => resendVerificationEmail().catch(() => {})}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-900 text-white whitespace-nowrap"
            >
              Resend Verification
            </button>
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold mb-1">
                Display Name *
              </label>
              <input
                id="prof-name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="prof-email" className="block text-xs font-semibold mb-1">
                Account Email (Read-only)
              </label>
              <input
                id="prof-email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800 opacity-75"
              />
            </div>
            <div>
              <label htmlFor="prof-affiliation" className="block text-xs font-semibold mb-1">
                Institutional Affiliation
              </label>
              <input
                id="prof-affiliation"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="prof-orcid" className="block text-xs font-semibold mb-1">
                ORCID iD (Optional)
              </label>
              <input
                id="prof-orcid"
                value={orcid}
                onChange={(e) => setOrcid(e.target.value)}
                placeholder="0000-0000-0000-0000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 font-mono"
              />
            </div>
            <div>
              <label htmlFor="prof-country" className="block text-xs font-semibold mb-1">
                Country / Region
              </label>
              <input
                id="prof-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Assigned Roles</label>
              <p className="px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800 capitalize">
                {user?.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="prof-bio" className="block text-xs font-semibold mb-1">
              Author / Researcher Biography
            </label>
            <textarea
              id="prof-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Learn how account data, biographies and confidential submissions are handled in our
            <Link to="/policies/privacy" className="ml-1 underline text-[#946000] dark:text-amber-400">draft Privacy Policy</Link>.
            Account profile edits do not automatically license or publish a manuscript.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}

export function NotificationsPage() {
  const { user, repo } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setLoading(true);
    repo
      .listNotifications(user.uid)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [user]);

  const markRead = async (id: string) => {
    if (!user) return;
    await repo.markNotificationRead(id, user.uid);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <PortalLayout title="Messages & Notifications" breadcrumb="Author Workspace">
      <div className="max-w-3xl rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-stone-200 dark:divide-slate-800">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No notifications yet. Editorial decisions and status updates will appear here.
          </div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`p-5 flex items-start justify-between gap-4 ${n.read ? 'opacity-70' : ''}`}>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400 tabular-nums">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {n.link && (
                  <Link to={n.link} className="text-xs font-semibold text-[#946000] hover:underline">
                    View
                  </Link>
                )}
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs font-medium px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
