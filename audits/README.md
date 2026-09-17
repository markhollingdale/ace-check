# Ace AI Review Framework (vendored)

This directory is the **source of truth** for the Ace AI Review Framework, vendored
into AceCheck. It was previously maintained as a standalone `ai-review` collection.

The framework defines a versioned suite of structured engineering reviews (16
reviews + a Summary aggregator + a Specification generator). Each review follows a
shared finding format with IDs, severity, evidence, recommendations, and estimated
effort, and can be run standalone or as a full sequential suite.

## Start here

- `framework/10-readme.md` - overview, philosophy, workflow, and the current review list.
- `framework/20-review-framework.md` - the standard report/scoring format every review follows.
- `framework/30-adding-a-review.md` - how to add, rename, or retire a review.

## Run a review

- `runners/run-review.md` - run a single review (or the summary / specification).
- `runners/run-full-suite.md` - run all 16 reviews in sequence, then the Summary.

## Layout

```text
audits/
  README.md
  framework/
  reviews/
    10-architecture-analysis/
    20-security-analysis/
    ...
    999-summary/
  runners/
```

Review documents are at `reviews/<number>-<name>/<number>-<name>.md`. The Summary is
numbered `999` (always last) and the Specification generator is `140`.
