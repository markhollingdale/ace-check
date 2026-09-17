#!/usr/bin/env node
/**
 * Generate third-party attribution for every dependency in the workspace.
 *
 *   node scripts/generate-attributions.mjs
 *
 * Writes:
 *   THIRD-PARTY-NOTICES.md        full notices (packages + license texts)
 *   web/public/attributions.json  data for the in-app Attribution page
 *
 * The package list comes from `pnpm licenses list --json`, so it always
 * reflects the real, installed dependency tree.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Hand-listed tools AceCheck orchestrates at runtime (never bundled). */
const EXTERNAL_TOOLS = [
  {
    name: 'Semgrep CE',
    license: 'LGPL-2.1 (engine); Semgrep Rules License (rules)',
    url: 'https://github.com/semgrep/semgrep',
    note: 'Invoked as a local CLI binary; not distributed with AceCheck. Semgrep states that software using the LGPL-2.1 engine may be shipped without a further license. Rules fetched by --config=auto are downloaded by your Semgrep install, not redistributed by AceCheck.',
  },
  {
    name: 'Gitleaks',
    license: 'MIT',
    url: 'https://github.com/gitleaks/gitleaks',
    note: 'Invoked as a local CLI binary; not distributed with AceCheck.',
  },
  {
    name: 'OSV-Scanner',
    license: 'Apache-2.0',
    url: 'https://github.com/google/osv-scanner',
    note: 'Invoked as a local CLI binary; not distributed with AceCheck.',
  },
  {
    name: 'ProjectDiscovery Nuclei',
    license: 'MIT',
    url: 'https://github.com/projectdiscovery/nuclei',
    note: 'Invoked as a local CLI binary; not distributed with AceCheck.',
  },
  {
    name: 'OWASP ZAP',
    license: 'Apache-2.0',
    url: 'https://github.com/zaproxy/zaproxy',
    note: 'Run via the official container image; not distributed with AceCheck.',
  },
  {
    name: 'ffuf',
    license: 'MIT',
    url: 'https://github.com/ffuf/ffuf',
    note: 'Invoked as a local CLI binary; not distributed with AceCheck.',
  },
  {
    name: 'Nmap',
    license: 'NPSL (GPLv2-based, not GPL-compatible)',
    url: 'https://nmap.org/book/man-legal.html',
    note: 'Invoked as a local CLI binary; not distributed with AceCheck. The NPSL restricts redistributing Nmap inside products, but it explicitly does not bind software that executes a copy of Nmap the end user has already installed or that parses its output, which is what AceCheck does.',
  },
  {
    name: 'Docker Engine',
    license: 'Apache-2.0',
    url: 'https://github.com/moby/moby',
    note: 'Used only to run the ZAP container on your machine.',
  },
  {
    name: 'Node.js',
    license: 'MIT',
    url: 'https://github.com/nodejs/node',
    note: 'Runtime requirement.',
  },
  {
    name: 'Google Chrome / Chromium',
    license: 'Proprietary (Chrome) / BSD-3-Clause (Chromium)',
    url: 'https://www.chromium.org/',
    note: 'Runtime requirement for the Lighthouse stage. Not distributed with AceCheck.',
  },
];

function readLicenseText(dir) {
  const candidates = readdirSync(dir)
    .filter((f) => /^(LICEN[CS]E|COPYING|UNLICENSE)\b/i.test(f))
    .sort((a, b) => a.length - b.length);
  for (const file of candidates) {
    const full = path.join(dir, file);
    try {
      const text = readFileSync(full, 'utf8').replace(/\r\n/g, '\n').trim();
      if (text) return text;
    } catch {
      /* unreadable: try the next candidate */
    }
  }
  return null;
}

function isCopyrightNotice(line) {
  if (line.length >= 160) return false;
  if (/©/.test(line)) return true;
  if (!/^copyright\b/i.test(line)) return false;
  // Reject boilerplate such as "copyright notice that is included in ...".
  if (/^copyright\s+(?:notice|owner|holder|laws?|and|in|is|to|shall)\b/i.test(line)) {
    return false;
  }
  return /[()\d]/.test(line) || /^copyright\s+[A-Z]/.test(line);
}

