import type {
  Finding,
  FindingSource,
  Severity,
} from '../../types.js';

let counter = 0;

export interface ScannerFindingInput {
  prefix: string;
  source: FindingSource;
  category: string;
  domain: string;
  severity: Severity;
  confidence?: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  evidence: {
    file?: string;
    line?: number;
    url?: string;
    proof?: 'confirmed' | 'likely' | 'possible';
  };
  recommendation?: string;
  effort?: string;
  correlationKeys?: string[];
  affectedFiles?: string[];
  affectedPages?: string[];
}

export function scannerFinding(input: ScannerFindingInput): Finding {
  counter += 1;
  return {
    id: `${input.prefix}-${String(counter).padStart(4, '0')}`,
    source: input.source,
    prefix: input.prefix,
    category: input.category,
    domain: input.domain,
    severity: input.severity,
    confidence: input.confidence ?? 'High',
    title: input.title,
    description: input.description,
    evidence: {
      file: input.evidence.file,
      line: input.evidence.line,
      url: input.evidence.url,
      proof: input.evidence.proof ?? 'confirmed',
    },
    recommendation: input.recommendation,
    effort: input.effort,
    correlationKeys: input.correlationKeys ?? [],
    affectedFiles: input.affectedFiles,
    affectedPages: input.affectedPages,
    status: 'detected',
  };
}

const SEVERITY_MAP: Record<string, Severity> = {
  critical: 'critical',
  high: 'high',
  error: 'high',
  medium: 'medium',
  warning: 'medium',
  warn: 'medium',
  low: 'low',
  note: 'low',
  info: 'info',
  informational: 'info',
};

export function normaliseSeverity(value: string | undefined): Severity {
  if (!value) return 'medium';
  return SEVERITY_MAP[value.toLowerCase()] ?? 'medium';
}

export function capFirst(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
