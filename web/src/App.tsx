import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/ui';
import { HomePage } from './pages/HomePage';

const ScanPage = lazy(() =>
  import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })),
);
const IssuePage = lazy(() =>
  import('./pages/IssuePage').then((m) => ({ default: m.IssuePage })),
);
const PageDetailPage = lazy(() =>
  import('./pages/PageDetailPage').then((m) => ({ default: m.PageDetailPage })),
);
const AiReviewsPage = lazy(() =>
  import('./pages/AiReviewsPage').then((m) => ({ default: m.AiReviewsPage })),
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
          <h1 className="text-lg font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Reload the page. If it persists, restart the dev server (
            <code className="rounded bg-slate-100 px-1">pnpm dev</code>) — the
            frontend may be running ahead of the server.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-100 p-4 text-left text-xs text-red-700">
            {String(this.state.error.message ?? this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoader() {
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ai-reviews" element={<AiReviewsPage />} />
            <Route path="/scan/:id" element={<ScanPage />} />
            <Route path="/scan/:id/issue/:issueId" element={<IssuePage />} />
            <Route path="/scan/:id/page/:slug" element={<PageDetailPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}
