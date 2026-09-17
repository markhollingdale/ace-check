import type { Finding } from '../../types.js';
import { runDependencyAudit } from './dependencies.js';
import { runSecretsScan } from './secrets.js';
import { runConfigAudit } from './config.js';
import { runEnvAudit } from './env.js';
import { runHygieneScan } from './hygiene.js';

export type CheckName = 'dependencies' | 'secrets' | 'config' | 'env' | 'hygiene';

export interface CodeCheckOptions {
  checks?: CheckName[];
}

export const ALL_CHECKS: CheckName[] = [
  'dependencies',
  'secrets',
  'config',
  'env',
  'hygiene',
];

export async function runCodeChecks(
  codebasePath: string,
  opts: CodeCheckOptions = {},
): Promise<Finding[]> {
  const checks = opts.checks ?? ALL_CHECKS;
  const runners: Record<CheckName, (dir: string) => Promise<Finding[]>> = {
    dependencies: runDependencyAudit,
    secrets: runSecretsScan,
    config: runConfigAudit,
    env: runEnvAudit,
    hygiene: runHygieneScan,
  };
  const results = await Promise.all(
    checks.map(async (name) => {
      try {
        return await runners[name](codebasePath);
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}