function copyrightLine(text) {
  if (!text) return null;
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find(isCopyrightNotice);
  return line ? line.replace(/^["'\s*/#]+/, '').trim() : null;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

console.log('Collecting dependency licenses...');
const raw = execFileSync('pnpm', ['licenses', 'list', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  shell: process.platform === 'win32',
});
const byLicense = JSON.parse(raw.replace(/^\uFEFF/, ''));

const licenseTexts = {};
const noticeTexts = new Map();
const packages = [];

for (const [license, entries] of Object.entries(byLicense)) {
  for (const entry of entries) {
    const dir = entry.paths?.[0];
    const pkg = dir ? readJson(path.join(dir, 'package.json')) : null;
    const text = dir ? readLicenseText(dir) : null;
    if (text && !licenseTexts[license]) licenseTexts[license] = text;

    const author =
      typeof pkg?.author === 'string'
        ? pkg.author
        : pkg?.author?.name || copyrightLine(text) || undefined;

    packages.push({
      name: entry.name,
      versions: entry.versions ?? [],
      license,
      homepage: entry.homepage || pkg?.homepage || undefined,
      repository:
        typeof pkg?.repository === 'string'
          ? pkg.repository
          : pkg?.repository?.url || undefined,
      author,
    });

    const noticePath = dir ? path.join(dir, 'NOTICE') : null;
    if (noticePath && existsSync(noticePath) && !noticeTexts.has(entry.name)) {
      noticeTexts.set(
        entry.name,
        readFileSync(noticePath, 'utf8').replace(/\r\n/g, '\n').trim(),
      );
    }
  }
}

packages.sort((a, b) => a.name.localeCompare(b.name));

const counts = {};
for (const pkg of packages) counts[pkg.license] = (counts[pkg.license] ?? 0) + 1;
const totalPackages = Object.values(counts).reduce((a, b) => a + b, 0);

const generated = new Date().toISOString().slice(0, 10);

// --- THIRD-PARTY-NOTICES.md ------------------------------------------------

const md = [];
md.push('# Third-Party Notices');
md.push('');
md.push(
  'AceCheck is distributed under the MIT License (see `LICENSE`). It builds on',
  'the open-source software listed below. This file is generated from the',
  'installed dependency tree by `pnpm licenses`; regenerate it with:',
  '',
  '```bash',
  'pnpm licenses',
  '```',
  '',
  `Generated: ${generated} - ${totalPackages} packages.`,
);
md.push('');
md.push('## Summary');
md.push('');
md.push('| License | Packages |');
md.push('| --- | --- |');
for (const [license, count] of Object.entries(counts).sort(
  (a, b) => b[1] - a[1],
)) {
  md.push(`| ${license} | ${count} |`);
}
md.push('');
md.push('## Packages');
for (const [license, list] of Object.entries(
  packages.reduce((acc, pkg) => {
    (acc[pkg.license] ??= []).push(pkg);
    return acc;
  }, {}),
)) {
  md.push('');
  md.push(`### ${license}`);
  md.push('');
  for (const pkg of list) {
    const bits = [`**${pkg.name}** ${pkg.versions.join(', ')}`];
    if (pkg.homepage) bits.push(pkg.homepage);
    md.push(`- ${bits.join(' - ')}`);
    if (pkg.author) md.push(`  - ${pkg.author}`);
  }
}

if (noticeTexts.size > 0) {
  md.push('');
  md.push('## Bundled NOTICE files');
  for (const [name, text] of noticeTexts) {
    md.push('');
    md.push(`### ${name}`);
    md.push('');
    md.push('```');
    md.push(text);
    md.push('```');
  }
}

md.push('');
md.push('## External tools AceCheck invokes');
md.push('');
md.push(
  'These are separate programs. AceCheck detects them and runs them as local',
  'commands or containers; it does not bundle or redistribute them, and each is',
  'governed by its own license.',
);
md.push('');
md.push('| Tool | License | Project |');
md.push('| --- | --- | --- |');
for (const tool of EXTERNAL_TOOLS) {
  md.push(`| ${tool.name} | ${tool.license} | ${tool.url} |`);
}
md.push('');
md.push('## License texts');
for (const [license, text] of Object.entries(licenseTexts).sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  md.push('');
  md.push(`### ${license}`);
  md.push('');
  md.push('```');
  md.push(text);
  md.push('```');
}
md.push('');

writeFileSync(
  path.join(root, 'THIRD-PARTY-NOTICES.md'),
  md.join('\n'),
  'utf8',
);
console.log(`Wrote THIRD-PARTY-NOTICES.md (${totalPackages} packages)`);

// --- web/public/attributions.json -----------------------------------------

const json = {
  generated,
  totalPackages,
  summary: Object.entries(counts)
    .map(([license, count]) => ({ license, count }))
    .sort((a, b) => b.count - a.count),
  packages: packages.map((pkg) => ({
    name: pkg.name,
    versions: pkg.versions,
    license: pkg.license,
    homepage: pkg.homepage ?? null,
    author: pkg.author ?? null,
  })),
  externalTools: EXTERNAL_TOOLS,
  licenseTexts,
};

const outPath = path.join(root, 'web', 'public', 'attributions.json');
writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8');
console.log(`Wrote ${path.relative(root, outPath)}`);
