import type { Finding, ScannerDescriptor } from '../../types.js';

export interface ScannerContext {
  /** Absolute path to the codebase, when the scanner targets source. */
  codebasePath?: string;
  /** Resolved URL for this stage (production or staging), when it targets a host. */
  targetUrl?: string;
  /** Hostname allowlist. Dynamic scanners refuse anything not listed. */
  allowedHosts: string[];
  /** Directory the scanner may write raw tool output into. */
  artifactDir: string;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}

export interface Scanner {
  descriptor: Omit<ScannerDescriptor, 'available' | 'version'>;
  run(ctx: ScannerContext): Promise<Finding[]>;
}

export function hostAllowed(url: string | undefined, allowed: string[]): boolean {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowed.some((entry) => {
    const clean = entry.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!clean) return false;
    if (clean.startsWith('*.')) {
      return host === clean.slice(2) || host.endsWith(`.${clean.slice(2)}`);
    }
    return host === clean;
  });
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
