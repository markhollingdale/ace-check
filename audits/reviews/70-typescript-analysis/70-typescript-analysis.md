# TypeScript Analysis

## Objective

Perform a comprehensive analysis of the application's TypeScript usage.

The goal is to evaluate how effectively TypeScript is used to improve correctness, maintainability, developer experience and long-term reliability.

Assess whether the application embraces modern TypeScript best practices rather than simply adding types to JavaScript.

This review focuses **only on TypeScript usage**.

Do **not** perform detailed reviews of architecture, code quality, security, performance or API design except where they directly affect the TypeScript implementation.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - TypeScript Documentation

Create:

```
docs/ai-review/reports/[project-name]-70-typescript.md
```

Document how TypeScript is used throughout the project.

Do not assess quality yet.

---

## 1. Compiler Configuration

Document:

- TypeScript version
- tsconfig configuration
- Strict mode
- Compiler options
- Path aliases
- Module resolution

---

## 2. Type Organisation

Document:

- Shared types
- Feature-specific types
- Generated types
- Global types
- Utility types

Explain how types are organised across the project.

---

## 3. Domain Modelling

Document:

- Domain models
- DTOs
- API contracts
- Database types
- External provider types

---

## 4. Type Inference

Document:

- Inference usage
- Explicit typing
- Generic usage
- Shared utilities

---

## 5. Runtime Validation

Document:

- Validation libraries
- Type generation
- Schema sharing
- Type inference from schemas

---

## 6. External Libraries

Document:

- Generated types
- Third-party typings
- Custom declarations
- Module augmentation

---

## 7. Build Process

Document:

- Type checking
- Build integration
- Lint integration
- CI integration

---

# Phase 2 - TypeScript Assessment

Create:

```
docs/ai-review/reports/[project-name]-70-typescript-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# Compiler Configuration

Review:

- Strict mode
- Compiler options
- Safety settings
- Module resolution
- Build configuration

Evaluate whether compiler settings maximise correctness.

---

# Type Safety

Review:

- Explicit any
- Implicit any
- Unknown
- Never
- Unsafe assertions
- Non-null assertions
- Type casting

Attempt to identify areas where the type system has been bypassed.

---

# Type Design

Review:

- Interfaces
- Type aliases
- Enums
- Literal types
- Union types
- Intersection types
- Branded types
- Discriminated unions

Evaluate whether the type system accurately models the domain.

---

# Type Inference

Review:

- Inference quality
- Unnecessary annotations
- Generic inference
- Return type inference

Encourage inference where it improves readability.

Avoid unnecessary explicit types.

---

# Generics

Review:

- Generic design
- Constraints
- Reusability
- Complexity

Identify overly complex or unnecessary generic abstractions.

---

# Runtime Validation

Review:

- Zod schemas
- Schema reuse
- Validation inference
- Type synchronisation

Evaluate whether runtime validation and compile-time types remain aligned.

---

# Null Safety

Review:

- Nullable values
- Optional properties
- Undefined handling
- Defensive programming

Identify opportunities to eliminate null-related bugs.

---

# Immutability

Review:

- Readonly usage
- Const assertions
- Immutable data structures

Evaluate whether immutability is used appropriately.

---

# Error Handling

Review:

- Typed errors
- Result types
- Error narrowing
- Unknown handling

Assess whether errors are safely represented.

---

# API Contracts

Review:

- Shared contracts
- End-to-end type safety
- Request types
- Response types
- DTO consistency

Evaluate the quality of type sharing.

---

# Maintainability

Review:

- Duplicate types
- Shared utilities
- Utility types
- Type naming
- File organisation

Identify opportunities to simplify the type system.

---

# Developer Experience

Evaluate:

- Auto-completion
- Discoverability
- Type readability
- Refactoring support
- Navigation
- Error messages

Consider the experience of another developer working with the codebase.

---

# Modern TypeScript Features

Review appropriate use of:

- satisfies
- as const
- Template literal types
- Conditional types
- Mapped types
- Utility types
- keyof
- typeof
- infer

Do not recommend advanced features unless they provide clear value.

---

# Technical Debt

Identify:

- Legacy typings
- Duplicate interfaces
- Unused types
- Type assertions
- Workarounds
- Excessive any usage
- Unsafe casts

Estimate long-term maintenance impact.

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

- Poor API design → API Analysis
- Large components → Code Quality Analysis
- Missing validation → Security Audit
- Slow algorithms → Performance Analysis

Reference the appropriate review instead.

---

# Positive Findings

Identify TypeScript practices worth keeping.

Explain why they improve correctness, maintainability or developer experience.

---

# Reusable TypeScript Patterns

Highlight reusable patterns.

Examples:

- Shared schemas
- Generic utilities
- Type-safe APIs
- Domain modelling
- Validation patterns
- Utility types

---

# Final Recommendation

Provide:

- Overall TypeScript Score
- Category Scores
- Production Readiness (TypeScript only)
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

Inspect the source code, type definitions and compiler configuration before making recommendations.

Prioritise correctness, clarity and maintainability over clever type-level programming.

Avoid recommending advanced TypeScript features unless they provide measurable value.

Recognise excellent TypeScript usage as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.