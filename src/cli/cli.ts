import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runCodeChecks } from '../audit/checks/index.js';
import { writeChecksReport } from '../audit/checks/report.js';
import { defaultConfig } from '../config.js';
import { isValidHttpUrl } from '../crawler/url.js';
import { runScan } from '../scanner/scanner.js';
import { scanDir } from '../storage/storage.js';
import { DEVICE_LABELS, SEVERITIES, SEVERITY_LABELS } from '../types.js';

interface CliOptions {
  url?: string;
  codebase?: string;
  pages?: number;
  mode?: 'quick' | 'standard' | 'full';
  device?: 'mobile' | 'desktop' | 'both';
  concurrency?: number;
  output?: string;
  ignoreRobots?: boolean;
  help?: boolean;
}

function printHelp(): void {
  console.log(`
acecheck — check everything, ship with confidence

Usage:
  acecheck <url> [options]
  acecheck --codebase <path>

Options:
  --pages <n>          Maximum pages to scan
  --mode <mode>        quick | standard | full   (default: standard)
  --device <device>    mobile | desktop | both   (default: both)
  --concurrency <n>    Concurrent crawler requests (default: 2)
  --output <dir>       Copy generated reports to a directory
  --ignore-robots      Ignore robots.txt
  --codebase <path>    Audit a local codebase (deterministic code checks)
  --help               Show this help
`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    switch (arg) {
      case '--pages':
        opts.pages = Number(value);
        i++;
        break;
      case '--mode':
        opts.mode = value as CliOptions['mode'];
        i++;
        break;
      case '--device':
        opts.device = value as CliOptions['device'];
        i++;
        break;
      case '--desktop':
        opts.device = 'desktop';
        break;
      case '--concurrency':
        opts.concurrency = Number(value);
        i++;
        break;
      case '--output':
        opts.output = value;
        i++;
        break;
      case '--codebase':
        opts.codebase = value;
        i++;
        break;
      case '--ignore-robots':
        opts.ignoreRobots = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        if (arg.startsWith('http://') || arg.startsWith('https://')) {
          opts.url = arg;
        } else if (!arg.startsWith('--') && !opts.url) {
          opts.url = arg;
        }
    }
  }
  return opts;
}

function formatScore(score: number | null): string {
  return score == null ? '—' : String(score);
}

async function runCodebaseChecks(codebase: string): Promise<void> {
  console.log(`Running code checks on ${codebase}`);
  const findings = await runCodeChecks(codebase);

  const counts: Partial<Record<string, number>> = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  console.log('');
  console.log(`Findings: ${findings.length}`);
  for (const severity of SEVERITIES) {
    const n = counts[severity];
    if (n) console.log(`  ${SEVERITY_LABELS[severity]}: ${n}`);
  }

  if (findings.length > 0) {
    console.log('');
    for (const f of findings) {
      const loc = f.evidence.file
        ? ` (${f.evidence.file}${f.evidence.line ? `:${f.evidence.line}` : ''})`
        : '';
      console.log(`  [${f.severity}] ${f.title}${loc}`);
    }
  }

  const report = await writeChecksReport(codebase, findings);
  console.log('');
  console.log(`Wrote ${report.jsonPath}`);
  console.log(`Wrote ${report.markdownPath}`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.codebase) {
    await runCodebaseChecks(opts.codebase);
  }

  if (!opts.url) {
    if (!opts.codebase) {
      printHelp();
      process.exit(1);
    }
    return;
  }

  if (!isValidHttpUrl(opts.url)) {
    console.error(`Invalid URL: ${opts.url}`);
    process.exit(1);
  }

  const config = defaultConfig({
    url: opts.url,
    mode: opts.mode,
    maxPages: opts.pages,
    device: opts.device,
    concurrency: opts.concurrency,
    respectRobots: !opts.ignoreRobots,
  });

  const deviceLabel =
    config.device === 'both'
      ? 'Mobile + Desktop'
      : DEVICE_LABELS[config.device];

  console.log(`Scanning ${opts.url}`);
  console.log(`Mode: ${config.mode} · Max pages: ${config.maxPages} · Device: ${deviceLabel}`);
  console.log('');

  const start = Date.now();

  const { metadata } = await runScan(config, {
    onProgress: (update) => {
      if (update.status === 'discovering' && update.message) {
        process.stdout.write(`\r  ${update.message}          `);
      } else if (update.status === 'scanning') {
        process.stdout.write(
          `\r  Scanning ${update.scanned}/${update.total} (${update.failed} failed) — ${update.currentUrl || ''}          `,
        );
      } else if (update.status === 'analysing' || update.status === 'reporting') {
        process.stdout.write(`\r  ${update.message}          `);
      }
    },
    shouldCancel: () => false,
  });

  process.stdout.write('\n\n');

  if (metadata.status === 'done' || metadata.status === 'cancelled') {
    const { readSummary, readIssues } = await import('../storage/storage.js');
    const summary = await readSummary(metadata.scanId);
    const issues = (await readIssues(metadata.scanId)) ?? [];

    if (summary) {
      console.log('Scores (median):');
      for (const device of summary.devices) {
        const scores = summary.deviceScores[device];
        console.log(`  ${DEVICE_LABELS[device]}:`);
        console.log(`    Performance:     ${formatScore(scores?.performance.median ?? null)}`);
        console.log(`    Accessibility:   ${formatScore(scores?.accessibility.median ?? null)}`);
        console.log(`    Best Practices:  ${formatScore(scores?.['best-practices'].median ?? null)}`);
        console.log(`    SEO:             ${formatScore(scores?.seo.median ?? null)}`);
      }
      console.log('');
      console.log(`Pages: ${summary.pagesSucceeded} scanned, ${summary.pagesFailed} failed, ${summary.pagesDiscovered} discovered`);
      console.log('');
      console.log('Issues:');
      for (const severity of SEVERITIES) {
        const count = summary.issueCounts[severity];
        if (count > 0) console.log(`  ${SEVERITY_LABELS[severity]}: ${count}`);
      }
    }

    console.log('');
    console.log(`Scan directory: ${scanDir(metadata.scanId)}`);
    console.log(`AI report:      ${path.join(scanDir(metadata.scanId), 'ai-audit.md')}`);

    if (opts.output) {
      await mkdir(opts.output, { recursive: true });
      for (const file of ['ai-audit.md', 'report.html', 'report.json']) {
        await copyFile(
          path.join(scanDir(metadata.scanId), file),
          path.join(opts.output, file),
        ).catch(() => undefined);
      }
      console.log(`Reports copied to: ${opts.output}`);
    }

    if (issues.length > 0) {
      console.log('');
      console.log('Top issues to investigate:');
      for (const issue of issues.slice(0, 5)) {
        console.log(`  [${issue.severity}] ${issue.title} — ${issue.count} pages`);
      }
    }
  } else {
    console.log(`Scan ${metadata.status}.`);
    console.error(
      metadata.status === 'failed'
        ? 'Scan failed. Check that Chrome/Chromium is installed.'
        : '',
    );
    process.exit(1);
  }

  console.log('');
  console.log(`Completed in ${((Date.now() - start) / 1000).toFixed(0)}s`);
}

main().catch((err) => {
  console.error('\nError:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
