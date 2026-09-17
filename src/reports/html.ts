import type { Category, Issue, PageSummary, Severity } from '../types.js';
import { CATEGORIES, CATEGORY_LABELS, DEVICE_LABELS, SEVERITIES, SEVERITY_LABELS } from '../types.js';
import type { ReportInput } from './markdown.js';
import { formatBytes, formatDate, formatDeviceMode, formatMs } from './markdown.js';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
  info: '#6b7280',
};

function scoreColor(score: number | null): string {
  if (score == null) return '#6b7280';
  if (score >= 90) return '#16a34a';
  if (score >= 50) return '#ca8a04';
  return '#dc2626';
}

function scoreCards(input: ReportInput): string {
  const devices = input.summary.devices;
  const multi = devices.length > 1;
  return devices
    .flatMap((device) =>
      CATEGORIES.map((cat: Category) => {
        const agg = input.summary.deviceScores[device]?.[cat];
        const value = agg?.median ?? agg?.average ?? null;
        const label = multi
          ? `${DEVICE_LABELS[device]} · ${CATEGORY_LABELS[cat]}`
          : CATEGORY_LABELS[cat];
        return `
      <div class="card">
        <div class="card-label">${label}</div>
        <div class="score" style="color:${scoreColor(value)}">${value ?? '-'}</div>
        <div class="sub">median ${agg?.min ?? '-'}-${agg?.max ?? '-'}</div>
      </div>`;
      }),
    )
    .join('');
}

function severityStrip(input: ReportInput): string {
  return SEVERITIES.map((s: Severity) => {
    const count = input.summary.issueCounts[s];
    if (count === 0) return '';
    return `<span class="sev" style="background:${SEVERITY_COLORS[s]}">${SEVERITY_LABELS[s]} ${count}</span>`;
  })
    .join('')
    .replace(/^\s*/, '');
}

function scoreBars(input: ReportInput): string {
  const bars = input.pages
    .filter((p) => p.status === 'ok' && p.scores.performance != null)
    .map((p) => {
      const v = p.scores.performance!;
      const label =
        input.summary.devices.length > 1
          ? `${p.url} (${DEVICE_LABELS[p.device].toLowerCase()})`
          : p.url;
      return `<div class="bar-row"><span class="bar-url">${esc(label)}</span><div class="bar"><div class="bar-fill" style="width:${v}%;background:${scoreColor(v)}"></div></div><span class="bar-val">${v}</span></div>`;
    })
    .join('');
  if (!bars) return '<p>No performance data.</p>';
  return `<div class="bars">${bars}</div>`;
}

function issueSection(issues: Issue[], severity: Severity): string {
  if (issues.length === 0) return '';
  const blocks = issues
    .map((issue) => {
      const urls = issue.representativeUrls
        .slice(0, 8)
        .map((u) => `<li>${esc(u)}</li>`)
        .join('');
      const impact =
        issue.avgNumericValue != null
          ? `<div class="sub">Estimated impact: ${
              issue.category === 'performance'
                ? formatBytes(issue.avgNumericValue)
                : issue.displayValue || Math.round(issue.avgNumericValue)
            }</div>`
          : '';
      return `
      <div class="issue">
        <h3>${esc(issue.title)}</h3>
        <div class="sub">${esc(issue.id)} · ${CATEGORY_LABELS[issue.category]} · ${issue.count} / ${issue.totalPages} pages</div>
        ${impact}
        ${issue.description ? `<p>${esc(issue.description)}</p>` : ''}
        <p class="cause">${esc(issue.likelyCommonCause)}</p>
        <details><summary>Affected pages (${issue.count})</summary><ul>${urls}</ul></details>
      </div>`;
    })
    .join('');
  return `<section><h2>${SEVERITY_LABELS[severity]} Issues</h2>${blocks}</section>`;
}

