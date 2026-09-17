type Json = Record<string, unknown>;

function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${Math.round(bytes)} B`;
}

const NOISE_KEYS = new Set([
  'page',
  'device',
  'via',
  'score',
  'scoreDisplayMode',
  'group',
]);

/**
 * Turn a raw Lighthouse `details.items` entry into one readable line.
 *
 * Lighthouse item shapes vary widely (DOM nodes, resources, long tasks,
 * per-category breakdowns), so this inspects the item rather than assuming a
 * shape, and falls back to listing primitives rather than dumping JSON.
 */
export function summariseEvidenceItem(item: Json): string {
  const parts: string[] = [];

  const node = item.node as Json | undefined;
  if (node && typeof node === 'object') {
    const snippet = str(node.snippet);
    const selector = str(node.selector);
    const label = str(node.nodeLabel);
    const explanation = str(node.explanation);
    let line = 'Element';
    if (snippet) line += ` ${truncate(snippet, 110)}`;
    if (selector) line += ` (selector: ${truncate(selector, 80)})`;
    if (label) line += ` - "${truncate(label, 60)}"`;
    if (explanation) line += ` - ${truncate(explanation, 140)}`;
    parts.push(line);
  } else if (str(item.url)) {
    let line = truncate(str(item.url)!, 160);
    const extras: string[] = [];
    const totalBytes =
      num(item.totalBytes) ?? num(item.transferSize) ?? num(item.resourceSize);
    const wastedBytes = num(item.wastedBytes);
    const wastedMs = num(item.wastedMs);
    if (totalBytes != null) extras.push(formatBytes(totalBytes));
    if (wastedBytes != null) extras.push(`${formatBytes(wastedBytes)} wasted`);
    if (wastedMs != null) extras.push(`${Math.round(wastedMs)} ms wasted`);
    if (extras.length > 0) line += ` (${extras.join(', ')})`;
    parts.push(line);
  } else if (num(item.duration) != null) {
    const duration = num(item.duration)!;
    const start = num(item.startTime);
    const group = str(item.groupLabel) ?? str(item.resourceType);
    let line = group ? `${group}: ` : 'Task: ';
    line += `${Math.round(duration)} ms`;
    if (start != null) line += ` (starts ${(start / 1000).toFixed(2)} s)`;
    parts.push(line);
  } else if (str(item.resourceType)) {
    const type = str(item.resourceType);
    const count = num(item.requestCount);
    const size = num(item.transferSize);
    let line = `Resource: ${type}`;
    const extras: string[] = [];
    if (count != null) extras.push(`${count} request(s)`);
    if (size != null) extras.push(formatBytes(size));
    if (extras.length > 0) line += ` - ${extras.join(', ')}`;
    parts.push(line);
  }

  if (parts.length === 0) {
    const pairs = Object.entries(item)
      .filter(([key, value]) => !NOISE_KEYS.has(key) && str(value) !== undefined)
      .slice(0, 4)
      .map(([key, value]) => `${key}=${truncate(String(value), 90)}`);
    parts.push(pairs.length > 0 ? pairs.join(', ') : '(no readable detail)');
  }

  const suffix: string[] = [];
  const via = str(item.via);
  if (via) suffix.push(`via ${via}`);
  const page = str(item.page);
  if (page) suffix.push(truncate(page, 90));

  return suffix.length > 0
    ? `${parts.join(' - ')} [${suffix.join(' | ')}]`
    : parts.join(' - ');
}

/**
 * Summarise a batch of items, dropping duplicates. The same audit runs once per
 * device, so identical evidence lines are common and add nothing.
 */
export function summariseEvidenceItems(items: Json[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const line = summariseEvidenceItem(item);
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}
