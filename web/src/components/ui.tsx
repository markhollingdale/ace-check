import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import type {
  FindingSource,
  Severity,
  StageStatus,
} from '../lib/types';
import { SEVERITY_LABELS, SOURCE_LABELS } from '../lib/types';

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants: Record<string, string> = {
    primary:
      'text-slate-950 font-semibold bg-gradient-to-b from-emerald-300 to-emerald-500 hover:from-emerald-200 hover:to-emerald-400 border border-emerald-400/40 shadow-[0_10px_30px_-14px_rgba(52,211,153,0.8)]',
    accent:
      'text-white font-semibold bg-gradient-to-b from-indigo-400 to-indigo-600 hover:from-indigo-300 hover:to-indigo-500 border border-indigo-400/40 shadow-[0_10px_30px_-14px_rgba(124,140,255,0.9)]',
    secondary:
      'bg-white/[0.04] text-ink-soft hover:bg-white/[0.09] hover:text-ink border border-line',
    ghost:
      'bg-transparent text-muted hover:bg-white/[0.06] hover:text-ink border border-transparent',
    danger:
      'bg-rose-500/90 text-white hover:bg-rose-500 border border-rose-400/40',
  };
  const sizes: Record<string, string> = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg',
    md: 'text-sm px-3.5 py-2 rounded-xl',
    lg: 'text-sm px-5 py-2.5 rounded-xl',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Shared styling for native <select> controls. The arbitrary variants style the
 * option list itself, which browsers otherwise paint using the OS theme (a
 * white flash over the dark UI). Composes with layout/padding classes.
 */
export const selectClass =
  'border border-line text-ink-soft outline-none transition focus:border-accent/60 [&>option]:bg-[#0b1020] [&>option]:text-ink-soft [&>optgroup]:bg-[#0b1020]';

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('glass rounded-2xl shadow-xl shadow-black/20', className)}
      {...props}
    />
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="text-sm font-semibold text-ink">{title}</div>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Card>
  );
}

// --- Badges ---------------------------------------------------------------

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  low: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  info: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-rose-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-sky-400',
  info: 'bg-slate-400',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        SEVERITY_STYLES[severity],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[severity])} />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

const SOURCE_STYLES: Record<FindingSource, string> = {
  web: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  static: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  dynamic: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  review: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

export function SourceTag({ source }: { source: FindingSource }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        SOURCE_STYLES[source],
      )}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-ink-soft">
      {category}
    </span>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-ink-soft',
        className,
      )}
    >
      {children}
    </span>
  );
}

const STAGE_STATUS_STYLES: Record<StageStatus, string> = {
  blocked: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  ready: 'bg-white/[0.05] text-ink-soft border-line',
  running: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  passed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  findings: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  skipped: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function StageStatusPill({ status }: { status: StageStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
        STAGE_STATUS_STYLES[status],
      )}
    >
      {status === 'running' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-300" />
      )}
      {status}
    </span>
  );
}

// --- Tabs -----------------------------------------------------------------

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-white/[0.03] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer',
            active === tab.id
              ? 'bg-white/[0.09] text-ink shadow-sm'
              : 'text-muted hover:bg-white/[0.05] hover:text-ink-soft',
          )}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && (
            <span className="rounded-full bg-white/[0.08] px-1.5 text-xs text-ink-soft">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// --- Feedback -------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-accent',
        className,
      )}
    />
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ProgressButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </Button>
  );
}

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold leading-none text-muted transition-colors group-hover:bg-accent-subtle group-hover:text-accent">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border border-line-strong bg-[#0b1020] px-3 py-2 text-xs font-normal leading-relaxed text-ink-soft opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-white/[0.015] px-6 py-14 text-center">
      {icon && <div className="mb-3 text-2xl opacity-60">{icon}</div>}
      <p className="text-sm font-semibold text-ink-soft">{title}</p>
      {hint && <p className="mt-1 max-w-md text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CopyButton({
  text,
  label = 'Copy',
  className,
  disabled,
}: {
  text: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      disabled={disabled}
      onClick={async (e) => {
        const btn = e.currentTarget;
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = original;
        }, 1200);
      }}
    >
      {label}
    </Button>
  );
}

/** Backwards-compatible shell wrapper (kept for older components). */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
