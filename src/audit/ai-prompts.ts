import type {
  Finding,
  FindingSource,
  Run,
  ScanSummary,
  StageId,
} from '../types.js';
import { SEVERITY_LABELS } from '../types.js';
import { buildReleaseGate } from './gate.js';
import { correlate } from './correlate.js';
import { STAGE_CATALOG } from './stages/catalog.js';

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const MAX_PAGES_LISTED = 20;
const MAX_DETAIL_ITEMS = 6;

function stageLabel(id: StageId | undefined): string {
  if (!id) return 'unknown stage';
  const def = STAGE_CATALOG.find((s) => s.id === id);
  return def ? `${def.label} (${def.tools.join(', ')})` : id;
}

function truncateValue(value: unknown, max = 400): string {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** Compact, line-based rendering of raw tool evidence. */
function detailLines(details: Record<string, unknown>[]): string[] {
  const lines: string[] = [];
  for (const item of details.slice(0, MAX_DETAIL_ITEMS)) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(item)) {
      if (value == null) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Lighthouse often nests the interesting value (node, url, etc).
        const nested = Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v != null && typeof v !== 'object')
          .slice(0, 4)
          .map(([k, v]) => `${k}=${truncateValue(v, 160)}`);
        if (nested.length > 0) parts.push(`${key}{${nested.join(', ')}}`);
        continue;
      }
      parts.push(`${key}=${truncateValue(value, 200)}`);
    }
    if (parts.length > 0) lines.push(`- ${parts.join(' | ')}`);
  }
  if (details.length > MAX_DETAIL_ITEMS) {
    lines.push(`- ...and ${details.length - MAX_DETAIL_ITEMS} more item(s)`);
  }
  return lines;
}

function findingLocation(finding: Finding): string {
  if (finding.evidence.file) {
    return `${finding.evidence.file}${
      finding.evidence.line ? `:${finding.evidence.line}` : ''
    }`;
  }
  return finding.evidence.url ?? '(location not recorded)';
}

/** One self-contained block that an agent can act on without further context. */
export function findingBlock(finding: Finding, index: number): string {
  const lines: string[] = [];
  lines.push(
    `### ${index}. [${SEVERITY_LABELS[finding.severity]}] ${finding.id} - ${finding.title}`,
  );
  lines.push('');
  lines.push(`- Source: ${finding.source}${finding.stage ? ` via ${stageLabel(finding.stage)}` : ''}`);
  lines.push(`- Domain: ${finding.domain} / ${finding.category}`);
  lines.push(`- Confidence: ${finding.confidence} (evidence: ${finding.evidence.proof})`);
  if (finding.effort) lines.push(`- Estimated effort: ${finding.effort}`);
  lines.push(`- Location: ${findingLocation(finding)}`);

  if (finding.context && finding.context.length > 0) {
    lines.push('');
    lines.push('Context:');
    for (const entry of finding.context) {
      lines.push(`- ${entry.label}: ${truncateValue(entry.value, 600)}`);
    }
  }

  if (finding.description) {
    lines.push('');
    lines.push('What the tool reports:');
    lines.push('');
    lines.push(finding.description.trim());
  }

  if (finding.details && finding.details.length > 0) {
    lines.push('');
    lines.push('Raw tool evidence:');
    lines.push('');
    lines.push(...detailLines(finding.details));
  }

  if (finding.affectedPages && finding.affectedPages.length > 0) {
    lines.push('');
    lines.push(
      `Affected pages (${finding.affectedPages.length} total, showing up to ${MAX_PAGES_LISTED}):`,
    );
    for (const page of finding.affectedPages.slice(0, MAX_PAGES_LISTED)) {
      lines.push(`- ${page}`);
    }
    if (finding.affectedPages.length > MAX_PAGES_LISTED) {
      lines.push(
        `- ...and ${finding.affectedPages.length - MAX_PAGES_LISTED} more`,
      );
    }
  }

  if (finding.affectedFiles && finding.affectedFiles.length > 0) {
    lines.push('');
    lines.push('Affected files:');
    for (const file of finding.affectedFiles.slice(0, 20)) {
      lines.push(`- ${file}`);
    }
  }

  if (finding.recommendation) {
    lines.push('');
    lines.push('Suggested direction:');
    lines.push('');
    lines.push(finding.recommendation.trim());
  }

  return lines.join('\n');
}

const SINGLE_INSTRUCTIONS = `You are fixing one finding in an existing application.

Before changing anything:
1. Confirm the finding is genuine from the evidence below.
2. Identify the root cause in the code (or configuration) that produces it.
3. Say which files or components are involved.
4. Propose the smallest safe change, and explain the trade-offs.
5. Note how to verify the fix and what could regress.

Do not blindly trust the automated finding: the evidence is real, but the
suggested direction is only a starting point.`;

