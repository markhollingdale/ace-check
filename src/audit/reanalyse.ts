import type { Finding, PageSummary, Project, Run } from '../types.js';
import { analyse } from '../analyser/analyser.js';
import { parseLighthouse } from '../lighthouse/parser.js';
import {
  readAllPages,
  readLighthouse,
  readMetadata,
  writeIssues,
  writePageSummary,
  writeSummary,
} from '../storage/storage.js';
import { issueToFinding } from './correlate.js';
import { replaceStageFindings } from './stages/runner.js';

export interface ReanalyseResult {
  pages: number;
  skipped: number;
  issues: number;
  findings: Finding[];
}

/**
 * Rebuild a run's web-quality findings from the Lighthouse JSON already stored
 * on disk. No Chrome, no network: this re-parses the preserved LHRs with the
 * current parser (which is where evidence extraction lives) so improvements to
 * evidence appear without re-running the scan.
 */
export async function reanalyseWebScan(
  project: Project,
  run: Run,
): Promise<ReanalyseResult> {
  const scanId = run.webScanId;
  if (!scanId) throw new Error('This run has no web scan to re-analyse.');

  const metadata = await readMetadata(scanId);
  if (!metadata) throw new Error('Stored scan data is missing.');

  const existing = await readAllPages(scanId);
  const pages: PageSummary[] = [];
  let skipped = 0;

  for (const page of existing) {
    if (page.status !== 'ok') {
      pages.push(page);
      continue;
    }
    const lhr = await readLighthouse(scanId, page.slug);
    if (!lhr) {
      skipped += 1;
      pages.push(page);
      continue;
    }
    try {
      const parsed = parseLighthouse(lhr);
      const rebuilt: PageSummary = {
        ...page,
        scores: parsed.scores,
        metrics: parsed.metrics,
        issues: parsed.issues,
        hasLighthouseJson: true,
      };
      await writePageSummary(scanId, rebuilt);
      pages.push(rebuilt);
    } catch {
      skipped += 1;
      pages.push(page);
    }
  }

  const { summary, issues } = analyse({
    scanId,
    url: metadata.url,
    timestamp: metadata.timestamp,
    mode: metadata.mode,
    device: metadata.device,
    pagesDiscovered: metadata.pagesDiscovered,
    pages,
  });

  await writeSummary(scanId, summary);
  await writeIssues(scanId, issues);

  const findings = issues.map((issue) => issueToFinding(issue, { scanId }));
  await replaceStageFindings(project, run, 'web-quality', findings);

  return { pages: pages.length, skipped, issues: issues.length, findings };
}
