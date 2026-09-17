import type { ScannerDescriptor, StageId } from '../../types.js';
import { detectBinary } from './exec.js';
import { semgrepScanner } from './semgrep.js';
import { gitleaksScanner } from './gitleaks.js';
import { osvScanner } from './osv.js';
import { nucleiScanner } from './nuclei.js';
import { zapScanner } from './zap.js';
import { ffufScanner } from './ffuf.js';
import { nmapScanner } from './nmap.js';
import type { Scanner } from './types.js';

export const SCANNERS: Scanner[] = [
  semgrepScanner,
  gitleaksScanner,
  osvScanner,
  nucleiScanner,
  zapScanner,
  ffufScanner,
  nmapScanner,
];

export function scannerById(id: string): Scanner | undefined {
  return SCANNERS.find((s) => s.descriptor.id === id);
}

export function scannersForStage(stage: StageId): Scanner[] {
  return SCANNERS.filter((s) => s.descriptor.stage === stage);
}

export function primaryBinariesForStage(stage: StageId): string[] {
  return scannersForStage(stage).flatMap((s) => s.descriptor.binaries);
}

interface CacheEntry {
  at: number;
  value: ScannerDescriptor;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export async function describeScanner(
  scanner: Scanner,
  force = false,
): Promise<ScannerDescriptor> {
  const id = scanner.descriptor.id;
  const cached = cache.get(id);
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }
  const bin = scanner.descriptor.binaries[0];
  const detection = await detectBinary(bin);
  const value: ScannerDescriptor = {
    ...scanner.descriptor,
    available: detection.available,
    version: detection.version,
  };
  cache.set(id, { at: Date.now(), value });
  return value;
}

export async function listScannerDescriptors(
  force = false,
): Promise<ScannerDescriptor[]> {
  return Promise.all(SCANNERS.map((s) => describeScanner(s, force)));
}

/** Reset the detection cache - used by tests. */
export function resetScannerCache(): void {
  cache.clear();
}