export function generateFindingPrompt(opts: {
  projectName: string;
  finding: Finding;
  run?: Run | null;
}): string {
  const { projectName, finding, run } = opts;
  const lines: string[] = [];
  lines.push(`# Fix request - ${projectName}`);
  lines.push('');
  lines.push(
    `${run ? `Run: ${run.label} (${run.id})` : 'Finding'} | ${new Date()
      .toISOString()
      .slice(0, 10)}`,
  );
  lines.push('');
  lines.push(SINGLE_INSTRUCTIONS);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(findingBlock(finding, 1));
  return lines.join('\n');
}

const RUN_INSTRUCTIONS = `You are reviewing the results of an automated audit run.

Do not make changes yet. Work through the findings below and produce:

1. Which findings are genuine problems, and which are noise or duplicates.
2. The likely root cause for each significant finding, and where it lives in
   the code.
3. A prioritised implementation plan (highest risk and highest impact first).
4. For each planned change: the smallest safe edit, the trade-offs, and how to
   verify it.

Prefer fixing shared root causes over treating each occurrence separately -
many findings often have a single cause behind them.`;

export function generateRunPrompt(opts: {
  projectName: string;
  run?: Run | null;
  findings: Finding[];
  stage?: StageId;
  source?: FindingSource;
  webSummary?: ScanSummary | null;
}): string {
  const { projectName, run, stage, source, webSummary } = opts;

  let findings = opts.findings;
  if (stage) findings = findings.filter((f) => f.stage === stage);
  if (source) findings = findings.filter((f) => f.source === source);
  findings = [...findings].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9),
  );

  const gate = buildReleaseGate(findings);
  const correlations = correlate(findings);

  const lines: string[] = [];
  lines.push(`# Audit report - ${projectName}`);
  lines.push('');
  lines.push(
    [
      run ? `${run.label} run (${run.id})` : 'Audit',
      run ? run.startedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      `profile: ${run?.profileId ?? 'n/a'}`,
    ].join(' | '),
  );
  lines.push('');

  if (stage) {
    lines.push(`Scope: stage "${stageLabel(stage)}" only.`);
    lines.push('');
  } else if (source) {
    lines.push(`Scope: ${source} findings only.`);
    lines.push('');
  }

  lines.push('## Verdict');
  lines.push('');
  lines.push(`Production status: ${gate.status}`);
  lines.push('');
  lines.push(
    `Critical ${gate.severityCounts.critical} | High ${gate.severityCounts.high} | Medium ${gate.severityCounts.medium} | Low ${gate.severityCounts.low}`,
  );
  lines.push('');

  const failedDomains = gate.domains.filter((d) => d.verdict !== 'PASS');
  if (failedDomains.length > 0) {
    lines.push('| Domain | Verdict | Critical | High | Medium | Low |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const d of failedDomains) {
      lines.push(
        `| ${d.domain} | ${d.verdict} | ${d.critical} | ${d.high} | ${d.medium} | ${d.low} |`,
      );
    }
    lines.push('');
  }

  if (webSummary) {
    lines.push('## Web scan summary');
    lines.push('');
    lines.push(
      `${webSummary.pagesSucceeded} of ${webSummary.pagesScanned} pages scanned, ${webSummary.pagesFailed} failed.`,
    );
    lines.push('');
    lines.push('| Category | Median score |');
    lines.push('| --- | --- |');
    for (const [category, agg] of Object.entries(webSummary.scores)) {
      lines.push(`| ${category} | ${agg.median ?? agg.average ?? '-'} |`);
    }
    lines.push('');
    lines.push(
      `Core Web Vitals (median): LCP ${webSummary.metrics.lcpMedian ?? '-'}ms, CLS ${webSummary.metrics.clsMedian ?? '-'}, TBT ${webSummary.metrics.tbtMedian ?? '-'}ms`,
    );
    lines.push('');
  }

  lines.push('## Instructions');
  lines.push('');
  lines.push(RUN_INSTRUCTIONS);
  lines.push('');

  lines.push(`## Findings (${findings.length})`);
  lines.push('');
  if (findings.length === 0) {
    lines.push('No findings in scope.');
    lines.push('');
  } else {
    findings.forEach((finding, i) => {
      lines.push(findingBlock(finding, i + 1));
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  if (correlations.length > 0) {
    lines.push('## Correlated findings');
    lines.push('');
    lines.push(
      'These are cross-source links (a site symptom with a likely code cause). The',
      'proof level reflects how confident AceCheck is in the link.',
    );
    lines.push('');
    for (const c of correlations) {
      lines.push(
        `- ${c.key} (${c.proof}): ${c.webFindingIds.join(', ')} <-> ${c.codeFindingIds.join(', ')}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
