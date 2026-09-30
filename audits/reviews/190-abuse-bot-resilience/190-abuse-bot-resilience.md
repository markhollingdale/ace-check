# Abuse, Bot & Crawl Resilience

## Objective

Perform a dedicated assessment of how well the application resists **abuse**: automated traffic,
bots and crawlers, spam and fake accounts, rate-limit gaps, engagement manipulation, and the
resulting cost amplification.

This review exists because these are a distinct risk class from core application security. The
question here is not only "can it be broken?" but "can it be **abused**, and is it **rate-limited
and absorbed**?".

This review focuses **only on abuse, bot, crawl and rate-limit resilience**.

Do **not** perform detailed reviews of the areas owned by other reviews; cross-reference instead:

- **Security (20)** owns core application security - authentication, authorisation, injection,
  secrets, supply chain, business-logic security. (Its pasted abuse section was split out into
  this review.)
- **Performance (30)** owns cacheability and edge absorption ("is the page cacheable?").
- **SEO (90)** owns robots/canonical correctness ("is the directive correct?").
- **Cost (110)** owns the dollar model ("what does the storm cost?").
- **Production Readiness (100)** owns the platform switches ("is the dashboard toggle actually on?").
- **Privacy (170)** owns UGC retention/deletion; **Business Logic (160)** owns workflow correctness.
- **Testing (150)** owns missing abuse/load test coverage; this review owns the production risk and
  names the test gap for Testing to file.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Abuse Surface Documentation

Create:

```
docs/ai-review/reports/[project-name]-190-abuse-bot-resilience.md
```

Document the application's abuse surface. Use "if applicable" throughout - this review must run on
any web application, not just one stack.

Do not assess quality yet.

---

## 1. Public & Unauthenticated Surface Inventory

Document every publicly reachable entry point and its cost:

- Every unauthenticated endpoint / procedure (if tRPC: every `publicProcedure`; if REST: every
  route reachable without auth) - name, work done (DB queries, geospatial, full-text, aggregation,
  external calls), and current limiter if any.
- Any endpoint reachable without auth that performs expensive work is an abuse surface by default.

---

## 2. Rate Limiting

Document:

- Where limits are enforced (middleware, procedure wrapper, route handler, gateway)
- Store (database, Redis/Upstash, in-memory) and whether it is shared across instances
- Window, quota, and key (IP, IP+UA, user, fingerprint)
- Insert/compare atomicity (single atomic op vs read-then-write)
- Failure behaviour under load (fail-open vs fail-closed)

---

## 3. Bot & Crawler Controls

Document:

- `robots.txt` / framework robots route: per-User-Agent rules, sitemap, crawl-delay
- Sitemap hygiene
- Edge/middleware UA blocking (what it matches, where it runs in the request path)
- Canonical / `noindex` policy for filter, sort and pagination permutations
- Platform bot controls (if Vercel/Cloudflare/other): Bot Management, firewall custom rules,
  managed challenge, action taken

---

## 4. Spam & Fake-Account Controls

Document (conditional):

- CAPTCHA / proof-of-work (e.g. ALTCHA) coverage and whether it is enforced **server-side**
- Honeypots, fingerprinting, secondary signals
- Email verification, registration throttling
- Enforcement on every write surface: registration, contact, claim, upload, report

---

## 5. Engagement & Analytics Abuse

Document:

- How views/impressions/clicks are counted and de-duplicated (IP+UA, fingerprint, none)
- Whether crawler/bot UAs are filtered out of counts and analytics
- Whether counts feed ranking, and therefore whether they can be gamed

---

## 6. User-Generated Content & Moderation (if UGC is present)

Document:

- Moderation queue: is new/edited UGC pending until reviewed or auto-scanned?
- Report → triage path: admin view, action (hide/delete/notify author), audit logging
- Automated filters (profanity/NSFW/URL/spam heuristics)
- Per-user and per-target creation limits
- Admin/moderation audit trail (`updatedBy`, `deletedAt`, append-only log)
- Blocking/escalation and appeal path

---

## 7. Platform-Level Controls

Document the configured state of any platform abuse/cost controls:

- Firewall / WAF rules and rate rules
- Bot management / managed challenge
- Attack / challenge mode (single-toggle under load) and who can toggle it
- Spend alerts and spend limits
- Connection pooling / concurrency limits if serverless + pooled DB

---

## 8. Cost-Amplification Exposure

Document the relationship between abuse and cost (details belong to Cost 110):

- Which uncached public reads can be hit at volume
- Requests-per-second needed to materially multiply the bill
- Whether a single unauthenticated expensive call dominates the bill

---

# Phase 2 - Abuse Assessment

Create:

