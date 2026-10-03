# Review Methodology & Self-Critique (Meta-Review)

Version: **v2.0.0**

## Objective

Review **the review process itself** - this run's reports, the review specifications, the
runner, and the shared framework - rather than the project's code.

This document exists because a suite of reviews can be internally consistent, score well,
and still miss whole classes of risk. The code reviews judge the product; this review judges
**the method used to judge the product**.

The Meta-Review must answer five questions:

1. **What did the process miss?** Risk classes that no review owns, so a defect there would
   go unreported even after a "complete" run.
2. **What should be reviewed differently?** Reviews that are over-broad, under-scoped,
   duplicated, or scored in a way that hides uncertainty.
3. **What is wrong with the documents?** Stale text, contradictions, ambiguity, or
   instructions an agent cannot follow literally.
4. **What concrete problems did this run not cover?** Evidence-backed project issues that
   fell between the existing reviews (not a re-run of the code reviews - a search for what
   they did not look at).
5. **What should change before the next cycle?** Additive, specific, and prioritised.

This document does **not** fix code, and it does **not** repeat findings the code reviews
already made. It is the suite's self-critique step.

All output must still follow the shared report conventions in:

```
framework/20-review-framework.md
```

---

# Numbering

The Meta-Review is locked at **990**. It sits after the numbered code reviews (10-190) and
before the Summary (999), so the Summary can consolidate its coverage-gap findings. Do not
renumber it.

---

# Prerequisites

Read the shared framework documents (these are inlined into this prompt):

```
README.md
framework/10-readme.md
framework/20-review-framework.md
```

Then read every artefact the current run produced in the project under review:

```
docs/ai-review/reports/
```

The Meta-Review may run on a **partial set** of reports. If reports are missing:

- List every missing report in a warning block (as the Summary does).
- Do not silently assume coverage - a missing review is itself a coverage gap.
- State clearly that the method verdict is provisional.

Also read the run inputs, not just the outputs:

- The review specification documents actually used, when available (they are inlined in a full-suite run). If they are not inlined, reconstruct each review's scope from the framework review list and the report's own scope/ownership statements.
- The framework version recorded in each report header.
- The runner mode (sequential or parallel) if the Summary records it.

---

# Phase 1 - Reconstruct the Run

Before judging the method, reconstruct what actually ran. Record:

- Which numbered reviews produced reports, and which were skipped or missing.
- The framework version in the headers (are they all the same version?).
- Whether any report is stale relative to the current code (dates, commit anchors if present).
- Whether the run was sequential or parallel, and whether a deduplication sweep was recorded.
- Which project risks were **in scope** of at least one review, and which were **outside every
  review's stated scope** (read the "Do not review" / ownership blocks in each spec).

This reconstruction is what makes the coverage analysis possible - a gap is only a gap if no
review's scope claimed it.

---

# Phase 2 - Meta-Review Report

Create:

```
docs/ai-review/reports/[project-name]-990-meta-review.md
```

The report must contain the sections below.

---

## 1. Warning Block

If any expected review report is missing, open with the same partial-run warning format used
by the Summary, naming every missing report. The method verdict is provisional while reports
are missing.

---

## 2. Method Verdict

State, in one line, how much confidence the run's output deserves as a release gate:

```
Method Confidence: HIGH / MEDIUM / LOW / PROVISIONAL
```

Explain why. A green set of code scores is **not** sufficient for `HIGH` if coverage gaps
(§4) or document defects (§6) undermine the result.

---

## 3. What the Process Does Well

List the design decisions in the suite worth keeping. This is deliberately required: a
self-critique that only lists faults is not credible, and it loses good decisions in a rewrite.

Examples to look for: shared output contract, explicit ownership / anti-duplication rules,
evidence-first behaviour, manual-gate awareness, partial-run honesty, actionable downstream
specification.

---

## 4. Coverage Gaps (Risk Classes No Review Owns)

This is the highest-value section. Identify **categories of risk that no review's scope
includes**, so a defect there is invisible to a "complete" run.

For each gap, record:

| Domain | Why it matters | Present in this project? (evidence) | Owning candidate |
|--------|----------------|--------------------------------------|------------------|

Rules:

- Base every gap on a review spec's stated scope - cite the reviews you checked.
- For each gap, say whether the project **actually has the surface** today, with file/env
  evidence. Mark genuinely hypothetical gaps as `not present`.
- Typical gap families to test explicitly (adapt to the project): data licensing / third-party
  data attribution and outbound crawler robots/ToS compliance; tax, VAT and consumer-protection
  compliance; email deliverability and messaging compliance (SPF/DKIM/DMARC, List-Unsubscribe);
  search relevance and ranking correctness; internationalisation, localisation and timezone
  correctness; software licensing / IP (copyleft contamination); operator safety and
  reversibility of destructive/bulk admin actions; browser/device support; analytics and
  data-pipeline trust-boundary correctness.
