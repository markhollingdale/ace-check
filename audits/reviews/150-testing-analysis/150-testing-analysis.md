# Testing Analysis

## Objective

Perform a comprehensive assessment of the application's testing quality.

The goal is to evaluate whether the test suite actually protects the application: whether tests exist where they matter, whether they are reliable, maintainable, fast, and run automatically, and whether they give engineers confidence to change code without breaking production.

Assess the testing strategy as a whole, not just individual test files.

This review focuses **only on testing**.

Do **not** perform detailed reviews of architecture, security, performance, accessibility or code quality except where they directly affect the testing strategy.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Testing Documentation

Create:

```
docs/ai-review/reports/[project-name]-150-testing.md
```

Document the application's testing implementation.

This document should explain how testing is currently done.

Do not assess quality yet.

---

## 1. Test Strategy

Document:

- Test strategy statement (or absence of one)
- Test pyramid shape (unit / integration / e2e)
- What is tested and what is deliberately not tested
- Testing goals (regression protection, documentation, design feedback)

---

## 2. Test Frameworks & Tooling

Document:

- Test runner (e.g., node:test, Vitest, Jest, Playwright, Cypress)
- Assertion library
- Mocking tools (built-in, vi, sinon, msw)
- Coverage tooling
- E2E tooling
- Fuzz / property testing (if used)

---

## 3. Test Organisation

Document:

- Test file location (co-located vs separate `__tests__` directories)
- Naming conventions
- Fixture and test-data organisation
- How tests are grouped (per module, per feature, per layer)

---

## 4. Test Environment

Document:

- How tests are run locally (commands, scripts)
- How tests are run in CI
- Test database strategy (real DB, in-memory, mocked)
- Environment variables needed for tests
- Parallelisation strategy

---

## 5. Coverage

Document:

- Coverage thresholds (if any)
- What the thresholds gate (CI, commit, nothing)
- How coverage is measured (line, branch, statement)
- Known untested areas

---

## 6. Specialised Testing

Document:

- Accessibility test automation (cross-reference: Accessibility Review 80) — `axe` CLI in CI? manual screen-reader pass date?
- Performance / load tests (cross-reference: Performance Review 30) — `k6` baseline (50 VUs steady) + `k6` crawl burst (100 VUs * 30s PostGIS), Lighthouse scores, Web Vitals
- Security tests (cross-reference: Security Review 20) — including abuse/bot/spam paths: rate-limit 429 tests, robots.txt rendering tests, spoofed UA tests, ALTCHA bypass test
- Visual regression tests (Chromatic / Percy or none)
- Contract tests (if applicable)
- Abuse & load simulation: `k6`/`Artillery` scripts for crawl burst, search PostGIS hammer, engagement inflation; run frequency (CI vs manual); reference `runbooks/abuse-red-team-playbook.md`
- Backup & restore drill: last restore date, target branch, verification queries (cross-ref Database 40 / Production 100)
- Synthetic smoke / canary post-deploy: `health → login → search → view → track` job, schedule, alert channel
- Failover drill: what happens when Neon/Supabase pool exhausted, email provider 429, or TRPC batch fails — documented?
- Browser matrix: Chrome/Firefox/Safari × mobile viewport — manual date or automated?
- Seed hygiene: is `seed` scrubbed of PII before CI/prod?

Document only. Do not assess.

---

# Phase 2 - Testing Assessment

Create:

```
docs/ai-review/reports/[project-name]-150-testing-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Test Strategy & Pyramid

Review:

- Balance across the pyramid (too many brittle e2e tests, or nothing but shallow unit tests)
- Whether the pyramid matches the risk profile of the application
- Whether critical flows have tests at the right level
- Whether the strategy is documented or implicit

Attempt to identify risk areas with no test coverage at any level.

---

# Unit Test Quality

Review:

- Test isolation (no shared state, no order dependence)
- Determinism (no sleeps, no reliance on wall-clock timing, no random data without seeding)
- Naming (tests describe behaviour, not implementation)
- Assertions (do they actually assert? assert-on-mock-only tests)
- Testing the implementation vs the behaviour (refactoring resistance)

Attempt to identify tests that would pass even if the code was broken.

---

# Integration Tests

Review:

- Database-backed tests (real DB vs mocks; migrations applied; data cleanup)
- External service interaction (mocked vs real; msw vs hand-rolled)
- API/integration coverage of multi-step flows
- Fixture drift (test data out of sync with schema)

---

# E2E & Smoke Tests — Including Post-Deploy Canary

Review:

- Coverage of critical user journeys
- **Post-deploy synthetic smoke:** does CI or a cron hit production with `health → login → search → view → track`? A green CI with no prod canary still ships broken prod.
- Reliability (flakiness, retries, timeouts)
- Speed and parallelisation
- Cost and maintenance burden

If no smoke exists, flag **High** — it is the cheapest pre-live safety net.

---

# Negative & Error Paths

Review coverage of:

- Validation failures
- Error handling paths
- Unauthorised / forbidden access
- Empty states and missing data
- Partial failures and retries
- Boundary conditions

This is where tests catch production bugs.

---

# Coverage

Review:

- Whether coverage numbers are meaningful or vanity metrics
- Whether thresholds gate anything
- Whether untested areas are known and accepted
- Coverage of business-critical code (payments, auth, state changes) vs trivial code

---

# Fixtures & Test Data

Review:

- Factory / builder patterns vs hand-rolled fixtures
- Fixture drift from schema and validation
- Seeding strategy and test-database lifecycle
- Reuse of production data (privacy risk — cross-reference Privacy Review 170)

---

# Mocking Discipline

Review:

- Mocking the right seam (boundaries) vs mocking internals
- Over-mocking (tests assert on mocks, not behaviour)
- Mocking third-party SDKs (capturing realistic payloads)
- Whether mocks match real-world behaviour (e.g., Stripe event shapes)

---

# Reliability & Flakiness

Review:

- CI retries, timeouts, sleeps, race conditions in tests
- Tests that pass locally but fail in CI
- Order-dependence between tests
- Flaky tests ignored or disabled rather than fixed

---

# Test Speed & Parallelism

Review:

- Test suite duration
- Parallelisation and isolation
- Unnecessary I/O in unit tests (network, DB, filesystem)
- Impact of slow suites on developer workflow

---

# CI Integration

Review:

- Tests run automatically on commit/PR/merge
- Tests gate merges and deployments
- Failure visibility (artifacts, logs, reports)
- Separate fast (unit) vs slow (e2e) pipelines
- Coverage thresholds enforced in CI

---

# Test Maintenance

Review:

- Effort required to update tests when behaviour changes
- Duplication across test files
- Test helpers shared vs re-implemented
- Tests that duplicate the implementation rather than the spec
- Documentation of how to run and write tests

---

# Accessibility, Performance & Security Test Automation — Including Abuse, Load & Resilience (Cross-reference, but flag missing coverage)

Review (briefly, then cross-reference the owning review):

- Automated a11y checks — `axe` in CI or `axe:ci` job? (cross-reference: Accessibility Review 80)
- Load/performance regression tests — `k6` baseline + burst (cross-reference: Performance Review 30)
- Security-related tests: auth bypass, injection, abuse paths (cross-reference: Security Review 20)
- Backup restore drill and synthetic smoke (cross-reference: Production Readiness 100, Database 40)

Do not duplicate findings from those reviews — reference them.

Additionally, flag missing test coverage as its own finding **here** if:

- **Abuse:** No test asserts `robots.txt` / `app/robots.ts` per-UA disallows (especially AI bots `GPTBot`, `ClaudeBot`) — a one-line regression re-exposes crawl trap
- **Abuse:** No test asserts `429` + `Retry-After` on burst to a public read proc (e.g., 20 rapid `search.search` from same IP → at least one `TRPCError 429`)
- **Abuse:** No test asserts spoofed UA still rate-limited (not bypassed by missing `x-forwarded-for` parsing) or crawler UAs ignored for engagement
- **Abuse:** No load script for crawl burst (`k6 run load/crawl-burst.js` with `100 VUs * 30s` on `/whats-on` permutations + `/api/trpc/search.search`)
- **Resilience:** No `k6` baseline (50 VUs steady) measuring p95 / `max_connections` headroom — you only know burst fails, not steady state
- **Resilience:** No backup restore test (last drill `NEVER`) and no synthetic post-deploy smoke (`health → login → search → view`) — both cheap, both catch deploy breakage
- **UI:** No visual regression (Chromatic/Percy) or `axe` gate — styles/a11y regress silently
- **Supply:** No pinned GH Action SHAs / `npm audit` gate (cross-ref Security supply chain — file missing gate here as CI debt)
- **Data:** No seed scrub check — `seed.ts` with plausible PII could ship to prod

If `tests/` has zero abuse/resilience tests, that is a **High** — not Low — because future refactors silently remove `revalidate` or pool config and you learn from the bill/outage. Reference Security/Cost/Production for impact, but file the coverage gap here.

See `runbooks/abuse-red-team-playbook.md` (6 scenarios) and `runbooks/pre-live-gate.md` (gate checklist) for codifiable scripts.

---

# Testing of Business-Critical Logic

Review whether the following are covered by tests:

- Money, ledger and fee calculations (cross-reference: Business Logic Review 160)
- State machines and workflow transitions (cross-reference: Business Logic Review 160)
- Idempotency of webhooks and jobs (cross-reference: Business Logic Review 160)
- Concurrency and race conditions (cross-reference: Business Logic Review 160)

If coverage is missing, the finding belongs here (test coverage), while the underlying logic issue belongs to the Business Logic review.

---

# Developer Experience

Review:

- Ease of running a single test, a file, a suite
- Debuggability of failing tests
- Test output quality (what failed and why)
- Onboarding: can a new developer write a test without guidance?

---

# Technical Debt

Identify:

- Skipped/disabled tests
- TODO tests and empty test bodies
- Tests asserting on implementation details
- Test helpers that mask failures
- Legacy test frameworks not removed
- Coverage thresholds lowered to pass

Estimate the maintenance burden.

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

- A race condition in production code → Business Logic Review (160)
- Missing security tests (but **missing abuse-test coverage** belongs here — the vuln belongs to Security, the absent test belongs to Testing)
- Slow test suite as a performance issue → Performance Review (30)
- Poor test naming as a readability issue → Code Quality Review (60)
- Uncached SSR → Performance Review (but "no load test to prove it" → Testing)

If the finding is about **test coverage or test quality** of an area, it belongs here. If it is about the production code itself, reference the owning review. Always pair: "Security SEC-012 flags unthrottled search → Testing TEST-004 flags no 429 test for SEC-012".

---

# Positive Findings

Identify testing decisions worth keeping.

Explain why they improve reliability and confidence.

---

# Reusable Testing Patterns

Highlight reusable testing patterns.

Examples:

- Factory/fixture patterns
- Integration test setup
- Mocking strategy
- CI pipeline structure
- Test naming conventions
- E2E journey organisation

---

# Final Recommendation

Provide:

- Overall Testing Score
- Category Scores
- Production Readiness (Testing only)
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

Inspect test files, test configuration, CI pipelines and test scripts before making recommendations.

Run the test suite if practical — a suite that cannot be run locally is itself a finding.

Prioritise coverage of business-critical and money-moving logic over coverage percentages.

Recognise excellent testing practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.
