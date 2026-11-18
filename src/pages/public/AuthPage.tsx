import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import type { UserRole } from '../../domain/types';

export function AuthPage() {
  const {
    user,
    authMode,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    requestPasswordReset,
    enterSandboxSession,
  } = useAuth();
  const { notify } = usePlatform();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'signin' | 'register' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [roleIntent, setRoleIntent] = useState<UserRole>('author');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogle = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
        navigate('/dashboard');
      } else if (tab === 'register') {
        if (!displayName.trim()) throw new Error('Full name is required.');
        await registerWithEmail({ email, password, displayName, affiliation, roleIntent });
        navigate('/dashboard');
      } else {
        await requestPasswordReset(email);
        setTab('signin');
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Authentication error.';
      const msg = raw.includes('operation-not-allowed')
        ? 'Email/Password sign-in is not yet enabled in Firebase Console. Use Google Sign-In above or explore the Sample Evaluation Workspace below.'
        : raw;
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSandbox = async (uid: string, dest: string) => {
    setBusy(true);
    setErrorMsg('');
    try {
      await enterSandboxSession(uid);
      navigate(dest);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not start sample session.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Primary Firebase Authentication */}
          <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#22170D] dark:text-white">
              Account Access
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Sign in with Google for live cloud persistence, or register a new Author / Researcher account.
            </p>

            {user && (
              <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
                <span>
                  Signed in as <strong>{user.displayName}</strong> ({authMode})
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="font-semibold underline whitespace-nowrap"
                >
                  Go to Dashboard
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-[#22170D] hover:bg-[#382511] dark:bg-[#946000] dark:hover:bg-[#734B00] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Continue with Google (Live Firebase)
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <div className="flex-1 h-px bg-stone-200 dark:bg-slate-800" />
              <span>or use email credentials</span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-slate-800" />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-slate-800 mb-5">
              {[
                { key: 'signin', label: 'Sign In' },
                { key: 'register', label: 'Register' },
                { key: 'reset', label: 'Reset Password' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTab(item.key as 'signin' | 'register' | 'reset');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    tab === item.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-3 text-xs text-red-900 dark:text-red-200 flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {tab === 'register' && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-semibold mb-1">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="auth-role" className="block text-xs font-semibold mb-1">
                        Account Type
                      </label>
                      <select
                        id="auth-role"
                        value={roleIntent}
                        onChange={(e) => setRoleIntent(e.target.value as UserRole)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                      >
                        <option value="author">Registered Author</option>
                        <option value="researcher">Academic Researcher</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="auth-affiliation" className="block text-xs font-semibold mb-1">
                        Affiliation (Optional)
                      </label>
                      <input
                        id="auth-affiliation"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Public registration assigns standard Author or Researcher permissions. Privileged
                    editorial and administrative roles require controlled admin assignment.
                  </p>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold mb-1">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              {tab !== 'reset' && (
                <div>
                  <label htmlFor="auth-password" className="block text-xs font-semibold mb-1">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg border border-[#22170D] text-[#22170D] dark:border-amber-500 dark:text-amber-300 hover:bg-[#22170D] hover:text-white dark:hover:bg-[#946000] dark:hover:text-white transition-colors disabled:opacity-50"
              >
                {tab === 'signin'
                  ? 'Sign In with Email'
                  : tab === 'register'
                    ? 'Create Author Account'
                    : 'Send Password Reset Email'}
              </button>
            </form>
          </div>

          {/* Sample Evaluation Sandbox */}
          <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-[#F1E8DC]/70 dark:bg-slate-900/70 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Sample Evaluation Workspace
              </p>
              <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white">
                Explore Role Workflows (Server-Backed Sandbox)
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Test manuscript submission, editorial assessment, private file versioning, service
                quotations, and catalogue release without signing in with a personal Google account.
                All sandbox actions persist on the server and enforce backend RBAC.
              </p>

              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSandbox('sandbox_author', '/dashboard')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#946000] transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sample Author — Elena Rostova
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit books/articles, upload revisions, request quotations
                  </p>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSandbox('sandbox_researcher', '/dashboard/submit?type=academic_research')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#946000] transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sample Researcher — Dr. Amara Okafor
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit academic papers with coauthors & ethics declarations
                  </p>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSandbox('sandbox_editor', '/editorial')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#946000] transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sample Managing Editor — Clara Holloway
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assess manuscripts, assign peer reviewers, post notes, change statuses
                  </p>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSandbox('sandbox_reviewer', '/editorial')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#946000] transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sample Peer Reviewer — Dr. Samuel Adeyemi
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evaluate assigned manuscripts with rubric scores &amp; section annotations
                  </p>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSandbox('sandbox_admin', '/admin')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#946000] transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sample Admin & Publishing Manager — Arthur Pendelton
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage services, roles, identifiers, settings & public releases
                  </p>
                </button>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-slate-500 dark:text-slate-400">
              Note: Sample accounts only operate inside the isolated evaluation sandbox and never
              have access to live Firebase production records.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
