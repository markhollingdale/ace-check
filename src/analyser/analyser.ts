import type {
  DeviceMode,
  Issue,
  PageSummary,
  ScanMode,
  ScanSummary,
} from '../types.js';
import { aggregateIssues } from './aggregation.js';
import { computeSummary } from './scoring.js';

export interface AnalyseInput {
  scanId: string;
  url: string;
  timestamp: string;
  mode: ScanMode;
  device: DeviceMode;
  pagesDiscovered: number;
  pages: PageSummary[];
}

export interface AnalyseOutput {
  summary: ScanSummary;
  issues: Issue[];
}

export function analyse(input: AnalyseInput): AnalyseOutput {
  const issues = aggregateIssues(input.pages);
  const summary = computeSummary({
    scanId: input.scanId,
    url: input.url,
    timestamp: input.timestamp,
    mode: input.mode,
    device: input.device,
    pagesDiscovered: input.pagesDiscovered,
    pages: input.pages,
    issues,
  });
  return { summary, issues };
}
