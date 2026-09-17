# Review Framework

Version: **v1.1.0**

This document defines the standard output format that every engineering review must follow.

Every review in this repository should produce reports using this structure.

---

# Report Metadata Header

Every report must begin with the following metadata block:

```
# [Review Name]

| | |
|---|---|
| **Project** | [Project name] |
| **Date** | [YYYY-MM-DD] |
| **Framework Version** | [Current version] |
| **Reviewer** | [AI model used] |
```

This ensures reports can be compared across time and projects.

---

# 1. Executive Summary

Provide a concise summary of the review.

Include:

- Overall assessment
- Biggest strengths
- Highest risks
- Overall recommendation

---

# 2. Overall Review Score

Provide a score between:

```
0 – 100
```

Suggested guidance:

| Score | Meaning |
|-------|---------|
| 95-100 | Excellent |
| 90-94 | Production Ready |
| 80-89 | Good |
| 70-79 | Acceptable |
| 60-69 | Needs Improvement |
| Below 60 | Significant Work Required |

Scores should reflect the overall quality of the reviewed area.

---

# 3. Category Scores

Each review should break its findings into logical categories.

Example:

```
Authentication ............. 9/10
Authorisation .............. 8/10
Input Validation ........... 10/10
Secrets Management ......... 7/10
Infrastructure ............. 8/10
```

Each category should include a short explanation.

---

# 4. Severity Summary

Provide totals for each severity level.

```
Critical
High
Medium
Low
```

---

# 5. Production Readiness

State whether the reviewed area is suitable for production.

Example:

```
Production Ready
YES
```

or

```
Production Ready
NO
```

Explain why.

---

# 6. Estimated Remediation Effort

Estimate effort required to resolve findings.

Suggested breakdown:

```
Quick Wins
Medium Improvements
Major Refactoring
Total Estimated Effort
```

---

# 7. Detailed Findings

Every finding should follow exactly this format.

---

## Finding ID

Example:

```
SEC-004
PERF-012
ARCH-007
```

---

## Severity

One of:

- Critical
- High
- Medium
- Low

---

## Category

The affected review category.

---

## Problem

Describe the issue.

---

## Why It Matters

Explain the business and technical impact.

---

## Recommendation

Provide a clear solution.

---

## Example Implementation

Whenever practical, include:

- code
- configuration
- architecture
- commands

Avoid pseudo-code where possible.

---

## Estimated Fix Time

Provide a realistic estimate.

---

# 8. Positive Findings

Identify engineering decisions worth keeping.

Examples:

- Good project structure
- Excellent validation
- Clean separation of concerns
- Strong security practices
- Well-designed APIs
- Excellent documentation

Reviews should recognise strengths as well as weaknesses.

---

# 9. Technical Debt

List areas that are not bugs but increase future maintenance cost.

Examples:

- Temporary workarounds
- Legacy abstractions
- Duplicate logic
- Large components
- Missing documentation

---

# 10. Future Improvements

Suggest ideas that are outside the current project scope but would improve the system.

These should not reduce the review score.

Examples:

- Feature flags
- Distributed caching
- CQRS
- Event sourcing
- AI-assisted tooling
- Additional monitoring

---

# 11. Patterns Worth Reusing

Highlight reusable engineering patterns.

Examples:

- Folder organisation
- Component patterns
- API conventions
- Error handling
- Testing patterns
- Authentication flows

These become useful references for future projects.

---

# 12. Final Recommendation

Provide a concise engineering conclusion.

Include:

- Overall confidence
- Production recommendation
- Highest priority improvements
- Suggested next review

Example:

```
Overall Score
92/100

Recommendation
Suitable for production after resolving three High severity findings.

Next Review
Performance Audit
```

---

# Scoring Guidelines

Scores should be based on:

- Correctness
- Maintainability
- Scalability
- Security
- Performance
- Consistency
- Engineering quality
- Production readiness

Avoid scoring based on personal preference.

Every deduction should be justified by evidence.

---

# AI Behaviour Guidelines

The reviewing AI should:

- Read the source code before drawing conclusions.
- Prefer evidence over assumptions.
- Explain recommendations clearly.
- Avoid unnecessary rewrites.
- Recommend pragmatic improvements.
- Recognise good engineering practices.
- Avoid duplicate findings across categories where possible.

When uncertain, clearly state assumptions.

Never invent implementation details.

---

# Review Goals

The purpose of every review is to:

- Improve engineering quality
- Reduce production risk
- Reduce technical debt
- Improve maintainability
- Improve scalability
- Improve security
- Improve performance
- Produce consistent and repeatable engineering assessments

Every report should leave the project in a better state than it was before the review.
