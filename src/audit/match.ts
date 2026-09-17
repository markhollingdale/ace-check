import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function projectNameFromCodebase(codebasePath: string): string | null {
  const pkgPath = path.join(codebasePath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: unknown };
    return typeof pkg.name === 'string' && pkg.name ? pkg.name : null;
  } catch {
    return null;
  }
}

export async function siteReferencesProject(
  url: string,
  projectName: string,
  timeoutMs = 10_000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'acecheck/0.1' },
      signal: controller.signal,
    });
    if (!res.ok) return true;
    const text = await res.text();
    return text.toLowerCase().includes(projectName.toLowerCase());
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}
