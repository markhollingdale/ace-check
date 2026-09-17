# Implementation Specification Generator

## Objective

Generate a comprehensive, phase-based implementation specification that addresses findings from the 12 engineering reviews at a specific severity level.

This document does **not** evaluate code quality or identify new issues - that work has already been done by the review reports.

It reads existing review reports and **expands** their findings into a detailed, actionable specification. To do this, it must read the codebase to identify which files need changes, but it uses the reviews' judgments about what the problems are and how to fix them.

The result is a specification that a junior/mid developer can follow without needing to re-read the review reports or figure out which files need changes.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Severity Selection

Before generating the specification, ask the user which severity level they want to generate:

```
Which severity level would you like to generate a specification for?

1. Critical (must fix before production)
2. High (should fix before production)
3. Medium (should fix in next development cycle)
4. Low (nice to have improvements)
```

Based on the selection, generate a specification document for that severity level only.

This approach:
- Reduces document size and context requirements
- Allows prioritization (e.g., skip Low if not needed)
- Makes documents more manageable for AI processing
- Enables incremental remediation by severity

---

# Prerequisites

Before producing the specification, verify that the following reports exist in:

```
docs/ai-review/reports/
```

## Required Review Reports

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

If any review reports are missing, list them and stop.

Do not produce a partial specification.

---

# Phase 1 - Read All Reviews

Read every review report listed above.

Extract from each:

- All findings with severity (Critical, High, Medium, Low)
- Finding ID, category, problem description
- Why it matters (business and technical impact)
- Recommendation with example implementation (if provided)
- Estimated fix time
- Dependencies on other findings

---

# Phase 2 - Organize by Review

Group all findings for the selected severity into 16 phases following this structure:

| Phase | Review |
|-------|--------|
| Phase 1 | Architecture (10) |
| Phase 2 | Security (20) |
| Phase 3 | Performance (30) |
| Phase 4 | Database (40) |
| Phase 5 | API (50) |
| Phase 6 | Code Quality (60) |
| Phase 7 | TypeScript (70) |
| Phase 8 | Accessibility (80) |
| Phase 9 | SEO (90) |
| Phase 10 | Production Readiness (100) |
| Phase 11 | Cost Analysis (110) |
| Phase 12 | Maintainability (120) |
| Phase 13 | Testing (150) |
| Phase 14 | Business Logic (160) |
| Phase 15 | Privacy & Compliance (170) |
| Phase 16 | Portability & Reusability (180) |

**Phase numbering:**
- Phase 1: [Selected Severity] Architecture findings
- Phase 2: [Selected Severity] Security findings
- Phase 3: [Selected Severity] Performance findings
- ...
- Phase 16: [Selected Severity] Portability & Reusability findings

If a review has no findings at the selected severity level, skip that phase and note it as "No findings at this severity level."

---

# Phase 3 - Generate Specification

Create:

```
docs/ai-review/reports/[project-name]-140-specification-[severity].md
```

Where `[severity]` is one of: `critical`, `high`, `medium`, or `low` (lowercase).

Example filenames:
- `business-template-140-specification-critical.md`
- `business-template-140-specification-high.md`
- `business-template-140-specification-medium.md`
- `business-template-140-specification-low.md`

Follow the format defined in:

```
framework/20-review-framework.md
```

## Specification Structure

The specification must include:

### 1. Report Metadata Header

```markdown
# Implementation Specification - [Severity] Findings

| | |
|---|---|
| **Project** | [Project name] |
| **Date** | [YYYY-MM-DD] |
| **Framework Version** | [Current version] |
| **Reviewer** | [AI model used] |
| **Severity Level** | [Critical/High/Medium/Low] |
| **Total Phases** | [Number of phases with findings] |
| **Total Findings** | [Total count for this severity level] |
```

### 2. Executive Summary

Provide a concise overview:

- Total findings for this severity level
- Breakdown by review (e.g., "Architecture: 3 findings, Security: 2 findings, ...")
- Difficulty breakdown (e.g., "Simple: 5 findings, Moderate: 3 findings, Complex: 2 findings")
- Estimated total remediation effort for this severity level
- Highest priority items (top 5 findings for this severity)
- Production readiness impact (especially for Critical/High)
- Recommended approach (phased vs. sprint-based)

