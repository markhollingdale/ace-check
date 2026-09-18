type Json = Record<string, unknown>;

function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
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
 * Render a Lighthouse value wrapper (`{ type, value }`, `{ url }`, a checklist
 * label/value pair, or a source location) as readable text.
 */
function renderValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'object') return str(value);

  const obj = value as Json;

  if (
    str(obj.type) === 'source-location' ||
    (str(obj.url) !== undefined && num(obj.line) != null)
  ) {
    const sourceLocation = renderSourceLocation(obj);
    if (sourceLocation) return sourceLocation;
  }

  const label = str(obj.label);
  if (label !== undefined) {
    const inner = renderValue(obj.value);
    return inner ? `${label}: ${inner}` : label;
  }

  const direct = str(obj.value);
  if (direct !== undefined) return direct;

  const url = str(obj.url);
  if (url !== undefined) return url;

  return undefined;
}

/** `https://x/app.js:1:5500` from a Lighthouse `source-location` object. */
function renderSourceLocation(loc: Json): string | undefined {
  const url = str(loc.url);
  if (!url) return undefined;
  const line = num(loc.line);
  const column = num(loc.column);
  return `${url}${line != null ? `:${line}` : ''}${
    column != null ? `:${column}` : ''
  }`;
}

/**
 * Lighthouse insight audits wrap a table inside a list item:
 * `{ type: 'table', headings: [{ key, label }], items: [row] }`. Render each row
 * in heading order so the reader gets the columns, not a JSON blob.
 */
function renderTable(item: Json): string[] {
  const headings = Array.isArray(item.headings)
    ? (item.headings as Json[])
    : [];
  const rows = Array.isArray(item.items) ? (item.items as Json[]) : [];
  if (rows.length === 0) return [];

  return rows.slice(0, 5).map((row) => {
    const parts: string[] = [];
    for (const heading of headings) {
      const key = str(heading.key);
      if (!key) continue;
      const label = str(heading.label) ?? key;
      const rendered = renderValue(row[key]);
      if (rendered) parts.push(`${label}: ${truncate(rendered, 200)}`);
    }
    if (parts.length === 0) {
      for (const [key, value] of Object.entries(row)) {
        if (NOISE_KEYS.has(key)) continue;
        const rendered = renderValue(value);
        if (rendered) parts.push(`${key}: ${truncate(rendered, 160)}`);
      }
    }
    return truncate(parts.join(' | '), 500);
  });
}

/**
 * `network-dependency-tree-insight` stores the whole tree under
 * `value.chains`. Walk it and surface the longest chain (the one Lighthouse
 * uses to grade the audit) as concrete URLs with timing.
 */
function renderNetworkTree(root: Json): string[] {
  const chains = root.chains;
  if (!chains || typeof chains !== 'object') return [];
  const lines: string[] = [];
  let best: { path: string[]; duration: number; size: number } | null = null;

  const walk = (
    node: Json,
    path: string[],
    acc: number,
    size: number,
  ): void => {
    const url = str(node.url) ?? '?';
    const duration = num(node.navStartToEndTime) ?? 0;
    const transfer = num(node.transferSize) ?? 0;
    const nextPath = [...path, url];
    const nextAcc = Math.max(acc, duration);
    const nextSize = size + transfer;
    if (!best || nextAcc > best.duration) {
      best = { path: nextPath, duration: nextAcc, size: nextSize };
    }
    const children = node.children;
    if (children && typeof children === 'object') {
      for (const child of Object.values(children as Json)) {
        if (child && typeof child === 'object') walk(child as Json, nextPath, nextAcc, nextSize);
      }
    }
  };

  for (const node of Object.values(chains as Json)) {
    if (node && typeof node === 'object') walk(node as Json, [], 0, 0);
  }

  const bestChain = best as { path: string[]; duration: number; size: number } | null;
  if (bestChain) {
    const chain = bestChain.path.map((url) => truncate(url, 90)).join(' -> ');
    lines.push(
      `Longest critical chain (${Math.round(bestChain.duration)} ms, ${formatBytes(
        bestChain.size,
      )}): ${chain}`,
    );
  }
  return lines;
}

