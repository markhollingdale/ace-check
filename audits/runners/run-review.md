# Run AI Review

You are reviewing the current project.

An AI Review Framework exists in the directory that contains this file. Resolve all paths **relative to this file** so the suite works from any location:

```
../README.md
../framework/10-readme.md
../framework/20-review-framework.md
```

Read, in order:

1. `../README.md`
2. `../framework/10-readme.md`
3. `../framework/20-review-framework.md`

Then ask the user:

```
What review would you like to run?

1. Architecture
2. Security
3. Performance
4. Database
5. API
6. Code Quality
7. TypeScript
8. Accessibility
9. SEO
10. Production Readiness
11. Cost Analysis
12. Maintainability
13. Testing
14. Business Logic
15. Privacy & Compliance
16. Portability & Reusability
17. Summary (aggregates existing reviews - may run on a partial set, will warn about missing reviews)
18. Specification (generates implementation plan - will ask which severity level)
19. Full Suite (runs all 16 reviews in order, then Summary - see run-full-suite.md)
```

Based on the selection, read the corresponding review document from the paths below and follow its instructions exactly.

## Review File Paths

| Number | Review | File Path |
|--------|--------|-----------|
| 1 | Architecture | `../reviews/10-architecture-analysis/10-architecture-analysis.md` |
| 2 | Security | `../reviews/20-security-analysis/20-security-analysis.md` |
| 3 | Performance | `../reviews/30-performance-analysis/30-performance-analysis.md` |
| 4 | Database | `../reviews/40-database-analysis/40-database-analysis.md` |
| 5 | API | `../reviews/50-api-analysis/50-api-analysis.md` |
| 6 | Code Quality | `../reviews/60-code-quality-analysis/60-code-quality-analysis.md` |
| 7 | TypeScript | `../reviews/70-typescript-analysis/70-typescript-analysis.md` |
| 8 | Accessibility | `../reviews/80-accessibility-analysis/80-accessibility-analysis.md` |
| 9 | SEO | `../reviews/90-seo-analysis/90-seo-analysis.md` |
| 10 | Production Readiness | `../reviews/100-production-readiness/100-production-readiness.md` |
| 11 | Cost Analysis | `../reviews/110-cost-analysis/110-cost-analysis.md` |
| 12 | Maintainability | `../reviews/120-maintainability/120-maintainability.md` |
| 13 | Testing | `../reviews/150-testing-analysis/150-testing-analysis.md` |
| 14 | Business Logic | `../reviews/160-business-logic-analysis/160-business-logic-analysis.md` |
| 15 | Privacy & Compliance | `../reviews/170-privacy-compliance-analysis/170-privacy-compliance-analysis.md` |
| 16 | Portability & Reusability | `../reviews/180-portability-analysis/180-portability-analysis.md` |
| 17 | Summary | `../reviews/999-summary/999-summary.md` |
| 18 | Specification | `../reviews/140-specification/140-specification.md` |
| 19 | Full Suite | `../runners/run-full-suite.md` |

If the user selects **19 (Full Suite)**, stop here and follow `run-full-suite.md` instead.

## Runbooks (Manual Checks — Code Cannot Prove ON)

The following require human dashboard clicks. Every review that touches them must surface them as a finding, and the Summary must surface them in §6b:

- `docs/runbooks/vercel-neon-manual-setup.md` — Vercel Firewall / Spend / Neon pooling
- `docs/runbooks/abuse-red-team-playbook.md` — 6 curl/k6 attack drills
- `docs/runbooks/pre-live-gate.md` — night-before sign-off gate (blocks `Production Ready: YES` if unsigned)

If you run **Full Suite**, the Summary will emit `⚠️ MANUAL GATE NOT SIGNED` until `pre-live-gate.md` is walked. Do not suppress this.

## Report Output

Create the output folder in the **current project being reviewed** (not in the framework repo) if it does not exist:

```
docs/ai-review/reports/
```

**Determine the project name** from `package.json` (name field) or the current folder name. Convert to lowercase with hyphens (e.g., "My App" becomes "my-app").

**All report files must be prefixed with the project name and review number:**

```
docs/ai-review/reports/[project-name]-[number]-[report-name].md
```

Example: `business-template-10-architecture-review.md`

**Note:** Review reports may contain sensitive information. Consider adding `docs/ai-review/reports/` to your project's `.gitignore` file.

Do not begin writing until all referenced documents have been read.
