# Privacy & Data Compliance Analysis

## Objective

Perform a comprehensive assessment of the application's privacy and data compliance posture.

The goal is to evaluate how the application handles personal data (PII): what it collects, where it flows, how long it is kept, how it can be deleted, and whether users' rights and consent are respected.

This is a **technical review of the implementation**, not legal advice. Findings should describe what the software does and what the compliance implications are, leaving legal judgement to counsel.

This review focuses **only on privacy and data compliance**.

Do **not** perform detailed reviews of security, architecture or database design except where they directly affect personal data handling.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Privacy Documentation

Create:

```
docs/ai-review/reports/[project-name]-170-privacy-compliance.md
```

Document how the application handles personal data.

Do not assess quality yet.

---

## 1. PII Inventory

Document:

- Every category of personal data collected (identity, contact, location, financial, biometric, device, behavioural) — **including UGC content bodies** if users can write reviews/listings (free-text often contains inadvertent PII)
- Where each category is stored (database tables, object storage, logs, backups, caches, search indexes)
- Data collected from users directly vs derived vs received from third parties
- Children's data considerations (COPPA/KYCC or equivalent, if relevant)

---

## 2. Data Flows

Document:

- Where PII enters the system (forms, auth providers, webhooks, analytics, support tools)
- Where PII leaves the system (third-party services: auth, analytics, email, payments, AI providers, support)
- Internal flows (services reading PII they do not need)
- Cross-border transfers (regions, hosting, provider locations)

---

## 3. Consent Management

Document:

- Consent collection points (cookie banners, account creation, marketing opt-ins)
- Consent records (what was consented to, when, version)
- Consent withdrawal mechanisms
- How consent is honoured downstream (marketing lists, analytics, email)

---

## 4. Cookies & Tracking

Document:

- Every cookie and storage mechanism (first/third-party, purpose)
- Analytics, advertising, and tracking scripts
- Consent-before-load behaviour for non-essential cookies

---

## 5. Data Retention

Document:

- Retention schedules per data category (or absence of them)
- Enforcement of retention (scheduled deletion jobs, TTLs)
- Retention of backups and logs
- What happens to data when an account is closed

---

## 6. Deletion & Erasure

Document:

- Account deletion flows (user-initiated and admin-initiated)
- What deletion actually removes (records, files, logs, caches, analytics, third-party copies)
- Soft-delete vs hard-delete behaviour
- Right-to-erasure request handling

---

## 7. Data Export & Portability

Document:

- Export features (user downloads of their data)
- What is included and in what format
- Time limits on exports

---

## 8. Third-Party Subprocessors

Document:

- Every third party that receives personal data
- Their role and what data they receive
- Privacy policy / data processing terms coverage
- User notification about subprocessors

---

## 9. Privacy in Logging & Analytics

Document:

- What logs record (request bodies? emails? IP addresses? full payloads? UGC bodies?)
- Error reporting content (Sentry and equivalents)
- Analytics event payloads + whether **crawler bot traffic is filtered** (bot-inflated MAU is both a cost and privacy noise)
- Any PII in logs by default

---

## 9b. UGC Privacy & Retention (if applicable)

Document (if UGC is present):

- Who can see which UGC (public, auth-only, owner-only) and whether PII inside UGC is exposed to crawlers/bots
- Deletion of UGC: does user deletion cascade to reviews/listings/media + search index + caches + backups? Is `reported`/`hidden` UGC still exportable?
- Moderation access: which roles can read all UGC (privacy implication for internal access)
- Seed/demo UGC: is demo PII scrubbed before prod?

---

# Phase 2 - Privacy Assessment

Create:

```
docs/ai-review/reports/[project-name]-170-privacy-compliance-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# PII Inventory Completeness

Review:

- Are all PII categories documented, including derived and inferred data?
- Are there PII stores not in the inventory (backups, cache layers, search indexes, dead-letter queues)?
- Are support/troubleshooting databases included?

---

# Data Minimisation

Review:

- Is PII collected that the feature does not need?
- Is PII stored in full when a truncated form would suffice?
- Do services read PII they do not use?
- Are identifiers kept longer than needed (e.g., raw IPs, device IDs)?

---

# Consent

Review:

- Is consent obtained before collection (not after)?
- Is consent granular (per purpose) or bundled?
- Are consent records stored with a timestamp and version?
- Can users withdraw consent, and is withdrawal honoured downstream?
- Is consent refreshed when purposes change?

---

# Cookies & Tracking

Review:

- Non-essential cookies/tracking loaded before consent
- Cookie banner accuracy (what is declared vs what is loaded)
- Third-party scripts (analytics, ads, fonts, embeds) that leak user data
- Storage on `localStorage`/`sessionStorage` beyond what is needed
- Consent state stored and respected across sessions

---

# Retention & Deletion — Including UGC Cascade

Review:

- Does any retention schedule exist, and is it enforced by a job/cron (not just documented)? Cross-ref Database 40 and Production 100 — retention without a job is not retention.
- Are deleted accounts' PII removed from backups/logs within a reasonable window?
- Does deletion cascade to related records (profiles, media, messages, **reviews/listings + search index + caches**, derived data)?
- Are there orphaned PII records with no deletion path (e.g., unverified sign-ups, pending moderation queue)?
- Is there a defined process for erasure requests that includes UGC?
- Is seed/demo PII scrubbed (Database 40 flags schema, you flag privacy leak if seed ships)?

---

# Right to Erasure

Review:

- Can a user delete all their data through the product?
- Does deletion cover third-party copies (email provider, analytics, payment records)?
- Is there an opt-out path where deletion is not possible (legal retention of financial records)?

---

# Data Portability

Review:

- Can users export their data in a common format?
- Is the export complete and correct?

---

# Third-Party Data Sharing

Review:

- Every subprocessor identified and covered by terms
- Analytics sending PII unnecessarily
- Payment data handled by PCI-compliant providers (cross-reference: Security Review 20)
- AI providers receiving data — what data, for how long, for what purpose (training?)

---

# Privacy in Logging & Observability

Review:

- Request/response bodies logged (passwords, tokens, emails, card data?)
- Error reports including PII or secrets (cross-reference: Security Review 20)
- Log retention vs data minimisation
- Query logs and database logs capturing PII

---

# User-Facing Privacy

Review:

- Privacy policy exists and matches actual behaviour
- Privacy controls accessible (settings, consent centre, deletion)
- What happens on account closure is explained to users
- Marketing opt-in/opt-out defaults (no dark patterns)

---

# Compliance Mapping

Where practical, map findings to:

- GDPR (lawful basis, data subject rights, retention, transfer)
- CCPA/CPRA (disclosure, deletion, sale/sharing opt-out)
- ePrivacy (cookies and tracking)
- PCI DSS (payment data — cross-reference Security Review 20)

State clearly that this is an engineering assessment, not legal advice, and note where counsel is needed.

---

# Technical Debt

Identify:

- Consent mechanisms that were never finished
- Deletion jobs that are missing or broken
- Hard-coded personal data in example/demo data
- PII in free-text fields without controls
- Legacy analytics embeds no longer used

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

- Encryption of PII at rest/in transit → Security Review (20)
- Access control on PII endpoints → Security Review (20)
- PII in logs as a security exposure → Security Review (20) (log the compliance impact here if relevant)
- Schema design for retention fields → Database Review (40)

If the finding is about **how personal data is handled** (collected, kept, deleted, shared, consented), it belongs here. If it is about protecting the data from attackers, security owns it.

---

# Positive Findings

Identify privacy decisions worth keeping.

Explain why they improve compliance posture and user trust.

---

# Reusable Privacy Patterns

Highlight reusable patterns.

Examples:

- Consent record models
- Deletion cascade implementation
- Retention job patterns
- Export implementations
- PII inventory maintenance
- Privacy-by-default defaults

---

# Final Recommendation

Provide:

- Overall Privacy Score
- Category Scores
- Compliance Readiness Assessment
- Production Readiness (Privacy only)
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

Inspect data models, forms, analytics setup, deletion flows, logging, and third-party integrations before making recommendations.

Trace a user's data from collection through storage, sharing, retention, and deletion.

Be specific: name the data category, the code path, and the compliance concern.

Recognise strong privacy practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions and note where legal advice is required.
