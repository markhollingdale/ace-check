# AceCheck

> **Check everything. Ship with confidence.**

An **open-source, local-first website and codebase auditing tool**. Crawl a website, run [Lighthouse](https://github.com/GoogleChrome/lighthouse) against selected pages, run deterministic code checks, orchestrate AI engineering reviews, and aggregate everything into a release gate — so you get the handful of things that actually matter, not 3,000 noisy findings.

## What it does

1. Crawls a website (sitemap, `robots.txt`, and internal links).
2. Discovers and normalises URLs, deduplicating tracking parameters.
3. Selects representative pages (or scans everything, up to a limit).
4. Runs Lighthouse against each page.
5. Stores the raw Lighthouse JSON and HTML reports.
6. Extracts the useful metrics and actionable findings.
7. Aggregates recurring issues across the site ("183 pages have inefficiently sized images").
8. Detects likely page templates and common causes.
9. Assigns priorities (critical / high / medium / low / info).
10. Shows a visual dashboard and generates condensed Markdown + AI-ready prompts.

> Roadmap: deterministic code checks (dependency / secrets / config / env /
> hygiene), orchestrated AI engineering reviews, and a release gate. See
> `docs/production-readiness-platform-plan.md`.

Everything runs locally. No database, no cloud, no accounts, no telemetry.

## Requirements

- Node.js >= 20
- pnpm
- Chrome / Chromium (for Lighthouse)

## Install & run

```bash
git clone <repository>
cd ace-check
pnpm install
pnpm dev
```

Open http://localhost:5173 to use the GUI. The API server runs on 3210 in both
modes; during development Vite proxies `/api` to it, so you only need to open
5173.

To run the production build, a single Node server serves both the UI and the API
on 3210:

```bash
pnpm build
pnpm start
# open http://localhost:3210
```

## CLI

The CLI uses the exact same scanner/analyser code as the GUI.

```bash
pnpm run audit https://example.com
pnpm run audit https://example.com --pages 100
pnpm run audit https://example.com --mode quick
pnpm run audit https://example.com --device mobile
pnpm run audit https://example.com --desktop
pnpm run audit https://example.com --output ./reports
```

`--device` accepts `mobile`, `desktop`, or `both` (default `both`, which runs
each page on both and combines the results into a single report).

> `pnpm audit` is reserved by pnpm's own security-audit command, so use
> `pnpm run audit` (or `pnpm exec acecheck` once built).

## Scan output

Each scan is a self-contained directory under `scans/`:

```text
scans/
  2026-08-14_103000/
    metadata.json
    summary.json
    issues.json
    ai-audit.md
    report.html
    report.json
    pages/
      homepage/
        lighthouse.json
        summary.json
        report.html
```

Scans are portable and can be exported as a ZIP from the Reports tab.

## Configuration

Create an `acecheck.config.json` in the project root (optional):

```json
{
  "maxPages": 100,
  "concurrency": 2,
  "device": "both",
  "respectRobots": true,
  "ignoredQueryParams": ["utm_source", "utm_medium", "utm_campaign"]
}
```

## AI-ready reports

The tool does not call any AI API in V1. Instead it generates condensed
Markdown that you can paste into Claude Code, OpenCode, Cursor, ChatGPT,
Gemini, or any other coding agent. Use the **Generate AI Prompt** button in
the Reports tab, or the per-issue and per-page investigation prompts.

## License

MIT
