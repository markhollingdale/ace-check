# Production Readiness Analysis

## Objective

Perform a comprehensive production readiness assessment of this application.

The goal is to determine whether the application is ready for deployment to a production environment.

Assess operational maturity, deployment readiness, reliability, observability and resilience.

This review focuses **only on production readiness**.

Do **not** perform detailed reviews of architecture, security, performance, accessibility or code quality except where they directly impact production deployment.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Production Documentation

Create:

```
docs/ai-review/reports/[project-name]-100-production-readiness.md
```

Document how the application is prepared for production.

Do not assess quality yet.

---

## 1. Deployment Strategy

Document:

- Hosting platform
- Deployment process
- CI/CD pipeline
- Rollback strategy
- Deployment frequency

---

## 2. Environment Configuration

Document:

- Development
- Staging
- Production
- Environment variables
- Configuration management

---

## 3. Monitoring

Document:

- Application monitoring
- Error monitoring
- Performance monitoring
- Health monitoring
- Alerting

---

## 4. Logging

Document:

- Structured logging
- Log aggregation
- Log retention
- Audit logging

---

## 5. Health Checks

Document:

- Health endpoints
- Dependency checks
- Readiness checks
- Liveness checks

---

## 6. Background Processing

Document:

- Scheduled jobs
- Queues
- Workers
- Retry strategy
- Failure handling

---

## 7. Backups & Recovery

Document:

- Backup strategy (provider PITR window — Neon 7d, Supabase PITR, logical dumps)
- Recovery procedures (step-by-step runbook, not "contact support")
- **Last successful restore drill date + artifact** (branch-from-backup or point-in-time restored to staging, queries verified) — if no date, state `NEVER TESTED`
- RTO / RPO targets vs measured drill time
- Disaster recovery (region failure, data-loss scenario)
- Data retention (backups vs logs vs caches)

---

## 8. Third-Party Dependencies

Document:

- External APIs
- AI providers
- Payment providers
- Email providers
- Storage providers

Explain operational dependencies.

---

## 9. Operations

Document:

- Maintenance procedures
- Operational runbooks (`docs/runbooks/*` — especially `pre-live-gate.md` and `vercel-neon-manual-setup.md`)
- Incident handling (on-call, toggle owners for Attack Challenge Mode / feature kill-switch)
- Release process (rollback, feature-flag kill-switch, progressive rollout if used)
- Synthetic smoke: `login → create → search → view` canary that runs post-deploy (URL + schedule)

---

## 10. Documentation

Document:

- Deployment documentation
- Operational documentation
- Recovery documentation
- Developer documentation

---

## 11. Platform Firewall, Bot & Spend Controls

Document (conditional — only if the platform is used):

- If Vercel: Firewall state — Bot Management ON/OFF, custom rate rules (e.g., 100 req/min on `/api/trpc` or `/api/*`), Managed Challenge vs Block action, Attack Challenge Mode familiarity
- If Cloudflare / other CDN: equivalent bot/WAF rules
- Spend controls: Vercel Billing → Spend Management alerts at 50/75/100%, Spend Limits / Pause project; Neon/Supabase plan limits, compute auto-suspend, `max_connections` / pool config
- `vercel.json` headers, `next.config.ts` headers, `middleware.ts` existence and runtime (`edge` vs `nodejs`)
- `app/robots.ts` vs `public/robots.txt` — which will ship
- `app/sitemap.ts` / `public/sitemap.xml` hygiene

---

# Phase 2 - Production Assessment

Create:

