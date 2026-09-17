import path from 'node:path';
import type { Finding } from '../../types.js';
import { listEnvFiles, makeFinding, readTextFile, relativePath } from './util.js';

const CLIENT_PREFIXES = ['NEXT_PUBLIC_', 'VITE_', 'REACT_APP_', 'PUBLIC_'];

function parseKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    keys.add(trimmed.slice(0, eq).trim());
  }
  return keys;
}

export async function runEnvAudit(codebasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const envFiles = await listEnvFiles(codebasePath);
  const gitignore = await readTextFile(path.join(codebasePath, '.gitignore'));

  for (const file of envFiles) {
    const rel = relativePath(file, codebasePath);
    const basename = path.basename(file);
    const content = await readTextFile(file);
    if (content == null) continue;

    if (basename === '.env' || basename === '.env.local') {
      const ignored =
        gitignore != null &&
        gitignore.split('\n').some((l) => {
          const t = l.trim();
          return t === basename || t === '.env' || t === '.env.*';
        });
      if (!ignored) {
        findings.push(
          makeFinding({
            prefix: 'ENV',
            category: 'env',
            domain: 'SECURITY',
            severity: 'high',
            title: `Environment file ${basename} is present but not gitignored`,
            description: `${rel} exists; if it holds real secrets and is committed, they are exposed.`,
            evidence: { file: rel, proof: 'confirmed' },
            recommendation: `Add ${basename} (and .env.*) to .gitignore and remove it from version control.`,
          }),
        );
      }
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const prefix = CLIENT_PREFIXES.find((p) => trimmed.startsWith(p));
      if (prefix && /[:=]["']?[A-Za-z0-9+/=_-]{16,}["']?$/.test(trimmed)) {
        findings.push(
          makeFinding({
            prefix: 'ENV',
            category: 'env',
            domain: 'SECURITY',
            severity: 'high',
            title: 'Client-exposed secret in environment file',
            description: `${basename}:${i + 1} exposes a value via the ${prefix} prefix, shipping it to the browser.`,
            evidence: { file: rel, line: i + 1, proof: 'possible' },
            recommendation: 'Remove the client prefix or move the value to a server-only variable.',
          }),
        );
      }
    }
  }

  const example = envFiles.find((f) => /\.env\.(example|sample|template)$/.test(path.basename(f)));
  if (example) {
    const exampleContent = await readTextFile(example);
    if (exampleContent) {
      const exampleKeys = parseKeys(exampleContent);
      const envFile = envFiles.find((f) => /\.env(\.(local|production|development))?$/.test(path.basename(f)));
      const envContent = envFile ? await readTextFile(envFile) : null;
      const envKeys = envContent ? parseKeys(envContent) : new Set<string>();
      const missing = [...exampleKeys].filter((k) => !envKeys.has(k));
      if (missing.length > 0) {
        findings.push(
          makeFinding({
            prefix: 'ENV',
            category: 'env',
            domain: 'SECURITY',
            severity: 'info',
            title: 'Environment variables declared in example but missing',
            description: `Missing keys: ${missing.join(', ')}`,
            evidence: { file: relativePath(example, codebasePath), proof: 'confirmed' },
            recommendation: 'Ensure these variables are set in the deployment environment.',
          }),
        );
      }
    }
  }

  return findings;
}