function renderListSection(item: Json): string[] {
  const parts: string[] = [];
  const title = str(item.title);
  if (title) parts.push(title);

  const value = item.value;
  if (value && typeof value === 'object') {
    const vtype = str((value as Json).type);
    if (vtype === 'network-tree') {
      parts.push(...renderNetworkTree(value as Json));
    } else {
      const rendered = renderValue(value);
      if (rendered) parts.push(truncate(rendered, 300));
    }
  } else {
    const rendered = renderValue(value);
    if (rendered) parts.push(truncate(rendered, 300));
  }

  if (Array.isArray(item.items) && (item.items as unknown[]).length > 0) {
    parts.push(...renderTable({ headings: item.headings, items: item.items }));
  }

  const description = str(item.description);
  if (description && parts.length <= 1) parts.push(truncate(description, 300));
  return parts;
}

/** Console errors and DevTools issues: keep the full message, it is the evidence. */
function renderConsoleEntry(item: Json): string | undefined {
  const source = str(item.source);
  const description = str(item.description);
  if (!source || !description) return undefined;
  const loc = item.sourceLocation as Json | undefined;
  const where = loc && typeof loc === 'object' ? renderSourceLocation(loc) : undefined;
  return `[${source}] ${truncate(description, 700)}${where ? ` (at ${where})` : ''}`;
}

function fallbackPairs(item: Json): string {
  const pairs = Object.entries(item)
    .filter(([key, value]) => !NOISE_KEYS.has(key) && renderValue(value) !== undefined)
    .slice(0, 8)
    .map(([key, value]) => `${key}=${truncate(renderValue(value)!, 200)}`);
  return pairs.length > 0 ? pairs.join(', ') : '(no readable detail)';
}

/**
 * Turn a raw Lighthouse `details.items` entry into one readable line.
 *
 * Lighthouse item shapes vary widely (DOM nodes, resources, long tasks,
 * per-category breakdowns, nested insight tables, network trees, checklist
 * objects), so this inspects the item rather than assuming a shape, and falls
 * back to listing primitives rather than dumping JSON.
 */
export function summariseEvidenceItem(item: Json): string {
  const type = str(item.type);
  let body: string | undefined;

  if (type === 'table') {
    const rows = renderTable(item);
    body = rows.length > 0 ? rows.join(' ; ') : undefined;
  } else if (type === 'list-section' || type === 'list') {
    const parts = renderListSection(item);
    body = parts.length > 0 ? parts.join(' - ') : undefined;
  } else {
    body = renderConsoleEntry(item);
  }

  if (!body) {
    const parts: string[] = [];

    const node = item.node as Json | undefined;
    if (node && typeof node === 'object') {
      const snippet = str(node.snippet);
      const selector = str(node.selector);
      const label = str(node.nodeLabel);
      const explanation = str(node.explanation);
      let line = 'Element';
      if (snippet) line += ` ${truncate(snippet, 160)}`;
      if (selector) line += ` (selector: ${truncate(selector, 120)})`;
      if (label) line += ` - "${truncate(label, 100)}"`;
      if (explanation) line += ` - ${truncate(explanation, 300)}`;
      parts.push(line);
    } else if (str(item.url)) {
      let line = truncate(str(item.url)!, 220);
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
      const resourceType = str(item.resourceType);
      const count = num(item.requestCount);
      const size = num(item.transferSize);
      let line = `Resource: ${resourceType}`;
      const extras: string[] = [];
      if (count != null) extras.push(`${count} request(s)`);
      if (size != null) extras.push(formatBytes(size));
      if (extras.length > 0) line += ` - ${extras.join(', ')}`;
      parts.push(line);
    }

    body = parts.length > 0 ? parts.join(' - ') : fallbackPairs(item);
  }

  const suffix: string[] = [];
  const via = str(item.via);
  if (via) suffix.push(`via ${via}`);
  const page = str(item.page);
  if (page) suffix.push(truncate(page, 120));

  return suffix.length > 0
    ? `${body} [${suffix.join(' | ')}]`
    : body;
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
