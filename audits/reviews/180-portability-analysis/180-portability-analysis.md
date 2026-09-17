# Portability & Reusability Analysis

## Objective

Perform an assessment of how portable and reusable the application's code is.

The goal is to evaluate how easily code can move from this project to another: how much of the codebase is genuinely project-agnostic, how cleanly shared or generic code is separated from project-specific code, and how easy it would be to extract reusable pieces or bootstrap a new project from this one.

This is a quality-of-engineering review, not a promise: portability is a desirable way of writing code, not a requirement of every project.

This review focuses **only on portability and reusability**.

Do **not** perform detailed reviews of architecture, code quality or maintainability except where they directly affect the ability to move code between projects.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Portability Documentation

Create:

```
docs/ai-review/reports/[project-name]-180-portability.md
```

Document how portable the application's code is.

Do not assess quality yet.

---

## 1. Generic vs Project-Specific Code

Document:

- Which modules are generic (framework-agnostic utilities, generic components, shared libraries)
- Which modules are business-specific (domain logic, feature pages, workflows)
- Whether the split is explicit or emergent

---

## 2. Shared Packages & Libraries

Document:

- Internal packages or libraries (monorepo workspaces, published packages)
- Their boundaries and exported surface
- Generic utilities that could be lifted out

---

## 3. Configuration Externalisation

Document:

- Environment variables and their documentation (`.env.example` completeness)
- Hard-coded configuration (URLs, provider keys, feature toggles, branding)
- Where configuration lives (code, config files, env, database)

---

## 4. Branding & White-Labelling

Document:

- Branding seams (names, logos, colours, domain names, contact details)
- Hard-coded project names in UI copy, emails, or code
- Any white-label/tenant theming support

---

## 5. Tooling & Framework Assumptions

Document:

- Framework and runtime choices (Next.js, Express, React, etc.)
- Build tooling and monorepo structure
- CI/CD platform specifics
- Hosting platform coupling (serverless, edge, containers)

---

## 6. Documentation Portability

Document:

- Setup/onboarding docs: generic vs project-specific
- Whether a new developer (or new project) can follow them

---

# Phase 2 - Portability Assessment

Create:

```
docs/ai-review/reports/[project-name]-180-portability-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Project-Specific Leakage

Review:

- Hard-coded project names, domains, URLs, contact details, and branding in otherwise-generic code
- Domain-specific terms embedded in generic utilities
- Generic modules importing business modules (dependency direction)
- Example/demo data that drags business specifics into shared code

---

# Generic vs Specific Separation

Review:

- Can the generic core be extracted without the business features?
- Do generic modules depend on business modules (inverted dependency)?
- Are generic utilities co-located with business code instead of shared?

---

# Configuration Externalisation

Review:

- Env vars documented and validated (cross-reference: TypeScript Review 70 for validation)
- Hard-coded configuration that should be configurable
- Provider API keys and service credentials in code
- Feature flags hard-coded rather than configurable

---

# Shared Package Extraction Readiness

Review:

- Internal packages with clear, stable exports
- Generic code that is not yet packaged but could be
- Package boundaries (what would a new project import?)
- Versioning and publishing story for shared code

---

# Framework & Tooling Lock-In

Review:

- How tightly coupled the code is to its framework (components, data access, styles)
- Whether the framework layer is thin or woven through everything
- Whether lock-in is an accepted trade-off (often it is — note it as such, not as a defect)

---

# Template-Readiness

Review:

- Is there a clean "start a new project" path (starter, template, or clear instructions)?
- Would copying this repo drag in project-specific features without seams?
- Are there feature flags or module boundaries to strip business features?

---

# Documentation Portability

Review:

- Setup docs: can someone set up this project in a different environment?
- Are docs written with hard-coded paths, project names, or credentials?
- Is the generic tooling documented separately from business features?

---

# Reusability of Patterns

Review:

- Generic components, hooks, utilities that are reusable as-is
- Business logic buried in components instead of services
- Patterns that would be valuable in a new project but are undocumented

---

# Technical Debt

Identify:

- Copy-paste forks of generic code inside the project
- Generic utilities that quietly grew business-specific behaviour
- Dead generic code that only one feature uses
- Monolith modules that mix generic and specific concerns

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

- Long-term changeability of the code → Maintainability Review (120)
- Module boundaries and coupling → Architecture Review (10)
- Duplicate logic as a code-quality issue → Code Quality Review (60)
- Type coupling to providers → TypeScript Review (70)

If the finding is about **whether code can move to another project**, it belongs here. If it is about how well the code can change within this project, maintainability owns it.

---

# Positive Findings

Identify portability decisions worth keeping.

Explain why they make the codebase easier to reuse and re-home.

---

# Reusable Portability Patterns

Highlight reusable patterns.

Examples:

- Explicit generic-vs-specific module split
- Config externalisation patterns
- Internal package conventions
- Framework-agnostic core layers
- Template/starter structures
- Branding seams

---

# Final Recommendation

Provide:

- Overall Portability Score
- Category Scores
- Reusability Assessment
- Production Readiness (Portability only)
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

Inspect module boundaries, imports, configuration, and documentation before making recommendations.

Ask "would this module make sense in a different project?" for each candidate.

Balance portability against pragmatism — not every project needs to be a template. Prioritise findings that create real reuse value.

Recognise portable code as well as coupling.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.
