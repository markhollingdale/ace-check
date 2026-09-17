import type { Issue, PageSummary } from '../types.js';
import { buildIssue, groupIssuesByAudit } from './issues.js';
import { compareSeverity } from './priorities.js';

export function aggregateIssues(pages: PageSummary[]): Issue[] {
  const successful = pages.filter((p) => p.status === 'ok');
  const groups = groupIssuesByAudit(successful);
  const totalPages = successful.length;

  const issues = groups.map((group) => buildIssue(group, totalPages));

  issues.sort((a, b) => {
    const bySeverity = compareSeverity(a.severity, b.severity);
    if (bySeverity !== 0) return bySeverity;
    return b.count - a.count;
  });

  return issues;
}
