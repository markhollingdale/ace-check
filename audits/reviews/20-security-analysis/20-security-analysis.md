# Security Audit

## Objective

Perform a comprehensive security assessment of this application.

The goal is to identify vulnerabilities, insecure design decisions, implementation flaws, and business logic weaknesses that could compromise the confidentiality, integrity or availability of the system.

Assume the application will be exposed to the public Internet and evaluated by experienced attackers.

Think like an attacker.

Attempt to identify realistic attack paths rather than simply checking best practices.

This review focuses **only on security**.

Do **not** perform detailed reviews of performance, architecture, maintainability, SEO, accessibility or production readiness except where they directly impact security.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Security Documentation

Create:

```
docs/ai-review/reports/[project-name]-20-security.md
```

Document the application's security architecture.

This document should explain how security has been implemented.

Do not assess quality yet.

---

## 1. Authentication

Document:

- Authentication provider
- Session strategy
- Token strategy
- Cookie configuration
- Login flow
- Registration flow
- Password reset flow
- MFA (if implemented)
- Email verification
- Social login (if implemented)

---

## 2. Authorisation

Document:

- Role model
- Permission model
- Route protection
- API protection
- Server-side checks
- Client-side restrictions
- Resource ownership checks

---

## 3. Multi-Tenant Security

Document:

- Tenant model
- Tenant identification
- Tenant boundaries
- Shared resources
- Isolation strategy

---

## 4. API Security

Document:

- API architecture
- Authentication flow
- Validation strategy
- Error handling
- Rate limiting
- Middleware

---

## 5. Database Security

Document:

- ORM
- Database access patterns
- Service role usage
- Row Level Security (if applicable)
- Migration strategy

Do not review indexes or performance.

---

## 6. File Upload Security

Document:

- Upload endpoints
- Storage provider
- Validation
- Access control
- Download permissions

---

## 7. Secrets Management

Document:

- Environment variables
- Secret storage
- API keys
- Service accounts
- Build-time secrets
- Runtime secrets

---

## 8. External Services

Document:

- Authentication providers
- Payment providers
- Email providers
- AI providers
- Analytics
- Monitoring

Explain how trust boundaries are managed.

---

## 9. Security Headers

Document:

- CSP
- HSTS
- X-Frame-Options
- Referrer Policy
- X-Content-Type-Options
- Permissions Policy

---

## 10. Logging

Document:

- Security logging
- Audit logging
- Authentication events
- Error logging
- Sensitive data handling

---

## 11. Abuse, Bot & Crawler Surface

Document (project-agnostic — use "if applicable"):

- Every public/unauthenticated endpoint and procedure (if tRPC: every `publicProcedure`; if REST: every `GET` without auth) — list name, cost (DB queries, PostGIS, external calls), and current rate limiter if any
- Rate-limit implementation: where enforced (middleware, procedure wrapper, route handler), store (DB table, Upstash Redis, in-memory), window/quotas, key (IP, IP+UA, userId, fingerprint), atomicity
- Bot/crawler controls: `robots.txt` / `app/robots.ts` rules per User-Agent, sitemap hygiene, middleware UA blocking, canonical/noindex for filter/pagination permutations
- Spam controls: CAPTCHA/ALTCHA coverage, honeypot, email verification, registration throttling
- Engagement/analytics abuse: how views/clicks/counts are deduped (IP+UA, fingerprint), whether crawler UAs are filtered
- Platform controls (if Vercel/Cloudflare used): Bot Management, Firewall custom rules, Attack Challenge Mode, Spend Alerts — document configured state

---

# Phase 2 - Security Assessment

Create:

