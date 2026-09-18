import type { Finding, NextAction } from '../types.js';
import { isResolved } from './lifecycle.js';
import { effectiveSeverity } from './gate.js';
import { groupFindings } from './groups.js';

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const CONFIDENCE_RANK: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

/** Rough effort ordering so cheap wins surface first within a severity band. */
function effortRank(effort: string | undefined): number {
  if (!effort) return 2;
  const match = effort.match(/(\d+(\.\d+)?)\s*(m|h|d)/i);
  if (!match) return 2;
  const value = Number(match[1]);
  const unit = match[3].toLowerCase();
  const minutes = unit === 'm' ? value : unit === 'h' ? value * 60 : value * 1440;
  if (minutes <= 30) return 0;
  if (minutes <= 120) return 1;
  if (minutes <= 480) return 2;
  return 3;
}

/**
 * A deterministic, explainable "do these next" ranking. No AI, no magic:
 * unresolved findings first, then by effective severity, then by confidence,
 * then by blast radius (how many files/pages are affected), then by effort.
 */
export function buildNextActions(findings: Finding[], limit = 5): NextAction[] {
  // Persisted findings are not group-tagged, so derive the role here.
  const { findings: grouped } = groupFindings(findings);
  const ranked = grouped
    .filter((f) => !isResolved(f.status))
    .filter((f) => f.severity !== 'info')
    // Derived symptoms and intentional/third-party findings are not next actions.
    .filter((f) => f.groupRole !== 'derived')
    .filter(
      (f) =>
        f.disposition === undefined ||
        f.disposition === 'genuine' ||
        f.disposition === 'needs-investigation',
    )
    .map((f) => {
      const blast = (f.affectedFiles?.length ?? 0) + (f.affectedPages?.length ?? 0);
      return { finding: f, blast };
    })
    .sort((a, b) => {
      const sev =
        SEVERITY_RANK[effectiveSeverity(a.finding)] -
        SEVERITY_RANK[effectiveSeverity(b.finding)];
      if (sev !== 0) return sev;
      const conf =
        CONFIDENCE_RANK[a.finding.confidence] - CONFIDENCE_RANK[b.finding.confidence];
      if (conf !== 0) return conf;
      if (b.blast !== a.blast) return b.blast - a.blast;
      return effortRank(a.finding.effort) - effortRank(b.finding.effort);
    });

  return ranked.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    findingId: entry.finding.id,
    title: entry.finding.title,
    severity: entry.finding.severity,
    confidence: entry.finding.confidence,
    domain: entry.finding.domain,
    source: entry.finding.source,
    effort: entry.finding.effort,
    recommendation:
      entry.finding.recommendation ??
      'Investigate the evidence and remediate the underlying cause.',
    blastRadius: entry.blast,
  }));
}
