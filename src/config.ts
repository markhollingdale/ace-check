import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Device, DeviceMode, ScanConfig, ScanMode } from './types.js';

export const DEFAULT_IGNORED_QUERY_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  '_ga',
  'ref',
  'source',
  'cmp',
];

export const MODE_PRESETS: Record<
  ScanMode,
  { maxPages: number; label: string; description: string }
> = {
  quick: {
    maxPages: 10,
    label: 'Quick',
    description: 'Fast feedback. Representative pages only.',
  },
  standard: {
    maxPages: 100,
    label: 'Standard',
    description: 'Default whole-site scan.',
  },
  full: {
    maxPages: 500,
    label: 'Full',
    description: 'Scan every discovered URL up to the maximum.',
  },
};

export function defaultConfig(overrides: Partial<ScanConfig> = {}): ScanConfig {
  const clean: Partial<ScanConfig> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      (clean as Record<string, unknown>)[key] = value;
    }
  }

  return {
    url: '',
    mode: 'standard',
    maxPages: MODE_PRESETS.standard.maxPages,
    device: 'both',
    concurrency: 2,
    timeoutMs: 60_000,
    respectRobots: true,
    includeSitemap: true,
    includeLinks: true,
    ignoredQueryParams: [...DEFAULT_IGNORED_QUERY_PARAMS],
    lighthouseHtml: 'findings',
    lighthouseTimeoutMs: 90_000,
    ...loadConfigFile(),
    ...clean,
  };
}

export function loadConfigFile(): Partial<ScanConfig> {
  const candidates = [
    'acecheck.config.json',
    'acecheck.config.cjs',
    'acecheck.config.js',
  ];
  for (const name of candidates) {
    const filePath = path.resolve(process.cwd(), name);
    if (!existsSync(filePath)) continue;
    try {
      if (name.endsWith('.json')) {
        const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
        return typeof parsed === 'object' && parsed ? parsed : {};
      }
      const req = createRequire(import.meta.url);
      const mod = req(filePath) as
        | Record<string, unknown>
        | { default?: Record<string, unknown> };
      const value = (mod as { default?: Record<string, unknown> }).default ?? mod;
      return value as Partial<ScanConfig>;
    } catch {
      /* ignore malformed config files */
    }
  }
  return {};
}

export function resolveMaxPages(config: ScanConfig): number {
  if (config.maxPages > 0) return config.maxPages;
  return MODE_PRESETS[config.mode].maxPages;
}

export function devicesForConfig(device: DeviceMode): Device[] {
  if (device === 'both') return ['mobile', 'desktop'];
  return [device];
}
