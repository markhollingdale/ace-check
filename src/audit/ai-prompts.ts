import type {
  Finding,
  FindingSource,
  Run,
  RunEnvironment,
  ScanSummary,
  StageId,
} from '../types.js';
import { SEVERITY_LABELS } from '../types.js';
import { buildReleaseGate } from './gate.js';
import { correlate } from './correlate.js';
import { groupFindings } from './groups.js';
import { STAGE_CATALOG, runProfileById } from './stages/catalog.js';

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const MAX_PAGES_LISTED = 40;
/**
 * Evidence caps are generous on purpose: the previous 6x160-char limit hid the
 * actual CSP directive and network-tree URLs, which made findings unfixable.
 * Only genuinely huge blobs are clipped.
 */
const MAX_DETAIL_ITEMS = 40;
const VALUE_CAP = 2000;
const NESTED_VALUE_CAP = 800;
const NESTED_KEY_LIMIT = 10;

function stageLabel(id: StageId | undefined): string {
  if (!id) return 'unknown stage';
  const def = STAGE_CATALOG.find((s) => s.id === id);
  return def ? `${def.label} (${def.tools.join(', ')})` : id;
}

function truncateValue(value: unknown, max = VALUE_CAP): string {
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
          .slice(0, NESTED_KEY_LIMIT)
          .map(([k, v]) => `${k}=${truncateValue(v, NESTED_VALUE_CAP)}`);
        if (nested.length > 0) parts.push(`${key}{${nested.join(', ')}}`);
        continue;
      }
      parts.push(`${key}=${truncateValue(value)}`);
    }
    if (parts.length > 0) lines.push(`- ${parts.join(' | ')}`);
  }
  if (details.length > MAX_DETAIL_ITEMS) {
    lines.push(
      `- ...and ${details.length - MAX_DETAIL_ITEMS} more item(s) omitted`,
    );
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
  if (finding.disposition) {
    lines.push(
      `- Disposition: ${finding.disposition}${
        finding.dispositionReason ? ` - ${finding.dispositionReason}` : ''
      }`,
    );
  }
  if (finding.groupId) {
    lines.push(
      `- Root-cause group: ${finding.groupLabel ?? finding.groupId} (${finding.groupRole ?? 'primary'})`,
    );
  }

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

  if (finding.detailsSummary && finding.detailsSummary.length > 0) {
    lines.push('');
    lines.push(
      'Evidence (the specific elements, resources or tasks the tool flagged):',
    );
    lines.push('');
    for (const line of finding.detailsSummary) lines.push(`- ${line}`);
  } else if (finding.details && finding.details.length > 0) {
    lines.push('');
    lines.push('Raw tool evidence:');
    lines.push('');
    lines.push(...detailLines(finding.details));
  }

  const pageRefs =
    finding.affectedPageRefs && finding.affectedPageRefs.length > 0
      ? finding.affectedPageRefs.map((p) => `${p.url} (${p.device})`)
      : finding.affectedPages;

  if (pageRefs && pageRefs.length > 0) {
    lines.push('');
    lines.push(
      `Affected pages (${pageRefs.length} rows, showing up to ${MAX_PAGES_LISTED}):`,
    );
    for (const page of pageRefs.slice(0, MAX_PAGES_LISTED)) {
      lines.push(`- ${page}`);
    }
    if (pageRefs.length > MAX_PAGES_LISTED) {
      lines.push(`- ...and ${pageRefs.length - MAX_PAGES_LISTED} more`);
    }
  }

  if (finding.affectedFiles && finding.affectedFiles.length > 0) {
    lines.push('');
    lines.push('Affected files:');
    for (const file of finding.affectedFiles.slice(0, 20)) {
      lines.push(`- ${file}`);
    }
  }

  if (finding.links && finding.links.length > 0) {
    lines.push('');
    lines.push('Evidence links:');
    for (const link of finding.links) {
      lines.push(`- ${link.label}: ${link.href}`);
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

const CODE_STAGES: StageId[] = [
  'sast',
  'secrets',
  'dependencies',
  'abuse',
  'review',
];

function profileHasCodeStage(run?: Run | null): boolean {
  if (!run) return false;
  const profile = runProfileById(run.profileId);
  const stages = profile?.stages ?? run.stages.map((s) => s.id);
  return stages.some((s) => CODE_STAGES.includes(s));
}

function renderEnvironment(env: RunEnvironment): string[] {
  const lines: string[] = ['## Environment', ''];
  if (env.targetUrl) lines.push(`- Target: ${env.targetUrl}`);
  if (env.scannedAt) lines.push(`- Scanned at: ${env.scannedAt}`);
  lines.push(
    `- Authenticated: ${env.authenticated ? 'yes' : 'no (anonymous crawl)'}`,
  );
  if (env.profileId) lines.push(`- Profile: ${env.profileId}`);
  if (env.stages.length > 0) lines.push(`- Stages: ${env.stages.join(', ')}`);
  if (env.codebasePath) lines.push(`- Codebase: ${env.codebasePath}`);
  if (env.manifest?.name) {
    lines.push(
      `- Project manifest: ${env.manifest.name}${
        env.manifest.version ? `@${env.manifest.version}` : ''
      }`,
    );
  }
  if (env.git?.commit) {
    lines.push(
      `- Commit: ${env.git.commit}${env.git.branch ? ` (${env.git.branch})` : ''}${
        env.git.dirty ? ' [dirty working tree]' : ''
      }`,
    );
  }
  if (env.codebaseMatch) lines.push(`- Codebase match: ${env.codebaseMatch}`);
  if (env.userAgent) lines.push(`- User agent: ${env.userAgent}`);
  lines.push('');
  return lines;
}

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

  const { findings: tagged } = groupFindings(findings);
  tagged.sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      (a.groupRole === 'derived' ? 1 : 0) - (b.groupRole === 'derived' ? 1 : 0),
  );

  const gate = buildReleaseGate(tagged);
  const correlations = correlate(tagged);

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

  if (run?.environment) {
    lines.push(...renderEnvironment(run.environment));
  }

  lines.push('## Verdict');
  lines.push('');
  lines.push(`Production status: ${gate.status}`);
  lines.push('');
  lines.push(
    `Critical ${gate.severityCounts.critical} | High ${gate.severityCounts.high} | Medium ${gate.severityCounts.medium} | Low ${gate.severityCounts.low}`,
  );
  lines.push('');
  const d = gate.dispositions;
  lines.push(
    `Dispositions: genuine ${d.genuine} | expected ${d.expected} | third-party ${d['third-party']} | not-actionable ${d['not-actionable']} | needs-investigation ${d['needs-investigation']}`,
  );
  lines.push('');
  lines.push(
    'Counts include only primary, genuine findings; derived symptoms and intentional/third-party findings are listed but not gated.',
  );
  lines.push('');

  const failedDomains = gate.domains.filter((d) => d.verdict !== 'PASS');
  if (failedDomains.length > 0) {
    lines.push('| Domain | Verdict | Critical | High | Medium | Low |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const domain of failedDomains) {
      lines.push(
        `| ${domain.domain} | ${domain.verdict} | ${domain.critical} | ${domain.high} | ${domain.medium} | ${domain.low} |`,
      );
    }
    lines.push('');
  }

  if (gate.groups.length > 0) {
    lines.push(`## Root-cause groups (${gate.groups.length})`);
    lines.push('');
    for (const group of gate.groups) {
      lines.push(
        `- ${group.label} (primary ${group.primary}): ${group.members.join(', ')}`,
      );
      lines.push(`  ${group.summary}`);
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
  if (!profileHasCodeStage(run)) {
    lines.push(
      'Profile limitation: this run executed no code stage, so no finding is mapped to source files and cross-source correlations are empty. Run the standard or full profile (with a codebase path) for file-level mapping.',
    );
    lines.push('');
  }

  lines.push(`## Findings (${tagged.length})`);
  lines.push('');
  if (tagged.length === 0) {
    lines.push('No findings in scope.');
    lines.push('');
  } else {
    tagged.forEach((finding, i) => {
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