- A gap is only actionable if the project has the surface - prefer evidence over speculation.

---

## 5. Reviews That Should Be Done Differently

For each existing review that needs a change, state the review number, the problem, and the
proposed change. Look for:

- **Overloaded reviews** carrying two or three reviews' worth of scope (deep security vs.
  abuse/bot resilience, for example) - propose a split.
- **Duplicate effort** where several reviews triple-count one root cause - propose a shared
  root-cause register so one cause is one row and one effort estimate.
- **Scores that blend verified and unverified facts** - propose splitting a score into
  "verified" and "assumed/UNKNOWN", or marking dashboard-only items explicitly.
- **Reviews that cannot verify what they score** (production dashboards, third-party state) -
  require them to mark items `UNKNOWN` rather than folding them into a 0-100 grade.
- **Ambiguous instructions** that block evidence gathering (for example, a "do not run commands"
  project rule versus a review that needs a test result) - clarify what is permitted.

---

## 6. Document Defects and Inconsistencies

Report concrete defects in the supplied documents. Do not report style preferences.

Check at least:

- Stale paths or prerequisite instructions that contradict the prompt being self-contained.
- Review counts that disagree between files ("N reviews" vs. the actual list).
- Stale cross-references (renumbered reviews, retired options, old report names).
- Finding-template ambiguity that makes machine parsing unreliable (for example, no explicit
  human-readable `Title` field distinct from `Category`).
- Missing operational guidance (for example, whether the reports directory should be
  `.gitignore`d, given reports may quote sensitive code).
- Version drift between files that all claim a framework version.

---

## 7. Findings the Process Missed

List concrete, evidence-backed problems in the project that **no review covered**. These are
the gap analysis made real.

Rules:

- Give each an ID `META-###` and the standard finding fields (severity, category, problem,
  why it matters, recommendation, estimated effort).
- Only include items outside every review's scope from §4. Do not restate code-review findings.
- Every item needs real evidence (file paths, env vars, commands, committed artefacts).
- For each item, name the review that **should** own it - an existing one, or a proposed new one.
- If a listed gap has no concrete instance yet, do not invent one; leave it in §4 instead.

---

## 8. Framework Recommendations

The **v2.0.0 baseline** now includes: per-finding `Title`, `Confidence` and `Evidence / Repro`;
header `Commit` / `Branch` / `Run mode`; a severity-calibration pass before the Summary;
verified vs unverified/`UNKNOWN` scoring in Production (100) and Cost (110); mandatory
quantification in Performance (30) and Cost (110); and explicit sequential/parallel execution modes
with a mandatory post-run reconciliation (deduplication sweep + calibration) in the full-suite
runner.

Do **not** re-recommend these. Instead, verify they are actually used: if a report omits a required
field, skips calibration, or a parallel run did not record its deduplication sweep, report that as a
document/process defect (§6), not as a framework gap.

Recommend only what is still missing, and only where the evidence supports it:

- A **persistent findings ledger** with stable IDs (first_seen / last_seen / status / owner), so
  cross-run status is not lost when finding IDs restart each run.
- **Risk-weighted headline scoring** (a plain mean lets a low-risk area carry the same weight as
  Security), plus a score distribution or confidence range.
- Any further change to the finding template must be treated as a **breaking framework change**
  and versioned accordingly.

---

## 9. Methodology Score and Confidence

Score the **method** (not the project), 0-100, and explain the deduction. State the confidence
in that score. A method with named model recommendations that will age, no commit anchor, and
no confidence field should score lower than one with those properties.

---

## 10. Recommended Next-Cycle Actions

Give a short, prioritised list, split into:

- **Immediate** (before the next full run): document fixes, framework fields, runner clarifications.
- **Next cycle**: proposed new reviews to add, and existing reviews to split or rescope.
- **Backlog**: larger structural changes (findings ledger, risk-weighted scoring).

Name each action with the specific file or review number it touches.

---

## 11. Final Recommendation

A concise conclusion: what the run's results can be trusted for, what they cannot, and the
single most valuable change to the suite before the next run.

---

# Review Behaviour

- The **review process and its documents are the subject**, not the code. Do not fix code and
  do not re-review the code reviews.
- Be adversarial about the method. A self-critique that finds nothing is not credible; if the
  process is genuinely strong, say so and prove it with specifics.
- Every claim needs evidence: a file path, a citation to a review spec's scope block, or a
  command output. Do not invent project problems.
- Distinguish clearly between a **coverage gap** (no review owns the domain) and a **missing
  report** (a review that should have run but did not).
- When uncertain whether a domain is in scope, quote the scope/ownership text you checked.
- Do not duplicate findings from the code reviews; the value here is what they did not cover.
- State assumptions and confidence explicitly. Never present an inference as a confirmed defect.
- Keep the review set as the thing under test: if you would change the suite, say exactly how.

The Meta-Review should leave the **review process** stronger than it found it.
