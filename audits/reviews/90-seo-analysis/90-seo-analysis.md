# SEO Analysis

## Objective

Perform a comprehensive SEO assessment of this application.

The goal is to evaluate the application's technical SEO, content structure, discoverability and search engine readiness.

Assess whether the application follows modern SEO best practices and provides search engines with sufficient information to accurately crawl, index and understand its content.

This review focuses **only on SEO**.

Do **not** perform detailed reviews of accessibility, performance, marketing, branding or user experience except where they directly impact SEO.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - SEO Documentation

Create:

```
docs/ai-review/reports/[project-name]-90-seo.md
```

Document the application's SEO implementation.

Do not assess quality yet.

---

## 1. SEO Strategy

Document:

- SEO objectives
- Target audience
- Target search intent
- Content strategy
- Indexing strategy

---

## 2. Metadata

Document:

- Title strategy
- Meta descriptions
- Canonical URLs
- Robots directives
- Open Graph
- Twitter Cards

---

## 3. URL Structure

Document:

- URL conventions
- Slugs
- Dynamic routes
- Pagination URLs
- Canonicalisation

---

## 4. Structured Data

Document:

- Schema.org usage
- JSON-LD
- Rich snippets
- Business schema
- Product schema
- Article schema

---

## 5. Internal Linking

Document:

- Navigation
- Breadcrumbs
- Related content
- Internal links
- Footer links

---

## 6. Content Structure

Document:

- Heading hierarchy
- Landing pages
- Category pages
- Service pages
- Blog structure

---

## 7. Media

Document:

- Images
- Alt text strategy
- Image optimisation
- Video
- File naming

---

## 8. Technical SEO

Document:

- Sitemap (generation method `app/sitemap.ts` vs static, `lastModified` correctness, whether it lists canonical URLs only without `?page`/`?sort`/`?filter` variants, `changeFrequency`/`priority` if used)
- Robots.txt (`public/robots.txt` vs `app/robots.ts` — which takes precedence in Next.js, per-UA rules, Sitemap directive)
- Canonical strategy (`alternates.canonical` / `<link rel="canonical">`, whether filtered/paginated variants canonicalise to clean base URL)
- Robots directives (`noindex`, `nofollow` on filtered search, private routes)
- Redirect strategy
- HTTPS
- Internationalisation (if applicable)
- Infinite URL spaces: how many query-param permutations the app exposes (`/whats-on?q=&where=&category=&sort=&dateFrom=&radius=&priceMax=`, `/*?*page=`, `/*?*filter=`) and how they are collapsed

---

## 9. Performance Signals

Document:

- Core Web Vitals
- Rendering strategy
- JavaScript usage
- SSR / SSG
- Lazy loading

Document only.

Do not assess performance.

---

## 10. Analytics

Document:

- Analytics platform
- Search Console integration
- Event tracking
- Conversion tracking

---

# Phase 2 - SEO Assessment

Create:

