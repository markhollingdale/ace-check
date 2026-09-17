# Code Quality Analysis

## Objective

Perform a comprehensive analysis of the application's code quality.

The goal is to evaluate the readability, maintainability, consistency and overall engineering quality of the codebase.

Assess whether the project follows modern software engineering principles and whether the code would be easy for another experienced developer to understand, extend and maintain.

This review focuses **only on code quality**.

Do **not** perform detailed reviews of architecture, security, performance, TypeScript usage or production readiness except where they directly affect code quality.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Code Documentation

Create:

```
docs/ai-review/reports/[project-name]-60-code-quality.md
```

Document how the project is organised from a code quality perspective.

This document should explain how engineering practices have been applied.

Do not assess quality yet.

---

## 1. Project Organisation

Document:

- Folder structure
- Feature organisation
- Shared code
- Utilities
- Naming conventions

---

## 2. Coding Standards

Document:

- Formatting
- Linting
- Naming conventions
- Comments
- Documentation

---

## 3. Component Organisation

Document:

- Component structure
- File size
- Shared components
- Composition patterns

---

## 4. Functions

Document:

- Function organisation
- Responsibilities
- Reusability
- Helper functions
- Utility functions

---

## 5. Error Handling

Document:

- Error handling patterns
- Error propagation
- Shared utilities
- Custom errors

---

## 6. Logging

Document:

- Logging strategy
- Debug logging
- Shared logging utilities

---

## 7. Documentation

Document:

- Code comments
- README files
- Architecture documentation
- Inline documentation

---

## 8. Dependencies

Document:

- Internal dependencies
- Shared modules
- Utility libraries

---

# Phase 2 - Code Quality Assessment

Create:

```
docs/ai-review/reports/[project-name]-60-code-quality-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Readability

Review:

- Naming
- Formatting
- Consistency
- Clarity
- Intent

Evaluate whether the code is easy to understand without additional explanation.

---

# Simplicity

Review:

- Function complexity
- Component complexity
- Nesting
- Branching
- Unnecessary abstractions

Identify opportunities to simplify the implementation.

---

# SOLID Principles

Evaluate:

- Single Responsibility
- Open / Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

Assess practical application rather than theoretical perfection.

---

# DRY

Review:

- Duplicate logic
- Duplicate components
- Duplicate utilities
- Duplicate validation
- Duplicate configuration

Identify opportunities for reuse.

---

# KISS

Identify:

- Unnecessary complexity
- Clever code
- Over-engineering
- Difficult-to-follow logic

Recommend simpler alternatives where appropriate.

---

# YAGNI

Review:

- Unused abstractions
- Premature optimisation
- Unused utilities
- Dead code
- Experimental features

Identify code that increases maintenance cost without providing value.

---

# Maintainability

Review:

- File size
- Function size
- Component size
- Module cohesion
- Dependency management

Evaluate long-term maintainability.

---

# Reusability

Review:

- Shared components
- Shared utilities
- Hooks
- Services
- Helper functions

Identify opportunities for reuse.

---

# Error Handling

Review:

- Consistency
- Clarity
- Error propagation
- Recovery
- User-facing errors

Evaluate whether error handling is predictable and maintainable.

---

# Documentation

Review:

- Code comments
- Function documentation
- Module documentation
- Architecture references
- README quality

Identify undocumented areas that reduce maintainability.

---

# Dependency Management

Review:

- Internal dependencies
- Circular dependencies
- Tight coupling
- Unnecessary dependencies

Evaluate dependency health.

---

# Code Smells

Identify:

- Long methods
- Large classes
- Large components
- Deep nesting
- Magic numbers
- Magic strings
- Duplicate conditionals
- Feature envy
- Primitive obsession
- Shotgun surgery
- God objects
- Dead code

Explain why each issue matters.

---

# Refactoring Opportunities

Identify areas where refactoring would improve:

- Readability
- Maintainability
- Reusability
- Simplicity

Prioritise practical improvements over stylistic preferences.

---

# Developer Experience

Evaluate:

- Ease of navigation
- Discoverability
- Consistency
- Debuggability
- Ease of onboarding
- Ease of modification

Consider the experience of a developer joining the project for the first time.

---

# Technical Debt

Identify:

- Temporary workarounds
- Legacy code
- Deprecated patterns
- TODOs
- FIXME comments
- Inconsistent implementations
- Partially completed refactors

Estimate long-term maintenance impact.

---

# Required Findings

Every issue must include:

- Severity
- Explanation
- Business impact
- Technical impact
- Recommendation
- Example implementation (where appropriate)
- Estimated effort

Do not duplicate findings that belong in other reviews.

For example:

- Poor architecture → Architecture Analysis
- Type safety issues → TypeScript Analysis
- Slow algorithms → Performance Analysis
- Missing authentication → Security Audit

Reference the appropriate review instead.

---

# Positive Findings

Identify engineering practices worth keeping.

Explain why they improve maintainability and code quality.

---

# Reusable Engineering Patterns

Highlight reusable coding patterns.

Examples:

- Component composition
- Utility organisation
- Error handling
- Logging
- Validation
- Shared abstractions

---

# Final Recommendation

Provide:

- Overall Code Quality Score
- Category Scores
- Production Readiness (Code Quality only)
- Highest Priority Improvements
- Estimated Remediation Effort
- Overall Recommendation

Follow the structure defined in:

```
framework/20-review-framework.md
```

---

# Review Behaviour

Read the implementation before making conclusions.

Inspect the source code rather than making assumptions.

Prioritise readability and maintainability over personal preference.

Avoid recommending unnecessary abstractions or over-engineering.

Recognise high-quality engineering practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.