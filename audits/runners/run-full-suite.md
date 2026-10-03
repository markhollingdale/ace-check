# Run Full AI Review Suite

Executes **all 17 reviews** in the framework-defined order, then the **Meta-Review (990)**, then produces the Summary (999), then always generates the Specification (140) for every severity level that has findings.

This document is selected via option **20** in `run-review.md`.

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

## Execution Modes

The suite runs in one of two modes. Both produce the same 17 review reports; they differ only in
how the work is scheduled.

- **Sequential** - one review at a time, in the framework-defined order. Best for a single agent,
  or when you want each review to reuse the earlier reviews' Phase 1 documentation.
- **Parallel (subagents)** - delegate reviews to independent subagents that run concurrently. Best
  when the host supports subagents and wall-clock time matters. This is a **supported mode, not an
  exception** - choose it whenever it is faster, without needing special permission.

### Why the order exists (and why parallel still works)

The reviews are numbered in a **logical** order, not a hard execution dependency:

- Architecture (10) is first because its Phase 1 documentation (stack, structure, env vars, data
  model) is useful context for the rest.
- The anti-duplication rule works best when a later review can see earlier finding IDs.

Sequential mode gets that shared context for free. Parallel mode does **not** - each subagent works
from the framework and the codebase alone. That is acceptable because the suite **reconciles
afterwards**: the mandatory deduplication sweep and the Summary's severity calibration catch
overlaps, duplicates and inconsistent grading. Loss of shared context is a trade-off to note, not a
reason to block a parallel run.

### Rules for both modes

- Only the **Meta-Review (990), the Summary (999) and the Specification (140)** require every
  report to exist first; never start those until all 17 reviews are written.
- In parallel mode the **deduplication sweep is mandatory** - it is the price of running
  concurrently.
- Each report is owned by exactly one agent; never let two agents write the same file.
- Reports must follow the same framework (`20-review-framework.md`) and naming convention in either
  mode, so the outputs are interchangeable.

---

## Execution Steps

### 1. Prepare

- Determine the project name from `package.json` (name field) or the current folder name. Convert to lowercase with hyphens.
- Create the reports directory in the project under review (not in the framework repo):
  ```
  docs/ai-review/reports/
  ```

### 2. Run each review

Run the reviews below **sequentially in order**, or as **parallel subagents** (one review per
subagent) according to the execution mode above. The table defines the full set of reviews and
their report filenames; the order matters most in sequential mode.

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
| 17 | Abuse, Bot & Crawl Resilience (190) | `[project]-190-abuse-bot-resilience.md` | `[project]-190-abuse-bot-resilience-review.md` |

For each review:

1. Read the review document at `../reviews/[number]-[name]/[number]-[name].md`.
2. Execute **Phase 1** (descriptive documentation) → write the Phase 1 report.
3. Execute **Phase 2** (scored assessment) → write the Phase 2 report, following `20-review-framework.md` exactly.
4. **Checkpoint** - report one line of progress: score, finding count, critical/high totals. Continue without waiting for user input unless one of the following happens:
   - The review document requires a user decision.
   - A Critical finding needs immediate confirmation (e.g., suspected active data exposure).
   - The user interrupts.

Before starting a later review **in sequential mode**, skim the Phase 1 reports of the reviews already completed for facts you can reuse (stack, structure, env vars, data model) and the Phase 2 reports for finding IDs to reference. In parallel mode this step does not apply - the deduplication sweep and calibration reconcile afterwards.

### 3. Run the Meta-Review (990)

After the 17 reviews, before the Summary:

- Read `../reviews/990-meta-review/990-meta-review.md` and follow it.
- Write `[project]-990-meta-review.md`.
- The Meta-Review judges the **method** - coverage gaps, reviews to change, document defects,
  and project risks no review owned. It does not re-review the code.
- The Summary (999) consumes its coverage-gap section, so it must run **before** the Summary.

### 4. Produce the Summary (999)

When all 17 reviews and the Meta-Review (990) are complete:

- Read `../reviews/999-summary/999-summary.md` and follow it.
- Write `[project]-999-summary.md`.
- Perform the **severity-calibration pass** (Summary Phase 1.5) before aggregating, and record any re-grades in §4b.
- If any review was skipped, follow the Summary's partial-run warning rules.
- **Always include §6b Manual Runbooks & Pre-Live Gate** - if `docs/runbooks/pre-live-gate.md` is unsigned, the Summary must emit `⚠️ MANUAL GATE NOT SIGNED` and keep `Production Ready: PROVISIONAL` even if all code scores are green.

### 5. Produce the Specification (140) - mandatory

Generating the specification is **not optional** and is done without asking the user.

- Read `../reviews/140-specification/140-specification.md` and follow it.
- Generate a separate specification document for **every severity level that has findings** (Critical, High, Medium, Low), in that order: `[project]-140-specification-critical.md`, `-high.md`, `-medium.md`, `-low.md`.
- Skip any severity level with no findings and note the skip in the Summary - do not create an empty document.
- The specification is always produced at the end of a full-suite run; the user is never prompted for a severity level.

---

## Deduplication Across the Run

- If a later review surfaces an issue that an earlier finding ID already covers, **reference the existing ID** - do not create a duplicate finding.
- When reviews have overlapping scope (e.g., Security 20 vs Business Logic 160 on the same flow; Testing 150 vs Code Quality 60 on test maintainability), place the finding in the **owning review** per that review's "Do not duplicate" rules and reference it elsewhere.
- If a later review needs to contradict an earlier report, note the discrepancy in the Summary rather than silently rewriting the earlier report.

---

## Parallel Mode Details (subagents)

When running in parallel, delegate each review to its own subagent:

- Each subagent receives the full framework context (`20-review-framework.md`), the project name,
  and the exact report naming convention for its review.
- No two subagents write the same report file - each owns its review number.
- Do not parallelise the Meta-Review (990), the Summary (999) or the Specification (140) - they
  depend on every report.
- Subagents do not share context, so duplicates and grading drift are expected. The reconciliation
  below is what makes the mode safe.

### Reconciliation (mandatory after a parallel run)

After all subagents finish:

1. **Deduplication sweep** - read every report, find findings that duplicate each other, keep the
   one in the owning review, and replace the others with a reference to its ID. Note the sweep in
   the Summary.
2. **Severity calibration** - run the Summary's calibration pass (Phase 1.5) as normal; it also
   normalises any drift between independent subagents.
3. Only then run the Meta-Review (990), the Summary (999) and the Specification (140).

---

## Notes

- Review reports may contain sensitive information. Consider adding `docs/ai-review/reports/` to the project's `.gitignore`.
- The user may stop the run at any checkpoint; completed reviews remain valid, and the Summary can be produced from the partial set (with warnings).
- Do not begin writing any report until all prerequisite documents have been read.