```
docs/ai-review/reports/[project-name]-190-abuse-bot-resilience-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Public Surface Abuse

Review every unauthenticated/expensive surface from §1.

Attempt to identify:

- **Crawl traps:** faceted search, filter/sort/pagination permutations, infinite URL spaces. Every
  permutation must not be a distinct, expensive, crawlable page (robots/canonical correctness is
  SEO's call - flag the abuse exposure here).
- **Unauthenticated expensive reads:** geospatial, full-text, aggregation or external-call reads
  reachable without auth and without an atomic limiter.
- **Cache-bypass amplification:** public reads that are forced dynamic / `no-store` so every bot hit
  executes work. Reference Performance for cacheability; flag the abuse/cost exposure here.
- **Cross-instance limiter gaps:** in-memory-only limiters that vanish under horizontal scale.

---

# Bot & Crawler Resilience

Assume aggressive crawling (search-engine and AI crawlers) and spoofed User-Agents.

Review:

- Whether known-bot traffic is absorbed (cache/edge) or hits origin/DB
- Whether the edge has a small, cheap UA/bot filter before expensive work
- Whether spoofed UAs are caught (UA alone is not proof - consider ASN/verified-bot handling)
- Whether robots directives actually prevent expensive permutation crawling
- Whether a challenge/kill-switch can shed abusive load quickly

Attempt to identify realistic crawl-storm paths and their blast radius.

---

# Spam & Fake Accounts

Review:

- Whether proof-of-work/CAPTCHA is enforced server-side on every write
- Whether transactional email can be triggered without limit (per IP and per target)
- Whether unauthenticated actors can create content/accounts at scale
- Whether throttling is differentiated between cheap and expensive operations

---

# UGC Moderation & Operator Abuse (conditional)

If UGC exists, review:

- Whether unmoderated content goes live instantly
- Whether there is a working report → hide/delete → notify path with audit logging
- Whether one user/agent can flood a target (review bombing, bulk creation)
- Whether moderators can act destructively without an audit trail or confirmation

Cross-reference Business Logic 160 (workflow) and Privacy 170 (retention/deletion).

---

# Rate-Limit Completeness Audit

For **every** write surface plus **every** expensive read surface, verify:

- The limiter is **atomic** (single DB upsert / Redis `INCR`), not read-then-write
- The key is appropriate (anonymous → IP or IP+UA, respecting proxy headers; authenticated → user
  with IP fallback)
- Limits are **differentiated**: cheap reads > expensive search > writes > auth. A flat limit on
  every route means the expensive endpoint is still abusable
- Fail-open vs fail-closed is intentional: a DB-backed limiter failing open under load removes
  protection exactly when it is needed

Test where practical and record the commands and outputs under **Evidence / Repro**.

---

# Engagement Inflation

Review:

- Whether engagement counts can be inflated by bots or scripts
- Whether crawler UAs are ignored for counting/analytics
- Whether inflated counts feed ranking or business decisions

---

# Abuse Test Coverage (Cross-Reference Testing 150)

Flag missing tests (the test gap is filed by Testing; the risk is owned here). At minimum:

- No test asserting `robots` per-UA disallows
- No test asserting `429` + `Retry-After` on a burst to a public expensive read
- No test asserting spoofed UA is still limited, or crawler UAs ignored for engagement
- No load test for crawl burst / expensive-search hammering

---

# Cost-Amplification Exposure

State the abuse-to-cost relationship. Cross-reference Cost 110 for the dollar model.

- Requests per second required to 10x the bill under the current posture
- Whether any single unauthenticated expensive call dominates spend
- Whether caching + limits + platform controls together form an effective kill-switch

---

# Required Findings

Every issue must include (per `framework/20-review-framework.md`):

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

- Core injection/XSS/authz flaws → Security Audit (20)
- "The page should be cacheable" → Performance (30)
- "The robots rule is wrong" → SEO (90)
- "What does it cost?" → Cost (110)
- "The dashboard switch is off" → Production Readiness (100)
- "No test covers this" → Testing (150), referencing the abuse finding ID here

Reference the appropriate review instead.

---

# Positive Findings

Identify abuse-resilience decisions worth keeping (limiter design, edge filters, challenge
kill-switches, spend caps) and explain why they reduce blast radius.

---

# Reusable Abuse Resilience Patterns

Highlight reusable patterns such as:

- Atomic, differentiated rate limiting
- Edge bot filtering and challenge switches
- Cache-first public reads
- Server-side proof-of-work on writes
- Moderation queue + audit trail

---

# Final Recommendation

Provide:

- Overall Abuse Resilience Score
- Category Scores
- Production Readiness (Abuse Resilience only)
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

Inspect every public entry point, limiter, robots rule and platform control before drawing conclusions.

Think like an abuser: assume the cheapest possible path to cause maximum cost or noise.

Prioritise realistic, high-blast-radius abuse over theoretical edge cases.

Provide evidence-based recommendations; never present an inference as confirmed.

Recognise strong abuse controls as well as gaps.

Avoid duplicate findings across review standards - cross-reference instead.

When uncertain, clearly state assumptions.
