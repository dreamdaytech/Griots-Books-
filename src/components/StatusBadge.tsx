import type { ManuscriptStatus } from '../domain/types';
import { STATUS_LABELS, STATUS_TONE } from '../domain/workflow';

const TONE_CLASSES: Record<'neutral' | 'info' | 'warning' | 'success' | 'danger', string> = {
  neutral: 'text-slate-700 bg-stone-100 border-stone-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
  info: 'text-[#0F1E36] bg-sky-50 border-sky-200 dark:text-sky-200 dark:bg-sky-950/60 dark:border-sky-800',
  warning: 'text-amber-900 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-800',
  success: 'text-teal-900 bg-teal-50 border-teal-200 dark:text-teal-200 dark:bg-teal-950/60 dark:border-teal-800',
  danger: 'text-red-900 bg-red-50 border-red-200 dark:text-red-200 dark:bg-red-950/60 dark:border-red-800',
};

export function StatusBadge({ status }: { status: ManuscriptStatus }) {
  const tone = STATUS_TONE[status] || 'neutral';
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
