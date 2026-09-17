import type { ReportInput } from './markdown.js';

export function buildReportObject(input: ReportInput) {
  return {
    metadata: input.metadata,
    summary: input.summary,
    issues: input.issues,
    pages: input.pages,
  };
}

export function generateJsonReport(input: ReportInput): string {
  return JSON.stringify(buildReportObject(input), null, 2);
}