### 3. Overview and Goals

Explain:

- What this specification covers (findings at [severity] level)
- How phases are organized (one phase per review, 16 phases total)
- How to use this document (mark tasks complete, track progress)
- Dependencies between phases
- Validation approach (typecheck, lint, test after each phase)
- Relationship to other severity specifications (if applicable)

### 4. Ground Rules

Establish project-wide rules:

- [ ] Do not run database commands without asking the user
- [ ] Follow existing code patterns and conventions
- [ ] Run validation after each phase: `pnpm typecheck`, `pnpm lint`, `pnpm test`
- [ ] Update documentation as you go
- [ ] Commit after each phase with descriptive messages
- [ ] Ask for clarification if a task is ambiguous

### 5. Difficulty Classification

Each finding must be classified by difficulty level to help select the appropriate AI model for implementation.

**Difficulty Levels:**

**Simple** (Low risk, straightforward)
- Clear instructions with exact code provided
- Changes are isolated and easily reversible
- Mistakes caught immediately by tests/linting
- Examples: Adding missing validation, updating imports, simple refactoring, config updates

**Moderate** (Medium risk, requires context)
- Need to understand how changes affect other parts
- Some judgment calls required
- Mistakes might not be immediately obvious
- Examples: Splitting components, adding middleware, refactoring modules

**Complex** (High risk, deep reasoning)
- Architectural changes affecting multiple systems
- Need to understand complex interactions
- Mistakes could cause subtle bugs or security issues
- Examples: Service layer extraction, transaction fixes, security-critical changes

**Recommended AI Models (OpenCode Go):**

| Difficulty | Model | Use Case |
|------------|-------|----------|
| Simple | Deepseek V4 Flash | Mechanical tasks, clear instructions |
| Moderate | Qwen 3.7 Plus | Everyday driver, balanced reasoning |
| Complex | Kimi K3 or GLM 5.2 | Deep reasoning, high-stakes changes |

**Classification Criteria:**

Base difficulty on **risk** and **complexity**, not time:
- **Risk**: What breaks if done wrong? (config change vs. security fix)
- **Complexity**: How much reasoning/context needed? (isolated change vs. system-wide)
- **Reversibility**: Easy to undo vs. hard to rollback

### 6. Phase-by-Phase Breakdown

For each phase (1-16), create a section following this template:

---

## Phase X — [Review Name] ([Severity] Findings)

**Goal:** Address all [severity] findings from the [review name] review.

**Source:** `[project-name]-[review-number]-[review-name]-review.md`

**Status:** NOT STARTED

**Estimated Effort:** [Total hours/days for this phase]

**Dependencies:** [List any dependencies on other phases or external factors]

### Difficulty Summary

| # | Finding | Difficulty | Recommended Model |
|---|---------|------------|-------------------|
| X.1 | [Finding ID] - [Brief Title] | Simple | Deepseek V4 Flash |
| X.2 | [Finding ID] - [Brief Title] | Moderate | Qwen 3.7 Plus |
| X.3 | [Finding ID] - [Brief Title] | Complex | Kimi K3 or GLM 5.2 |

_All difficulty ratings are listed above for easy reference. See individual sections below for full implementation details._

---

### X.1 [Finding ID] - [Brief Title]

**Severity:** [Critical/High/Medium/Low]

**Category:** [e.g., Authentication, Performance, Database]

**Difficulty:** [Simple/Moderate/Complex]

**Recommended Model:** [Deepseek V4 Flash / Qwen 3.7 Plus / Kimi K3 or GLM 5.2]

**Problem:**

[Copy the problem description from the review report]

**Why It Matters:**

[Copy the business and technical impact from the review report]

**Recommendation:**

[Copy the recommendation from the review report]

**Implementation:**

Expand the review's recommendation into detailed, step-by-step instructions suitable for a junior/mid developer. Do not just copy the recommendation - break it down into concrete actions:

