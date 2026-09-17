import type { Finding, Severity } from '../../types.js';
import { listFiles, makeFinding, readTextFile, relativePath } from './util.js';

const PATTERNS: { name: string; regex: RegExp; severity: Severity }[] = [
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/g, severity: 'critical' },
  { name: 'GitHub token', regex: /\b(ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{20,}\b/g, severity: 'critical' },
  { name: 'GitHub fine-grained PAT', regex: /\bgithub_pat_[0-9A-Za-z_]{22,}\b/g, severity: 'critical' },
  { name: 'Stripe live key', regex: /\bsk_live_[0-9A-Za-z]{16,}\b/g, severity: 'critical' },
  { name: 'Stripe restricted key', regex: /\brk_live_[0-9A-Za-z]{16,}\b/g, severity: 'critical' },
  { name: 'Slack token', regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, severity: 'high' },
  { name: 'OpenAI API key', regex: /\bsk-[A-Za-z0-9]{20,}\b/g, severity: 'high' },
  { name: 'Private key block', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'Database URL with credentials', regex: /(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^\s"'`]+:[^\s"'`]+@/g, severity: 'high' },
  { name: 'Hard-coded secret assignment', regex: /(api[_-]?key|secret|password|token|passwd)\s*[:=]\s*["'][A-Za-z0-9+/=_\-]{16,}["']/gi, severity: 'high' },
];

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.yaml', '.yml', '.toml', '.md',
]);

export async function runSecretsScan(codebasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await listFiles(codebasePath, { extensions: SOURCE_EXTENSIONS });
  for (const file of files) {
    const content = await readTextFile(file);
    if (content == null) continue;
    const rel = relativePath(file, codebasePath);
    const lines = content.split('\n');
    for (const pattern of PATTERNS) {
      let count = 0;
      let firstLine = 0;
      for (let i = 0; i < lines.length; i++) {
        const re = new RegExp(pattern.regex.source, pattern.regex.flags);
        if (re.test(lines[i])) {
          count++;
          if (firstLine === 0) firstLine = i + 1;
        }
      }
      if (count === 0) continue;
      findings.push(
        makeFinding({
          prefix: 'SECRET',
          category: 'secrets',
          domain: 'SECURITY',
          severity: pattern.severity,
          title: `Potential secret: ${pattern.name}`,
          description: `${count} occurrence(s) of a ${pattern.name} pattern in ${rel}.`,
          evidence: { file: rel, line: firstLine, proof: 'possible' },
          recommendation: 'Remove the value, rotate it if it was committed, and move it to a server-side secret store or environment variable.',
        }),
      );
    }
  }
  return findings;
}
