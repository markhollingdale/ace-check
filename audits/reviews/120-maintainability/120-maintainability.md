# Maintainability Analysis

## Objective

Perform a comprehensive maintainability assessment of this application.

The goal is to evaluate how easily the application can be understood, modified, extended and supported over its lifetime.

Assess long-term engineering sustainability rather than current implementation quality alone.

This review focuses **only on maintainability**.

Do **not** perform detailed reviews of architecture, code quality, performance or production readiness except where they directly impact long-term maintainability.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Maintainability Documentation

Create:

```
docs/ai-review/reports/[project-name]-120-maintainability.md
```

Document the engineering practices that affect long-term maintenance.

Do not assess quality yet.

---

## 1. Project Structure

Document:

- Feature organisation
- Module boundaries
- Folder structure
- Shared libraries
- Internal packages

Explain how the application is organised.

---

## 2. Engineering Standards

Document:

- Coding standards
- Review process
- Documentation standards
- Naming conventions
- Testing standards

---

## 3. Knowledge Distribution

Document:

- Documentation
- READMEs
- ADRs
- Architecture documentation
- Onboarding material

Assess how knowledge is shared throughout the project.

---

## 4. Dependencies

Document:

- Internal dependencies
- External dependencies
- Shared utilities
- Third-party libraries

---

## 5. Configuration

Document:

- Environment configuration
- Build configuration
- Feature flags
- Shared configuration

---

## 6. Testing

Document:

- Unit tests
- Integration tests
- End-to-end tests
- Test organisation
- Test coverage strategy

Document only.

---

## 7. Automation

Document:

- CI/CD
- Linting
- Formatting
- Static analysis
- Automated checks

---

## 8. Technical Debt

Document:

- Known debt
- TODOs
- Workarounds
- Legacy code
- Deprecated patterns

---

## 9. Team Practices

Document:

- Code ownership
- Review practices
- Release process
- Documentation process

---

## 10. Future Planning

Document:

- Roadmap considerations
- Scalability planning
- Expected areas of growth
- Planned refactoring

---

# Phase 2 - Maintainability Assessment

Create:

```
docs/ai-review/reports/[project-name]-120-maintainability-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Changeability

Evaluate how easily developers can:

- Add features
- Modify behaviour
- Replace components
- Remove functionality
- Refactor existing code

Assess the cost of future change.

---

# Understandability

Review:

- Code discoverability
- Naming
- Documentation
- Project organisation
- Learning curve

Determine how quickly a new developer could become productive.

---

# Modularity

Review:

- Module boundaries
- Coupling
- Cohesion
- Shared libraries
- Feature isolation

Evaluate whether changes remain localised.

---

# Dependency Health

Review:

- Dependency graph
- Circular dependencies
- Tight coupling
- Shared abstractions
- Third-party reliance

Assess long-term maintainability risks.

---

# Documentation

Review:

- README quality
- Architecture documentation
- ADRs
- API documentation
- Operational documentation
- Inline documentation

Determine whether documentation supports long-term maintenance.

---

# Testability

Review:

- Test organisation
- Ease of testing
- Mocking complexity
- Test isolation
- Confidence during refactoring

Focus on maintainability rather than test coverage percentages.

---

# Configuration Management

Review:

- Environment configuration
- Feature flags
- Build configuration
- Shared settings

Evaluate ease of maintaining multiple environments.

---

# Automation

Review:

- CI/CD
- Linting
- Formatting
- Static analysis
- Dependency updates
- Automated testing

Determine how automation reduces maintenance effort.

---

# Technical Debt

Identify:

- Legacy code
- Temporary workarounds
- Deprecated implementations
- TODOs
- FIXME comments
- Incomplete migrations
- Historical compromises

Estimate the impact on future development velocity.

---

# Knowledge Risk

Assess:

- Single points of knowledge
- Undocumented systems
- Complex business logic
- Tribal knowledge
- Developer onboarding

Identify areas where maintenance depends on specific individuals.

---

# Evolution Readiness

Evaluate whether the project can comfortably support:

- New developers
- New features
- New integrations
- Additional tenants
- Platform expansion
- Significant refactoring

Assess long-term engineering flexibility.

---

# Engineering Sustainability

Review:

- Consistency
- Predictability
- Maintainable workflows
- Release confidence
- Refactoring readiness

Determine whether engineering quality can be sustained as the project grows.

---

# Technical Debt Prioritisation

Categorise debt into:

### Immediate

Issues significantly slowing current development.

### Near-Term

Issues likely to impact development within the next 6–12 months.

### Strategic

Issues unlikely to cause immediate problems but worth addressing as the project evolves.

Estimate the effort and long-term benefit of addressing each category.

---

# Maintainability Risks

Identify risks such as:

- Large feature areas
- Complex business rules
- Difficult onboarding
- Tight coupling
- Low automation
- Sparse documentation
- Poor knowledge sharing

Estimate their long-term impact.

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

- Poor architecture → Architecture Analysis
- Duplicate logic → Code Quality Analysis
- Missing monitoring → Production Readiness
- Security vulnerabilities → Security Audit

Reference the appropriate review instead.

---

# Positive Findings

Identify engineering practices that improve long-term maintainability.

Explain why they reduce future maintenance effort and increase development velocity.

---

# Reusable Maintainability Patterns

Highlight reusable engineering practices.

Examples:

- ADRs
- Feature-based organisation
- Automated quality gates
- Shared utilities
- Testing strategies
- Documentation standards
- Dependency management

---

# Final Recommendation

Provide:

- Overall Maintainability Score
- Category Scores
- Long-Term Sustainability Assessment
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

Inspect project organisation, engineering practices, documentation, automation and workflows before making recommendations.

Prioritise long-term engineering sustainability over short-term optimisation.

Avoid recommending abstractions that add unnecessary maintenance burden.

Recognise maintainable engineering practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.