```
docs/ai-review/reports/[project-name]-100-production-readiness-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Deployment Readiness

Review:

- Build process
- Deployment automation
- Environment separation
- Rollback capability
- Repeatability

Evaluate deployment reliability.

---

# Configuration Management

Review:

- Environment variables
- Secret management
- Configuration consistency
- Environment separation
- Feature flags

Evaluate configuration quality.

---

# Monitoring

Review:

- Error monitoring
- Application monitoring
- Performance monitoring
- Infrastructure monitoring
- Alerting

Determine whether production issues would be detected quickly.

---

# Logging

Review:

- Structured logging
- Log consistency
- Correlation IDs
- Error logging
- Audit logging
- Sensitive data handling

Evaluate operational usefulness.

---

# Health & Reliability

Review:

- Health endpoints
- Readiness probes
- Dependency checks
- Failure detection
- Self-healing capabilities

Assess operational resilience.

---

# Error Recovery

Review:

- Retry logic
- Timeouts
- Circuit breakers
- Graceful degradation
- Failure recovery

Evaluate resilience to failures.

---

# Background Processing

Review:

- Queue handling
- Scheduled jobs
- Retry policies
- Idempotency
- Dead-letter handling

Assess reliability of asynchronous processing.

---

# Backup & Disaster Recovery — Proof Required

Review:

- Backup procedures (PITR window matches provider — Neon/Supabase 7d+)
- Recovery procedures (runbook exists and is not "contact support")
- **Restore testing: is there evidence of a restore?** Demand date + artifact: a branch restored from backup to staging with `SELECT COUNT(*) > 0` or equivalent. `Backup ON` with `last drill = NEVER` = **High** (Critical if no PITR at all).
- RTO/RPO: targets vs drill-measured time; is RPO < 1h?
- Data retention (backups vs logs — are logs retaining PII longer than DB?)

Evaluate disaster recovery readiness. If provider says "PITR enabled" but team never restored, flag — that is untested, not ready.

Cross-reference: Database owns schema retention, Testing owns drill automation, you own "can we prove we restored?"

---

# Dependency Management

Review:

- External services
- Service dependencies
- Failure handling
- Timeouts
- Fallback behaviour

Assess resilience to third-party outages.

---

# Scalability Readiness

Review:

- Horizontal scaling
- Stateless services
- Session management
- Resource limits
- Autoscaling compatibility
- Crawl elasticity: what happens under 100k bot hits/hr if CDN is bypassed (connections exhausted, Serverless concurrency throttled, DB pool queued)

Evaluate readiness for increased demand.

---

# Operational Readiness — Including Kill-Switch & Runbook Drill

Review:

- Runbooks (does `docs/runbooks/pre-live-gate.md` exist and is it the single pre-launch checklist? does `vercel-neon-manual-setup.md` match dashboard state?)
- Incident response (who is on-call, who toggles Attack Challenge Mode / feature flag off at 2am, who restores DB — names, not roles)
- Maintenance procedures
- Release process (feature flags / progressive rollout / immediate kill-switch if no flags — can you shed load without a redeploy?)
- Operational documentation (RTO/RPO, contacts, escalation)

Determine whether the application can be effectively supported in production. If the only rollback is `git revert + redeploy (8 min)` and the spike is 100 req/s, flag as **High** — you need a flag or Challenge toggle that works in seconds.

---

# Testing Readiness — Including Synthetic Smoke

Review:

- Automated tests
- Integration tests (including backup restore drill if present)
- End-to-end tests
- **Synthetic smoke / canary post-deploy:** does a job hit production after each deploy with `health → login → search → view → track` and alerts on failure? A `200` on `/api/health` alone is not a smoke test.
- Deployment validation (Vercel preview → checks → prod gate; DB migration validated)

Evaluate confidence in production deployments. No canary = deploy can break business flow while infra stays green.

Reference Testing review for implementation, but flag missing gate here as operational risk.

---

# Observability — Including SLOs & Human vs Bot Split

Review:

- Metrics + **SLIs/SLOs**: p95 latency, error rate, and burn rate — is there an SLO and an alert when it burns? No SLO = no shared definition of "down".
- Logs (including PII hygiene — cross-ref Privacy)
- Traces
- Dashboards
- Alerting (who gets paged, not just emailed)
- Bot visibility: can you distinguish bot vs human in logs/analytics? Are `User-Agent`, `x-forwarded-for`, route, cache `HIT/MISS` logged? Dashboard for `429` rate, bot UA share, function invocations?
- Analytics trust: does PostHog/equivalent filter crawler UAs so MAU is not inflated? Is the dashboard trusted for business decisions?

Assess whether production behaviour can be understood and diagnosed. Logs without bot split = you can't tell if the spike is customers or GPTBot.

---

# Business Continuity

Review:

- Single points of failure
- Disaster recovery
- Data recovery
- Service continuity
- Operational resilience
- Financial continuity: do Spend Alerts + Spend Limits + manual Attack Challenge Mode toggle constitute a bill-runaway kill-switch? Who can toggle it at 2am?

Identify risks to business continuity.

---

# Platform Firewall & Spend Safeguards — Pre-Launch Click Checklist (Manual, Not Code)

You must verify these in the **Vercel / Neon / Supabase dashboards** — code review alone cannot prove they are ON.

**If Vercel is used, verify:**

- [ ] Project → Settings → Security / Firewall → **Bot Management** ON (Managed Challenge for unverified bots — catches spoofed GPTBot)
- [ ] Firewall → Custom Rules → **Rate limit**: `if path startsWith /api/trpc then rate limit 100 req/min per IP` (or 60/min on expensive search), action `Challenge` or `Block` with `429`
- [ ] Know where **Attack Challenge Mode** is (Firewall tab — single toggle to challenge all traffic during a spike). Document who can toggle and drill it once.
- [ ] Billing → Spend Management → **Spend Alerts** at `50%`, `75%`, `100%` of budget; **Spend Limits / Pause project** if tier supports it
- [ ] `middleware.ts` (if present) uses `edge` runtime and is <50 lines — verify it does UA block before DB, not after
- [ ] `vercel.json` / `next.config.ts` security + cache headers are shipped (inspect deployment → Headers tab)

**If Neon is used, verify:**

- [ ] Project → Settings → Compute → **Auto-suspend** tuned, `max_connections` and PgBouncer (pooled connection string) in use — not direct `postgres://` per Serverless invocation
- [ ] Branching / PITR enabled for recovery (reference Backups)
- [ ] Billing alerts ON

