import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_PLATFORM_SETTINGS } from '../data/seedData';
import type { PlatformSettings } from '../domain/types';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PlatformContextValue {
  settings: PlatformSettings;
  setSettings: React.Dispatch<React.SetStateAction<PlatformSettings>>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  toasts: ToastMessage[];
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('pp_theme') === 'dark';
    }
    return false;
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      window.localStorage.setItem('pp_theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('pp_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    document.title = `${settings.platformName} — Stories. Memory. Legacy.`;
  }, [settings.platformName]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-1), { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  return (
    <PlatformContext.Provider
      value={{
        settings,
        setSettings,
        darkMode,
        toggleDarkMode,
        toasts,
        notify,
        dismissToast,
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${
                toast.type === 'error'
                  ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/90 dark:text-red-100'
                  : toast.type === 'success'
                    ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100'
                    : 'border-stone-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
              }`}
            >
              <span className="leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-xs font-medium opacity-70 hover:opacity-100 shrink-0"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          ))}
        </div>
      )}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
