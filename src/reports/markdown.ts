import type {
  Category,
  Device,
  DeviceMode,
  Issue,
  PageSummary,
  ScanMetadata,
  ScanSummary,
  Severity,
} from '../types.js';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEVICE_LABELS,
  SEVERITY_LABELS,
} from '../types.js';
import { templateLabel } from '../analyser/templates.js';

export interface ReportInput {
  metadata: ScanMetadata;
  summary: ScanSummary;
  issues: Issue[];
  pages: PageSummary[];
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return '-';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatMs(ms: number | null): string {
  if (ms == null) return '-';
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDeviceMode(mode: DeviceMode): string {
  if (mode === 'both') return 'Mobile + Desktop';
  return DEVICE_LABELS[mode];
}

function sectionIssues(issues: Issue[], severity: Severity): Issue[] {
  return issues.filter((i) => i.severity === severity);
}

function issueBlock(issue: Issue, index: number): string {
  const lines: string[] = [];
  lines.push(`### ${index}. ${issue.title}`);
  lines.push('');
  lines.push(`- **Category:** ${CATEGORY_LABELS[issue.category]}`);
  lines.push(`- **Devices:** ${issue.devices.map((d) => DEVICE_LABELS[d]).join(' + ')}`);
  lines.push(`- **Affected pages:** ${issue.count} / ${issue.totalPages}`);
  if (issue.avgNumericValue != null) {
    const value =
      issue.category === 'performance'
        ? formatBytesOrMetric(issue)
        : String(Math.round(issue.avgNumericValue));
    lines.push(`- **Estimated average impact:** ${value}`);
  }
  if (issue.affectedTemplates.length > 0) {
    lines.push(
      `- **Likely affected templates:** ${issue.affectedTemplates
        .slice(0, 4)
        .map((t) => templateLabel(t.template))
        .join(', ')}`,
    );
  }
  if (issue.representativeUrls.length > 0) {
    lines.push(`- **Representative pages:**`);
    for (const url of issue.representativeUrls.slice(0, 3)) {
      lines.push(`  - ${url}`);
    }
  }
  lines.push('');
  if (issue.description) {
    lines.push(issue.description.trim());
    lines.push('');
  }
  lines.push(issue.likelyCommonCause);
  lines.push('');
  return lines.join('\n');
}

function formatBytesOrMetric(issue: Issue): string {
  if (
    issue.avgNumericValue != null &&
    issue.avgNumericValue > 1000 &&
    ['total-byte-weight', 'uses-optimized-images', 'uses-responsive-images', 'modern-image-formats'].includes(issue.id)
  ) {
    return formatBytes(issue.avgNumericValue);
  }
  if (issue.avgNumericValue == null) return '-';
  return issue.displayValue || String(Math.round(issue.avgNumericValue));
}

function scoreTable(summary: ScanSummary): string {
  const devices = summary.devices;
  const header = ['Category', ...devices.map((d) => DEVICE_LABELS[d])];
  const sep = header.map((_, i) => (i === 0 ? '---' : '---:'));
  const rows = CATEGORIES.map((cat) => {
    const cells = devices.map((d) => {
      const agg = summary.deviceScores[d]?.[cat];
      return agg ? String(agg.median ?? agg.average ?? '-') : '-';
    });
    return [CATEGORY_LABELS[cat], ...cells];
  });
  return [
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function categoryLine(summary: ScanSummary, category: Category): string {
  if (summary.devices.length === 1) {
    const device = summary.devices[0];
    const agg = summary.deviceScores[device]?.[category];
    return `${DEVICE_LABELS[device]}: ${agg?.median ?? agg?.average ?? '-'}`;
  }
  return summary.devices
    .map((d) => {
      const agg = summary.deviceScores[d]?.[category];
      return `${DEVICE_LABELS[d]}: ${agg?.median ?? agg?.average ?? '-'}`;
    })
    .join(' · ');
}

function performanceSection(summary: ScanSummary): string {
  const lines: string[] = [];
  for (const device of summary.devices) {
    const agg = summary.deviceScores[device]?.performance;
    const metrics = summary.deviceMetrics[device];
    lines.push(`### ${DEVICE_LABELS[device]}`);
    lines.push('');
    lines.push(
      `Median: ${agg?.median ?? '-'} · Worst: ${agg?.min ?? '-'} · Best: ${agg?.max ?? '-'}`,
    );
    lines.push('');
    lines.push(`- LCP (median): ${formatMs(metrics?.lcpMedian ?? null)}`);
    lines.push(`- CLS (median): ${metrics?.clsMedian ?? '-'}`);
    lines.push(`- TBT (median): ${formatMs(metrics?.tbtMedian ?? null)}`);
    lines.push(`- FCP (median): ${formatMs(metrics?.fcpMedian ?? null)}`);
    lines.push(`- Speed Index (median): ${formatMs(metrics?.speedIndexMedian ?? null)}`);
    lines.push(`- Total page weight (median): ${formatBytes(metrics?.totalByteWeightMedian ?? null)}`);
    lines.push(`- Request count (median): ${metrics?.requestCountMedian ?? '-'}`);
    lines.push('');
  }
  return lines.join('\n');
}

function executiveSummary(summary: ScanSummary, issues: Issue[]): string {
  const lines: string[] = [];
  const deviceNote =
    summary.devices.length > 1
      ? ` (${summary.devices.map((d) => DEVICE_LABELS[d]).join(' + ')})`
      : '';

  lines.push(
    `This audit scanned ${summary.pagesSucceeded} of ${summary.pagesDiscovered} pages${deviceNote}.`,
  );

  for (const device of summary.devices) {
    const perf =
      summary.deviceScores[device]?.performance.median ??
      summary.deviceScores[device]?.performance.average;
    if (perf == null) continue;
    const tone =
      perf >= 90
        ? 'strong'
        : perf >= 70
          ? 'acceptable but improvable'
          : 'needs attention';
    lines.push(
      `${DEVICE_LABELS[device]} performance is ${tone} (median ${perf}).`,
    );
  }

  const critical = issues.filter((i) => i.severity === 'critical');
  const high = issues.filter((i) => i.severity === 'high');

  if (critical.length > 0 || high.length > 0) {
    const top = [...critical, ...high]
      .slice(0, 3)
      .map((i) => `"${i.title}" (${i.count} pages)`)
      .join(', ');
    lines.push(`The most significant findings are: ${top}.`);
  } else if (issues.length > 0) {
    lines.push(`No critical or high-priority issues were detected.`);
  } else {
    lines.push(`No significant issues were detected.`);
  }

  return lines.join('\n');
}

export function generateAiReport(input: ReportInput): string {
  const { metadata, summary, issues } = input;
  const lines: string[] = [];

  lines.push('# Website Technical Audit');
  lines.push('');
  lines.push('## Site');
  lines.push('');
  lines.push(metadata.url);
  lines.push('');
  lines.push('## Scan');
  lines.push('');
  lines.push(
    `${formatDate(metadata.timestamp)} · ${metadata.mode} mode · ${formatDeviceMode(metadata.device)}`,
  );
  lines.push('');
  lines.push('## Pages');
  lines.push('');
  lines.push(
    `${summary.pagesSucceeded} scanned · ${summary.pagesFailed} failed · ${summary.pagesDiscovered} discovered`,
  );
  if (summary.devices.length > 1) {
    lines.push(`Scanned on ${summary.devices.map((d) => DEVICE_LABELS[d]).join(' and ')}.`);
  }
  lines.push('');
  lines.push('## Scores');
  lines.push('');
  lines.push(scoreTable(summary));
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(executiveSummary(summary, issues));
  lines.push('');

  const critical = sectionIssues(issues, 'critical');
  const high = sectionIssues(issues, 'high');
  const medium = sectionIssues(issues, 'medium');

  if (critical.length > 0) {
    lines.push('## Critical Issues');
    lines.push('');
    critical.forEach((issue, i) => lines.push(issueBlock(issue, i + 1)));
  }

  if (high.length > 0) {
    lines.push('## High Priority Issues');
    lines.push('');
    high.forEach((issue, i) => lines.push(issueBlock(issue, i + 1)));
  }

  if (medium.length > 0) {
    lines.push('## Medium Priority Issues');
    lines.push('');
    medium.forEach((issue, i) => lines.push(issueBlock(issue, i + 1)));
  }

  lines.push('## Performance');
  lines.push('');
  lines.push(performanceSection(summary));

  lines.push('## Accessibility');
  lines.push('');
  lines.push(categoryLine(summary, 'accessibility'));
  lines.push('');

  lines.push('## Best Practices');
  lines.push('');
  lines.push(categoryLine(summary, 'best-practices'));
  lines.push('');

  lines.push('## SEO');
  lines.push('');
  lines.push(categoryLine(summary, 'seo'));
  lines.push('');

  if (critical.length > 0 || high.length > 0) {
    lines.push('## Recommended Action Plan');
    lines.push('');
    const top = [...critical, ...high].slice(0, 8);
    top.forEach((issue, i) => {
      lines.push(
        `${i + 1}. Investigate "${issue.title}" (${issue.count} pages affected).`,
      );
    });
    lines.push('');
  }

  lines.push('## AI Investigation Instructions');
  lines.push('');
  lines.push('Do not make changes immediately.');
  lines.push('');
  lines.push(
    'Review the findings above and determine whether the recommendations are appropriate for the application. Identify likely source files/components before proposing implementation changes.',
  );

  return lines.join('\n');
}

export function generateIssueInvestigationReport(
  input: ReportInput,
  issue: Issue,
): string {
  const lines: string[] = [];
  lines.push(`# Issue Investigation: ${issue.title}`);
  lines.push('');
  lines.push(`- **Site:** ${input.metadata.url}`);
  lines.push(`- **Severity:** ${SEVERITY_LABELS[issue.severity]}`);
  lines.push(`- **Category:** ${CATEGORY_LABELS[issue.category]}`);
  lines.push(`- **Devices:** ${issue.devices.map((d) => DEVICE_LABELS[d]).join(' + ')}`);
  lines.push(`- **Affected pages:** ${issue.count} / ${issue.totalPages}`);
  lines.push('');
  if (issue.affectedTemplates.length > 0) {
    lines.push('## Likely affected templates');
    lines.push('');
    for (const t of issue.affectedTemplates) {
      lines.push(`- ${templateLabel(t.template)} (${t.count})`);
    }
    lines.push('');
  }
  lines.push('## Representative pages');
  lines.push('');
  for (const url of issue.representativeUrls.slice(0, 10)) {
    lines.push(`- ${url}`);
  }
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push(issue.description.trim());
  lines.push('');
  lines.push('## Lighthouse evidence');
  lines.push('');
  if (issue.examples.length > 0) {
    lines.push('```json');
    lines.push(JSON.stringify(issue.examples.slice(0, 5), null, 2));
    lines.push('```');
  } else {
    lines.push('No detailed evidence captured.');
  }
  lines.push('');
  lines.push(issue.likelyCommonCause);
  lines.push('');
  lines.push('## Determine');
  lines.push('');
  lines.push('1. Whether this is a genuine issue.');
  lines.push('2. The likely root cause.');
  lines.push('3. Where in the application it is likely implemented.');
  lines.push('4. How it should be fixed.');
  lines.push('5. Any trade-offs.');
  lines.push('6. How to verify the fix.');
  return lines.join('\n');
}
