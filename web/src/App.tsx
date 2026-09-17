import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { Shell } from './components/Shell';
import { ProjectsPage } from './pages/ProjectsPage';

const ProjectPage = lazy(() =>
  import('./pages/ProjectPage').then((m) => ({ default: m.ProjectPage })),
);
const RunPage = lazy(() =>
  import('./pages/RunPage').then((m) => ({ default: m.RunPage })),
);
const FindingsPage = lazy(() =>
  import('./pages/FindingsPage').then((m) => ({ default: m.FindingsPage })),
);
const FindingPage = lazy(() =>
  import('./pages/FindingPage').then((m) => ({ default: m.FindingPage })),
);
const ReportPage = lazy(() =>
  import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ReviewPage = lazy(() =>
  import('./pages/ReviewPage').then((m) => ({ default: m.ReviewPage })),
);
const ToolsPage = lazy(() =>
  import('./pages/ToolsPage').then((m) => ({ default: m.ToolsPage })),
);
const ComparePage = lazy(() =>
  import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })),
);
const PageDetailPage = lazy(() =>
  import('./pages/PageDetailPage').then((m) => ({ default: m.PageDetailPage })),
);
const AttributionsPage = lazy(() =>
  import('./pages/AttributionsPage').then((m) => ({
    default: m.AttributionsPage,
  })),
);

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="text-lg font-bold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            Reload the page. If it persists, restart the dev server (
            <code className="rounded bg-white/[0.08] px-1">pnpm dev</code>) - the
            frontend may be running ahead of the server.
          </p>
          <pre className="mt-4 overflow-auto rounded-xl border border-line bg-black/30 p-4 text-left text-xs text-rose-300">
            {String(this.state.error.message ?? this.state.error)}
          </pre>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-accent underline"
          >
            Back to projects
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoader() {
  return (
    <div className="flex items-center gap-3 py-20 text-sm text-muted">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Shell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/about" element={<AttributionsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/projects/:id/runs/:runId" element={<RunPage />} />
            <Route path="/projects/:id/findings" element={<FindingsPage />} />
            <Route
              path="/projects/:id/findings/:findingId"
              element={<FindingPage />}
            />
            <Route path="/projects/:id/report" element={<ReportPage />} />
            <Route path="/projects/:id/settings" element={<SettingsPage />} />
            <Route path="/projects/:id/reviews" element={<ReviewPage />} />
            <Route path="/projects/:id/compare" element={<ComparePage />} />
            <Route
              path="/projects/:id/runs/:runId/pages/:slug"
              element={<PageDetailPage />}
            />
          </Routes>
        </Suspense>
      </Shell>
    </ErrorBoundary>
  );
}
