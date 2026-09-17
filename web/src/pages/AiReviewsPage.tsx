import { useState } from 'react';
import { AiReviewsPanel } from '../components/AiReviewsPanel';
import { Card } from '../components/ui';

export function AiReviewsPage() {
  const [codebasePath, setCodebasePath] = useState('');

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-accent-subtle/40 px-6 py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-accent">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                AI Reviews
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Run 16 AI engineering reviews against your code — generate
                prompts for an external agent or run them in-tool, then import
                the findings.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <Field id="ai-codebase-path" label="Codebase path">
            <input
              id="ai-codebase-path"
              type="text"
              value={codebasePath}
              onChange={(e) => setCodebasePath(e.target.value)}
              placeholder="C:\path\to\your\repo"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </Field>
        </div>
      </Card>

      {codebasePath.trim() && <AiReviewsPanel codebasePath={codebasePath.trim()} />}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
