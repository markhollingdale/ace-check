# Engineering Review Summary

Version: **v1.1.0**

## Objective

Aggregate and synthesise findings from all completed engineering reviews into a single summary report.

This document does **not** perform any new analysis.

It reads existing review reports and produces a consolidated view of the project's engineering health.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Prerequisites

This review is numbered **999** so it is always the last document in the suite.

The Summary may run with **any subset** of the review reports present. If any reports are missing:

- List every missing review report in an explicit **warning block** at the top of the report.
- Produce the summary using only the reports that exist.
- Do **not** silently omit missing reviews — the warning must be prominent and must name them.

Before producing the summary, check which of the following reports exist in:

```
docs/ai-review/reports/
```

## Review Reports

| Review | Expected Files |
|--------|----------------|
| Architecture | `[project-name]-10-architecture.md`, `[project-name]-10-architecture-review.md` |
| Security | `[project-name]-20-security.md`, `[project-name]-20-security-review.md` |
| Performance | `[project-name]-30-performance.md`, `[project-name]-30-performance-review.md` |
| Database | `[project-name]-40-database.md`, `[project-name]-40-database-review.md` |
| API | `[project-name]-50-api.md`, `[project-name]-50-api-review.md` |
| Code Quality | `[project-name]-60-code-quality.md`, `[project-name]-60-code-quality-review.md` |
| TypeScript | `[project-name]-70-typescript.md`, `[project-name]-70-typescript-review.md` |
| Accessibility | `[project-name]-80-accessibility.md`, `[project-name]-80-accessibility-review.md` |
| SEO | `[project-name]-90-seo.md`, `[project-name]-90-seo-review.md` |
| Production Readiness | `[project-name]-100-production-readiness.md`, `[project-name]-100-production-readiness-review.md` |
| Cost Analysis | `[project-name]-110-cost-analysis.md`, `[project-name]-110-cost-analysis-review.md` |
| Maintainability | `[project-name]-120-maintainability.md`, `[project-name]-120-maintainability-review.md` |
| Testing | `[project-name]-150-testing.md`, `[project-name]-150-testing-review.md` |
| Business Logic | `[project-name]-160-business-logic.md`, `[project-name]-160-business-logic-review.md` |
| Privacy & Compliance | `[project-name]-170-privacy-compliance.md`, `[project-name]-170-privacy-compliance-review.md` |
| Portability & Reusability | `[project-name]-180-portability.md`, `[project-name]-180-portability-review.md` |

Missing reports go into the warning block (§1 below). A summary is still produced from whatever exists.

---

# Phase 1 - Read All Reviews

Read every review report that exists.

Extract from each:

- Overall score
- Category scores
- Severity summary (Critical, High, Medium, Low)
- Production readiness verdict
- Top priority improvements
- Estimated remediation effort

---

# Phase 2 - Summary Report

Create:

```
docs/ai-review/reports/[project-name]-999-summary.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

## 1. Warning Block

If any review reports are missing, begin the report with:

```
> ⚠️ WARNING: Partial summary. The following reviews have not been completed and are NOT included:
>
> - [Review name] ([expected report filename])
> - [Review name] ([expected report filename])
>
> The overall engineering score reflects only the completed reviews.
```

## 2. Executive Summary

Provide a concise overview of the project's engineering health.

Include:

- Overall assessment
- Key strengths across all reviews
- Highest risks across all reviews
- Production recommendation
- Note which reviews are missing (if any)

---

## 3. Overall Engineering Score

Calculate an overall score based on all review scores.

Explain the weighting used.

If the summary is partial, state that the score excludes the missing reviews.

---

## 4. Review Scores Summary

Present a table of all review scores:

| Review | Score | Production Ready |
|--------|-------|------------------|
| Architecture | X/100 | YES/NO |
| Security | X/100 | YES/NO |
| Performance | X/100 | YES/NO |
| Database | X/100 | YES/NO |
| API | X/100 | YES/NO |
| Code Quality | X/100 | YES/NO |
| TypeScript | X/100 | YES/NO |
| Accessibility | X/100 | YES/NO |
| SEO | X/100 | YES/NO |
| Production Readiness | X/100 | YES/NO |
| Cost Analysis | X/100 | YES/NO |
| Maintainability | X/100 | YES/NO |
| Testing | X/100 | YES/NO |
| Business Logic | X/100 | YES/NO |
| Privacy & Compliance | X/100 | YES/NO |
| Portability & Reusability | X/100 | YES/NO |

Mark missing reviews as `MISSING` and exclude them from any aggregate calculations.

---

## 5. Combined Severity Summary

Aggregate severity counts across all reviews:

| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |

Note if counts are partial (missing reviews).

---

## 6. Production Readiness Assessment

Provide an overall production readiness verdict.

Consider:

- Are there any Critical findings?
- Are there any High findings that block production?
- Which reviews are not production ready?
- What is the overall confidence level?
- If reviews are missing, state that the verdict is provisional.
- **Manual gate:** has `docs/runbooks/pre-live-gate.md` been walked and signed? If not, verdict cannot be `YES`.

State clearly:

```
Production Ready: YES / NO / PROVISIONAL
```

Explain why. If `Production Ready: YES` but the pre-live gate is unsigned, downgrade to `PROVISIONAL` and explain.

---

## 6b. Manual Runbooks & Pre-Live Gate (Cannot Be Verified From Code)

You **must** surface manual checks so the human does not miss them — code reports alone are insufficient.

Check in the repo (and in Production Readiness Phase 1 doc) whether these exist and are signed:

- `docs/runbooks/vercel-neon-manual-setup.md` — Vercel Firewall + Spend + Neon/Supabase pooling (dashboard toggles)
- `docs/runbooks/abuse-red-team-playbook.md` — 6 scripted curl/k6 attack scenarios
- `docs/runbooks/pre-live-gate.md` — night-before gate with sign-off table

Report:

- For each runbook: `Present / Missing`, and for `pre-live-gate.md`: `Signed (date) / Unsigned`
- If any runbook is missing → list as a **gap** (not a code finding, but a process gap).
- If `pre-live-gate.md` is unsigned → add explicit warning:

```
> ⚠️ MANUAL GATE NOT SIGNED: Walk docs/runbooks/pre-live-gate.md (sections 1-4) and paste curl/k6/drill evidence before trusting `Production Ready: YES`.
```

This section is mandatory even when all code reviews are `YES` — the bill-related toggles live outside code.

---

## 7. Top Priority Improvements

List the highest priority improvements across all reviews.

Rank by:

1. Severity
2. Business impact
3. Effort required

Limit to the top 10-15 items.

---

## 8. Remediation Roadmap

Suggest a phased approach to addressing findings.

### Immediate (Before Production)

Critical and blocking High items.

### Short-Term (First Sprint)

High priority items that don't block production.

### Medium-Term (Next 1-3 Months)

Medium priority items and technical debt.

### Long-Term (Strategic)

Low priority items and future improvements.

---

## 9. Estimated Total Remediation Effort

Sum the estimated effort across all reviews.

Break down by:

- Quick Wins (< 1 day each)
- Medium Improvements (1-5 days each)
- Major Refactoring (> 5 days each)
- Total Estimated Effort

---

## 10. Strengths Worth Preserving

Highlight the strongest engineering decisions across all reviews.

These are patterns and practices worth keeping.

---

## 11. Patterns Worth Reusing

Identify reusable engineering patterns observed across multiple reviews.

These become references for future projects.

---

## 12. Recommendations for Next Review Cycle

Suggest:

- Which areas to review first in the next cycle
- What to focus on
- When to schedule the next review

---

## 13. Implementation Specifications

Check for implementation specifications at:
- `[project-name]-140-specification-critical.md`
- `[project-name]-140-specification-high.md`
- `[project-name]-140-specification-medium.md`
- `[project-name]-140-specification-low.md`

For each specification that exists, summarise:

- Severity level
- Total phases
- Total findings
- Estimated total effort
- Progress (if any phases have been completed)

If no specifications exist, recommend generating them using the Specification option from the runner. Suggest starting with Critical, then High, then Medium. Low can be skipped if not needed.

---

## 14. Final Recommendation

Provide a concise engineering conclusion.

Include:

- Overall confidence
- Production recommendation
- Highest priority actions
- Suggested next steps

---

# Review Behaviour

Read all existing review reports before producing the summary.

Do not perform new analysis.

Do not duplicate findings.

Aggregate and synthesise.

When scores conflict between reviews, note the discrepancy.

**Never silently produce a partial summary** — if reports are missing, the warning block is mandatory.

Prioritise clarity and actionability.

The summary should give a decision-maker everything needed to understand the project's engineering health and make informed decisions.
