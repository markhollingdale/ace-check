# Billing & Subscription Lifecycle Analysis

## Objective

Perform a comprehensive assessment of the application's billing and subscription
lifecycle correctness.

The goal is to evaluate whether a customer can move through the entire paid
lifecycle - purchase, renewal, payment failure, recovery, card update,
cancellation, refund, dispute, and expiry - without losing access they paid for,
keeping access they no longer pay for, or being billed after the entitlement is
removed.

This review focuses **only on recurring billing lifecycle correctness and
operability**.

Do **not** perform detailed reviews of architecture, database design,
performance, general API design, testing, or visual design except where they
directly affect billing lifecycle correctness. Cross-reference the owning review
instead.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Billing Lifecycle Documentation

Create:

```
docs/ai-review/reports/[project-name]-250-billing-lifecycle.md
```

Document the application's billing model and how it is implemented.

Do not assess quality yet.

---

## 1. Products, Prices, and Billing Model

Document:

- Every billable product or plan, including free/comped variants.
- Price, currency, billing interval, and whether the price is code-driven,
  database-driven, or provider-driven.
- Whether prices can change after purchase and how existing subscriptions are
  treated.
- Trials, proration, upgrades/downgrades, quantity changes, coupons, credits,
  and tax handling (or state that they are not supported).
- Where the authoritative price lives and how the checkout/charge path reads it.

---

## 2. Subscription State Machine

Document:

- Every state the provider can report (for example trial, active, past_due,
  unpaid, incomplete, canceled, paused, expired).
- Every state the application stores locally, or state that it stores none.
- Valid and invalid transitions.
- Which states entitle the customer to the product, which suspend it, and which
  revoke it.
- How cancellations, refunds, disputes, and expired cards interact with the
  state machine.
- What happens when a subscription reaches a terminal state.
- How comped/free accounts are represented and whether they can accidentally
  receive renewal events.

---

## 3. Provider Events and Handlers

Document:

- Every billing webhook event the provider sends that is relevant to the
  lifecycle.
- Every event the application actually subscribes to and handles.
- For each handler: the event, the local writes, external calls, notifications,
  idempotency key, and failure behaviour.
- Which events are deliberately ignored and why.
- Whether the provider dashboard event list matches the code's handlers.

---

## 4. Renewal and Invoicing

Document:

- How a renewal is detected and recorded.
- How the next renewal date/period end is calculated and stored.
- Whether invoices are persisted locally or only read from the provider.
- How receipts, credit notes, invoice history, and customer-facing billing
  records are produced.
- How proration and mid-cycle changes are reflected.
- How a missed or out-of-order renewal event is detected.

---

## 5. Failed Payments, Dunning, and Recovery

Document:

- The provider's retry/dunning behavior and who configures it.
- The local state during a failed payment.
- Customer notification on failure, recovery, and final cancellation.
- Whether the customer can update their payment method and how.
- The grace period and what happens at its end.
- The operator alert path and the runbook for a failed renewal.
- What happens if the provider leaves a subscription `past_due` indefinitely or
  marks it uncollectible.

---

## 6. Cancellation and Entitlement Changes

Document:

- Cancel-at-period-end, immediate cancellation, pause, and resume.
- Who can cancel (customer, admin, provider dashboard) and how each path updates
  local state.
- What access the customer retains during the paid period.
- What happens to the entitlement when a cancellation webhook is missed.
- How a refund or chargeback interacts with cancellation.

---

## 7. Reconciliation and Data Integrity

Document:

- Whether a scheduled reconciliation job exists and what it compares.
- How duplicate subscriptions, duplicate checkouts, and duplicate webhook
  deliveries are prevented.
- How out-of-order events converge.
- Whether unique constraints protect provider identifiers.
- How the system behaves when an external API call times out after the provider
  has committed the change.

---

## 8. Operator Configuration and Runbooks

Document:

- Every provider dashboard setting the code depends on.
- Webhook endpoint and event list.
- Dunning/retry/auto-cancel settings.
- Customer portal configuration.
- Receipt/invoice email settings.
- Tax settings, if applicable.
- Alert channels and the on-call runbook.
- Kill switches that stop new billing without breaking existing subscriptions.

---

# Phase 2 - Billing Lifecycle Assessment

Create:

```
docs/ai-review/reports/[project-name]-250-billing-lifecycle-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Full Lifecycle Trace

Trace at least one subscription through a full 13+ month lifecycle, using code
inspection plus provider test tooling where available. Cover:

1. Initial purchase and first charge.
2. First successful renewal.
3. Failed renewal (expired/declined card).
4. Customer notification and card update.
5. Recovery and successful retry.
6. Cancellation at period end.
7. Immediate cancellation/revocation.
8. Full refund.
9. Partial refund.
10. Dispute opened.
11. Dispute won.
12. Dispute lost.
13. Duplicate checkout or duplicate subscription.
14. Missed webhook and reconciliation.
15. Final expiry or deletion.

For each step, record the expected entitlement, the local state, the customer
communication, the operator signal, and whether the state can be recovered.

If the provider does not support test clocks or equivalent, state how the
reviewer simulated time and what could not be verified.

---

# State Machine Correctness

Review:

- Are all provider states mapped to a local state?
- Can a customer keep access after the paid period without a grace policy?
- Can a customer lose access while still paid?
- Can a canceled subscription be resurrected by a stale event?
- Can a duplicate subscription keep billing after a conflict?
- Can a stale subscription event wipe a newer customer's entitlement?
- Is every terminal state actually terminal?
- Is a comped/free account excluded from renewal and dunning logic?

---

# Renewal and Invoicing Correctness

Review:

- Is the renewal period end taken from the authoritative provider object rather
  than an arbitrary line item?
- Are renewal invoices recorded locally with amount, currency, period, status,
  and receipt link?
- Does the customer receive a receipt or invoice for every charge?
- Does the revenue view distinguish paid, past-due, comped, and canceled
  subscriptions?
- Does a missed renewal webhook leave a stale period that is never reconciled?
- Does a partial refund or credit note leave the entitlement correct?

---

# Failure, Dunning, and Recovery

Review:

- Does a failed renewal produce a customer-visible path to fix it?
- Is the failure surfaced to the operator with enough context to act?
- Is there exactly one notification per failure event, even on redelivery?
- Is the grace period defined and consistent with the public terms?
- Does final dunning failure revoke the entitlement and stop billing?
- Can the customer update their card without contacting support?
- Is the card-update flow authenticated and scoped to the right customer?
- Is 3DS/SCA or other action-required flow handled?

---

# Entitlement Integrity

Review:

- Does a dispute immediately revoke or merely suspend? Is the policy explicit?
- Is a won dispute restored?
- Is a lost dispute recorded distinctly from a goodwill refund?
- Does a partial refund avoid revoking the whole entitlement?
- Does a full refund revoke it?
- Can a stale deletion event wipe a newer customer's claim?
- Are admin bulk actions as safe as the single-row actions?
- Do operator actions cancel the provider subscription before or after wiping
  local state, and what happens if the provider call fails?

---

# Checkout and Webhook Reliability

Review:

- Is checkout creation idempotent if the request times out?
- Does fulfilment depend on a local ID that might not have been saved?
- Can a paid checkout exist without a local entitlement?
- Does fulfilment verify the payment status and amount?
- Are provider identifiers protected by unique constraints?
- Is the webhook endpoint configured to receive every event the code handles?
- Do transient failures retry? Do permanent failures get recorded?
- Is there a reconciliation job or dead-letter path for missed events?
- Does the system distinguish test and live provider modes?

---

# Security and Environment Boundaries

Cross-reference Security (20) for the deep security review. At minimum verify:

- Test/live keys cannot be used in the wrong environment.
- Webhook secrets and event `livemode` match the key mode.
- Outbound create/refund operations use idempotency keys where retries are
  possible.
- Customer portal sessions are authenticated and scoped to the customer.
- Refund operations are authorized and capped by the remaining paid amount.
- No card data or secret key reaches the client.

If a deeper security issue is found, file it under Security (20) and reference it
here.

---

# Operator Safety and Auditability

Review:

- Can a bulk action silently leave subscriptions billing?
- Does every money-moving or entitlement-changing operator action write an audit
  record?
- Is the failed-payment/dunning runbook discoverable and current?
- Does the admin UI show subscription status, renewal date, past-due state, and
  last invoice?
- Can an operator tell the difference between a comp, a paid subscription, a
  refund, and a chargeback?

---

# Technical Debt

Identify:

- Provider status values not mapped locally.
- Duplicate or divergent entitlement logic across user and admin paths.
- Webhook handlers that assume event order.
- Invoices or renewals visible only in the provider dashboard.
- Missing unique constraints.
- Notifications sent before the state is committed.
- Test-clock scenarios that do not exist.

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
- Confidence and Evidence/Repro per the framework format

Do not duplicate findings that belong in other reviews. In particular:

- Card data, webhook signature, secret handling, and portal authorization
  security depth -> Security (20)
- Tax law and statutory cancellation rights -> Financial/Tax review (when added)
- Query performance -> Performance (30) / Database (40)
- Missing tests as a coverage problem -> Testing (150)

If the finding is about the **correctness or operability of the recurring
billing lifecycle**, it belongs here.

---

# Positive Findings

Identify billing lifecycle decisions worth keeping.

Explain why they improve correctness and reliability.

---

# Reusable Billing Lifecycle Patterns

Highlight reusable patterns, for example:

- A local subscription state mirror with a pure status mapper.
- Provider-test-clock verification of renewal/failure/cancellation.
- Cancel-first, then wipe, with a compensating retry.
- Entitlement functions that are pure and tested.
- Notification idempotency keyed on the provider event/invoice id.
- Reconciliation jobs that only repair confirmed drift.

---

# Final Recommendation

Provide:

- Overall Billing Lifecycle Score
- Category Scores
- Production Readiness (billing lifecycle only)
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

Inspect the provider events, local state, entitlement checks, renewal and
dunning handlers, refund/dispute handlers, cancellation paths, the admin console,
and the operator runbook.

Trace a real subscription end to end through at least one renewal and one
failure, rather than checking for the existence of a webhook handler.

Attempt to break the lifecycle with realistic sequences: expired card, duplicate
checkout, out-of-order events, missed webhook, partial refund, dispute, card
update, cancellation during dunning, and a stale deletion event.

Prioritise findings that could cause a customer to be billed without access,
keep access without paying, lose a paid entitlement, or never recover from a
failed payment.

Recognise strong lifecycle design as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions and mark provider/dashboard facts as
`Needs manual verification`.