1. **Step 1: [Action]**
   - Explain exactly what to do
   - Specify exact file paths to create or modify
   - List all files that need changes (not just examples)
   - Include complete code examples (expand from review report if needed)

2. **Step 2: [Action]**
   - Continue with clear, specific instructions
   - Show before/after code where applicable
   - If the finding requires applying a pattern across multiple files (e.g., "fix all routers"), list every file that needs the fix

3. **Step 3: [Action]**
   - Include verification steps
   - Specify how to test the changes

**Important:** If a review finding says "apply this pattern to all X" (e.g., "add transactions to all routers"), you must:
- Identify all files that need the change by reading the codebase
- List each file explicitly in the implementation steps
- Provide the specific changes needed for each file

**Code Example:**

```typescript
// Before (if applicable)
[existing code]

// After
[fixed code]
```

**Acceptance Criteria:**

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (if applicable)

**Estimated Time:** [hours/days]

**Notes:**

_Space for the developer to record decisions, deviations, or observations during implementation._

---

### Phase Summary

After all findings in the phase:

**Phase X Checklist:**

- [ ] All findings addressed
- [ ] All acceptance criteria met
- [ ] Code reviewed (if applicable)
- [ ] Tests updated
- [ ] Documentation updated
- [ ] Committed with descriptive message

---

### 6. Example Phase (Sanitized)

Include one fully worked example phase to show the expected format and detail level:

---

## Example Phase — Critical Security Issues

**Goal:** Address all Critical findings from the Security review.

**Source:** `business-template-20-security-review.md`

**Status:** NOT STARTED

**Estimated Effort:** 2 days

**Dependencies:** None

### Difficulty Summary

| # | Finding | Difficulty | Recommended Model |
|---|---------|------------|-------------------|
| SEC-001 | Missing Rate Limiting on Authentication Endpoints | Complex | Kimi K3 or GLM 5.2 |

---

### SEC-001 - Missing Rate Limiting on Authentication Endpoints

**Severity:** Critical

**Category:** Authentication

**Difficulty:** Complex

**Recommended Model:** Kimi K3 or GLM 5.2

**Problem:**

The login endpoint (`/api/auth/login`) has no rate limiting, allowing unlimited authentication attempts. This exposes the application to brute-force attacks and credential stuffing.

**Why It Matters:**

- **Business Impact:** Account compromise could lead to data breaches, financial loss, and reputational damage
- **Technical Impact:** Attackers can systematically guess passwords without detection
- **Compliance:** Violates OWASP A07:2021 (Identification and Authentication Failures)

**Recommendation:**

Implement rate limiting on all authentication endpoints using a sliding window algorithm. Limit to 5 failed attempts per IP address per 15-minute window. Lock accounts after 10 consecutive failed attempts.

**Implementation:**

1. **Step 1: Install rate limiting middleware**
   ```bash
   pnpm add rate-limiter-flexible
   ```

2. **Step 2: Create rate limiter configuration**
   
   Create `lib/rate-limiter.ts`:
   ```typescript
   import { RateLimiterMemory } from 'rate-limiter-flexible';
   
   export const loginRateLimiter = new RateLimiterMemory({
     points: 5, // 5 attempts
     duration: 900, // per 15 minutes (900 seconds)
   });
   
   export const accountLockoutLimiter = new RateLimiterMemory({
     points: 10, // 10 failed attempts
     duration: 3600, // lock for 1 hour
     block: true,
   });
   ```

3. **Step 3: Apply rate limiter to login endpoint**
   
   Update `app/api/auth/login/route.ts`:
   ```typescript
   import { loginRateLimiter, accountLockoutLimiter } from '@/lib/rate-limiter';
   
   export async function POST(request: Request) {
     const ip = request.headers.get('x-forwarded-for') || 'unknown';
     
     // Check if account is locked
     try {
       await accountLockoutLimiter.consume(ip);
     } catch {
       return Response.json(
         { error: 'Too many failed attempts. Account locked for 1 hour.' },
         { status: 429 }
       );
     }
     
     // ... existing login logic ...
     
     // On failed login, consume a point
     if (!success) {
       try {
         await loginRateLimiter.consume(ip);
       } catch {
         // Rate limit exceeded
         return Response.json(
           { error: 'Too many login attempts. Please try again in 15 minutes.' },
           { status: 429 }
         );
       }
     } else {
       // Reset on successful login
       await loginRateLimiter.delete(ip);
     }
   }
   ```

