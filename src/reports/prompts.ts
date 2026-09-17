import type { Category, Issue, PageSummary, ScanMetadata, ScanSummary } from '../types.js';
import { CATEGORY_LABELS, DEVICE_LABELS } from '../types.js';
import {
  generateAiReport,
  generateIssueInvestigationReport,
  type ReportInput,
} from './markdown.js';

export type PromptMode =
  | 'full'
  | 'performance'
  | 'accessibility'
  | 'best-practices'
  | 'seo';

export type PromptFormat = 'markdown' | 'text' | 'json';

const PREAMBLE = `You are reviewing an existing web application.

Do not make changes yet.

Analyse the attached website audit and determine:

1. Which issues are genuine problems.
2. Which issues are likely duplicates of the same underlying problem.
3. The likely root cause of each significant issue.
4. Which files/components are likely involved.
5. The recommended implementation.
6. Potential risks or regressions.
7. A prioritised implementation plan.

Do not blindly accept automated audit recommendations.
Use the Lighthouse evidence provided below.`;

function filterByCategory(
  input: ReportInput,
  category: Category,
): ReportInput {
  return {
    ...input,
    issues: input.issues.filter((i) => i.category === category),
  };
}

function preambleForMode(mode: PromptMode, categoryLabel: string): string {
  if (mode === 'full') return PREAMBLE;
  return `You are reviewing an existing web application.

Focus only on ${categoryLabel} issues.

Do not make changes yet.

Analyse the attached ${categoryLabel.toLowerCase()} audit and determine the same points as a full audit: genuine problems, duplicates, root causes, involved files, recommended implementation, risks, and a prioritised plan.

Do not blindly accept automated audit recommendations.
Use the Lighthouse evidence provided below.`;
}

function reportForMode(input: ReportInput, mode: PromptMode): string {
  if (mode === 'full') return generateAiReport(input);
  if (mode === 'performance') return generateAiReport(filterByCategory(input, 'performance'));
  if (mode === 'accessibility') return generateAiReport(filterByCategory(input, 'accessibility'));
  if (mode === 'best-practices') return generateAiReport(filterByCategory(input, 'best-practices'));
  if (mode === 'seo') return generateAiReport(filterByCategory(input, 'seo'));
  return generateAiReport(input);
}

export function generatePrompt(
  input: ReportInput,
  options: { mode?: PromptMode; format?: PromptFormat } = {},
): string {
  const mode = options.mode || 'full';
  const format = options.format || 'markdown';
  const categoryLabel = CATEGORY_LABELS[mode as Category] || 'site';

  const preamble = preambleForMode(mode, categoryLabel);
  const report = reportForMode(input, mode);

  if (format === 'json') {
    const payload = {
      instructions: preamble,
      audit: report,
    };
    return JSON.stringify(payload, null, 2);
  }

  return `${preamble}\n\n[REPORT]\n\n${report}`;
}

export function generateIssuePrompt(
  input: ReportInput,
  issue: Issue,
): string {
  const report = generateIssueInvestigationReport(input, issue);
  return `Investigate the following website issue.

${report}`;
}

export function generateAllIssuesPrompt(input: ReportInput): string {
  const lines: string[] = [];
  lines.push(`Investigate the following website issues for ${input.metadata.url}.`);
  lines.push('');
  lines.push(`Total issues: ${input.issues.length}`);
  lines.push('');
  input.issues.forEach((issue, i) => {
    lines.push(`## Issue ${i + 1} of ${input.issues.length}`);
    lines.push('');
    lines.push(generateIssueInvestigationReport(input, issue));
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  return lines.join('\n');
}

export function generatePagePrompt(
  input: ReportInput,
  page: PageSummary,
): string {
  const lines: string[] = [];
  lines.push('Investigate the following website page.');
  lines.push('');
  lines.push(`# Page: ${page.url}`);
  lines.push('');
  lines.push(`- **Device:** ${DEVICE_LABELS[page.device]}`);
  lines.push(`- **Template:** ${page.template}`);
  lines.push(`- **Performance:** ${page.scores.performance ?? '—'}`);
  lines.push(`- **Accessibility:** ${page.scores.accessibility ?? '—'}`);
  lines.push(`- **Best Practices:** ${page.scores['best-practices'] ?? '—'}`);
  lines.push(`- **SEO:** ${page.scores.seo ?? '—'}`);
  lines.push('');
  lines.push('## Issues detected on this page');
  lines.push('');
  if (page.issues.length === 0) {
    lines.push('No automated issues were detected on this page.');
  }
  for (const issue of page.issues) {
    lines.push(`### ${issue.title}`);
    lines.push('');
    lines.push(`- Category: ${CATEGORY_LABELS[issue.category]}`);
    lines.push(`- Severity: ${issue.baseSeverity}`);
    if (issue.displayValue) lines.push(`- Impact: ${issue.displayValue}`);
    if (issue.description) lines.push(`- ${issue.description.trim()}`);
    lines.push('');
  }
  lines.push('## Determine');
  lines.push('');
  lines.push('1. Whether each issue is genuine.');
  lines.push('2. The likely root cause.');
  lines.push('3. Where it is implemented in the application.');
  lines.push('4. How it should be fixed.');
  lines.push('5. Any trade-offs.');
  lines.push('6. How to verify the fix.');
  return lines.join('\n');
}
