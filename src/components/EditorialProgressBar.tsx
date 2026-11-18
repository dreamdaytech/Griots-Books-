import {
  EDITORIAL_WORKFLOW_STAGES,
  getEditorialProgress,
  type SegmentFillWidth,
} from '../domain/workflow';
import type { ManuscriptStatus } from '../domain/types';

const LABEL_TONE_CLASSES: Record<'neutral' | 'info' | 'warning' | 'success' | 'danger', string> = {
  neutral: 'text-slate-700 dark:text-slate-300',
  info: 'text-[#22170D] dark:text-sky-300',
  warning: 'text-amber-800 dark:text-amber-300',
  success: 'text-[#946000] dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
};

const BAR_TONE_CLASSES: Record<'neutral' | 'info' | 'warning' | 'success' | 'danger', string> = {
  neutral: 'bg-slate-400 dark:bg-slate-500',
  info: 'bg-[#22170D] dark:bg-sky-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  success: 'bg-[#946000] dark:bg-amber-400',
  danger: 'bg-red-600 dark:bg-red-500',
};

export function EditorialProgressBar({ status }: { status: ManuscriptStatus }) {
  const progress = getEditorialProgress(status);
  const currentStage = EDITORIAL_WORKFLOW_STAGES[progress.stageIndex];
  const stepText = progress.isHalted
    ? 'Closed'
    : `Step ${progress.stepNumber}/${progress.totalStages}`;

  return (
    <div
      className="min-w-[220px] max-w-[290px]"
      data-testid={`editorial-progress-${status}`}
      title={`${progress.fullLabel} — ${progress.stageHint}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-xs font-semibold whitespace-nowrap ${LABEL_TONE_CLASSES[progress.tone]}`}>
          {progress.label}
        </span>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
          {stepText}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`Editorial workflow progress: ${progress.label}`}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${progress.label}, ${currentStage.label} stage, ${progress.stageHint}`}
        className="mt-1.5 grid grid-cols-6 gap-1"
      >
        {EDITORIAL_WORKFLOW_STAGES.map((stage, idx) => {
          let fillWidth: SegmentFillWidth = 'w-0';
          if (idx < progress.stageIndex) {
            fillWidth = 'w-full';
          } else if (idx === progress.stageIndex) {
            fillWidth = progress.activeSegmentFill;
          }

          return (
            <span
              key={stage.key}
              className="h-1.5 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden block"
            >
              {fillWidth !== 'w-0' && (
                <span
                  className={`block h-full rounded-full transition-all duration-200 ${fillWidth} ${BAR_TONE_CLASSES[progress.tone]}`}
                />
              )}
            </span>
          );
        })}
      </div>

      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
        {progress.stageHint}
      </p>
    </div>
  );
}
