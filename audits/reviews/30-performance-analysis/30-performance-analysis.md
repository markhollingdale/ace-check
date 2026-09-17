# Performance Analysis

## Objective

Perform a comprehensive performance assessment of this application.

The goal is to identify bottlenecks, inefficient implementations, scalability concerns and opportunities to improve responsiveness, throughput and resource utilisation.

Consider both the current implementation and how performance is likely to evolve as the application grows.

This review focuses **only on performance**.

Do **not** perform detailed reviews of architecture, security, accessibility, SEO, maintainability or production readiness except where they directly impact performance.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Performance Documentation

Create:

```
docs/ai-review/reports/[project-name]-30-performance.md
```

Document the application's performance architecture.

This document should explain how performance has been considered throughout the application.

Do not assess quality yet.

---

## 1. Rendering Strategy

Document:

- Server Components
- Client Components
- Static rendering
- Dynamic rendering
- Streaming
- Suspense boundaries
- Partial prerendering (if applicable)
- Hydration strategy

---

## 2. Data Fetching

Document:

- Server-side fetching
- Client-side fetching
- Parallel requests
- Sequential requests
- Prefetching
- Caching strategy
- Revalidation strategy

---

## 3. Database Access

Document:

- ORM
- Query patterns
- Transactions
- Connection management
- Pagination
- Background processing

Do not assess indexing or schema quality.

---

## 4. API Performance

Document:

- API architecture
- Request flow
- Response flow
- Validation
- Caching
- Streaming
- Batching

---

## 5. Frontend Assets

Document:

- JavaScript bundles
- CSS strategy
- Fonts
- Images
- Icons
- Third-party scripts

---

## 6. Caching

Document:

- Browser caching
- HTTP caching
- CDN caching
- Next.js cache (fetch cache, ISR `revalidate`, `generateStaticParams`, `dynamic` / `fetchCache` settings)
- Database caching
- In-memory caching
- Per-route cache posture: which routes are `force-static` / ISR with `revalidate = N` vs `force-dynamic` / `no-store` / `dynamic = 'force-dynamic'`; include `app/api/trpc/[trpc]/route.ts` Cache-Control headers
- Whether tRPC / API responses set `no-store` globally vs per-procedure (public reads vs mutations)
- Whether expensive reads (PostGIS, aggregations, featured/home/nearby) have a query-level cache / request collapsing for concurrent identical hits

---

## 7. Background Processing

Document:

- Scheduled jobs
- Queues
- Workers
- Cron jobs
- Long-running tasks

---

## 8. External Services

Document:

- Database
- Authentication
- Payments
- Email
- AI providers
- Storage
- Monitoring

Explain how external dependencies affect performance.

---

# Phase 2 - Performance Assessment

Create:

```
docs/ai-review/reports/[project-name]-30-performance-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Rendering Performance

Review:

- React rendering
- Component hierarchy
- Re-render frequency
- Hydration
- Suspense usage
- Lazy loading
- Memoisation
- Server vs Client Components

Attempt to identify unnecessary rendering work.

---

# Frontend Performance

Review:

- JavaScript bundle size
- Code splitting
- Dynamic imports
- CSS loading
- Font loading
- Image optimisation
- Layout shifts
- Interaction latency

Review Core Web Vitals where possible.

---

# Data Fetching

Review:

- Duplicate requests
- Sequential requests
- Parallelisation
- Request waterfalls
- Over-fetching
- Under-fetching
- Cache effectiveness

Attempt to minimise unnecessary network traffic.

---

# Database Performance

Review:

- Query efficiency
- N+1 queries
- Transaction scope
- Query duplication
- Pagination strategy
- Connection usage

Do not review schema design or indexing unless they directly impact performance.

---

# API Performance

Review:

- Request validation overhead
- Response sizes
- Serialization
- Compression
- Streaming
- Batching
- Pagination

Attempt to identify unnecessary processing.

---

# Caching Strategy — Including Crawl Resilience (Edge Absorption)

Review:

- Browser caching
- HTTP cache headers (`Cache-Control: public, s-maxage=..., stale-while-revalidate=...` vs `no-store` / `private`)
- Next.js cache (ISR `export const revalidate = 60/300`, `generateStaticParams`, `fetch` with `next: { revalidate }`)
- Server cache
- CDN usage (if Vercel: Edge Network; if Cloudflare: cache rules)
- Cache invalidation
- Query-level cache for hot aggregates (identical concurrent tRPC calls collapsing to one DB query)

Verify caching is used appropriately.

**Crawl storm absorption — the $ check:**

1. For every public detail/search page (`/events/[slug]`, `/venues/[slug]`, `/whats-on`, `/calendar`, home sections) verify it is **not** `dynamic = 'force-dynamic'` with double DB query (`generateMetadata` + `page`) and `no-store` on every hit. Ideal: `export const revalidate = 300` (or `60` for search) so 100k bot hits = CDN hits after first render. Engagement counts stay live via separate client fetch — do not block ISR because counts are dynamic.
2. If `app/api/trpc/[trpc]/route.ts` sets `Cache-Control: no-store` globally, flag: public reads (`event.list`, `venue.list`, `category.list`, `search.search`, `ad.getForPosition`) should allow edge caching or at least a short `s-maxage` with `stale-while-revalidate`. Mutations must remain `no-store`.
3. Confirm `s-maxage` is used for ISR/SSG shells and that client-fetched tRPC sections do not defeat CDN (use client cache + server revalidation separately).
4. Check canonical collapse: filter permutations (`?q=&where=&category=&sort=&dateFrom=&radius=&priceMax=`) that are uncachable duplicates still generate distinct cache keys — these are crawl traps even with CDN.

Reference Security for abuse vector, Cost for dollar impact — you own "is it cacheable?".

---

# Network Efficiency

Review:

- Request count
- Payload sizes
- Compression
- Duplicate downloads
- Third-party requests
- Resource prioritisation
- Prefetching

Attempt to identify unnecessary network overhead.

---

# Resource Utilisation

Review:

- CPU intensive operations
- Memory usage
- Background processing
- Event listeners
- Timers
- Cleanup
- Resource leaks

Attempt to identify avoidable resource consumption.

---

# Scalability Assessment

Evaluate how the application is likely to perform as usage increases.

Consider:

- Concurrent users
- Database growth
- Large datasets
- Background jobs
- Queue growth
- External API limits
- AI workloads
- Storage growth

Estimate likely bottlenecks.

---

# External Service Performance

Review the impact of:

- Database latency
- Authentication providers
- Email providers
- AI providers
- Payment providers
- Storage providers

Identify opportunities to reduce external dependency latency.

---

# Cost Efficiency — Serverless / DB Amplification

Identify performance issues that may unnecessarily increase operational costs.

Examples:

- Excessive database queries (especially uncached SSR per bot hit)
- Uncached requests (`no-store` on cacheable public reads)
- Expensive AI calls
- Large bandwidth usage
- Repeated API calls (concurrent identical tRPC without query coalescing)
- Inefficient polling
- Infinite crawl spaces generating unique cache keys per permutation

Estimate potential cost impact where practical — reference Cost Analysis for dollar modelling, but flag uncached public pages as cost amplification here.

---

# Load Readiness — Including Bot Burst

Assess how well the application would perform under increasing load.

Consider:

- Burst traffic (including **bot burst**: 100k requests / hours from crawlers, 100 req/s on `/api/trpc` / search)
- Sustained traffic
- Background processing
- Queue congestion
- Database contention (if Neon/Supabase: connection pool exhaustion under `no-store` storm — `max_connections` / PgBouncer queue)
- Memory pressure
- Serverless concurrency limits (if Vercel: function invocation count, cold starts, throttle)

Identify likely scaling limits.

Simulate mentally: with current `revalidate`/cache headers, how many DB queries per 1k crawler hits? Without ISR, `1k hits = 1k SSR + 1k * N PostGIS` — model before/after.

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

- Missing authentication → Security Audit
- Poor folder structure → Architecture Analysis
- Missing indexes (design issue) → Database Review
- Poor TypeScript usage → TypeScript Review

Reference the appropriate review instead.

---

# Positive Findings

Identify performance decisions worth keeping.

Explain why they improve performance or scalability.

---

# Reusable Performance Patterns

Highlight reusable patterns that could be applied in future projects.

Examples:

- Efficient data fetching
- Cache architecture
- Background processing
- Rendering strategies
- API optimisation
- Resource loading

---

# Final Recommendation

Provide:

- Overall Performance Score
- Category Scores
- Production Readiness (Performance only)
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

Prioritise evidence over opinion.

Focus on realistic bottlenecks rather than micro-optimisations.

Consider both current performance and future scalability.

Provide pragmatic recommendations with measurable benefit.

Recognise good performance practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.