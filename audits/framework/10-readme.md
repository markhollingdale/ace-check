# AI Engineering Review Framework

> A comprehensive collection of AI-powered engineering review standards for modern TypeScript SaaS applications.

## Overview

This repository contains a set of structured engineering review documents designed to help AI assistants perform consistent, repeatable and production-grade reviews of software projects.

Unlike traditional prompts, these documents define engineering standards. Each review focuses on a specific area of software development while following a shared review framework and scoring methodology.

The goal is to produce objective, repeatable reviews that identify risks, technical debt, performance issues and opportunities for improvement before software reaches production.

---

# How to Run a Review

From the project you want to review, read:

```
runners/run-review.md
```

This will ask which review to run and guide the AI through the process.

To run **all 17 reviews in sequence** (then the Meta-Review and the Summary), read:

```
runners/run-full-suite.md
```

Reports are generated in the project being reviewed at:

```
docs/ai-review/reports/
```

---

# Philosophy

Every review should be:

- Thorough rather than fast
- Evidence-based
- Technology agnostic where possible
- Opinionated but justified
- Focused on long-term maintainability
- Suitable for production systems
- Consistent across every project

The AI should read the actual implementation rather than making assumptions.

Whenever possible it should inspect source code, configuration files, dependencies and project structure before making recommendations.

---

# Review Workflow

Reviews are numbered in a logical order. Run them **sequentially in this order**, or as **parallel
subagents** - both are supported. A parallel run must reconcile afterwards (deduplication sweep +
severity calibration); see `runners/run-full-suite.md`.

```
Architecture
    ↓
Security
    ↓
Performance
    ↓
Database
    ↓
API
    ↓
Code Quality
    ↓
TypeScript
    ↓
Accessibility
    ↓
SEO
    ↓
Production Readiness
    ↓
Cost Analysis
    ↓
Maintainability
    ↓
Abuse, Bot & Crawl Resilience
    ↓
Meta-Review (990)
    ↓
Summary (999)
```

Some reviews may overlap, but each has a clearly defined primary responsibility.

---

# Current Reviews

| Review | Purpose |
|--------|---------|
| Architecture | Overall project architecture, design patterns and scalability |
| Security | Application security, OWASP, authentication and authorisation |
| Performance | Runtime, rendering, database and infrastructure performance |
| Database | Schema design, indexing, migrations and data modelling |
| API | API quality, contracts, validation and scalability |
| Code Quality | Maintainability, complexity and engineering practices |
| TypeScript | Type safety and language best practices |
| Accessibility | WCAG compliance and usability |
| SEO | Search engine optimisation and metadata |
| Production Readiness | Deployment readiness checklist |
| Cost Analysis | Infrastructure efficiency and operational costs |
| Maintainability | Technical debt and long-term sustainability |
| Testing | Test strategy, quality, coverage and reliability |
| Business Logic | Domain rule correctness, state machines, idempotency, race conditions |
| Privacy & Compliance | PII handling, consent, retention, deletion, data flows |
| Portability & Reusability | Project-agnostic code, extraction readiness, template-readiness |
| Abuse, Bot & Crawl Resilience | Bots, crawlers, spam, rate-limit completeness, engagement abuse, cost amplification |
| Meta-Review (990) | Reviews the review process itself: coverage gaps, reviews to do differently, document defects, recommended suite changes |
| Summary (999) | Aggregates all completed reviews; partial summaries allowed with warnings |
| Specification (140) | Generates severity-based implementation plans |

> The Summary is numbered **999** so it is always the last document in the suite. The Meta-Review (990) runs before it and reviews the method, not the code. The Specification (140) is a generator, not a summary. See `framework/30-adding-a-review.md` for how to add or retire reviews.

---

# Review Framework

Every review must follow the common format defined in:

```
20-review-framework.md
```

This ensures every report has:

- Consistent scoring
- Consistent severity levels
- Consistent recommendations
- Comparable results across projects

---

# Severity Levels

## Critical

A serious issue that could result in:

- Security compromise
- Data loss
- Financial loss
- Complete service failure

Must be fixed before production.

---

## High

Major issue affecting:

- Reliability
- Security
- Performance
- Scalability

Should normally be resolved before production.

---

## Medium

Important improvement that reduces technical debt or future risk.

Should be planned for the next development cycle.

---

## Low

Minor improvement or best practice recommendation.

---

# Principles

Every recommendation should explain:

- What is wrong
- Why it matters
- The impact
- How to fix it
- Estimated effort
- Priority

Recommendations should be actionable.

Avoid vague statements.

---

# Project Scoring

Every review produces:

- Category scores
- Overall review score
- Severity summary
- Estimated remediation effort
- Production readiness assessment

The scores should make it possible to compare projects over time.

---

# Intended Audience

This framework is intended for:

- SaaS applications
- Modern TypeScript projects
- Next.js applications
- T3 Stack projects
- AI-assisted software development
- Production engineering reviews

Although optimised for the T3 Stack, most reviews should be applicable to other modern web frameworks.

---

# Contributing

When creating a new review:

1. Follow the Review Framework.
2. Follow `30-adding-a-review.md` (numbering, file layout, coupled files, smoke test).
3. Keep the scope focused.
4. Avoid overlap with existing reviews.
5. Provide evidence-based recommendations.
6. Maintain consistent terminology and scoring.

---

# Versioning

The review framework should evolve over time.

Changes should be versioned so previous review reports remain comparable.

Current Version:

**v2.0.0**

Changes:
- v2.0.0 (breaking format): Added mandatory finding fields `Title`, `Confidence` and `Evidence / Repro`, and header fields `Commit`, `Branch` and `Run mode`. Added the Abuse, Bot & Crawl Resilience review (190), split out of Security (20). Added a severity-calibration pass before the Summary. Production Readiness (100) and Cost (110) now split verified vs unverified/`UNKNOWN` scoring. Performance (30) and Cost (110) require a quantified measure per finding. Testing (150) clarifies which test runs are permitted without asking. The full-suite runner now treats sequential and parallel (subagent) execution as equal modes, with a mandatory reconciliation step after a parallel run.
- v1.2.0: Added the Meta-Review (990) - a self-critique of the review process that runs before the Summary and reports coverage gaps, reviews to do differently, document defects, and recommended suite changes. Removed the model recommendations from the Specification (140); difficulty is now model-agnostic.
- v1.1.0: Added Testing (150), Business Logic (160), Privacy & Compliance (170), Portability & Reusability (180). Summary renumbered 130 → 999 with partial-summary support. Added extension guide (`30-adding-a-review.md`). Runner paths resolved relative to the runner file.