```
docs/ai-review/reports/[project-name]-20-security-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Authentication Security

Review:

- Login flow
- Registration
- Password reset
- Email verification
- Session handling
- Session expiry
- Session invalidation
- Token lifecycle
- Cookie security
- MFA implementation
- Brute force protection

Questions:

- Can authentication be bypassed?
- Can expired sessions be reused?
- Can users remain authenticated after logout?
- Can sessions be hijacked?

---

# Authorisation Security

Review every protected resource.

Verify authorisation is enforced server-side.

Test for:

- Missing ownership checks
- Missing role checks
- Client-side only restrictions
- Resource enumeration
- Permission bypasses

Questions:

- Can one user access another user's data?
- Can hidden endpoints be accessed directly?
- Can permissions be modified by the client?

---

# Multi-Tenant Isolation

Treat this as a critical SaaS requirement.

Verify complete tenant isolation.

Attempt to identify:

- Cross-tenant reads
- Cross-tenant updates
- Cross-tenant deletes
- Cross-tenant exports
- Shared resources
- Tenant enumeration

Review:

- Database queries
- API routes
- Background jobs
- File storage
- Search
- Reporting
- Caching

---

# API Security

Review every API surface.

Check:

- Authentication
- Authorisation
- Validation
- Error handling
- Sensitive information leakage
- HTTP methods
- Response consistency

Attempt to identify:

- IDOR vulnerabilities
- Mass assignment
- Injection attacks
- Parameter tampering
- Privilege escalation

---

# Input Validation

Review every user-controlled input.

Check:

- Zod validation
- Server-side validation
- Sanitisation
- Type validation
- Length limits
- File validation

Attempt to identify:

- SQL Injection
- NoSQL Injection
- XSS
- Command Injection
- Template Injection
- SSRF
- Path Traversal

---

# Session Security

Review:

- Session creation
- Rotation
- Expiry
- Revocation
- Cookie flags
- Secure storage

Verify:

- HttpOnly
- Secure
- SameSite
- CSRF protection

---

# Supabase Security

If Supabase is used, review:

- Every table
- Every RLS policy
- Service role usage
- Anonymous access
- Auth configuration

Look for policies that unintentionally expose data.

Attempt to identify privilege escalation through misconfigured policies.

---

# Next.js Security

Review:

- Server Actions
- Route Handlers
- Middleware
- Server Components
- Client Components
- Environment variables
- Error pages
- Dynamic routes

Verify sensitive logic remains server-side.

---

# Business Logic Security

Attempt to abuse application logic.

Examples:

- Duplicate subscriptions
- Duplicate payments
- Duplicate rewards
- Multiple free trials
- Quota bypasses
- Workflow manipulation

Do not assume business logic is secure simply because authentication succeeds.

---

# File Upload Security

Review:

- MIME validation
- File extension validation
- File size limits
- Virus scanning (if implemented)
- Storage permissions
- Download permissions

Attempt to upload unexpected file types.

---

# AI Endpoint Security

If AI functionality exists, review:

- Prompt injection
- Jailbreak resistance
- Cost amplification
- Model abuse
- Uploaded documents
- Sensitive context exposure
- Rate limiting

Attempt to identify abuse scenarios.

---

# Abuse & Cost Amplification — Bot, Crawler & Spam (Primary Owner)

You own abuse detection. Cross-reference but do not duplicate: Performance owns edge-cache absorption, SEO owns robots/canonical correctness, Cost owns dollar modelling — you own "can it be abused?" and "is it rate-limited?".

## A. Bot & Crawler Abuse (Critical for Vercel/Serverless Apps)

Assume 100k+ requests in hours from GPTBot, ClaudeBot, Bytespider, CCBot, PerplexityBot, Google-Extended, plus spoofed UAs.

Review:

- **Infinite URL spaces / crawl traps:** Faceted search (`/whats-on?q=&where=&category=&sort=&dateFrom=&radius=&priceMax=`), pagination `?page=`, sort/filter combos. Every permutation must not be crawlable as a distinct expensive page. Check `robots.ts` / `robots.txt`, canonical collapsing, `noindex` on filtered variants (reference SEO review for correctness, flag here as abuse surface).
- **Unauthenticated read abuse:** Inventory every public read/search proc. If any expensive query (PostGIS `ST_DWithin`, full-text, aggregation) is reachable without auth and without a limiter, it is a P0. Examples: `search.search`, `venue.search`, `event.list/getBySlug/getById/getUpcoming`, `category.list`, `ad.getForPosition`, `favorite.count` — verify each has an atomic sliding-window limit (DB or Upstash Redis). In-memory only = bypassed by horizontal scale.
- **Cache-bypass abuse:** If `app/api/trpc/[trpc]/route.ts` sets `Cache-Control: no-store` on all responses, or detail pages have no `export const revalidate` / `export const dynamic = "force-static"` / ISR, every bot hit = DB render. Flag as cost-amplification even though Performance owns the fix.
- **Edge middleware second line:** If Next.js middleware exists, verify a tiny UA filter for known AI bots at the edge catches spoofed scrapers (keep tiny — runs on every request). No middleware = note as missing layer.
- **Engagement inflation:** If views/impressions are counted client-side and keyed only by `IP+UA`, bots running JS inflate counts and can be used to game ranking. Flag if crawler UAs are not ignored in `lib/engagement.ts` or equivalent.
- **Spoofed UA:** Malicious scrapers spoof `GPTBot` to sneak past naive rules. Verify platform Firewall does ASN verification (if Vercel Bot Management) or that middleware blocks UA regardless of spoof.

## B. Spam & Fake Account Abuse

Review:

- Registration / contact / claim / upload / report forms: is ALTCHA (or equivalent) enforced server-side on every write? Client-only check = bypass.
- Email abuse: can an attacker trigger unlimited transactional emails (verification, reset, notifications) per IP? Is there per-IP + per-target rate limit? Is SPF/DKIM/DMARC passing (deliverability check — cross-ref `pre-live-gate.md`)?
- Content spam: can an unauthenticated actor create listings, reviews, comments at scale? Check throttling + moderation.
- Honeypot / fingerprinting (if used): document secondary signals.

### If UGC Is Present (reviews, comments, listings, profiles) — Conditional

If the app accepts user-generated content (as this review library does), also review:

- **Moderation queue:** Is every new/edited UGC item `pending` until moderated or auto-scanned? No queue = spam is live instantly.
- **Report → triage SLA:** Can any user `report` content and is there an admin view + action (hide/delete + notify author) with audit logging? Missing report path = no takedown.
- **Automated filters:** profanity/NSFW/URL spam heuristic or vendor (e.g., Perspective, regex) — not as sole gate, but as flag for queue.
- **Review bombing / throttling:** Can one IP/user create 50 reviews/hr across targets? Require per-user + per-target rate limit distinct from generic API limit.
- **Admin abuse:** Can a moderator edit/delete any content without audit trail? Verify `updatedBy` + `deletedAt` + `audit_log` and that moderator actions are not client-authorizable.
- **Escalation & blocking:** Can admins block user + hide all their UGC in one action; is there an appeal path?

Cross-ref Privacy 170 for UGC retention/deletion and Business Logic 160 for workflow correctness — you own "can it be spammed or abused by a moderator/bot?"

## C. Rate-Limit Completeness Audit

For **every** write surface already checked (tracking, auth, claims, uploads, reports) plus **every** read surface above, verify:

- Limiter is atomic (DB `INSERT ... ON CONFLICT` / Redis `INCR` with sliding window), not `SELECT then INSERT`.
- Key is appropriate: anon → `IP` or `IP+UA` (+ `x-forwarded-for` parsing respecting `trustProxy`); auth → `userId` with IP fallback.
- Limits are differentiated: cheap reads > expensive search > writes > auth. Flat `60/min` on all routes = search still abusable.
- Fail-open vs fail-closed is intentional: DB-backed limiter failing open under DB load = protection disappears during the storm it's meant to stop.

Estimate financial impact: `requests * (Serverless GB-s + DB compute + external calls)` — reference Cost Analysis for dollar figure, but state req/s needed to 10x bill.

Test manually: `curl -A GPTBot`, `curl -A "Mozilla (spoofed GPTBot)`, burst 60/min on cheapest search endpoint with `x-forwarded-for` rotation — expect `429` with `Retry-After`.

