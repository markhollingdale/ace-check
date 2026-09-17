import type {
  Category,
  Issue,
  ScanSummary,
} from '../types.js';
import { CATEGORIES, CATEGORY_LABELS } from '../types.js';

export interface ScoreComparison {
  category: Category;
  label: string;
  previous: number | null;
  current: number | null;
  change: number | null;
}

export interface IssueComparison {
  id: string;
  title: string;
  category: Category;
  previousCount: number;
  currentCount: number;
  previousSeverity: string;
  currentSeverity: string;
}

export interface ScanComparison {
  previousScanId: string;
  currentScanId: string;
  scores: ScoreComparison[];
  fixed: IssueComparison[];
  new: IssueComparison[];
  persisted: IssueComparison[];
  improved: IssueComparison[];
  worsened: IssueComparison[];
}

function scoreValue(summary: ScanSummary, category: Category): number | null {
  const agg = summary.scores[category];
  return agg.median ?? agg.average;
}

export function buildComparison(
  previousSummary: ScanSummary,
  currentSummary: ScanSummary,
  previousIssues: Issue[],
  currentIssues: Issue[],
): ScanComparison {
  const scores: ScoreComparison[] = CATEGORIES.map((category) => {
    const prev = scoreValue(previousSummary, category);
    const curr = scoreValue(currentSummary, category);
    const change = prev != null && curr != null ? curr - prev : null;
    return {
      category,
      label: CATEGORY_LABELS[category],
      previous: prev,
      current: curr,
      change,
    };
  });

  const prevMap = new Map(previousIssues.map((i) => [i.id, i]));
  const currMap = new Map(currentIssues.map((i) => [i.id, i]));

  const toComparison = (issue: Issue, prev?: Issue): IssueComparison => ({
    id: issue.id,
    title: issue.title,
    category: issue.category,
    previousCount: prev?.count ?? 0,
    currentCount: issue.count,
    previousSeverity: prev?.severity ?? 'none',
    currentSeverity: issue.severity,
  });

  const fixed: IssueComparison[] = [];
  const news: IssueComparison[] = [];
  const persisted: IssueComparison[] = [];
  const improved: IssueComparison[] = [];
  const worsened: IssueComparison[] = [];

  for (const [id, prev] of prevMap) {
    const curr = currMap.get(id);
    if (!curr) {
      fixed.push(toComparison(prev));
    } else {
      const c = toComparison(curr, prev);
      if (curr.count < prev.count) improved.push(c);
      else if (curr.count > prev.count) worsened.push(c);
      else persisted.push(c);
    }
  }

  for (const [id, curr] of currMap) {
    if (!prevMap.has(id)) news.push(toComparison(curr));
  }

  const sortByCount = (a: IssueComparison, b: IssueComparison) =>
    b.currentCount - a.currentCount;

  fixed.sort((a, b) => b.previousCount - a.previousCount);
  news.sort(sortByCount);
  improved.sort(sortByCount);
  worsened.sort(sortByCount);
  persisted.sort(sortByCount);

  return {
    previousScanId: previousSummary.scanId,
    currentScanId: currentSummary.scanId,
    scores,
    fixed,
    new: news,
    persisted,
    improved,
    worsened,
  };
}
