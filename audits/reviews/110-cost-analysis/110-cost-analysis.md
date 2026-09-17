# Cost Analysis

## Objective

Perform a comprehensive cost analysis of this application.

The goal is to evaluate whether the application's technical implementation is economically sustainable and whether operational costs are likely to remain under control as the application grows.

Assess infrastructure costs, third-party services, AI usage, storage, bandwidth, database usage and cost amplification risks.

This review focuses **only on operational cost efficiency**.

Do **not** perform detailed reviews of performance, architecture or production readiness except where they directly impact operational cost.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Cost Documentation

Create:

```
docs/ai-review/reports/[project-name]-110-cost-analysis.md
```

Document how the application incurs operational costs.

Do not assess quality yet.

---

## 1. Infrastructure Overview

Document:

- Hosting platform
- Database
- Storage
- CDN
- Edge Functions
- Serverless Functions
- Regions

Describe the primary infrastructure components contributing to operational cost.

---

## 2. Third-Party Services

Document:

- Authentication
- Payments
- Email
- AI providers
- Analytics
- Monitoring
- Logging
- Search
- Maps
- SMS
- Other external services

Summarise how each service contributes to recurring costs.

---

## 3. AI Usage

If applicable, document:

- AI providers
- Models used
- Prompt sizes
- Token usage
- Embeddings
- Image generation
- Audio generation
- Batch processing

---

## 4. Database Usage

Document:

- Reads
- Writes
- Storage
- Backups
- Replication
- Scheduled jobs

Focus on cost drivers rather than performance.

---

## 5. Storage

Document:

- File storage
- Image storage
- Video storage
- Object storage
- Backups

---

## 6. Bandwidth

Document:

- Static assets
- Dynamic responses
- Media
- API traffic
- CDN usage

---

## 7. Background Processing

Document:

- Scheduled jobs
- Queues
- Workers
- AI processing
- Batch operations

---

## 8. Billing Model

Document:

Where practical, identify how major services are billed.

Examples:

- Per request
- Per user
- Per GB
- Per million operations
- Per token
- Per execution
- Per seat

---

## 9. Cost Controls

Document existing controls such as:

- Rate limiting
- Usage limits
- Quotas
- Budget alerts
- Spend monitoring
- Caching
- Request batching

---

## 10. Growth Assumptions

Estimate the primary cost drivers as usage increases.

Examples:

- 100 users
- 1,000 users
- 10,000 users
- 100,000 users

---

# Phase 2 - Cost Assessment

Create:

