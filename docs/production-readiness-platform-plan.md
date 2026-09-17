# AceCheck — Production-Readiness / Release-Audit Platform Plan

> **Product name:** AceCheck · **Tagline:** *"Check everything. Ship with confidence."*

|                       |                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Project**           | AceCheck (project `ace-check`; renamed from repo `ace-site-audit` / package `site-audit`)           |
| **Date**              | 2026-08-14                                                                                          |
| **Framework Version** | ai-review v1.1.0 (the existing "Ace AI Review Framework", to be vendored into this repo — §6 Q1)    |
| **Author**            | opencode                                                                                            |
| **Status**            | **DRAFT v0.2 — decisions captured.** All §6 open questions resolved; phasing updated.               |
| **Source input**      | ChatGPT "production-readiness audit platform" draft + the existing Ace AI Review Framework          |
| **Prerequisites**     | The external `ai-review` collection (16 reviews + summary + specification) — to be copied in, then deleted |

> **STATUS:** This is a first-pass exploration plan. It is deliberately a
> *reconciliation* document: ChatGPT proposed a large, mostly-correct product
> vision **without knowing** that the Ace AI Review Framework already exists and
> already covers most of it. The core thesis of this plan is that we should **not**
> build 33 new audit prompts — we should **build the orchestrator, correlator, and
> release gate around the 16 reviews we already have**, and add a small set of
> deterministic (non-AI) checks the tool can run itself.
>
> **Decisions captured (2026-08-14):** the product is named **AceCheck** and the
> project is **`ace-check`** (renamed from `ace-site-audit`/`site-audit`); the
> ai-review framework is **vendored into this repo and becomes the source of
> truth** (the external copy is deleted); reports land in a hidden base-path folder
> (`.acecheck/`, gitignored) with in-app links; all **five** deterministic checks
> ship together; no new review modules yet. Details in §6 and §8.

---

## 1. Executive Summary

Today `ace-check` (the repo formerly `ace-site-audit`) is a **local-first website
technical auditor**: it crawls a site, runs Lighthouse, aggregates recurring issues,
and emits concise reports plus "AI-ready" Markdown prompts. It never calls an AI API
(a deliberate V1 non-goal).

**AceCheck** is the product name for its evolution into a release-audit platform.
The project itself is **`ace-check`**. The tagline — *"Check everything. Ship with
confidence."* — encodes the philosophy: over-audit the *input* (check every domain),
under-report the *output* (dedupe, correlate, prioritise to the handful that matter).

The **Ace AI Review Framework** is a structured,
versioned suite of **16 engineering reviews** (architecture, security, performance,
database, API, code quality, TypeScript, accessibility, SEO, production readiness,
cost, maintainability, testing, business logic, privacy, portability) plus a
**Summary** aggregator and a **Specification** generator. It already defines a
finding format (`SEC-004`, severity, category, evidence, recommendation), a scoring
model, deduplication rules, and an extension guide. It has already been used to
produce a full 16-review run for `local-events`.

The vision — a **production-readiness / release-audit platform** — is the marriage
of these two things:

> **"Give me a codebase and a deployed URL, and systematically find everything that
> could prevent this application being secure, reliable, performant, accessible,
> maintainable and production-ready — then tell me the handful of things that
> actually matter."**

The platform becomes a **three-source audit engine**:

1. **Web scan** (already built) — crawl + Lighthouse → aggregated site issues.
2. **Deterministic code checks** (new, no AI) — dependency audit, secrets scan,
   config audit, codebase hygiene. Fast, local, reproducible.
3. **AI code reviews** (the 16-review framework, orchestrated by the tool) — the
   deep reasoning layer, run by an external agent in V1 (paste a prompt / import a
   report), optionally a built-in API in a later phase.

Everything feeds a **unified finding store**, a **correlation layer** (Lighthouse
LCP regression ↔ the EventHero image in code), and a **release gate** that emits a
`PRODUCTION STATUS` verdict and a **release report**.

The **key strategic pushback** on the ChatGPT draft: *don't build 33 audit prompts;
build the machinery around the 16 we have.* Over-audit the *input* (check
everything), under-report the *output* (dedupe, correlate, prioritise) — which is
exactly the philosophy already baked into the current README.

---

## 2. Current-State Findings

### 2.1 What `ace-check` already does (evidence)

