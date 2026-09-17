import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from './ui';

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-cyan-400 text-sm font-black text-slate-950 shadow-[0_8px_24px_-10px_rgba(124,140,255,0.9)]">
        A
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight text-ink">
          AceCheck
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          audit · verify · ship
        </span>
      </span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <NavLink to="/" className="shrink-0">
            <Logo />
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavItem to="/" label="Projects" end />
            <NavItem to="/tools" label="Tools" />
            <a
              href="/api/scanners"
              target="_blank"
              rel="noreferrer"
              className="ml-2 hidden rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink-soft sm:inline-flex"
            >
              API status
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-6 pb-10 pt-4 text-center text-xs text-muted/70">
        <span>AceCheck - local-first. Nothing leaves your machine.</span>
        <span className="mx-2 text-muted/40">·</span>
        <NavLink to="/about" className="transition-colors hover:text-ink-soft">
          Attribution &amp; licenses
        </NavLink>
      </footer>
    </div>
  );
}

function NavItem({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-white/[0.09] text-ink'
            : 'text-muted hover:bg-white/[0.05] hover:text-ink-soft',
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Crumb({
  to,
  label,
}: {
  to: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className="transition-colors hover:text-ink-soft hover:underline"
    >
      {label}
    </NavLink>
  );
}
