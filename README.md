# AceCheck

> **Check everything. Ship with confidence.**

An **open-source, local-first security and quality audit platform**. Point it at a
deployed site and a codebase, then run a **guided progression of audit stages** -
static analysis, secrets, dependencies, Lighthouse, runtime scanners and AI
engineering reviews - that all feed a single **release verdict** with an ordered
list of next actions.

Everything runs locally. No database, no cloud, no accounts, no telemetry.

## The model

```
Project ──owns──▶ Run ──contains──▶ Stage ──produces──▶ Finding
   │                 │                                   │
   └── latest Run ───┴──────────▶ Verdict ◀──────────────┘
```

- **Project** - the durable thing: a production URL, a staging URL and a codebase.
- **Run** - one execution of a profile (`Quick`, `Standard`, `Security`, `Full`).
- **Stage** - a single, runnable step. This is the progression:

| #  | Stage                      | Tool                     | Target   |
| -- | -------------------------- | ------------------------ | -------- |
| 1  | Target & tools             | built-in                 | -        |
| 2  | Static analysis (SAST)     | Semgrep CE               | codebase |
| 3  | Secrets scan               | Gitleaks                 | codebase |
| 4  | Dependency & supply chain  | OSV-Scanner              | codebase |
| 5  | Web quality                | Lighthouse               | site     |
| 6  | Attack surface             | Nmap                     | host     |
| 7  | Misconfiguration/exposure  | Nuclei                   | site     |
| 8  | Dynamic scan (DAST)        | OWASP ZAP (via Docker)   | staging  |
| 9  | Fuzzing & discovery        | ffuf                     | staging  |
| 10 | Abuse & authorisation      | Playwright (imported)    | staging  |
| 11 | Deep review (AI)           | the 16-module framework  | codebase |
| 12 | Verdict                    | built-in gate            | -        |

- **Finding** - one unified shape across `web`, `static`, `dynamic` and `review`
  sources, with evidence, confidence, lifecycle status and a fix suggestion.
- **Verdict** - per-domain `PASS/WARN/FAIL`, an overall `PRODUCTION STATUS`, and
  ranked **Next Actions**.

External scanners are **detected, never bundled**. Install the ones you want on the
**Tools** page; each stage unlocks automatically and falls back to built-in checks
where it can.

## Requirements

- Node.js >= 20
- pnpm
- Chrome / Chromium (for the Lighthouse stage)

## Install & run

```bash
git clone <repository>
cd ace-check
pnpm install
pnpm dev
```

Open http://localhost:5173 for the GUI. The API server runs on 3210 in both modes;
during development Vite proxies `/api` to it.

Production build (single Node server serves UI + API on 3210):

```bash
pnpm build
pnpm start
# open http://localhost:3210
```

## Safety

Active scanners (Nmap, Nuclei, ZAP, ffuf) refuse any host that is not in the
project's **allowlist**, default to the **staging** URL, and require an explicit
authorisation acknowledgement. They are not run against production unless you
deliberately configure it.

## Where data lives

AceCheck writes **nothing into the repository**. All generated data goes to the
per-user application data directory:

| Platform | Location                          |
| -------- | --------------------------------- |
| Windows  | `%LOCALAPPDATA%\AceCheck`         |
| macOS    | `~/Library/Application Support/AceCheck` |
| Linux    | `$XDG_DATA_HOME/acecheck` (or `~/.local/share/acecheck`) |

```
<data root>/
  projects/<project-id>/runs/<run-id>/   stage findings, release report, artifacts
  scans/<run-id>/                        Lighthouse evidence for the web stage
  targets/<repo-name>-<hash>/            per-target state (finding statuses, review findings)
  logs/acecheck.log
```

The exact paths are shown on the **Tools** page, and the app never writes into
the audited project either. Override the root when you want to (CI, portable
installs, synced folders):

```bash
ACECHECK_DATA_DIR=D:\AceCheck-data pnpm dev
```

## Config file

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

## CLI (legacy)

The original single-shot scanner is still available:

```bash
pnpm run audit https://example.com
pnpm run audit https://example.com --pages 100
pnpm run audit https://example.com --codebase ./path/to/repo
```

> `pnpm audit` is reserved by pnpm's own security-audit command, so use
> `pnpm run audit`.

## Development

```bash
pnpm typecheck   # tsc for backend + frontend
pnpm test        # node:test suites
pnpm build       # production build
```

## Attribution & third-party licenses

AceCheck is MIT-licensed (see `LICENSE`). It stands on a lot of open source, and
the notices ship with it in two places:

- [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md) - every dependency with
  its version, license and copyright holder, plus the full text of each license
  and any bundled `NOTICE` files.
- The **Attribution & licenses** page in the app (footer link, or `/about`).

To regenerate both after a dependency change:

```bash
pnpm licenses
```

This runs `pnpm licenses list` and rewrites `THIRD-PARTY-NOTICES.md` and
`web/public/attributions.json`, so the attribution can never drift from the
lockfile.

### Licensing notes

A licence audit of the dependency tree (243 packages) found **no strong
copyleft** — no GPL, AGPL, LGPL, EPL or CDDL code is bundled, so AceCheck's MIT
license is compatible with everything it ships. Three points are worth knowing:

- **MPL-2.0** (`axe-core`, `lightningcss`): weak, file-level copyleft. We do not
  modify those files, so the obligation is attribution plus the license text,
  both of which are included.
- **CC-BY-4.0** (`caniuse-lite`): a data license requiring credit, which the
  notices provide.
- **Apache-2.0** dependencies with `NOTICE` files: their notice text is
  reproduced verbatim in `THIRD-PARTY-NOTICES.md`.

### External tools

AceCheck orchestrates separate security tools but never bundles or redistributes
them. Each is installed by you and governed by its own license:

| Tool | License |
| --- | --- |
| Semgrep CE | LGPL-2.1 |
| Gitleaks | MIT |
| OSV-Scanner | Apache-2.0 |
| ProjectDiscovery Nuclei | MIT |
| OWASP ZAP | Apache-2.0 |
| ffuf | MIT |
| Nmap | NPSL (GPLv2-based) |
| Docker Engine | Apache-2.0 |
| Node.js | MIT |
| Google Chrome / Chromium | Proprietary / BSD-3-Clause |

## License

MIT
