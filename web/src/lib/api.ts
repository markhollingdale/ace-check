import type {
  AuditProfile,
  Finding,
  FindingStatus,
  Issue,
  PageSummary,
  ProgressUpdate,
  ReleaseResult,
  ReviewModule,
  ScanComparison,
  ScanMetadata,
  ScanSummary,
} from './types';

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* body was not JSON */
    }
    if (res.status >= 500) {
      message += ' — is the local server running?';
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

export async function listScans(): Promise<ScanMetadata[]> {
  const res = await fetch('/api/scans');
  return (await json<{ scans: ScanMetadata[] }>(res)).scans;
}

export async function startScan(input: {
  url: string;
  codebasePath?: string;
  config?: Partial<Record<string, unknown>>;
}): Promise<string> {
  const res = await fetch('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await json<{ scanId: string }>(res)).scanId;
}

export async function getScan(
  scanId: string,
): Promise<{ metadata: ScanMetadata; summary: ScanSummary | null }> {
  const res = await fetch(`/api/scans/${scanId}`);
  return json(res);
}

export async function getScanRelease(scanId: string): Promise<ReleaseResult> {
  const res = await fetch(`/api/scans/${scanId}/release`);
  return json(res);
}

export async function browseDirectory(dirPath: string): Promise<{
  path: string;
  parent: string;
  entries: { name: string; path: string }[];
}> {
  const params = new URLSearchParams();
  if (dirPath) params.set('path', dirPath);
  const qs = params.toString();
  const res = await fetch(`/api/fs/browse${qs ? `?${qs}` : ''}`);
  return json(res);
}

export async function getIssues(
  scanId: string,
  filters: { category?: string; severity?: string } = {},
): Promise<Issue[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.severity) params.set('severity', filters.severity);
  const qs = params.toString();
  const res = await fetch(`/api/scans/${scanId}/issues${qs ? `?${qs}` : ''}`);
  return (await json<{ issues: Issue[] }>(res)).issues;
}

export async function getPages(scanId: string): Promise<PageSummary[]> {
  const res = await fetch(`/api/scans/${scanId}/pages`);
  return (await json<{ pages: PageSummary[] }>(res)).pages;
}

export async function getPage(
  scanId: string,
  slug: string,
): Promise<PageSummary> {
  const res = await fetch(`/api/scans/${scanId}/pages/${slug}`);
  return (await json<{ page: PageSummary }>(res)).page;
}

export async function getProgress(scanId: string): Promise<ProgressUpdate> {
  const res = await fetch(`/api/scans/${scanId}/progress`);
  return (await json<{ progress: ProgressUpdate }>(res)).progress;
}

export async function cancelScan(scanId: string): Promise<void> {
  await fetch(`/api/scans/${scanId}/cancel`, { method: 'POST' });
}

export async function retryFailed(scanId: string): Promise<void> {
  await fetch(`/api/scans/${scanId}/retry-failed`, { method: 'POST' });
}

export async function deleteScan(scanId: string): Promise<void> {
  await fetch(`/api/scans/${scanId}`, { method: 'DELETE' });
}

export async function getPrompt(
  scanId: string,
  mode = 'full',
  format = 'markdown',
): Promise<string> {
  const res = await fetch(
    `/api/scans/${scanId}/prompt?mode=${mode}&format=${format}`,
  );
  return res.text();
}

export async function getIssuePrompt(
  scanId: string,
  issueId: string,
): Promise<string> {
  const res = await fetch(`/api/scans/${scanId}/issues/${issueId}/prompt`);
  return res.text();
}

export async function getAllIssuesPrompt(scanId: string): Promise<string> {
  const res = await fetch(`/api/scans/${scanId}/investigation-prompt`);
  return res.text();
}

export async function getPagePrompt(
  scanId: string,
  slug: string,
): Promise<string> {
  const res = await fetch(`/api/scans/${scanId}/pages/${slug}/prompt`);
  return res.text();
}

export async function getReport(scanId: string, type: string): Promise<string> {
  const res = await fetch(`/api/scans/${scanId}/reports/${type}`);
  return res.text();
}

export async function getComparison(
  scanId: string,
  otherId: string,
): Promise<ScanComparison> {
  const res = await fetch(`/api/scans/${scanId}/compare?other=${otherId}`);
  return (await json<{ comparison: ScanComparison }>(res)).comparison;
}

export const reportUrl = (scanId: string, type: string) =>
  `/api/scans/${scanId}/reports/${type}`;
export const lighthouseJsonUrl = (scanId: string, slug: string) =>
  `/api/scans/${scanId}/pages/${slug}/lighthouse.json`;
export const lighthouseHtmlUrl = (scanId: string, slug: string) =>
  `/api/scans/${scanId}/pages/${slug}/report.html`;
export const exportUrl = (scanId: string) => `/api/scans/${scanId}/export`;

export async function runChecks(codebasePath: string): Promise<{
  findings: Finding[];
  report?: { jsonPath: string; markdownPath: string };
}> {
  const res = await fetch('/api/checks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath }),
  });
  return json(res);
}

export async function listProfiles(): Promise<AuditProfile[]> {
  const res = await fetch('/api/reviews/profiles');
  return (await json<{ profiles: AuditProfile[] }>(res)).profiles;
}

export async function listReviewModules(profile?: string): Promise<ReviewModule[]> {
  const res = await fetch(
    `/api/reviews${profile ? `?profile=${encodeURIComponent(profile)}` : ''}`,
  );
  return (await json<{ modules: ReviewModule[] }>(res)).modules;
}

export async function getReviewPrompt(
  codebasePath: string,
  moduleNumber: number,
): Promise<string> {
  const res = await fetch('/api/reviews/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, moduleNumber }),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Failed to generate prompt.');
  return res.text();
}

export async function getSuitePrompt(
  codebasePath: string,
  profile?: string,
): Promise<string> {
  const res = await fetch('/api/reviews/suite-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, profile }),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Failed to generate prompt.');
  return res.text();
}

export async function ingestReport(
  markdown: string,
  codebasePath?: string,
): Promise<Finding[]> {
  const res = await fetch('/api/reviews/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown, codebasePath }),
  });
  return (await json<{ findings: Finding[] }>(res)).findings;
}

export async function getRelease(
  codebasePath?: string,
  scanId?: string,
): Promise<ReleaseResult> {
  const res = await fetch('/api/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, scanId }),
  });
  return json(res);
}

export async function runReview(
  codebasePath: string,
  moduleNumber: number,
): Promise<string> {
  const res = await fetch('/api/reviews/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, moduleNumber }),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  return (await json<{ response: string }>(res)).response;
}

export async function getFindingStatuses(
  codebasePath: string,
): Promise<Record<string, FindingStatus>> {
  const res = await fetch(
    `/api/findings/status?codebasePath=${encodeURIComponent(codebasePath)}`,
  );
  return (await json<{ statuses: Record<string, FindingStatus> }>(res)).statuses;
}

export async function setFindingStatus(
  codebasePath: string,
  findingId: string,
  status: FindingStatus,
): Promise<Record<string, FindingStatus>> {
  const res = await fetch('/api/findings/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, findingId, status }),
  });
  return (await json<{ statuses: Record<string, FindingStatus> }>(res)).statuses;
}