**If Supabase is used, verify:**

- [ ] Project → Database → **Connection pooling** (PgBouncer) ON, pool size vs Serverless concurrency modelled; `max_connections` not trivially exhaustible by `no-store` crawl
- [ ] Auth → Rate limits reviewed
- [ ] Billing alerts ON

Reference docs: `../runbooks/vercel-neon-manual-setup.md` (add to repo) or link to Vercel/Neon docs. Flag any unchecked item as **High** — it costs real money from day one.

Dedup: Security owns "is rate limit correct in code?", Performance owns "is it cached?", you own "is the platform switch actually ON?"

---

# Technical Debt

Identify:

- Manual deployment steps
- Missing monitoring
- Missing documentation
- Missing health checks
- Operational workarounds
- Incomplete automation

Estimate long-term operational impact.

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

- Authentication weaknesses → Security Audit
- Slow rendering → Performance Analysis
- Database schema issues → Database Analysis
- Code organisation → Code Quality Analysis

Reference the appropriate review instead.

**Mandatory manual-verification finding — you must always emit this:**

Even if all code checks pass, you **must** create at least one finding that surfaces the dashboard runbooks, because code review cannot prove they are ON. Use this template (High; upgrade to Critical if no evidence of any manual check):

```
## PRD-MANUAL-001 — Manual Dashboard & Pre-Live Gate Verification Required

Severity: High
Problem: The following platform controls cannot be verified from code and require human confirmation before `PRODUCTION READY: YES`: Vercel Bot Management, Firewall rate rule on /api/trpc, Attack Challenge Mode owner, Spend Alerts 50/75/100%, Neon/Supabase pooled URL + PITR + restore drill date, synthetic smoke. See docs/runbooks/vercel-neon-manual-setup.md and docs/runbooks/pre-live-gate.md.

Recommendation: Walk docs/runbooks/pre-live-gate.md gate checklist (sections 1-4) and paste curl outputs + drill dates into this report's Phase 1 doc. Do not mark production ready until signed.

Cross-reference: Security owns limiter correctness, Performance owns cache, Cost owns spend model — you own proof the switch is ON.
```

If `docs/runbooks/pre-live-gate.md` is not present in the repo or has no sign-off date, state that explicitly in the finding.

---

# Positive Findings

Identify production practices worth keeping.

Explain why they improve reliability, resilience or operational maturity.

---

# Reusable Production Patterns

Highlight reusable operational patterns.

Examples:

- Deployment pipelines
- Health checks
- Monitoring
- Logging
- Background workers
- Recovery procedures

---

# Final Recommendation

Provide:

- Overall Production Readiness Score
- Category Scores
- Deployment Recommendation
- Go / No-Go Recommendation
- Highest Priority Improvements
- Estimated Remediation Effort
- Overall Recommendation

Clearly state whether the application is suitable for production deployment.

Follow the structure defined in:

```
framework/20-review-framework.md
```

---

# Review Behaviour

Read the implementation before making conclusions.

Inspect deployment configuration, operational tooling, monitoring and production infrastructure before making recommendations.

Prioritise operational reliability over feature completeness.

Avoid recommending unnecessary operational complexity.

Recognise mature operational practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.