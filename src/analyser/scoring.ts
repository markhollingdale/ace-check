import type {
  Category,
  CategoryAggregate,
  Device,
  DeviceMode,
  Issue,
  PageSummary,
  ScanMetrics,
  ScanMode,
  ScanSummary,
  Severity,
} from '../types.js';
import { CATEGORIES, DEVICES, SEVERITIES } from '../types.js';

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(n: number | null, digits = 0): number | null {
  if (n == null) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

type MetricKey =
  | 'lcp'
  | 'cls'
  | 'tbt'
  | 'fcp'
  | 'speedIndex'
  | 'totalByteWeight'
  | 'requestCount';

const METRIC_KEYS: MetricKey[] = [
  'lcp',
  'cls',
  'tbt',
  'fcp',
  'speedIndex',
  'totalByteWeight',
  'requestCount',
];

function categoryAggregate(
  pages: PageSummary[],
  category: Category,
): CategoryAggregate {
  const values = pages
    .filter((p) => p.status === 'ok')
    .map((p) => p.scores[category])
    .filter((v): v is number => v != null);

  return {
    average: round(mean(values)),
    median: round(median(values)),
    min: values.length > 0 ? Math.min(...values) : null,
    max: values.length > 0 ? Math.max(...values) : null,
  };
}

function metricsFor(pages: PageSummary[]): ScanMetrics {
  const medianMetric = (key: MetricKey): number | null => {
    const values = pages
      .filter((p) => p.status === 'ok')
      .map((p) => p.metrics[key])
      .filter((v): v is number => v != null);
    return median(values);
  };

  return {
    lcpMedian: round(medianMetric('lcp')),
    clsMedian: round(medianMetric('cls'), 3),
    tbtMedian: round(medianMetric('tbt')),
    fcpMedian: round(medianMetric('fcp')),
    speedIndexMedian: round(medianMetric('speedIndex')),
    totalByteWeightMedian: round(medianMetric('totalByteWeight')),
    requestCountMedian: round(medianMetric('requestCount')),
  };
}

function uniqueUrls(pages: PageSummary[]): string[] {
  return [...new Set(pages.map((p) => p.url))];
}

export function computeSummary(input: {
  scanId: string;
  url: string;
  timestamp: string;
  mode: ScanMode;
  device: DeviceMode;
  pagesDiscovered: number;
  pages: PageSummary[];
  issues: Issue[];
}): ScanSummary {
  const { pages, issues } = input;

  const devices = DEVICES.filter((d) => pages.some((p) => p.device === d));

  const okUrls = new Set(
    pages.filter((p) => p.status === 'ok').map((p) => p.url),
  );
  const scannedUrls = uniqueUrls(pages);
  const succeeded = okUrls.size;
  const failed = scannedUrls.length - okUrls.size;

  const scores = {} as Record<Category, CategoryAggregate>;
  for (const category of CATEGORIES) {
    scores[category] = categoryAggregate(pages, category);
  }

  const deviceScores = {} as Record<
    Device,
    Record<Category, CategoryAggregate>
  >;
  const deviceMetrics = {} as Record<Device, ScanMetrics>;
  for (const device of devices) {
    const devicePages = pages.filter((p) => p.device === device);
    deviceScores[device] = {} as Record<Category, CategoryAggregate>;
    for (const category of CATEGORIES) {
      deviceScores[device][category] = categoryAggregate(devicePages, category);
    }
    deviceMetrics[device] = metricsFor(devicePages);
  }

  const issueCounts = {} as Record<Severity, number>;
  for (const severity of SEVERITIES) {
    issueCounts[severity] = issues.filter(
      (i) => i.severity === severity,
    ).length;
  }

  const deviceIssueCounts = {} as Record<Device, Record<Severity, number>>;
  for (const device of devices) {
    deviceIssueCounts[device] = {} as Record<Severity, number>;
    for (const severity of SEVERITIES) {
      deviceIssueCounts[device][severity] = issues.filter(
        (i) => i.severity === severity && i.devices.includes(device),
      ).length;
    }
  }

  return {
    scanId: input.scanId,
    url: input.url,
    timestamp: input.timestamp,
    mode: input.mode,
    device: input.device,
    devices,
    pagesDiscovered: input.pagesDiscovered,
    pagesScanned: scannedUrls.length,
    pagesSucceeded: succeeded,
    pagesFailed: failed,
    scores,
    deviceScores,
    metrics: metricsFor(pages),
    deviceMetrics,
    issueCounts,
    deviceIssueCounts,
    totalIssues: issues.length,
  };
}

export { METRIC_KEYS };
