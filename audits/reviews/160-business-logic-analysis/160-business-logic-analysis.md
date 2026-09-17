# Business Logic & Domain Correctness Analysis

## Objective

Perform a comprehensive assessment of the application's business logic correctness.

The goal is to evaluate whether the business rules — the rules that define how the product works and makes money — are implemented correctly, completely, and safely under real-world conditions: concurrency, retries, failures, and edge cases.

This review focuses **only on business logic correctness**.

It does **not** review security *abuse* of business logic (duplicate subscriptions, quota bypasses, workflow manipulation) — that is owned by the Security Review (20). This review owns whether the logic is *correct*.

Do **not** perform detailed reviews of architecture, database design, performance or testing except where they directly affect business logic correctness.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Business Logic Documentation

Create:

```
docs/ai-review/reports/[project-name]-160-business-logic.md
```

Document the application's business rules and how they are implemented.

Do not assess quality yet.

---

## 1. Domain Overview

Document:

- Core domain entities and their responsibilities
- Key workflows (creation, update, completion, cancellation)
- Where business rules live (services, routers, actions, database constraints, validation schemas)

---

## 2. State Machines & Workflows

Document:

- Every state machine or status lifecycle (e.g., match, order, subscription, payment, job)
- Valid transitions
- Terminal states
- Who/what is allowed to transition each state

---

## 3. Business Rules & Invariants

Document:

- The rules that must always hold (e.g., balance cannot go negative, one active subscription per user, a match cannot be booked twice)
- Where each rule is enforced (app layer, database constraint, validation)
- Rules that are enforced nowhere (implicit)

---

## 4. Money & Ledger Flows

If applicable, document:

- Currency handling and precision strategy
- Fee and charge calculations
- Refunds, partial refunds, chargebacks
- Ledger/balance models
- Rounding behaviour

---

## 5. Asynchronous Workflows

Document:

- Queues, jobs, scheduled tasks
- Webhooks (payment providers, external services)
- Retry strategy
- Which operations must be idempotent

---

## 6. Concurrency Model

Document:

- Where concurrent writes are possible (same record, same resource)
- Locking strategy (optimistic, pessimistic, advisory)
- Transactions and their scope
- Unique constraints that prevent duplicates

---

# Phase 2 - Business Logic Assessment

Create:

```
docs/ai-review/reports/[project-name]-160-business-logic-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# State Machines

Review every state machine:

- Are all expected transitions implemented?
- Are invalid transitions possible (e.g., a match can be cancelled after finalised)?
- Can the system reach a terminal state and then be mutated back?
- Are there stuck states (no valid outgoing transition)?
- Is every transition guarded by the correct precondition?
- Can the same transition fire twice (double-cancel, double-finalise)?

---

# Invariants & Constraints

Review:

- Can any invariant be violated by a sequence of valid operations?
- Are invariants enforced at every entry point (API, jobs, admin tooling, webhooks) or only the main path?
- Are database-level constraints the final safety net, or is integrity app-only?
- Can stale code or a bypassed service violate constraints that the database does not enforce?

---

# Concurrency & Race Conditions

Attempt to identify:

- Double-spend / double-credit / double-charge paths
- Double-booking of a scarce resource (venue, slot, seat, coupon)
- Lost updates (read-modify-write without locking)
- Check-then-act races (check balance, then debit)
- Concurrent webhook deliveries causing duplicate side effects
- Idempotency keys missing where replays are possible

---

# Idempotency

Review:

- Webhook handlers: can a replayed event cause double credit, double charge, duplicate record?
- Job processors: what happens if the same job runs twice (no acknowledgement)?
- Retry semantics: are retries safe?
- Client retries: can a timed-out request be safely retried?
- Idempotency key storage and expiry

---

# Money & Financial Math

Review:

- Floating-point usage in monetary values (should be integer minor units or decimal)
- Rounding strategy (half-up, half-even) and where it applies
- Fee calculations: are fees computed consistently on both sides (charge and refund)?
- Partial refunds: is the refunded amount bounded by the original?
- Currency mixing (can two currencies be compared/added accidentally?)
- Negative amounts / zero amounts where they should be impossible

---

# Partial Failures & Compensation

Review multi-step workflows:

- If step 2 of 3 fails, what state is the system left in?
- Are compensating actions performed (rollback, refund, notification, cleanup)?
- Are operations that must be atomic wrapped in a transaction?
- Are side effects (email, push, external API) fired before or after the DB commit? (Fire-before-commit can send notifications for actions that never happened.)

---

# Boundary Conditions & Edge Cases

Review:

- Zero, negative, and maximum inputs
- Empty collections (no players, no slots, no items)
- Off-by-one in ranges and quotas
- Timezone and daylight-saving handling for scheduling
- Expiry logic (subscriptions, coupons, sessions, slots)
- Large inputs (bulk operations, batch limits)

---

# Business Rule Enforcement Locations

Review:

- Single source of truth for each rule (not duplicated across layers with drift)
- Validation schema vs service logic vs database constraint — do they agree?
- Admin/ops paths that bypass rules the user-facing path enforces
- Rules enforced client-side only (a correctness issue, not just security)

---

# Workflow Integrity

Review:

- Ordering of operations within a workflow (e.g., payment before fulfilment, not after)
- Cancellation/refund workflows that must cascade to other entities
- Archival/cleanup jobs that assume states that no longer exist
- Scheduled jobs interacting with user-initiated changes (e.g., season rollover during an active match)

---

# Auditability of Business Actions

Review:

- Can every business-critical mutation be traced (who, what, when)?
- Are money-moving operations logged with enough detail?
- Cross-reference the Security Review (20) for abuse and audit-logging security; here the focus is whether the *business trail* is complete enough to reconstruct state.

---

# Technical Debt

Identify:

- Duplicated rule implementations that have drifted
- Rules enforced only in UI code
- Known edge cases deferred with TODO comments
- State machines without exhaustive transition tables
- Missing unique constraints that are instead checked in code

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

- Abuse of a workflow (multiple free trials) → Security Review (20)
- Missing index making a check slow → Database Review (40)
- Missing tests for a state machine → Testing Review (150)
- Poorly structured service layer → Architecture Review (10)

If the finding is about **correctness of a business rule or flow**, it belongs here. If it is about exploiting rules, security owns it.

---

# Positive Findings

Identify business logic decisions worth keeping.

Explain why they improve correctness and reliability.

---

# Reusable Business Logic Patterns

Highlight reusable patterns.

Examples:

- State machine implementations
- Idempotency key patterns
- Transaction + compensating-action patterns
- Money handling conventions
- Invariant enforcement strategies
- Webhook replay protection

---

# Final Recommendation

Provide:

- Overall Business Logic Score
- Category Scores
- Production Readiness (Business Logic only)
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

Inspect services, state machines, payment and webhook handlers, and database constraints before making recommendations.

Trace real flows end-to-end — follow a payment, a booking, a state transition from entry point to completion.

Attempt to break the logic with realistic sequences (double-submit, replay, concurrent requests, out-of-order events) rather than checking for the existence of code.

Prioritise findings that could cause financial loss, data corruption, or incorrect business outcomes.

Recognise strong business logic as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.
