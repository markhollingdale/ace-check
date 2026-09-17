# Adding a Review to the Suite

Version: **v1.1.0**

This document is the checklist for extending the review suite with a new review standard. Follow it every time a review is added, renamed, or retired so the suite stays internally consistent.

---

# Numbering Rules

- Reviews are numbered in 10-step slots: `10`, `20`, ... `180`.
- New reviews take the next free slot. Do **not** renumber existing reviews — every generated report references the review number in its filename (`[project-name]-40-database-review.md`). Renumbering breaks comparability with historical reports.
- The **Summary is locked at `999`** — it is always the last document in the suite, regardless of how many reviews exist. Never reuse 999 for anything else.
- The **Specification generator stays at `140`**. It is a generator, not a summary, and is not renumbered.

---

# Creating a New Review

## 1. Create the review directory and document

```
ai-review/reviews/[number]-[name]-analysis/[number]-[name]-analysis.md
```

Example:

```
ai-review/reviews/150-testing-analysis/150-testing-analysis.md
```

## 2. Follow the style conformance checklist

Every review must include, in this order:

| Section | Required |
| ------- | -------- |
| `# [Review Name]` title | ✅ |
| Objective (scope + "focus only on X" + "do not review Y") | ✅ |
| Reference to `framework/20-review-framework.md` | ✅ |
| Phase 1 — Documentation (descriptive, no assessment) with numbered sections | ✅ |
| Phase 2 — Assessment (scored, follows the review framework) | ✅ |
| Required Findings (severity/impact/recommendation/example/effort) | ✅ |
| Positive Findings | ✅ |
| Reusable Patterns | ✅ |
| Final Recommendation (score, categories, production readiness, effort) | ✅ |
| Review Behaviour | ✅ |

Reuse an existing review as a structural template (e.g., `60-code-quality-analysis.md`).

## 3. Enforce the deduplication rule

- Every review must list which findings **belong to another review** and must cross-reference rather than duplicate (the "Do not duplicate findings" block in Phase 2).
- If the new review overlaps an existing one, define the boundary explicitly (e.g., Business Logic 160 owns *correctness*, Security 20 owns *abuse*).

## 4. Keep the review project-agnostic

- No examples, paths, frameworks, or providers baked in that only apply to one project.
- Use conditional language: "if applicable", "if X is used" (matching existing docs, e.g., "If Stripe is used").
- The suite must run effectively on any project — validate with a smoke run (§7 of the expansion plan) on structurally different projects before declaring the review done.

## 5. Update every coupled file

| File | What to change |
| ---- | -------------- |
| `ai-review/runners/run-review.md` | Add the option to the selection prompt and the file-path table |
| `ai-review/framework/10-readme.md` | Add a row to the Current Reviews table; update workflow order if it has a natural position |
| `README.md` (root) | Update the review count and "What's Included" |
| `ai-review/reviews/999-summary/999-summary.md` | Add rows to the prerequisites table and the review-scores table |
| `ai-review/reviews/140-specification/140-specification.md` | Add a row to the prerequisites table and a phase to the phase map |

All five updates must land in the same commit — partial updates leave the suite broken.

## 6. Run a smoke test

Before merging, execute the new review (via the runner) against at least two structurally different projects and confirm:

- The document leads an AI through Phase 1 and Phase 2 without ambiguity.
- The report follows the `20-review-framework.md` format.
- No findings were duplicated with existing reviews.
- No project-specific assumptions leaked into the document.

---

# Renaming a Review

- Create the new directory/file; delete the old one.
- Update all coupled files (§5 above) including report filename conventions.
- If reports were already generated with the old name, note in the review document that legacy reports keep their old filenames.
- Log the rename in the Decision Log of the plan that performed it.

---

# Retiring a Review

- Mark the document with a "**Superseded**" banner at the top stating the replacement review and date.
- Remove it from the runner options (keep a note in the prompt: "option removed — see framework readme").
- Keep the document on disk so historical reports remain interpretable.
- Remove its rows from the Summary prerequisites/scores tables and the Specification phase map.
- Document the retirement in the Summary's notes so missing reports are explainable.

---

# Versioning

- Additive changes (new reviews, no format change): bump the minor version (e.g., v1.1.0 → v1.2.0).
- Breaking changes (scoring methodology, severity levels, report format): bump the major version (e.g., v2.0.0) — prior reports are no longer directly comparable.
- Record the change in `framework/10-readme.md` under a short "changes" note.
