# Contributing

Thanks for your interest in contributing to site-audit.

## Development setup

```bash
pnpm install
pnpm dev
```

- `pnpm dev` starts the API server (port 3210) and the Vite dev server (port 5173).
- `pnpm typecheck` runs the TypeScript compiler for both the backend and the web app.
- `pnpm build` builds both the backend and the frontend.
- `pnpm run audit https://example.com` runs a scan via the CLI.

## Project layout

```text
src/
  crawler/      URL discovery (sitemap, robots.txt, links, normalisation)
  lighthouse/   Lighthouse runner + result parser
  analyser/     issue extraction, aggregation, scoring, priorities, templates
  reports/      Markdown / JSON / HTML / ZIP report generation + AI prompts
  storage/      filesystem-based scan storage
  scanner/      scan orchestration (workflow, progress, cancellation)
  server/       local Hono API server
  cli/          command-line interface
web/            React + Vite + Tailwind frontend
```

## Conventions

- TypeScript throughout, strict mode.
- Both the GUI and the CLI share the same scanner core (`src/scanner`).
- Never modify raw Lighthouse output - derived data must remain traceable.
- Keep concurrency conservative by default; do not hammer target sites.

## Reporting issues

Please include the scan ID or a link to the exported ZIP when reporting a
problem, plus the site URL if you are comfortable sharing it.