```
docs/ai-review/reports/[project-name]-110-cost-analysis-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Infrastructure Efficiency

Review:

- Hosting choices
- Serverless usage
- Compute utilisation
- Regions
- Resource allocation

Identify unnecessary infrastructure costs.

---

# Third-Party Services

Review:

- Service selection
- Pricing tiers
- Vendor lock-in
- Duplicate services
- Under-utilised services

Identify opportunities to reduce recurring costs.

---

# AI Cost Efficiency

If applicable, review:

- Model selection
- Prompt efficiency
- Context size
- Response size
- Embeddings
- Caching
- Batch processing
- Token optimisation

Estimate avoidable AI expenditure.

---

# Database Cost Efficiency

Review:

- Read amplification
- Write amplification
- Storage growth
- Backup costs
- Replication
- Query frequency

Focus on financial impact rather than performance.

---

# Storage Efficiency

Review:

- Object storage
- Media optimisation
- Compression
- Retention
- Lifecycle policies

Identify unnecessary storage costs.

---

# Bandwidth Efficiency

Review:

- Static assets
- Images
- Video
- Downloads
- CDN usage
- Compression

Estimate unnecessary bandwidth expenditure.

---

# Cost Amplification Risks — Including Crawl Storm

Identify technical implementations that could rapidly increase costs.

Examples:

- Uncached AI requests
- Infinite polling
- Duplicate processing
- Excessive logging
- Repeated API calls
- Inefficient retries
- Unbounded background jobs
- **Uncached public SSR + DB per bot hit** (the crawl storm)

Estimate potential impact.

**Mandatory crawl-storm model (if Vercel + DB is used):**

Document:

- Requests: assume `100k requests` over `24h` (legitimate crawler) and `1k req/min` burst (aggressive scrape)
- Current posture: if detail pages are `no-store` / no `revalidate` and `app/api/trpc` is `no-store`, then `100k hits = 100k SSR renders + 100k * (generateMetadata query + page query + N client tRPC fetches)` with PostGIS.
- Model before/after: `uncached cost = 100k * (Serverless GB-s + DB compute + Data Transfer)` vs `ISR 300s cost = ~ (unique pages / 300s) * DB cost + 99% CDN hits (≈ $0)`. Even rough `$/1k requests` is enough to justify P0 vs P2.
- Cross-reference Performance (is it cacheable?) and Security (is it throttled?) — you own "how much does the storm cost?".

Flag as **Critical** if a single `search.search` with PostGIS can be called anon without limit and without cache — that proc alone can dominate the bill.

---

# Scaling Economics

Assess how costs are likely to scale as usage grows.

Consider:

- Infrastructure
- Database
- AI
- Storage
- Bandwidth
- Monitoring
- Third-party services

Identify likely cost bottlenecks.

---

# Unit Economics

Where practical, estimate:

- Cost per request
- Cost per active user
- Cost per tenant
- Cost per AI interaction
- Cost per file upload
- Cost per scheduled job

If exact figures are unavailable, provide reasoned estimates based on the implementation and service pricing models.

---

# Cost Controls — Including Platform Spend Caps

Review:

- Rate limiting (and whether it actually covers **read** procs — reference Security inventory)
- Usage quotas / soft & hard limits
- Billing alerts (if Vercel: Spend Alerts 50/75/100%; if Neon/Supabase: compute/billing alerts)
- Spend monitoring / dashboards / log-based billing alerts
- Administrative controls (Spend Limits / Pause project, Attack Challenge Mode toggle access)
- Caching as cost control (if public pages are ISR-cached, bot traffic is absorbed at CDN for ~$0 — cheapest control)

Evaluate how effectively the application prevents unexpected expenditure. An expensive uncached search with no limit and no alerts is a **Critical** cost control failure even if code quality is high.

---

# Cost Optimisation Opportunities

Identify practical improvements such as:

- Better caching
- Request batching
- Lower-cost services
- Reduced AI usage
- Storage lifecycle policies
- Image optimisation
- Scheduled processing
- Infrastructure consolidation

Estimate potential savings where practical.

---

# Technical Debt

Identify:

- Temporary infrastructure
- Legacy services
- Duplicate subscriptions
- Over-provisioned resources
- Missing cost controls
- Expensive workarounds

Estimate long-term financial impact.

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
- Estimated financial impact (where practical)

Do not duplicate findings that belong in other reviews.

For example:

- Slow queries → Performance Analysis (but flag cost here if they run uncached per bot hit)
- Missing monitoring / missing Spend Alerts → Production Readiness (reference their ID)
- Poor architecture → Architecture Analysis
- Security vulnerabilities → Security Audit (but estimate $ impact here)
- Missing robots/canonical → SEO Analysis

Reference the appropriate review instead. When a single unthrottled uncached search causes both abuse and cost, file abuse in Security, cacheability in Performance, dollar figure here, and cross-reference IDs.

---

# Positive Findings

Identify engineering decisions that reduce operational costs.

Explain why they improve long-term financial sustainability.

---

# Reusable Cost Optimisation Patterns

Highlight reusable cost-saving patterns.

Examples:

- AI request caching
- Tiered storage
- Background batching
- CDN optimisation
- Usage quotas
- Cost-aware architecture

---

# Final Recommendation

Provide:

- Overall Cost Efficiency Score
- Category Scores
- Cost Scalability Assessment
- Highest Priority Savings
- Estimated Remediation Effort
- Estimated Annual Savings (where practical)
- Overall Recommendation

Follow the structure defined in:

```
framework/20-review-framework.md
```

---

# Review Behaviour

Read the implementation before making conclusions.

Inspect infrastructure, third-party services, deployment configuration and application behaviour before estimating costs.

Prioritise sustainable operational economics over premature micro-optimisations.

Avoid recommending changes that significantly increase complexity for negligible savings.

Recognise cost-efficient engineering practices as well as unnecessary expenditure.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions and explain the basis of any cost estimates.