| Area         | Evidence                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Crawler      | `src/crawler/` — sitemap, `robots.txt`, internal links; URL normalisation + tracking-param stripping (`config.ts`, `ignoredQueryParams`) |
| Lighthouse   | `src/lighthouse/` — programmatic Lighthouse via `chrome-launcher`, mobile/desktop/both (`types.ts: DeviceMode`)                        |
| Scanner      | `src/scanner/scanner.ts` — orchestrates discovery → scan → analyse → report; `ScanStatus` lifecycle                                   |
| Analyser     | `src/analyser/` — `aggregation.ts`, `issues.ts`, `scoring.ts`, `priorities.ts`, `templates.ts` (template detection), `compare.ts`     |
| Reports      | `src/reports/` — `markdown.ts`, `json.ts`, `html.ts`, `prompts.ts` (AI-ready prompts), `zip.ts` (portable export)                     |
| Storage      | `src/storage/` — filesystem only, `scans/<id>/...` self-contained dirs, no DB                                                                  |
| Server / CLI | `src/server/server.ts` (Hono), `src/cli/cli.ts`; shared scanner/analyser code                                                          |
| Types        | `src/types.ts` — `ScanConfig`, `PageSummary`, `Issue`, `ScanSummary`, `ScanRecord`, `Severity` (`critical/high/medium/low/info`)      |
| Non-goals    | V1 spec (§3): no accounts, no DB, no cloud, **no built-in AI API**, no telemetry, no auto-fixes                                       |

Current `Issue` shape (`src/types.ts:80`) already carries `id`, `category`,
`severity`, `affectedPages`, `affectedTemplates`, `examples`, `likelyCommonCause` —
a strong foundation for a unified finding model.

### 2.2 What the Ace AI Review Framework already covers (evidence)

| Review                          | #   | Finding prefix |
| ------------------------------- | --- | -------------- |
| Architecture                    | 10  | `ARCH-`        |
| Security                        | 20  | `SEC-`         |
| Performance                     | 30  | `PERF-`        |
| Database                        | 40  | `DB-`          |
| API                             | 50  | `API-`         |
| Code Quality                    | 60  | `CQ-`          |
| TypeScript                      | 70  | `TS-`          |
| Accessibility                   | 80  | `A11Y-`        |
| SEO                             | 90  | `SEO-`         |
| Production Readiness            | 100 | `PR-`          |
| Cost Analysis                   | 110 | `COST-`        |
| Maintainability                 | 120 | `MAINT-`       |
| Testing                         | 150 | `TST-`         |
| Business Logic                  | 160 | `BL-`          |
| Privacy & Compliance            | 170 | `PRIV-`        |
| Portability & Reusability       | 180 | `PORT-`        |
| Summary (aggregator)            | 999 | —              |
| Specification (plan generator)  | 140 | —              |

Each review has **Phase 1** (descriptive documentation of the target) and
**Phase 2** (scored assessment), and follows a shared finding format
(`framework/20-review-framework.md`): ID, severity, category, problem, why-it-matters,
recommendation, example, effort. The suite has **deduplication rules**, a **Summary
that tolerates partial runs**, an **extension guide** (`30-adding-a-review.md`), and
a **runner** (`run-full-suite.md`). Reports land in the *reviewed project's*
`docs/ai-review/reports/[project]-NN-[name].md`.

### 2.3 Gaps this plan closes

1. The tool audits **deployed sites only** — it has no notion of a **codebase**.
2. The 16 reviews are run **manually** by pasting prompts; nothing orchestrates them,
   injects the codebase context, or correlates their findings with Lighthouse data.
3. No **deterministic** security/dependency/config checks (things that should be
   automated, not AI-reasoned).
4. No **unified finding model** across web and code findings; two separate severity
   vocabularies (`info` vs none) and no confidence/evidence standard.
5. No **release gate** or **release report** — the Summary (999) is a manual step.
6. No **audit profiles** (Web App / API / E-commerce / …) and no **finding lifecycle**.

---

## 3. Reconciling the ChatGPT draft — what we keep, change, or drop

This is the section ChatGPT could not write, because it did not know the framework
existed. Treat every ChatGPT idea as already-implemented, fold-into-existing, or
genuinely-new.

### 3.1 Already covered by an existing review (do not re-build)

Almost the entire ChatGPT domain list maps 1:1 onto the framework:

| ChatGPT domain           | Framework review(s)                             |
| ------------------------ | ----------------------------------------------- |
| Architecture             | 10 Architecture                                 |
| Security (auth/authz/input/secrets/frontend) | 20 Security (+ deterministic scans below) |
| Database (schema/perf/integrity) | 40 Database                              |
| API (inventory, abuse)   | 50 API (+ 20 Security's abuse coverage)         |
| Code Quality             | 60 Code Quality                                 |
| TypeScript               | 70 TypeScript                                   |
| Performance (static)     | 30 Performance                                  |
| Accessibility            | 80 Accessibility                                |
| SEO                      | 90 SEO                                          |
| Testing (critical paths) | 150 Testing                                     |
| Production / Deployment / Observability | 100 Production Readiness      |
| Cost                     | 110 Cost Analysis                               |
| Maintainability / hygiene | 120 Maintainability (+ 60 Code Quality)         |
| Business logic (states, time/date, currency) | 160 Business Logic               |
| Privacy / data           | 170 Privacy & Compliance                        |
| Release gate             | 999 Summary (adopted as the tool's gate)        |
| Release report           | 999 Summary output (adopted)                    |
| "Don't hallucinate / evidence" | 20-review-framework.md (finding format)   |
| Finding ID scheme        | existing `SEC-004` prefixes                     |

### 3.2 Genuinely new — but *deterministic*, not AI (the tool runs these itself)

These belong in the tool, not in a prompt, because they are mechanical and should be
reproducible/cheap:

| New check                    | What it does                                                            | Source data                      |
| ---------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| **Dependency audit**         | `pnpm/npm audit`, abandoned/deprecated/duplicate/outdated packages       | `package.json`, lockfile         |
| **Secrets scan**             | grep for keys/tokens/private keys/`.env` commits; flag `NEXT_PUBLIC_*`   | repo files, git history          |
| **Config audit**             | `tsconfig` strictness, `any`/`@ts-ignore` counts, ESLint disable counts   | `tsconfig.json`, `.eslintrc`     |
| **Environment audit**        | missing prod vars, client-exposed secrets, dev/prod drift                | `.env*`, `next.config` etc.      |
| **Codebase hygiene**         | dead code, `console.log`, `TODO/FIXME`, commented-out code, oversized files | repo files                    |
| **Abuse matrix (partial)**   | per-endpoint: auth / rate-limit / pagination / size limits (structural)  | route handlers / routers         |

> These produce findings in the **same schema** as the AI reviews, but with
> `source: 'static'`, `confidence: 'High'`, and precise `file:line` evidence — no
> AI needed, no hallucination risk. This is the ChatGPT "dependencies" + "config" +
> "secrets" + "hygiene" work, done right.

### 3.3 Genuinely new — *AI* reviews we could add to the framework (optional)

If we decide the following deserve dedicated review modules rather than being
handled inside existing reviews, they are added via `30-adding-a-review.md` (which
requires updating 5 coupled files + a smoke test). **Proposed, not decided:**

| Candidate new review            | Why it might deserve its own module                 | Home if not added                 |
| ------------------------------- | --------------------------------------------------- | --------------------------------- |
| Multi-Tenant Isolation / RLS    | ChatGPT's strongest "AI audits miss this" point     | Security 20 + Database 40         |
| Dependency & Supply-Chain Security | complements the deterministic audit with judgement | Security 20                       |
| Time / Date / Timezone          | events apps; DST/UTC/leap edge cases                | Business Logic 160                |
| Disaster / Failure Scenarios    | dependency-outage reasoning                         | Production Readiness 100          |

**Recommendation:** ship V1 with the **16 existing reviews + deterministic checks**,
and only add new review modules when a real project's run shows a systematic gap.
Adding a review is cheap but multiplying reviews dilutes the "11 things that matter"
output — the opposite of the product's promise.

### 3.4 Deliberately deferred / dropped from the ChatGPT draft

| Idea                       | Disposition                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| 33 independent prompts     | **Dropped.** Orchestrate the 16 existing reviews.                              |
| One giant AI prompt        | **Dropped.** Already the framework's anti-pattern (specialised modules).       |
| "Run all prompts" button   | **Re-framed.** V1 generates orchestrated prompts; a real API runner is Phase 4. |
| Internationalisation audit | **Scoped.** Fold into Business Logic 160 (hard-coded locale/currency assumptions). |
| Confidence scores          | **Kept** — extend finding schema (framework doesn't have them; it says "state assumptions"). |
| Finding lifecycle          | **Kept** — future phase (detected→confirmed→accepted→fixed→verified).          |
| Audit profiles             | **Kept** — future phase (subset of modules per app type).                      |

---

## 4. Product vision — the three-source audit engine

```
              ┌─────────────────────────────┐
              │         AUDIT TARGET        │
              │  deployed URL  +  codebase  │
              └──────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   WEB SCANNER         DETERMINISTIC           AI REVIEWS
   (existing)          CODE CHECKS             (16 modules)
   crawl+Lighthouse    deps/secrets/config     framework-orchestrated
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                   UNIFIED FINDING STORE
                (web + static + review findings)
                             │
                             ▼
                       CORRELATOR
          Lighthouse evidence ↔ code evidence ↔ findings
                             │
                             ▼
                       RELEASE GATE
         per-domain PASS/WARN/FAIL + PRODUCTION STATUS
                             │
               ┌─────────────┴─────────────┐
               ▼                           ▼
        RELEASE REPORT              AI-READY OUTPUT
        (human + JSON)         (condensed markdown / prompts)
```

### 4.1 Two inputs, not one

`AuditTarget` gains an optional `codebasePath` alongside the existing `url`:

```typescript
interface AuditTarget {
  url?: string;           // deployed site (existing scanner)
  codebasePath?: string;  // local repo (new: deterministic checks + AI reviews)
}
```

- **URL only** → today's behaviour (web scanner).
- **Codebase only** → deterministic checks + AI-review prompt/report generation.
- **Both** → full production-readiness audit with correlation (the flagship mode).

### 4.2 Audit modules = the framework reviews, registered not hard-coded

The tool reads the ai-review framework — **vendored into this repo at `audits/`**
(see §6 Q1) — and builds a **module manifest**:

```typescript
interface AuditModule {
  number: number;            // 10..180
  name: string;              // "Security"
  prefix: string;            // "SEC"
  category: string;          // maps to a tool Category / domain
  phase1Doc: string;         // path to Phase 1 instructions
  phase2Doc: string;         // path to Phase 2 instructions
  requiresCodebase: boolean; // e.g. true for architecture; false for none
  consumesWebScan: boolean;  // e.g. Performance/Accessibility/SEO want Lighthouse evidence
}
```

This mirrors ChatGPT's "structured Audit Module" idea (§33 of the draft) — but the
"modules" already exist on disk; we register them, we don't author them.

### 4.3 Unified finding model

Extend `src/types.ts` so web, static, and review findings share one shape. The goal:
one store, one severity axis, one correlation key, always traceable to evidence.

```typescript
type FindingSource = 'web' | 'static' | 'review';

interface Finding {
  // identity
  id: string;                    // Lighthouse audit id | static id | review id ("SEC-004")
  source: FindingSource;
  moduleNumber?: number;         // review number (10..180) for review findings
  prefix?: string;               // "SEC", "PERF", ...

  // classification
  category: string;              // unified: performance/accessibility/seo/security/...
  domain: string;                // release-gate bucket: SECURITY, DATABASE, API, ...
  severity: Severity;            // existing critical/high/medium/low/info (review: low maps, info unused)
  confidence: 'High' | 'Medium' | 'Low';  // NEW — ChatGPT's anti-hallucination point

  // evidence
  title: string;
  description: string;
  evidence: FindingEvidence;
  recommendation?: string;
  effort?: string;               // from framework "Estimated Fix Time"

  // correlation
  correlationKeys: string[];     // e.g. ['lcp', 'image-optimization'] or ['event-image']
  affectedPages?: string[];      // web findings
  affectedFiles?: string[];      // code findings
  status: FindingStatus;         // detected → confirmed → fixed → verified (future)
}

interface FindingEvidence {
  file?: string;                 // review/static: src/components/EventHero.tsx
  line?: number;
  url?: string;                  // web: /events/123
  auditId?: string;              // web: lighthouse audit id
  numericValue?: number | null;
  proof: 'confirmed' | 'likely' | 'possible';  // ChatGPT's evidence tiers
}
```

The existing `Issue` becomes the `web` source of this model (its fields map
cleanly: `affectedPages` → `affectedPages`, `likelyCommonCause` → a correlation key).

### 4.4 Correlation (the feature that makes this more than "Lighthouse + prompts")

Correlate across sources by **shared keys**. Examples:

| Web finding (Lighthouse)                    | Code finding (review/static)                 | Key                    |
| ------------------------------------------- | -------------------------------------------- | ---------------------- |
| Poor LCP on `/events/*`                     | EventHero image unoptimized (`next/image` missing `sizes`) | `lcp`, `image-optimization` |
| `uses-optimized-images` on 183 pages        | EventCard renders full-resolution images     | `image-optimization`   |
| `color-contrast` failures on venue pages    | hard-coded `#6b7280` on `--muted`            | `contrast`             |
| `total-byte-weight` high, large third-party | unused client bundle / heavy deps (static)   | `bundle-size`          |

The correlator does **not** invent links: it attaches a web finding to a code
finding only when both share an explicit key **and** evidence, and marks the link
`confirmed | likely | possible`. The output is ChatGPT's "Lighthouse shows X; code
shows Y" correlation, with an honesty label.

### 4.5 Release gate + release report

Adopt the framework's **Summary (999)** format as the gate. The tool computes:

```
SECURITY          PASS
AUTHORIZATION     WARN     (folded under Security domain in V1)
DATABASE          PASS
API               WARN
PERFORMANCE       PASS
ACCESSIBILITY     PASS
SEO               WARN
TESTING           WARN
OBSERVABILITY     FAIL
DEPLOYMENT        PASS
BUSINESS LOGIC    WARN
DEPENDENCIES      PASS
─────────────────────────────
PRODUCTION STATUS: 🔴 NOT READY / 🟡 CONDITIONAL / 🟢 READY
Critical: 3   High: 7   Medium: 14   Low: 21
```

The **release report** is the human-facing artifact (blocking / required-before /
recommended-before / post-release, matching the framework's Remediation Roadmap),
plus a **condensed AI-ready markdown** and **structured JSON** — the same "less but
more useful" principle as today's `ai-audit.md`.

---

## 5. Goals and Non-Goals

### Goals (V1 of this expansion)

- Accept a **codebase** (path) in addition to a **URL** (CLI + GUI).
- **Register** the 16-review framework as audit modules (config-driven manifest).
- Run a set of **deterministic checks** (deps, secrets, config, env, hygiene) locally.
- **Generate orchestrated AI-review prompts** (per-module + full-suite) with
  auto-injected Phase 1 context and correlated web-scan evidence — no AI API.
- **Ingest** a pasted/imported AI review report into structured findings.
- **Unify** web + static + review findings into one store with evidence + confidence.
- **Correlate** Lighthouse findings with code findings by shared keys.
- Emit a **release gate** + **release report** (human, JSON, AI-ready).
- Keep everything **local-first**, filesystem-stored, no accounts, no telemetry.

### Non-Goals (explicitly out of V1)

- Built-in AI API calls (stays out — remains a Phase 4 optional feature).
- Writing reports into a *version-controlled* location in the target project
  (reports go to a gitignored `.acecheck/` folder in the target's base path — §6 Q2).
- Auto-fixing code, auto-deploying, auto-running DB migrations.
- A database (filesystem stays the store).
- AuthN/accounts/SaaS/multi-user.
- New AI review modules (deferred until evidence demands them — §3.3).
- i18n as a separate domain (folded into Business Logic).

---

## 6. Resolved decisions (was: open questions)

All seven questions answered (2026-08-14). Where the answer was "go with your
preferred option", the original lean is adopted.

1. **Where does the ai-review framework live?** → **Vendored into this repo as
   `audits/`, and it becomes the source of truth.** The external copy of the
   `ai-review` collection is deleted. Phase 0 also normalises the
   runner's internal relative paths (they currently assume a different layout).
2. **Where do reports get written?** → **A hidden base-path folder in the target
   project, `.acecheck/`, gitignored** (the `.unlighthouse` pattern). The app must
   provide **links to every generated report**. URL-only audits (no codebase) keep
   using the tool's own `scans/` dir.
3. **How are correlation links surfaced?** → **Show them with a
   `possible / likely / confirmed` badge, but never count a link as a hard finding
   until `confirmed`.**
4. **How is `info` handled?** → **Web-only; never blocks a release gate.** The
   gate's floor stays `Low` (framework-aligned).
5. **Which deterministic checks ship first?** → **All five** (deps, secrets,
   config, env, hygiene) in Phase 1. Over-audit is the point.
6. **Add new review modules now?** → **No — wait for evidence** from a real run.
7. **Naming.** → **Product: AceCheck; project: `ace-check`** (renamed from
   `ace-site-audit`). Tagline: *"Check everything. Ship with confidence."*

---

## 7. Phasing

### Phase 0 — Foundation & reconciliation (rename + vendor + schema + module registry)

**Goal:** rename the project to `ace-check`, vendor the ai-review framework as the
source of truth, land the unified finding types, and prove the framework can be read
as a module manifest.

**Estimated effort:** 3–4 hours.

**Status:** DONE (2026-08-14) — verified: `discoverModules()` returns 16 modules,
`pnpm typecheck` passes.

- [x] Rename project → `ace-check`: repo folder, `package.json` (`name` → `ace-check`,
      `bin.acecheck` → `dist/cli/cli.js`), workspace package `site-audit-web` →
      `ace-check-web`, config file `site-audit.config.json` → `acecheck.config.json`,
      README/branding/tagline, `.gitignore` (`scans/` + `.acecheck/`).
- [x] Vendor the external `ai-review` collection → `audits/` (framework + reviews +
      runners + README). External copy left in place for the user to delete.
- [x] Normalise the runner's internal relative paths (`run-review.md`,
      `run-full-suite.md`) for the new `audits/` layout (`../ai-review/` → `../`).
- [x] This plan approved / updated per §6 resolved decisions.
- [x] `docs/` folder created; decision log maintained in this file.
- [x] `src/types.ts` extended with `AuditTarget`, `AuditModule`, `Finding`,
      `FindingSource`, `FindingEvidence`, `FindingStatus`, `ReleaseGate`.
- [x] New `src/audit/` module: `modules.ts` (reads `audits/` → `AuditModule[]`
      manifest, with a small hand-written `module-catalog.ts` mapping review
      number → prefix/category/domain/`consumesWebScan`).
- [x] New `src/audit/correlate.ts` skeleton with the `correlationKeys` vocabulary.
- [x] `pnpm typecheck` passes.

### Phase 1 — Deterministic code checks (the "no-AI" wins)

**Goal:** the tool itself runs the mechanical checks ChatGPT described — all five —
with no AI.

**Estimated effort:** 6–10 hours.

**Status:** DONE (2026-08-14) — all five checks, CLI `--codebase`, server
`POST /api/checks`, 6 tests passing, `pnpm typecheck` green, and the "Code checks"
GUI (now the **Code checks** tab of the unified `AuditPage`).

- [x] `src/audit/checks/dependencies.ts` — `pnpm/npm audit` + `outdated`.
      (Deprecated/duplicate/abandoned detection deferred — harder to do reliably.)
- [x] `src/audit/checks/secrets.ts` — regex scans for keys/tokens/private keys
      (AWS, GitHub, Stripe, Slack, OpenAI, private-key blocks, DB URLs, generic
      secret assignments). `NEXT_PUBLIC_*`/client-exposed flags live in `env.ts`.
- [x] `src/audit/checks/config.ts` — `tsconfig` strictness, unsafe-`any` count,
      `@ts-ignore` count, `eslint-disable` count.
- [x] `src/audit/checks/env.ts` — ungitignored `.env`, client-exposed secrets,
      missing vars vs `.env.example`.
- [x] `src/audit/checks/hygiene.ts` — `console.*`, `TODO/FIXME`, oversized files.
- [x] Each check emits `Finding` records (`source: 'static'`, `confidence: 'High'`,
      `file:line` evidence); CLI `--codebase` writes `.acecheck/checks.json`.
- [x] GUI "Code checks" tab — implemented as `CodeChecksPanel` in the unified `AuditPage` (`/audit`).
- [x] Unit tests per check against a temp fixture repo (`pnpm test`, 6 passing).
- [x] `pnpm typecheck` passes. (`pnpm lint` not configured in this repo — no ESLint.)

### Phase 2 — Audit-module orchestration + prompt generation + report ingestion

**Goal:** generate per-module and full-suite AI-review prompts with injected context,
and close the loop by ingesting the resulting report.

**Estimated effort:** 8–14 hours.

**Status:** DONE (2026-08-14) — prompts + ingestion + endpoints + GUI, 4 ingest
tests passing. GUI lives in the `AiReviewsPanel` of the unified `AuditPage`.

- [x] `src/audit/prompts.ts` — per-module prompt (`generateModulePrompt`) with
      auto-generated Phase 1 context (name, stack, tree, env keys); full-suite
      prompt (`generateFullSuitePrompt`) mirroring `run-full-suite.md`.
- [x] `src/audit/ingest.ts` — `parseReviewReport` + `extractField` + `extractFiles`
      parse the framework's `## SEC-004` / `## Severity` / `## Problem` format into
      `Finding[]`.
- [x] Server endpoints: `GET /api/reviews`, `POST /api/reviews/prompt`,
      `POST /api/reviews/suite-prompt`, `POST /api/reviews/ingest`.
- [x] GUI: module list, per-module "Copy prompt", full-suite "Copy prompt",
      "Import report" — as `AiReviewsPanel` in `AuditPage`.
- [x] Round-trip tests: `parseReviewReport` fixture (SEC-001/SEC-002) verifies ID,
      severity, domain, confidence, effort, and file extraction.
- [x] `pnpm typecheck` passes. (`pnpm lint` not configured.)

### Phase 3 — Correlation + release gate + release report (the flagship)

**Goal:** unify everything into one store and emit the verdict.

**Estimated effort:** 8–12 hours.

**Status:** DONE (2026-08-14) — gate + correlation + release report + GUI, 8 gate/
correlation tests passing, end-to-end `/api/release` smoke verified (`NOT_READY`,
2 domains, report generated).

- [x] `src/audit/correlate.ts` — `issueToFinding` (web `Issue` → unified `Finding`),
      `correlationKeysForIssue`, and `correlate()` linking web ↔ static/review by
      `correlationKeys`, tagged `confirmed|likely|possible`.
- [x] `src/audit/gate.ts` — `buildReleaseGate`: per-domain PASS/WARN/FAIL from
      severity + confidence (low-confidence downgrades one step), overall
      `PRODUCTION STATUS` (READY/CONDITIONAL/NOT_READY/UNKNOWN).
- [x] `src/audit/release-report.ts` — human Markdown + condensed AI-ready Markdown;
      review findings persist to `.acecheck/review-findings.json`.
- [x] GUI: "Release gate" tab in `AuditPage` — status banner, domain matrix,
      correlation hints, copyable release report.
- [x] Deviation: release report is returned to the GUI (copy/save) rather than
      auto-written to `scans/<id>/` — trivially addable later if wanted.
- [x] End-to-end fixture test: `buildReleaseGate` + `correlate` covered by
      `gate.test.ts` (8 tests); `/api/release` smoke-tested.
- [x] `pnpm typecheck` passes. (`pnpm lint` not configured.)

### Phase 4 — Optional: AI API, audit profiles, finding lifecycle

**Goal:** the deferred "nice-to-haves", only if demand justifies them.

**Status:** DONE (2026-08-14) — 7 tests passing; endpoint smoke verified
(`profiles=6`, API profile → 14 modules, lifecycle round-trip, AI runner gated on
config).

- [x] Audit profiles (`src/audit/profiles.ts`): Web App, Next.js, API/Backend,
      Content Site, E-commerce, SaaS — each selects a review-module subset;
      exposed via `GET /api/reviews/profiles`, filters `GET /api/reviews` and the
      full-suite prompt scope. GUI profile dropdown in `AiReviewsPanel`.
- [x] Pluggable AI provider (`src/audit/ai-runner.ts`): OpenAI-compatible
      `chat/completions` client configured via `ACE_AI_API_KEY` /
      `ACE_AI_BASE_URL` / `ACE_AI_MODEL`. `POST /api/reviews/run` runs a module
      in-tool and returns the report; GUI "Run" button per module. Returns 400
      with a clear message when unconfigured.
- [x] Finding lifecycle (`src/audit/lifecycle.ts`): status persisted to
      `.acecheck/finding-status.json`; `GET/POST /api/findings/status`; the
      release gate excludes `fixed`/`verified` findings; GUI status dropdowns in
      the Release gate tab.
- [x] `pnpm typecheck`, `pnpm test` (25 tests) pass.

---

## 8. Decision log

| #   | Decision                                                                                   | Rationale                                                                                                     |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 001 | Reuse the 16-review framework; do **not** author 33 new prompts                            | The framework already covers ChatGPT's domains with a versioned, deduplicated, evidence-based format            |
| 002 | Three finding sources: `web` (Lighthouse), `static` (deterministic), `review` (AI)         | Mechanical checks must be reproducible and non-hallucinating; only the reasoning layer should be AI             |
| 003 | All five deterministic checks ship in V1 (deps, secrets, config, env, hygiene) | Over-audit is the point; zero AI cost; directly answers ChatGPT's dependency/config/secrets sections           |
| 004 | V1 stays **no built-in AI API** (prompt-out / report-in)                                   | Preserves the existing V1 non-goal; an external agent is already how the framework is run today                 |
| 005 | Unified `Finding` model with `confidence` + `evidence.proof`                               | ChatGPT's anti-hallucination requirement; static = `High`, review = stated, correlation links labelled          |
| 006 | Release gate adopts the framework's Summary (999) shape + severity vocabulary              | Keeps tool output compatible with the reports the user already generates for `local-events`                     |
| 007 | New review modules deferred until a real run proves a gap                                  | Adding reviews dilutes the "11 things that matter" promise; extension guide already exists                       |
| 008 | ~~Reports stay in the scan dir; "export into target repo" opt-in~~ **SUPERSEDED by 013** | —                                                                                                               |
| 009 | `info` severity is web-only and never blocks a gate                                        | Framework's floor is `Low`; keeps the gate's severity axis aligned with the framework                           |
| 010 | `correlationKeys` vocabulary is curated, not free-form                                     | Correlation must be predictable and explainable; keys map to Lighthouse audit ids + known code patterns         |
| 011 | Product name **AceCheck**; project renamed to **`ace-check`**                              | Branding decision; tagline "Check everything. Ship with confidence."                                            |
| 012 | Vendor ai-review framework into `audits/` as the **source of truth**; delete external copy | Self-contained + distributable; one place to evolve the framework                                              |
| 013 | Reports → `.acecheck/` in the target base path (gitignored) + in-app links to every report | `.unlighthouse` pattern; reports live next to the code without ever entering source control                    |
| 014 | Correlation links shown with a `possible/likely/confirmed` badge; never hard until confirmed | Honesty over volume; prevents false confidence in cross-source claims                                          |
| 015 | `info` severity is web-only and never blocks a gate                                        | Framework's floor is `Low`; keeps the gate's severity axis aligned with the framework                          |
| 016 | All five deterministic checks ship together in Phase 1                                    | "Over-audit" is the product promise; the five are cheap and mechanical                                          |

---

## 9. Recommended file inventory

| File / path                                  | Purpose                                                          | Phase |
| -------------------------------------------- | ---------------------------------------------------------------- | ----- |
| `docs/production-readiness-platform-plan.md` | this plan                                                        | 0     |
| `audits/` (vendored)                         | the ai-review framework (source of truth): framework/reviews/runners | 0  |
| `src/types.ts` (extend)                      | `AuditTarget`, `AuditModule`, `Finding`, `ReleaseGate` types     | 0     |
| `src/audit/modules.ts`                       | read `audits/` → `AuditModule[]` manifest                        | 0     |
| `src/audit/module-catalog.ts`                | review-number → prefix/category/domain/`consumesWebScan` mapping | 0     |
| `src/audit/correlate.ts`                     | cross-source correlation by `correlationKeys`                    | 0/3   |
| `src/audit/checks/dependencies.ts`           | dependency audit                                                  | 1     |
| `src/audit/checks/secrets.ts`                | secrets scan                                                      | 1     |
| `src/audit/checks/config.ts`                 | tsconfig/eslint audit                                          | 1     |
| `src/audit/checks/env.ts`                    | environment-variable / client-secret audit                     | 1     |
| `src/audit/checks/hygiene.ts`                | dead code / TODO / console / oversized files                      | 1     |
| `src/audit/prompts.ts`                       | per-module + full-suite prompt builder                           | 2     |
| `src/audit/ingest.ts`                        | parse review report → `Finding[]`                                | 2     |
| `src/audit/gate.ts`                          | domain verdicts + `PRODUCTION STATUS`                            | 3     |
| `src/audit/release-report.ts`                | human / JSON / AI-ready release report                           | 3     |
| `src/cli/cli.ts` (extend)                    | `--codebase`, `--reviews`, `--checks`, `--release` flags         | 1–3   |
| `src/server/server.ts` (extend)              | audit endpoints for the GUI                                       | 1–3   |
| `web/src/...` (extend)                       | "Code checks", "AI Reviews", "Release" tabs                       | 1–3   |

---

## 10. Out of scope (explicitly)

- Built-in AI API calls (Phase 4).
- Auto-fixing, auto-deploy, auto-migration, or any write into the audited project.
- A database / accounts / cloud / telemetry.
- Turning this into a SaaS.
- Legal advice (privacy audit stays technical).
- i18n as a standalone domain.
- New review modules until evidence demands them.

---

## 11. Manual testing plan (as phases land)

### Phase 1 — deterministic checks
1. Point `--codebase` at a repo with a known committed secret → secrets check flags it with `file:line`.
2. Run dependency audit on a repo with an outdated package → finding with severity + remediation.
3. Repo with `strict: false` → config check flags it; repo with `strict: true` → no finding.

### Phase 2 — prompt/ingest round-trip
1. Generate the Security prompt → confirm it embeds project name, stack, and (if a scan exists) correlated Lighthouse evidence.
2. Paste a fixture Security report → confirm `SEC-00X` findings ingest with correct severity/effort.
3. Feed a deliberately malformed report → confirm a clear error, no partial writes.

### Phase 3 — correlation + gate
1. Run a small site + repo fixture with one planted LCP↔image cause → confirm the correlator emits a `confirmed` link.
2. Confirm the gate drops from READY to NOT READY when a single `Critical` + `High`-confidence finding is added.
3. Confirm `release-report.md`, `.json`, and AI-ready markdown all render the same verdict and counts.

---

## 12. Suggested next steps

1. **Execute Phase 0** — rename to `ace-check`, vendor `audits/`, delete the external
   framework copy, land the unified types + module registry.
2. **Pick a pilot target** — run the expansion against `local-events` (it already has
   a full 16-review run to diff against), or against `ace-check` itself as dogfood.
3. **Ship Phase 0 + Phase 1** (small, high-confidence), then decide whether the
   prompt/ingest loop or the gate is the better Phase 2 priority.
4. Re-run the Ace AI Review suite on *this plan's* code once Phase 1–3 land, using the
   tool on itself.