function pageTable(input: ReportInput): string {
  const multi = input.summary.devices.length > 1;
  const rows = input.pages
    .map((p: PageSummary) => {
      const perf = p.scores.performance;
      const a11y = p.scores.accessibility;
      const bps = p.scores['best-practices'];
      const seo = p.scores.seo;
      const deviceCell = multi ? `<td>${DEVICE_LABELS[p.device]}</td>` : '';
      if (p.status === 'failed') {
        return `<tr><td>${esc(p.url)}</td>${deviceCell}<td colspan="5" class="failed">Failed${p.error ? `: ${esc(p.error)}` : ''}</td></tr>`;
      }
      return `<tr>
        <td>${esc(p.url)}</td>
        ${deviceCell}
        <td style="color:${scoreColor(perf)}">${perf ?? '-'}</td>
        <td style="color:${scoreColor(a11y)}">${a11y ?? '-'}</td>
        <td style="color:${scoreColor(bps)}">${bps ?? '-'}</td>
        <td style="color:${scoreColor(seo)}">${seo ?? '-'}</td>
        <td>${esc(p.template)}</td>
      </tr>`;
    })
    .join('');
  const deviceHeader = multi ? '<th>Device</th>' : '';
  return `<table><thead><tr><th>URL</th>${deviceHeader}<th>Perf</th><th>A11y</th><th>BP</th><th>SEO</th><th>Template</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function generateHtmlReport(input: ReportInput): string {
  const { metadata, summary, issues } = input;

  const perfSection = summary.devices
    .map((device) => {
      const metrics = summary.deviceMetrics[device];
      const agg = summary.deviceScores[device]?.performance;
      return `
    <section><h2>${DEVICE_LABELS[device]} Performance</h2>
    <p class="sub">Median ${agg?.median ?? '-'} · Worst ${agg?.min ?? '-'} · Best ${agg?.max ?? '-'}</p>
    <ul class="metrics">
      <li>LCP (median): ${formatMs(metrics?.lcpMedian ?? null)}</li>
      <li>CLS (median): ${metrics?.clsMedian ?? '-'}</li>
      <li>TBT (median): ${formatMs(metrics?.tbtMedian ?? null)}</li>
      <li>FCP (median): ${formatMs(metrics?.fcpMedian ?? null)}</li>
      <li>Speed Index (median): ${formatMs(metrics?.speedIndexMedian ?? null)}</li>
      <li>Page weight (median): ${formatBytes(metrics?.totalByteWeightMedian ?? null)}</li>
      <li>Requests (median): ${metrics?.requestCountMedian ?? '-'}</li>
    </ul></section>`;
    })
    .join('');

  const severitySections = SEVERITIES.map((s: Severity) =>
    issueSection(issues.filter((i) => i.severity === s), s),
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Site Audit - ${esc(metadata.url)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; color: #111827; background: #f9fafb; line-height: 1.5; }
  header { background: #111827; color: #fff; padding: 24px 32px; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header .url { color: #9ca3af; font-size: 14px; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 32px 64px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
  .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .score { font-size: 32px; font-weight: 700; }
  .sub { font-size: 12px; color: #6b7280; }
  .sevs { margin: 0 0 24px; }
  .sev { display: inline-block; color: #fff; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 2px 10px; margin-right: 6px; }
  section { margin-bottom: 32px; }
  h2 { font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
  .issue { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
  .issue h3 { margin: 0 0 4px; font-size: 15px; }
  .issue p { margin: 8px 0 0; font-size: 14px; color: #374151; }
  .issue .cause { color: #6b7280; font-style: italic; }
  details { margin-top: 8px; }
  details ul { margin: 8px 0 0; padding-left: 20px; }
  details li { font-size: 12px; color: #4b5563; }
  .metrics { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
  .metrics li { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  td.failed { color: #dc2626; }
  .bars { margin-top: 8px; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .bar-url { width: 40%; font-size: 11px; color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { flex: 1; background: #f3f4f6; border-radius: 4px; height: 10px; }
  .bar-fill { height: 10px; border-radius: 4px; }
  .bar-val { width: 28px; font-size: 11px; text-align: right; color: #4b5563; }
</style>
</head>
<body>
<header>
  <h1>Website Technical Audit</h1>
  <div class="url">${esc(metadata.url)}</div>
  <div class="sub" style="color:#9ca3af">${formatDate(metadata.timestamp)} · ${esc(metadata.mode)} mode · ${esc(formatDeviceMode(metadata.device))} · ${summary.pagesSucceeded} pages scanned</div>
</header>
<main>
  <div class="cards">${scoreCards(input)}</div>
  <div class="sevs">${severityStrip(input)}</div>
  ${perfSection}
  ${severitySections}
  <section><h2>Performance by page</h2>${scoreBars(input)}</section>
  <section><h2>Pages</h2>${pageTable(input)}</section>
</main>
</body>
</html>`;
}