---

# Stripe Security

If Stripe is used, review:

- Webhook verification
- Subscription validation
- Payment state
- Checkout flow
- Customer ownership
- Refund handling

Verify premium access cannot be obtained without successful payment.

---

# Secrets Management

Review:

- Environment variables
- Browser bundles
- API keys
- Service role keys
- Git history
- Example files

Attempt to identify exposed secrets.

---

# Dependency Security

Review:

- Direct dependencies
- Transitive dependencies
- Known vulnerabilities
- Deprecated packages
- Malicious packages

Review dependency update strategy.

---

# Supply Chain Security

Review:

- CI/CD workflows
- GitHub Actions
- Build scripts
- npm lifecycle scripts
- Lock files

Attempt to identify supply chain risks.

---

# Logging & Monitoring

Review:

- Authentication logging
- Audit logging
- Security events
- Failed logins
- Permission failures

Verify logs do not expose:

- Passwords
- Tokens
- API keys
- Secrets
- Personal data

---

# OWASP Top 10

Review the application against the latest OWASP Top 10.

Include:

- Broken Access Control
- Cryptographic Failures
- Injection
- Insecure Design
- Security Misconfiguration
- Vulnerable Components
- Authentication Failures
- Software & Data Integrity Failures
- Logging & Monitoring Failures
- SSRF

---

# OWASP ASVS

Where practical, assess the application against the OWASP Application Security Verification Standard (ASVS).

Use ASVS as a benchmark for production readiness.

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

- Missing indexes → Database Review
- Slow queries → Performance Review
- Large bundles → Performance Review
- Poor architecture → Architecture Review

Reference the appropriate review instead.

---

# Positive Findings

Identify security decisions worth keeping.

Explain why they improve the security posture.

---

# Reusable Security Patterns

Highlight security patterns that could be reused in future projects.

Examples:

- Authentication architecture
- Authorisation middleware
- Validation strategy
- Secure API patterns
- Audit logging
- Multi-tenant isolation

---

# Final Recommendation

Provide:

- Overall Security Score
- Category Scores
- Production Readiness (Security only)
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

Think like an attacker.

Attempt to exploit weaknesses rather than simply checking for their existence.

Prioritise vulnerabilities that present realistic business risk.

Provide evidence-based recommendations.

Recognise strong security practices as well as weaknesses.

When uncertain, clearly state assumptions.

Avoid duplicate findings across review standards.