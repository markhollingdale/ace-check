# API Analysis

## Objective

Perform a comprehensive analysis of the application's API design.

The goal is to evaluate the quality, consistency, maintainability, usability and scalability of the application's API surface.

This review focuses **only on API design**.

Do **not** perform detailed reviews of architecture, security, performance, database design or production readiness except where they directly impact the API design.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - API Documentation

Create:

```
docs/ai-review/reports/[project-name]-50-api.md
```

Document the complete API architecture.

This document should explain how the application's APIs are designed and organised.

Do not assess quality yet.

---

## 1. API Overview

Document:

- API style
- API framework
- Routing architecture
- Versioning strategy
- Overall design philosophy

Examples:

- tRPC
- REST
- GraphQL
- RPC

---

## 2. API Structure

Document:

- Routers
- Endpoints
- Procedures
- Controllers
- Middleware
- Shared utilities

Explain how the API has been organised.

---

## 3. Request Lifecycle

Document:

- Request flow
- Validation
- Middleware
- Business logic
- Database access
- Response generation
- Error handling

---

## 4. Input Validation

Document:

- Validation framework
- Shared schemas
- Request validation
- Response validation
- Type generation

---

## 5. API Contracts

Document:

- Request models
- Response models
- Shared types
- Error models
- Pagination models

---

## 6. Error Handling

Document:

- Error strategy
- Error types
- Validation errors
- Business errors
- Unexpected errors

---

## 7. Pagination

Document:

- Pagination strategy
- Cursor pagination
- Offset pagination
- Filtering
- Sorting

---

## 8. File Handling

If applicable, document:

- Upload APIs
- Download APIs
- Storage integration
- Streaming

---

## 9. External APIs

Document:

- Third-party integrations
- AI providers
- Payment providers
- Email providers
- Storage providers

Explain how external APIs integrate with the application.

---

## 10. API Documentation

Document:

- Generated documentation
- OpenAPI
- API references
- Developer documentation

---

# Phase 2 - API Assessment

Create:

```
docs/ai-review/reports/[project-name]-50-api-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# API Organisation

Review:

- Router organisation
- Endpoint organisation
- Procedure organisation
- Naming conventions
- Folder structure

Evaluate whether the API is easy to understand.

---

# Consistency

Review:

- Naming conventions
- Request patterns
- Response patterns
- Error responses
- Status handling

Attempt to identify inconsistencies.

---

# API Design

Review:

- Resource design
- Procedure design
- Endpoint responsibilities
- Separation of concerns
- Reusability

Evaluate whether APIs have a single, well-defined responsibility.

---

# Request & Response Design

Review:

- Request models
- Response models
- Optional fields
- Required fields
- Consistency
- Predictability

Identify unnecessarily complex contracts.

---

# Validation

Review:

- Input validation
- Shared schemas
- Validation reuse
- Type inference
- Contract consistency

Focus on API quality rather than security.

---

# Error Handling

Review:

- Error consistency
- Error messages
- Error structure
- Client usability
- Developer experience

Evaluate whether errors are predictable and useful.

---

# Pagination & Filtering

Review:

- Pagination implementation
- Filtering
- Searching
- Sorting
- Cursor design
- Whether pagination/filter combinatorics create an infinite crawlable URL space (reference SEO review for robots/canonical impact)

Evaluate usability and consistency. Flag unbounded `?page`/`?filter` permutations that make brute-force crawl cheap — Security owns the abuse flag, you own the design disclosure.

---

# Public Read Abuse Surface — Rate Limit Inventory (Co-owned with Security)

For every `publicProcedure` / unauthenticated route, document in Phase 1 and verify in Phase 2:

- Procedure name, router file, cost (DB/PostGIS/external), and limiter (if any): middleware, Upstash Redis, DB sliding window, or none
- Typical unthrottled gaps to flag as High: `search.search`, `venue.search`, `event.list/getBySlug/getById/getUpcoming`, `venue.list/getById`, `category.list`, `ad.getForPosition` — any PostGIS or aggregation reachable anon without `ratelimit.limit(ip)` before DB
- That `429 Too Many Requests` with `Retry-After` is returned (not `200` with empty) and that errors use the same shape as other procedures
- That expensive reads are not same-tier as cheap reads — search should be tighter than `category.list`

Security owns "is it exploitable?", you own "is the contract inventoried and consistently enforced?". Reference Security finding ID rather than duplicating.

---

# Versioning

Review:

- Versioning strategy
- Backwards compatibility
- Breaking changes
- Deprecation strategy

If versioning is not currently required, assess whether the existing design would support it.

---

# API Maintainability

Review:

- Shared utilities
- Shared types
- Reusable procedures
- Duplicate logic
- Boilerplate

Identify opportunities to simplify the API.

---

# Developer Experience

Evaluate:

- Ease of use
- Discoverability
- Documentation
- Predictability
- Type safety
- Auto-completion
- Error messages

Consider the experience of another developer consuming the API.

---

# Scalability

Evaluate whether the API design supports:

- Additional endpoints
- New features
- New clients
- Mobile applications
- Third-party integrations
- Public APIs

Focus on API evolution rather than runtime performance.

---

# External Integrations

Review:

- Integration design
- Abstraction
- Error handling
- Retry strategy
- Shared clients

Evaluate maintainability of external API integrations.

---

# Technical Debt

Identify:

- Duplicate endpoints
- Duplicate procedures
- Inconsistent naming
- Legacy endpoints
- Deprecated contracts
- Large procedures
- Missing abstractions

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
- Slow API responses → Performance Analysis
- Poor folder structure → Architecture Analysis
- Database modelling issues → Database Analysis

Reference the appropriate review instead.

---

# Positive Findings

Identify API design decisions worth keeping.

Explain why they improve maintainability, usability or developer experience.

---

# Reusable API Patterns

Highlight reusable API patterns.

Examples:

- Router organisation
- Validation patterns
- Pagination
- Error handling
- Shared contracts
- Integration patterns

---

# Final Recommendation

Provide:

- Overall API Score
- Category Scores
- Production Readiness (API only)
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

Inspect the API implementation, contracts and supporting code before making recommendations.

Prioritise consistency, maintainability and developer experience over personal preference.

Recognise well-designed APIs as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.