```
docs/ai-review/reports/[project-name]-90-seo-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Crawlability — Including AI-Bot Split & Crawl-Trap Prevention

Review:

- Robots.txt (if Next.js: `app/robots.ts` generates it — verify file actually renders; `public/robots.txt` is ignored when `app/robots.ts` exists)
- XML sitemap (canonical URLs only? `lastModified` real date vs `new Date()` meaningless now?)
- Crawl depth / internal links / redirects / broken links
- **AI crawler split rules (Critical for abuse):** Good bots respect `robots.txt`, bad scrapers spoof it — both matter. Verify:
  - `User-agent: GPTBot`, `ChatGPT-User`, `ClaudeBot`, `Bytespider`, `CCBot`, `PerplexityBot`, `Google-Extended` → `Disallow: /` (you rarely need LLM training crawl)
  - `User-agent: Googlebot`, `Bingbot` → allow canonical pages only
  - `User-agent: *` → `Disallow: /api/`, `Disallow: /search`, `Disallow: /*?*sort=`, `Disallow: /*?*filter=`, `Disallow: /*?*page=`, plus any app-specific private paths (`/favorites`, `/dashboard`, `/admin`)
  - `Sitemap: https://<domain>/sitemap.xml` present and points to canonical sitemap
- **Infinite URL spaces:** Faceted search with 10+ query params generates `N!` permutations. If `robots.ts` does not disallow `/*?*` variants, every permutation is a crawlable near-duplicate that defeats CDN. Must be blocked at robots + collapsed at canonical layer.

Evaluate whether search engines can efficiently crawl the site **without generating a crawl storm**.

Cross-reference: Security owns "can it be abused via crawl?", Performance owns "is it absorbed by CDN?", you own "is the robots/canonical contract correct?"

---

# Indexability — Canonical Collapse for Filtered Variants

Review:

- Meta robots (`index, follow` vs `noindex, follow` for filtered/search variants)
- Canonical tags (`<link rel="canonical">` or `metadata.alternates.canonical` in Next.js — must point filtered `/whats-on?sort=...&filter=...` to clean base URL so engines treat permutations as duplicates)
- Duplicate pages / near-duplicates from query permutations
- Parameter handling (Google Search Console param handling is gone — canonical + robots must do it)
- Noindex usage (filtered search pages: `noindex, follow` if disallowed in robots is not enough — belt and suspenders)
- Auth/private pages (`/favorites`, `/dashboard`) must be `noindex` regardless of robots

Identify pages that may not index correctly **or that generate duplicate crawl load**.

If canonical is missing on `events/[slug]` or `venues/[slug]` + `whats-on`, crawlers traverse every `?page` variation as distinct content → flag High.

---

# Metadata

Review:

- Page titles
- Meta descriptions
- Canonical URLs
- Open Graph
- Twitter Cards

Evaluate quality, consistency and uniqueness.

---

# URL Structure

Review:

- Readability
- Keywords
- Slug quality
- Hierarchy
- Consistency

Identify unnecessarily complex URLs.

---

# Content Structure

Review:

- Heading hierarchy
- Semantic structure
- Page hierarchy
- Content organisation
- Landing pages

Evaluate whether content is easy for search engines to understand.

---

# Structured Data

Review:

- JSON-LD
- Schema.org
- Rich Results
- Business information
- Breadcrumb schema
- FAQ schema

Identify opportunities to improve search engine understanding.

---

# Internal Linking

Review:

- Navigation
- Contextual links
- Breadcrumbs
- Related content
- Orphan pages

Evaluate the effectiveness of the internal linking strategy.

---

# Images & Media

Review:

- Alt text
- File names
- Captions
- Image formats
- Lazy loading

Evaluate media optimisation for search engines.

---

# Mobile SEO

Review:

- Responsive layouts
- Mobile usability
- Viewport configuration
- Touch targets
- Mobile rendering

Assess mobile search readiness.

---

# Local SEO

If applicable, review:

- Business information
- Address consistency
- Contact information
- Local structured data
- Location pages

Evaluate local search optimisation.

---

# International SEO

If applicable, review:

- hreflang
- Language handling
- Regional targeting
- Canonicalisation
- Duplicate content

---

# JavaScript SEO

Review:

- Server-side rendering
- Static rendering
- Hydration
- Search engine rendering
- Dynamic content

Evaluate whether search engines can fully understand rendered content.

---

# Content Quality

Review:

- Originality
- Relevance
- Search intent
- Duplicate content
- Thin content

Evaluate whether content satisfies likely user intent.

---

# EEAT Signals

Review evidence supporting:

- Experience
- Expertise
- Authoritativeness
- Trustworthiness

Examples:

- Author information
- Business details
- Contact information
- Policies
- Reviews
- Citations

Evaluate credibility signals where applicable.

---

# Technical Debt

Identify:

- Duplicate metadata
- Missing metadata
- Broken links
- Thin pages
- Duplicate content
- Redirect chains
- Missing structured data

Estimate long-term SEO impact.

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

- Slow rendering → Performance Analysis
- Poor accessibility → Accessibility Analysis
- Missing security headers → Security Audit
- Unthrottled expensive search proc → Security Audit (you flag duplicates as SEO crawl waste, they flag as abuse)
- Uncached SSR per hit → Performance Analysis (you flag as duplicate-URL problem)

Reference the appropriate review instead. When bot abuse is caused by SEO misconfig (missing robots/canonical), file the root cause here and have Security reference your ID.

---

# Positive Findings

Identify SEO practices worth keeping.

Explain why they improve discoverability or search performance.

---

# Reusable SEO Patterns

Highlight reusable SEO patterns.

Examples:

- Metadata generation
- Structured data
- Sitemap generation
- URL conventions
- Content hierarchy
- Internal linking

---

# Final Recommendation

Provide:

- Overall SEO Score
- Category Scores
- Search Engine Readiness
- Production Readiness (SEO only)
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

Inspect routing, metadata generation, structured data and rendered HTML before making recommendations.

Prioritise long-term discoverability over short-term ranking tactics.

Avoid recommending keyword stuffing or manipulative SEO techniques.

Recognise excellent technical SEO practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.