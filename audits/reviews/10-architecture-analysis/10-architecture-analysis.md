# Architecture Analysis

## Objective

Perform a comprehensive software architecture review of this project.

Your goal is to understand and document **how the application is built**, evaluate the architectural quality, and identify opportunities for improvement.

This review should focus **only on architecture**.

Do **not** perform detailed reviews of security, performance, SEO, accessibility, cost, testing or production readiness. Those areas are covered by separate review documents.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Architecture Documentation

Create:

```
docs/ai-review/reports/[project-name]-10-architecture.md
```

This document should become the definitive technical reference for the project's architecture.

Do **not** describe the business purpose or product functionality.

Document the implementation only.

---

## 1. Technology Stack

Document every significant technology including:

- Frameworks
- Libraries
- Runtime
- Build tools
- ORM
- Database
- Authentication
- Styling
- Validation
- Deployment
- Monitoring
- Analytics
- Email
- Storage

For each include:

- Version
- Purpose
- How it integrates
- Major dependencies

---

## 2. Project Structure

Document:

- Directory structure
- Major folders
- Key files
- Feature organisation
- Shared libraries
- Server vs Client separation

Explain why the project is organised this way.

---

## 3. Routing Architecture

Document:

- Route groups
- Layout hierarchy
- Nested layouts
- Loading boundaries
- Error boundaries
- Server Components
- Client Components
- Route protection

---

## 4. Configuration Architecture

Document:

- Configuration files
- Environment validation
- Runtime configuration
- Feature flags
- Build configuration
- Shared configuration patterns

---

## 5. Component Architecture

Document:

- Component organisation
- UI architecture
- Shared components
- Layout components
- Hooks
- Providers
- Composition patterns

---

## 6. API Architecture

Document:

- tRPC structure
- Routers
- Procedures
- Middleware
- Context creation
- Validation flow
- Error handling architecture

Do not perform security analysis.

---

## 7. Authentication Architecture

Document:

- Authentication provider
- Session management
- User model
- Permission model
- Role architecture

Do not review security implementation.

---

## 8. Database Architecture

Document:

- ORM
- Schema organisation
- Table responsibilities
- Relationships
- Migrations
- Repository patterns
- Transaction strategy

Do not review performance or indexing.

---

## 9. External Services

Document:

- Third-party integrations
- Storage
- Payments
- Email
- Monitoring
- Analytics

Explain how they integrate.

---

## 10. Environment Variables

Document:

Every environment variable including:

- Purpose
- Required
- Optional
- Validation
- Default behaviour

---

## 11. Cross-Cutting Patterns

Identify reusable architecture patterns such as:

- Service layer
- Repository layer
- Shared utilities
- Error handling
- Logging
- Validation
- Configuration
- Dependency Injection (if applicable)

---

# Phase 2 - Architecture Review

Create:

```
docs/ai-review/reports/[project-name]-10-architecture-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

## Evaluate

Review the architecture against the following principles.

### Separation of Concerns

Evaluate whether responsibilities are clearly separated.

---

### Cohesion

Evaluate whether related functionality is grouped appropriately.

---

### Coupling

Evaluate dependency relationships.

Identify unnecessary coupling.

---

### SOLID

Evaluate compliance with:

- Single Responsibility
- Open / Closed
- Liskov
- Interface Segregation
- Dependency Inversion

---

### DRY

Identify duplicated architecture.

---

### KISS

Identify unnecessary complexity.

---

### YAGNI

Identify unnecessary abstractions.

---

### Modularity

Evaluate:

- Feature isolation
- Reusability
- Extensibility

---

### Scalability

Evaluate whether the architecture supports:

- Growth
- Additional features
- Additional developers
- Multi-tenancy
- Horizontal scaling

Do not perform infrastructure or performance analysis.

---

### Maintainability

Evaluate:

- Consistency
- Readability
- Discoverability
- Documentation
- Developer experience

---

### Consistency

Review naming conventions.

Review architectural consistency.

Review folder organisation.

Review project conventions.

---

### Technical Debt

Identify:

- Temporary solutions
- Workarounds
- Obsolete abstractions
- Duplicate patterns
- Missing abstractions
- Over-engineering
- Under-engineering

---

### Future Readiness

Evaluate whether the architecture would support future additions such as:

- Mobile applications
- APIs
- White-labelling
- Localisation
- AI integrations
- Plugin systems
- Background workers

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
- Missing CSP → Security Review
- Slow queries → Performance Review
- Bundle size → Performance Review
- Missing tests → Code Quality Review

Instead, reference the appropriate review.

---

# Positive Findings

Identify architecture decisions worth keeping.

Explain why they are good.

---

# Reusable Patterns

Highlight architectural patterns that could be reused in future projects.

---

# Final Recommendation

Provide:

- Overall Architecture Score
- Category Scores
- Production Readiness (Architecture only)
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

Do not invent architecture that is not present.

When uncertain, clearly state assumptions.

Provide evidence-based recommendations.

Recognise good architectural decisions as well as weaknesses.

Prioritise pragmatic improvements over theoretical perfection.