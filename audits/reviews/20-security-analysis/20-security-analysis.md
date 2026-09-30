# Security Audit

## Objective

Perform a comprehensive security assessment of this application.

The goal is to identify vulnerabilities, insecure design decisions, implementation flaws, and business logic weaknesses that could compromise the confidentiality, integrity or availability of the system.

Assume the application will be exposed to the public Internet and evaluated by experienced attackers.

Think like an attacker.

Attempt to identify realistic attack paths rather than simply checking best practices.

This review focuses **only on security**.

Do **not** perform detailed reviews of performance, architecture, maintainability, SEO, accessibility, abuse/bot/crawl resilience or production readiness except where they directly impact security.

Abuse, bot, crawler, spam and rate-limit concerns are owned by the **Abuse, Bot & Crawl Resilience** review (190). Cross-reference it rather than duplicating.

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

Abuse, bot, crawler, spam, rate-limit and engagement manipulation are owned by the separate
**Abuse, Bot & Crawl Resilience** review (190). Do not document or assess them here - cross-refer
to 190 so the two reviews do not duplicate the same surface.

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

# Abuse, Bot, Crawl & Spam

Owned by the **Abuse, Bot & Crawl Resilience** review (190). Do not assess abuse, bot/crawler
traffic, spam/fake accounts, engagement inflation, rate-limit completeness, platform bot controls
or crawl-storm cost amplification here.

Security keeps only what is inseparable from core application security (e.g. an unauthenticated
endpoint that leaks data is a Security finding). Where a surface is both a security flaw and an
abuse surface, file the core flaw here and let 190 own the abuse/limiter angle, referencing each
other's IDs.

Reference: review 190.

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

- Title
- Severity
- Confidence (Confirmed / Inferred / Needs manual verification)
- Evidence / Repro
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
- Abuse, bot, crawl, spam or rate-limit gaps → Abuse, Bot & Crawl Resilience Review (190)

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