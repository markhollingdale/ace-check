import type { Device, Issue, PageIssue, PageSummary, Severity } from '../types.js';
import { DEVICES } from '../types.js';
import {
  assignSeverity,
  compareSeverity,
  unitHintForAudit,
} from './priorities.js';
import { templateLabel } from './templates.js';

export interface GroupedIssue {
  auditId: string;
  category: PageIssue['category'];
  entries: { page: PageSummary; issue: PageIssue }[];
}

export function groupIssuesByAudit(pages: PageSummary[]): GroupedIssue[] {
  const map = new Map<string, GroupedIssue>();

  for (const page of pages) {
    if (page.status !== 'ok') continue;
    for (const issue of page.issues) {
      let group = map.get(issue.auditId);
      if (!group) {
        group = {
          auditId: issue.auditId,
          category: issue.category,
          entries: [],
        };
        map.set(issue.auditId, group);
      }
      group.entries.push({ page, issue });
    }
  }

  return [...map.values()];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function buildIssue(group: GroupedIssue, totalPages: number): Issue {
  const entries = group.entries;
  const first = entries[0].issue;

  const numericValues = entries
    .map((e) => e.issue.numericValue)
    .filter((v): v is number => v != null);

  const avgNumericValue = average(numericValues);
  const maxNumericValue =
    numericValues.length > 0 ? Math.max(...numericValues) : null;
  const sumNumericValue =
    numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0)
      : null;

  const affectedPages = entries.map((e) => e.page.slug);
  const affectedUrls = entries.map((e) => e.page.url);

  const deviceCounts = {} as Record<Device, number>;
  for (const device of DEVICES) deviceCounts[device] = 0;
  for (const e of entries) deviceCounts[e.page.device]++;
  const devices = DEVICES.filter((d) => deviceCounts[d] > 0);

  const templateCounts = new Map<string, number>();
  for (const e of entries) {
    const t = e.page.template;
    templateCounts.set(t, (templateCounts.get(t) || 0) + 1);
  }
  const affectedTemplates = [...templateCounts.entries()]
    .map(([template, count]) => ({ template, count }))
    .sort((a, b) => b.count - a.count);

  const representativeUrls = affectedUrls.slice(0, 5);

  const severity = assignSeverity({
    auditId: first.auditId,
    category: first.category,
    baseSeverity: first.baseSeverity,
    score: first.score,
    affectedCount: entries.length,
    totalPages,
    avgNumericValue,
    unitHint: unitHintForAudit(first.auditId),
  });

  // Attach the source page to every evidence item so the evidence can be tied
  // back to the pages in the blast radius, rather than being an anonymous dump.
  const examples = entries.slice(0, 5).flatMap((e) =>
    e.issue.items.slice(0, 4).map((item) => ({
      page: e.page.url,
      device: e.page.device,
      ...item,
    })),
  );

  const templateNames = affectedTemplates
    .slice(0, 3)
    .map((t) => templateLabel(t.template));
  const likelyCommonCause =
    templateNames.length > 1
      ? `This issue appears across ${templateNames.join(
          ', ',
        )} pages, which may indicate a shared implementation path. Confirm the likely source component/template against the application code before making changes.`
      : 'This issue may have a single root cause. Confirm the likely source component/template against the application code before making changes.';

  return {
    id: first.auditId,
    category: first.category,
    title: first.title,
    description: first.description,
    severity,
    devices,
    deviceCounts,
    affectedPages,
    affectedUrls,
    count: entries.length,
    totalPages,
    avgNumericValue,
    maxNumericValue,
    sumNumericValue,
    displayValue: first.displayValue,
    affectedTemplates,
    representativeUrls,
    examples,
    likelyCommonCause,
  };
}
