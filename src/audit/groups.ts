import type { Finding, FindingGroup, Severity } from '../types.js';

const RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

interface Family {
  id: string;
  label: string;
  summary: string;
  members: Set<string>;
  /** Preferred primary, most actionable first. */
  primaryCandidates: string[];
}

/**
 * Audit families that are symptoms of one root cause. Counting every member as
 * an independent defect inflated the critical count: the LCP family alone was
 * five findings, the bundle family eight.
 */
const FAMILIES: Family[] = [
  {
    id: 'lcp',
    label: 'LCP / critical image load path',
    summary:
      'A single late-discovered LCP image produces the LCP, discovery, breakdown and image-delivery findings.',
    members: new Set([
      'largest-contentful-paint',
      'lcp-discovery-insight',
      'lcp-breakdown-insight',
      'largest-contentful-paint-element',
      'image-delivery-insight',
    ]),
    primaryCandidates: [
      'largest-contentful-paint',
      'lcp-discovery-insight',
      'image-delivery-insight',
      'lcp-breakdown-insight',
    ],
  },
  {
    id: 'js-bundle',
    label: 'Shared client bundle & main-thread work',
    summary:
      'One oversized shared client bundle drives the blocking-time, unused-JS and bootup findings.',
    members: new Set([
      'total-blocking-time',
      'max-potential-fid',
      'interactive',
      'unused-javascript',
      'mainthread-work-breakdown',
      'bootup-time',
      'legacy-javascript',
      'legacy-javascript-insight',
      'network-dependency-tree-insight',
    ]),
    primaryCandidates: [
      'unused-javascript',
      'total-blocking-time',
      'mainthread-work-breakdown',
      'bootup-time',
    ],
  },
  {
    id: 'css-blocking',
    label: 'Render-blocking CSS & first paint',
    summary:
      'Render-blocking stylesheets delay first paint and the metrics derived from it.',
    members: new Set([
      'render-blocking-insight',
      'render-blocking-resources',
      'first-contentful-paint',
      'speed-index',
      'unused-css-rules',
    ]),
    primaryCandidates: [
      'render-blocking-insight',
      'render-blocking-resources',
      'first-contentful-paint',
    ],
  },
  {
    id: 'cls',
    label: 'Layout stability (CLS)',
    summary:
      'A small number of elements cause the layout-shift and CLS-culprit findings.',
    members: new Set([
      'cumulative-layout-shift',
      'cls-culprits-insight',
      'layout-shifts',
    ]),
    primaryCandidates: ['cumulative-layout-shift', 'layout-shifts'],
  },
];

function auditIdOf(finding: Finding): string {
  return (finding.evidence.auditId ?? finding.id).toLowerCase();
}

function severityRank(finding: Finding): number {
  return RANK[finding.severity] ?? 0;
}

function choosePrimary(members: Finding[], candidates: string[]): Finding {
  for (const candidate of candidates) {
    const match = members.find((m) => auditIdOf(m) === candidate);
    if (match) return match;
  }
  return [...members].sort((a, b) => severityRank(b) - severityRank(a))[0];
}

/**
 * Tag findings with their root-cause group and return the group index. Grouping
 * only happens when a family has two or more members; standalone findings are
 * left untouched (and count as primary).
 */
export function groupFindings(findings: Finding[]): {
  findings: Finding[];
  groups: FindingGroup[];
} {
  const tagged = findings.map((f) => ({ ...f }));
  const byId = new Map(tagged.map((f) => [auditIdOf(f), f]));
  const groups: FindingGroup[] = [];

  for (const family of FAMILIES) {
    const members = [...family.members]
      .map((id) => byId.get(id))
      .filter((f): f is Finding => Boolean(f));
    if (members.length < 2) continue;

    const primary = choosePrimary(members, family.primaryCandidates);
    const ordered = [primary, ...members.filter((m) => m !== primary)];

    for (const member of ordered) {
      member.groupId = family.id;
      member.groupLabel = family.label;
      member.groupRole = member === primary ? 'primary' : 'derived';
    }

    groups.push({
      id: family.id,
      label: family.label,
      summary: family.summary,
      primary: primary.id,
      members: ordered.map((m) => m.id),
    });
  }

  return { findings: tagged, groups };
}