4. **Step 4: Add rate limiting headers to response**
   ```typescript
   const remaining = await loginRateLimiter.get(ip);
   response.headers.set('X-RateLimit-Remaining', remaining?.remainingPoints.toString() || '0');
   ```

**Code Example:**

```typescript
// Before
export async function POST(request: Request) {
  const body = await request.json();
  const user = await authenticate(body.email, body.password);
  // No rate limiting
  return Response.json({ user });
}

// After
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limits
  try {
    await loginRateLimiter.consume(ip);
  } catch {
    return Response.json(
      { error: 'Too many login attempts' },
      { status: 429 }
    );
  }
  
  const body = await request.json();
  const user = await authenticate(body.email, body.password);
  
  if (!user) {
    // Consume point on failure
    await loginRateLimiter.consume(ip);
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  
  // Reset on success
  await loginRateLimiter.delete(ip);
  return Response.json({ user });
}
```

**Acceptance Criteria:**

- [ ] Login endpoint returns 429 after 5 failed attempts within 15 minutes
- [ ] Account is locked after 10 consecutive failed attempts
- [ ] Rate limit headers are included in responses
- [ ] Successful login resets the rate limit counter
- [ ] Rate limiting works with X-Forwarded-For header
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Unit tests added for rate limiting logic

**Estimated Time:** 4 hours

**Notes:**

_Space for the developer to record decisions, deviations, or observations during implementation._

---

### Phase Summary

**Phase Checklist:**

- [ ] All Critical Security findings addressed
- [ ] All acceptance criteria met
- [ ] Code reviewed
- [ ] Tests updated
- [ ] Documentation updated
- [ ] Committed: "fix: add rate limiting to authentication endpoints"

---

### 8. Dependencies and Risks

List cross-phase dependencies and risks:

| Dependency | Impact | Mitigation |
|------------|--------|------------|
| Phase 1 (Architecture) changes may affect other phases | Structural changes require testing | Complete Architecture phase first |
| Phase 2 (Security) may require database migrations | Migration conflicts | Coordinate with Phase 4 (Database) |
| Phase 13 (Testing) work depends on code changed by other phases | Tests rewritten for removed/reworked code | Run Testing phase after other phases; add/update tests alongside each phase where practical |
| Phase 14 (Business Logic) overlaps Phase 2 (Security) abuse findings | Duplicate or conflicting fixes | Coordinate ownership: Business Logic fixes *correctness*, Security fixes *abuse* |
| Phase 15 (Privacy) touches auth, analytics, and logging changed by Phases 2, 10, 12 | Fixes interact | Coordinate with Security (2) and Production Readiness (10) |
| Phase 16 (Portability) may suggest module extraction | Structural changes ripple | Coordinate with Phase 1 (Architecture) and Phase 12 (Maintainability) |
| [etc.] | [etc.] | [etc.] |

Also note dependencies on other severity specifications if applicable:
- Critical specification should be completed first
- High specification depends on Critical being resolved
- [etc.]

### 9. Validation Strategy

Define how to validate the work:

**After each phase:**
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (if tests exist)
- [ ] Manual testing of affected features
- [ ] Update this specification with notes/decisions

**After each severity level (Critical, High, Medium, Low):**
- [ ] Run full test suite
- [ ] Performance test (if applicable)
- [ ] Security scan (if applicable)
- [ ] Update project documentation

**After all phases complete:**
- [ ] Full regression test
- [ ] Production readiness check
- [ ] Re-run relevant reviews to verify improvements
- [ ] Generate new summary report

### 10. Success Metrics

Define measurable outcomes:

- [ ] All [severity] findings resolved
- [ ] All acceptance criteria met for each phase
- [ ] No regressions introduced
- [ ] Code quality metrics improved (if applicable)
- [ ] Production readiness improved (especially for Critical/High)
- [ ] [Add project-specific metrics]

### 11. Decision Log

Track decisions made during implementation:

| # | Date | Phase | Decision | Rationale |
|---|------|-------|----------|-----------|
| D1 | [date] | [phase] | [decision] | [rationale] |
| D2 | [date] | [phase] | [decision] | [rationale] |

### 12. Notes and Observations

Space for general observations, patterns, and lessons learned during implementation.

### 13. Implementation Instructions

Include clear instructions for tracking progress:

- Update phase status (NOT STARTED → IN PROGRESS → COMPLETE)
- Check off acceptance criteria as completed
- Update phase summary checklists when phases are complete
- Record decisions in the Decision Log
- Document deviations and insights in Notes sections

This section ensures the implementing AI knows to keep the specification updated as work progresses.

---

# Implementation Instructions

**IMPORTANT:** When implementing this specification, you MUST update the document to track progress. This is not optional - it helps maintain context and provides a record of what has been completed.

## Status Updates

Update the status field for each phase as you work:

- **NOT STARTED** → **IN PROGRESS** when you begin working on a phase
- **IN PROGRESS** → **COMPLETE** when all findings in the phase are addressed

Example:
```markdown
## Phase 1 — Architecture (Critical Findings)

**Status:** IN PROGRESS
```

## Acceptance Criteria

As you complete each finding's acceptance criteria, check them off:

```markdown
**Acceptance Criteria:**

- [x] Login endpoint returns 429 after 5 failed attempts within 15 minutes
- [x] Account is locked after 10 consecutive failed attempts
- [ ] Rate limit headers are included in responses
```

## Phase Summary Checklist

When you complete a phase, check off the phase summary items:

```markdown
**Phase 1 Checklist:**

- [x] All findings addressed
- [x] All acceptance criteria met
- [x] Code reviewed
- [x] Tests updated
- [x] Documentation updated
- [x] Committed: "fix: add rate limiting to authentication endpoints"
```

## Decision Log

When you make implementation decisions, add them to the Decision Log table:

```markdown
| # | Date | Phase | Decision | Rationale |
|---|------|-------|----------|-----------|
| D1 | 2024-01-15 | Phase 1 | Used Redis for rate limiting | Better performance than in-memory for distributed systems |
```

## Notes and Observations

Record any deviations, issues, or insights in the Notes section of each finding or in the general Notes and Observations section at the end.

## Progress Tracking

Before starting work on a finding, update its status. After completing it, verify all acceptance criteria are checked and update the phase status. This ensures the specification always reflects the current state of implementation.

---

# Review Behaviour

Read all existing review reports before producing the specification.

**Important distinction:** You must **read the codebase** to expand findings into actionable steps, but you do not need to **analyze** the code (evaluate quality, identify new issues, or make judgments about problems). The reviews have already done the analysis. Your job is to translate their findings into specific implementation instructions.

To do this effectively, you must:

- **Read the codebase** to identify which files need changes
- **Extract findings** directly from the review reports (IDs, severity, recommendations)
- **Expand recommendations** into step-by-step implementation instructions
- **Identify all affected files** - if a review says "fix all routers" or "apply pattern to all components", read the codebase to find every file that needs changes and list them explicitly
- **Complete code examples** - if the review provides partial examples, expand them into complete, working code
- **Add verification steps** - specify how to test each change
- **Break down large tasks** - if a finding requires multiple changes, split them into numbered steps

The specification should be detailed enough that a junior/mid developer can execute it **without needing to re-read the review reports** or figure out which files need changes.

When a review report includes code examples, copy and expand them into the specification.

When a review report does not include code examples, provide detailed implementation guidance with exact file paths and complete code.

Ensure every task has clear, testable acceptance criteria.

Ensure every phase can be marked complete independently.

Prioritise clarity and actionability over brevity.

The specification should leave the project in a better state than it was before.
