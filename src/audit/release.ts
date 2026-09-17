import type { Finding, ReleaseGate } from '../types.js';
import { readIssues, readMetadata } from '../storage/storage.js';
import { runCodeChecks } from './checks/index.js';
import { correlate, issueToFinding, type CorrelatedGroup } from './correlate.js';
import { buildReleaseGate } from './gate.js';
import { isResolved, readFindingStatuses } from './lifecycle.js';
import { projectNameFromCodebase, siteReferencesProject } from './match.js';
import { buildProjectContext } from './prompts.js';
import {
  readReviewFindings,
  releaseReportAiMarkdown,
  releaseReportMarkdown,
} from './release-report.js';

export interface ReleaseResult {
  gate: ReleaseGate;
  correlations: CorrelatedGroup[];
  findings: Finding[];
  sources: { web: number; static: number; review: number };
  report: { markdown: string; aiMarkdown: string };
}

export async function buildRelease(opts: {
  codebasePath?: string;
  scanId?: string;
}): Promise<ReleaseResult> {
  const codebasePath = opts.codebasePath?.trim() || '';
  const scanId = opts.scanId?.trim() || '';

  const staticFindings = codebasePath ? await runCodeChecks(codebasePath) : [];
  const reviewFindings = codebasePath ? readReviewFindings(codebasePath) : [];
  const webIssues = scanId ? await readIssues(scanId) : null;
  const webFindings = (webIssues ?? []).map((issue) =>
    issueToFinding(issue, { scanId: scanId || undefined }),
  );
  const statuses = codebasePath ? readFindingStatuses(codebasePath) : {};
  const allFindings = [...staticFindings, ...reviewFindings, ...webFindings].map(
    (f) => ({ ...f, status: statuses[f.id] ?? f.status }),
  );

  if (codebasePath && scanId) {
    const meta = await readMetadata(scanId);
    const siteUrl = meta?.url;
    const name = projectNameFromCodebase(codebasePath);
    if (name && siteUrl) {
      const referenced = await siteReferencesProject(siteUrl, name);
      if (!referenced) {
        allFindings.push({
          id: 'MATCH-001',
          source: 'static',
          prefix: 'MATCH',
          category: 'match',
          domain: 'ARCHITECTURE',
          severity: 'high',
          confidence: 'Low',
          title: 'Deployed site may not match this codebase',
          description: `The project "${name}" was not referenced on ${siteUrl}. The code and deployed URL may be unrelated.`,
          evidence: { url: siteUrl, proof: 'possible' },
          recommendation:
            'Point the audit at the deployed version of this codebase.',
          correlationKeys: [],
          status: 'detected',
        });
      }
    }
  }

  const findings = allFindings.filter((f) => !isResolved(f.status));
  const sources = {
    web: allFindings.filter((f) => f.source === 'web').length,
    static: allFindings.filter((f) => f.source === 'static').length,
    review: allFindings.filter((f) => f.source === 'review').length,
  };

  const gate = buildReleaseGate(findings);
  const correlations = correlate(findings);
  const project = codebasePath
    ? buildProjectContext(codebasePath).name
    : scanId || 'audit';
  const report = {
    meta: {
      project,
      codebasePath,
      scanId: scanId || undefined,
      date: new Date().toISOString().slice(0, 10),
    },
    gate,
    findings,
    correlations,
  };

  return {
    gate,
    correlations,
    findings: allFindings,
    sources,
    report: {
      markdown: releaseReportMarkdown(report),
      aiMarkdown: releaseReportAiMarkdown(report),
    },
  };
}
