# Run Full AI Review Suite

Executes **all 16 reviews** in the framework-defined order, then produces the Summary (999). The Specification (140) is generated afterwards only if the user asks.

This document is selected via option **19** in `run-review.md`.

---

## Prerequisite Reading

Resolve all paths **relative to this file**:

```
../README.md
../framework/10-readme.md
../framework/20-review-framework.md
```

Read them in order before doing anything else.

---

## Mode: Sequential (default - recommended)

The full suite runs **sequentially, in the framework-defined order**. Do not parallelise unless the user explicitly asks (see below).

Why sequential:

- **Earlier reports inform later reviews.** Each review's Phase 1 documentation (technology stack, project structure, environment variables, data model) is reused by later reviews instead of being re-discovered. Architecture (10) is first because it documents the foundation everything else builds on.
- **The deduplication rule works best with shared context.** Reviews must reference existing finding IDs from earlier reports instead of duplicating them (e.g., a money-flow finding belongs in Business Logic 160, not in Testing 150's coverage notes).
- **One shared context produces consistency**: one project name, one report style, no naming collisions, no contradictory findings.
- **The Summary requires all 16 reports anyway** - a parallel run still needs a sequential aggregation pass at the end.
- **Parallelism multiplies cost**: N agents re-read the same codebase independently instead of reusing earlier Phase 1 docs.

---

## Execution Steps

### 1. Prepare

- Determine the project name from `package.json` (name field) or the current folder name. Convert to lowercase with hyphens.
- Create the reports directory in the project under review (not in the framework repo):
  ```
  docs/ai-review/reports/
  ```

### 2. Run each review, in order

| # | Review | Phase 1 Report | Phase 2 Report |
|---|--------|----------------|----------------|
| 1 | Architecture (10) | `[project]-10-architecture.md` | `[project]-10-architecture-review.md` |
| 2 | Security (20) | `[project]-20-security.md` | `[project]-20-security-review.md` |
| 3 | Performance (30) | `[project]-30-performance.md` | `[project]-30-performance-review.md` |
| 4 | Database (40) | `[project]-40-database.md` | `[project]-40-database-review.md` |
| 5 | API (50) | `[project]-50-api.md` | `[project]-50-api-review.md` |
| 6 | Code Quality (60) | `[project]-60-code-quality.md` | `[project]-60-code-quality-review.md` |
| 7 | TypeScript (70) | `[project]-70-typescript.md` | `[project]-70-typescript-review.md` |
| 8 | Accessibility (80) | `[project]-80-accessibility.md` | `[project]-80-accessibility-review.md` |
| 9 | SEO (90) | `[project]-90-seo.md` | `[project]-90-seo-review.md` |
| 10 | Production Readiness (100) | `[project]-100-production-readiness.md` | `[project]-100-production-readiness-review.md` |
| 11 | Cost Analysis (110) | `[project]-110-cost-analysis.md` | `[project]-110-cost-analysis-review.md` |
| 12 | Maintainability (120) | `[project]-120-maintainability.md` | `[project]-120-maintainability-review.md` |
| 13 | Testing (150) | `[project]-150-testing.md` | `[project]-150-testing-review.md` |
| 14 | Business Logic (160) | `[project]-160-business-logic.md` | `[project]-160-business-logic-review.md` |
| 15 | Privacy & Compliance (170) | `[project]-170-privacy-compliance.md` | `[project]-170-privacy-compliance-review.md` |
| 16 | Portability & Reusability (180) | `[project]-180-portability.md` | `[project]-180-portability-review.md` |

For each review:

1. Read the review document at `../reviews/[number]-[name]/[number]-[name].md`.
2. Execute **Phase 1** (descriptive documentation) → write the Phase 1 report.
3. Execute **Phase 2** (scored assessment) → write the Phase 2 report, following `20-review-framework.md` exactly.
4. **Checkpoint** - report one line of progress: score, finding count, critical/high totals. Continue without waiting for user input unless one of the following happens:
   - The review document requires a user decision.
   - A Critical finding needs immediate confirmation (e.g., suspected active data exposure).
   - The user interrupts.

Before starting a later review, **skim the Phase 1 reports of the reviews already completed** for facts you can reuse (stack, structure, env vars, data model) and the Phase 2 reports for finding IDs to reference.

### 3. Produce the Summary (999)

When all 16 reviews are complete:

- Read `../reviews/999-summary/999-summary.md` and follow it.
- Write `[project]-999-summary.md`.
- If any review was skipped, follow the Summary's partial-run warning rules.
- **Always include §6b Manual Runbooks & Pre-Live Gate** - if `docs/runbooks/pre-live-gate.md` is unsigned, the Summary must emit `⚠️ MANUAL GATE NOT SIGNED` and keep `Production Ready: PROVISIONAL` even if all code scores are green.

### 4. Offer the Specification (140)

Ask the user whether to generate an implementation specification (and at which severity level). Only generate it if asked - it is optional output.

---

## Deduplication Across the Run

- If a later review surfaces an issue that an earlier finding ID already covers, **reference the existing ID** - do not create a duplicate finding.
- When reviews have overlapping scope (e.g., Security 20 vs Business Logic 160 on the same flow; Testing 150 vs Code Quality 60 on test maintainability), place the finding in the **owning review** per that review's "Do not duplicate" rules and reference it elsewhere.
- If a later review needs to contradict an earlier report, note the discrepancy in the Summary rather than silently rewriting the earlier report.

---

## If the User Asks for Parallel Execution

Explain the trade-offs above, then - if the user still wants it - proceed as follows:

- Reviews are **independent analysis tasks** and may be delegated to subagents, subject to:
  - Each subagent receives the full framework context (`20-review-framework.md`) and the exact project name + report naming convention.
  - No two subagents write the same report file (each owns its review numbers).
  - Do not parallelise the Summary or the Specification - they depend on all reports.
- After all subagents finish, perform a **deduplication sweep**: read every report, find findings that duplicate each other, keep the one in the owning review, and add references to the others. Note the sweep in the Summary.
- The Summary (999) must wait until every report exists.

---

## Notes

- Review reports may contain sensitive information. Consider adding `docs/ai-review/reports/` to the project's `.gitignore`.
- The user may stop the run at any checkpoint; completed reviews remain valid, and the Summary can be produced from the partial set (with warnings).
- Do not begin writing any report until all prerequisite documents have been read.
