\# Technical Website Audit \& AI Report Generator — Full Specification



\## 1. Project Overview



Build an \*\*open-source, local-first website technical auditing tool\*\* that crawls a website, runs Lighthouse against selected pages, aggregates the results across the entire site, identifies recurring problems, and produces concise reports suitable for both humans and AI coding agents.



The tool should solve the following problem:



> Lighthouse provides excellent detailed information for individual pages, but its raw output is too large and repetitive to be useful when auditing an entire website.



The application should therefore:



1\. Crawl a website.

2\. Discover URLs through sitemap, robots.txt and internal links.

3\. Select pages to audit.

4\. Run standard Lighthouse against each selected page.

5\. Store the raw Lighthouse results.

6\. Extract the useful information.

7\. Aggregate recurring issues across pages.

8\. Identify affected page types/templates where possible.

9\. Assign sensible priorities.

10\. Present a useful visual dashboard.

11\. Provide links to detailed Lighthouse results.

12\. Generate condensed Markdown reports.

13\. Generate AI-ready prompts/reports.

14\. Allow comparison between scans.

15\. Work entirely locally without requiring a database or cloud service.



The initial version should be \*\*local-first, open-source and lightweight\*\*.



\---



\# 2. Goals



\## Primary Goals



\### G1 — Whole-site auditing



Allow a user to enter:



```text

https://example.com

```



and scan the site rather than manually running Lighthouse against individual pages.



\### G2 — Useful aggregation



Do not simply present hundreds of Lighthouse reports.



Identify patterns such as:



> 183 pages have inefficiently sized images.



rather than repeating the same Lighthouse finding 183 times.



\### G3 — Human-readable dashboard



Provide an interface showing:



\* Overall scores

\* Number of pages scanned

\* Critical issues

\* High-priority issues

\* Medium-priority issues

\* Low-priority issues

\* Performance metrics

\* Accessibility problems

\* Best-practice problems

\* SEO problems

\* Affected pages

\* Issue trends

\* Links to detailed reports



\### G4 — AI-ready output



Generate concise Markdown that can be supplied to:



\* Claude Code

\* OpenCode

\* Cursor

\* ChatGPT

\* Gemini

\* other coding agents



The generated report should contain enough evidence for an AI to reason about the problem without requiring the AI to process hundreds of megabytes of raw Lighthouse JSON.



\### G5 — Preserve raw evidence



Never discard the original Lighthouse results.



The condensed reports are derived from the raw data and should always be traceable back to the original report.



\---



\# 3. Non-Goals for V1



Do \*\*not\*\* build the following initially:



\* User accounts

\* Authentication

\* Cloud hosting

\* SaaS functionality

\* Subscription system

\* Stripe

\* Database

\* Cloud storage

\* Built-in AI API integration

\* Mandatory Docker

\* Electron

\* Tauri

\* Browser extension

\* Telemetry

\* Automatic code modification

\* Automatic fixes

\* Automatic deployment



The application should remain a local developer tool.



\---



\# 4. Recommended Technology Stack



\## Core



\### TypeScript



Primary language.



Reasons:



\* Lighthouse is Node-based.

\* Excellent ecosystem for web tooling.

\* Strong typing.

\* Familiar to the target developer audience.

\* Easy open-source contribution.



\### Node.js



Runtime.



\### pnpm



Package manager.



\---



\# 5. Frontend



\## React



Use React for the UI.



\## Vite



Use Vite rather than Next.js.



Reasons:



\* No SSR required.

\* No SEO requirement for the application itself.

\* No server-side rendering requirement.

\* Very lightweight.

\* Fast development.

\* Easy local deployment.



\## Tailwind CSS



Use Tailwind for styling.



\## shadcn/ui



Use shadcn/ui where appropriate for:



\* Buttons

\* Tabs

\* Dialogs

\* Cards

\* Tables

\* Dropdowns

\* Progress indicators

\* Badges

\* Tooltips



The UI should feel like a modern developer tool rather than a generic website.



\---



\# 6. Backend



Use a small local Node.js HTTP server.



Recommended:



\### Hono



Hono should provide the local API layer.



The backend is responsible for:



\* Starting scans

\* Reporting scan progress

\* Reading/writing scan data

\* Starting Lighthouse

\* Crawling URLs

\* Running analysis

\* Generating reports

\* Serving report files



No external backend should be required.



\---



\# 7. Database / Storage



Do not use PostgreSQL, SQLite or another database initially.



Use the filesystem.



Example:



```text

.scans/

&#x20;   2026-08-14\_103000/

&#x20;       scan.json

&#x20;       summary.json

&#x20;       issues.json

&#x20;       ai-report.md

&#x20;       pages/

&#x20;           homepage/

&#x20;               lighthouse.json

&#x20;               summary.json

&#x20;           whats-on/

&#x20;               lighthouse.json

&#x20;               summary.json

&#x20;           event-123/

&#x20;               lighthouse.json

&#x20;               summary.json

```



A scan should be self-contained.



A scan directory should be portable and optionally zip-able.



\---



\# 8. Project Structure



Initial structure:



```text

site-audit-tool/

│

├── src/

│   ├── crawler/

│   │   ├── crawler.ts

│   │   ├── sitemap.ts

│   │   ├── robots.ts

│   │   └── links.ts

│   │

│   ├── lighthouse/

│   │   ├── runner.ts

│   │   └── parser.ts

│   │

│   ├── analyser/

│   │   ├── analyser.ts

│   │   ├── issues.ts

│   │   ├── aggregation.ts

│   │   ├── scoring.ts

│   │   └── priorities.ts

│   │

│   ├── reports/

│   │   ├── markdown.ts

│   │   ├── json.ts

│   │   └── html.ts

│   │

│   ├── storage/

│   │   └── storage.ts

│   │

│   ├── server/

│   │   └── server.ts

│   │

│   └── cli/

│       └── cli.ts

│

├── web/

│   ├── src/

│   │   ├── components/

│   │   ├── pages/

│   │   ├── hooks/

│   │   └── lib/

│   └── ...

│

├── scans/

│

├── package.json

├── pnpm-workspace.yaml

├── tsconfig.json

└── README.md

```



The project can be split into packages later if required.



Do not prematurely create a large monorepo architecture.



\---



\# 9. Scanner Workflow



The complete workflow should be:



```text

User enters URL

&#x20;       ↓

Validate URL

&#x20;       ↓

Fetch robots.txt

&#x20;       ↓

Find sitemap.xml

&#x20;       ↓

Parse sitemap

&#x20;       ↓

Discover internal links

&#x20;       ↓

Build URL list

&#x20;       ↓

Apply scan configuration

&#x20;       ↓

Select URLs

&#x20;       ↓

Run Lighthouse

&#x20;       ↓

Store raw Lighthouse JSON

&#x20;       ↓

Extract useful metrics

&#x20;       ↓

Normalise audit results

&#x20;       ↓

Aggregate recurring issues

&#x20;       ↓

Determine severity

&#x20;       ↓

Generate summary

&#x20;       ↓

Generate AI report

&#x20;       ↓

Display dashboard

```



\---



\# 10. URL Discovery



The scanner should support multiple discovery methods.



\## 10.1 Sitemap



First attempt:



```text

https://example.com/sitemap.xml

```



Also inspect:



```text

robots.txt

```



for sitemap declarations.



Support sitemap indexes:



```text

sitemap.xml

&#x20;   ↓

sitemap-events.xml

sitemap-venues.xml

sitemap-pages.xml

```



\---



\# 11. Internal Link Crawling



If sitemap data is unavailable or incomplete, crawl internal links.



Extract links from HTML.



Only follow URLs matching the site's origin.



For example:



```text

https://example.com/events/123

```



may be followed.



Do not follow:



```text

https://facebook.com/...

```



unless explicitly configured.



\---



\# 12. URL Normalisation



Normalise URLs to avoid duplicate scans.



Handle:



\* trailing slash

\* URL fragments

\* default ports

\* URL encoding

\* duplicate query strings

\* tracking parameters



Fragments should normally be removed:



```text

/page#section

```



becomes:



```text

/page

```



Configurable query parameters should be ignored where appropriate.



Default ignored parameters should include common tracking parameters such as:



```text

utm\_source

utm\_medium

utm\_campaign

utm\_term

utm\_content

gclid

fbclid

```



\---



\# 13. Scan Modes



Provide three scan modes.



\## Quick



Designed for fast development feedback.



Default:



```text

10 pages

```



Prefer representative pages.



\## Standard



Default whole-site scan.



Suggested maximum:



```text

100 pages

```



Configurable.



\## Full



Scan every discovered URL subject to a user-defined maximum.



Example:



```text

Maximum pages: 500

```



The user should always be warned before starting a large scan.



\---



\# 14. Representative Page Selection



For Quick mode, intelligently select representative pages.



Prioritise:



1\. Homepage

2\. Main navigation pages

3\. Search pages

4\. Category pages

5\. Location pages

6\. Event pages

7\. Venue pages

8\. Other unique URL patterns



Avoid selecting 10 pages from the same template if more useful templates exist.



\---



\# 15. Template Detection



Attempt to group URLs into page types.



Examples:



```text

/

/whats-on

/events/123

/events/456

/venues/foo

/venues/bar

/category/music

/location/farnborough

```



Potential groups:



```text

homepage

search

event

venue

category

location

other

```



Initial detection can use URL patterns.



Future versions may use DOM similarity.



The system should not claim template detection is certain.



Use wording such as:



> Likely template: Event



\---



\# 16. Lighthouse Integration



Use the \*\*Lighthouse npm package directly\*\*.



Do not depend on Unlighthouse.



The scanner should launch Lighthouse programmatically against each URL.



Use a controlled Chrome/Chromium instance.



The exact browser-launch implementation should be isolated behind:



```text

LighthouseRunner

```



so it can be changed later without affecting the rest of the application.



\---



\# 17. Lighthouse Configuration



Default to:



\* Mobile

\* Performance

\* Accessibility

\* Best Practices

\* SEO



Provide a future option for desktop.



The scanner should allow:



```text

Mobile

Desktop

Both

```



V1 can default to Mobile.



\---



\# 18. Lighthouse Data



For every page preserve the complete raw Lighthouse JSON.



Never modify the raw result.



Example:



```text

pages/

&#x20;   event-123/

&#x20;       lighthouse-mobile.json

```



The raw result should remain available from the UI.



\---



\# 19. Useful Lighthouse Metrics



Extract at minimum:



\## Scores



\* Performance

\* Accessibility

\* Best Practices

\* SEO



\## Core Web Vitals



\* LCP

\* CLS

\* INP

\* FCP



\## Other performance metrics



\* TBT

\* Speed Index

\* Total page weight

\* Request count



Where Lighthouse provides relevant values.



\---



\# 20. Issue Extraction



Extract Lighthouse audits that represent actionable findings.



Examples:



\* inefficient images

\* oversized images

\* render-blocking resources

\* unused JavaScript

\* unused CSS

\* excessive DOM size

\* excessive network payload

\* long main-thread work

\* accessibility failures

\* missing labels

\* contrast problems

\* invalid ARIA

\* security-related best practices

\* SEO problems



Do not automatically treat every Lighthouse audit as a problem.



\---



\# 21. Issue Normalisation



Each issue should have a stable internal representation.



Example:



```json

{

&#x20; "id": "uses-optimized-images",

&#x20; "category": "performance",

&#x20; "title": "Use efficiently encoded images",

&#x20; "description": "...",

&#x20; "severity": "high",

&#x20; "affectedPages": \[],

&#x20; "count": 0,

&#x20; "potentialSavingsBytes": 0

}

```



\---



\# 22. Issue Aggregation



This is one of the most important features.



If:



```text

Page 1 → inefficient images

Page 2 → inefficient images

Page 3 → inefficient images

...

```



the site report should contain one issue:



```text

Inefficiently sized images



Affected pages: 187

```



rather than 187 separate issues.



\---



\# 23. Issue Severity



Severity should be determined using a combination of:



\* Lighthouse impact

\* Number of affected pages

\* Potential performance savings

\* Core Web Vital impact

\* Accessibility severity

\* Whether the issue affects important page types



Suggested levels:



```text

critical

high

medium

low

info

```



Do not blindly copy Lighthouse's own scoring.



The tool should have its own prioritisation layer.



\---



\# 24. Severity Guidelines



\## Critical



Issues that:



\* seriously break functionality

\* cause major accessibility failures

\* cause severe performance problems

\* affect most of the site

\* create significant security concerns



\## High



Issues that:



\* materially affect performance

\* affect Core Web Vitals

\* affect many pages

\* have significant savings



\## Medium



Issues that:



\* have noticeable but limited impact

\* affect fewer pages

\* represent meaningful improvements



\## Low



Minor improvements.



\## Info



Useful observations that don't necessarily require action.



\---



\# 25. Aggregated Metrics



Calculate:



\* pages scanned

\* successful scans

\* failed scans

\* average performance

\* median performance

\* lowest performance

\* highest performance

\* average accessibility

\* median accessibility

\* average best practices

\* average SEO

\* issue counts

\* pages affected by each issue



Median should be preferred over average when presenting typical page performance.



\---



\# 26. Performance Summary



Example:



```text

Performance



Average: 78

Median: 81

Best: 96

Worst: 43



LCP

Median: 2.4s



CLS

Median: 0.04



TBT

Median: 180ms

```



\---



\# 27. Site Dashboard



The main dashboard should show:



```text

Website

https://example.com



Pages scanned

87



Performance

78



Accessibility

94



Best Practices

96



SEO

100

```



Then:



```text

Critical    2

High        7

Medium     14

Low         9

```



\---



\# 28. Dashboard Sections



\## Overview



High-level site health.



\## Issues



Aggregated issues.



\## Pages



Individual page results.



\## Performance



Performance-focused metrics.



\## Accessibility



Accessibility-focused findings.



\## Best Practices



Best-practice findings.



\## SEO



SEO findings.



\## Reports



Generated reports and raw Lighthouse results.



\## Compare



Compare previous scans.



\---



\# 29. Issue Explorer



Clicking an issue should show:



```text

Inefficiently Sized Images



Severity

HIGH



Affected pages

187 / 200



Estimated average savings

640 KB



Estimated maximum savings

2.4 MB



Affected page types

Event

Venue

Search



Example pages

/events/123

/events/456

/venues/foo



Description

...



Recommended investigation

...



View Lighthouse evidence

```



\---



\# 30. Page Explorer



Each page should show:



```text

/events/123



Performance       72

Accessibility     94

Best Practices    96

SEO              100



LCP                2.9s

CLS                0.03

TBT                180ms

```



Then list the page-specific issues.



Provide:



> Open Lighthouse Report



\---



\# 31. Raw Lighthouse Reports



Store raw JSON.



Optionally create a human-readable HTML Lighthouse report.



The UI should provide:



> View raw JSON



and:



> Open Lighthouse HTML report



\---



\# 32. Report Storage



Example:



```text

scans/

&#x20;   2026-08-14\_103000/

&#x20;       metadata.json

&#x20;       summary.json

&#x20;       issues.json

&#x20;       ai-audit.md



&#x20;       pages/

&#x20;           homepage/

&#x20;               lighthouse.json

&#x20;               summary.json

&#x20;               report.html



&#x20;           event-123/

&#x20;               lighthouse.json

&#x20;               summary.json

&#x20;               report.html

```



\---



\# 33. AI Report



Generate a Markdown report specifically intended for an AI developer.



It should be significantly smaller than the raw Lighthouse data.



Example structure:



```markdown

\# Website Technical Audit



\## Site



https://example.com



\## Scan



14 August 2026



\## Pages



87 pages scanned



\## Executive Summary



...



\## Critical Issues



\### 1. ...



Affected pages: 187



...



\## High Priority Issues



...



\## Performance



...



\## Accessibility



...



\## Best Practices



...



\## SEO



...



\## Recommended Action Plan



1\. ...

2\. ...

3\. ...



\## Evidence



...

```



\---



\# 34. AI Report Principles



The AI report should:



\* remove duplicate findings

\* retain important numbers

\* retain affected URLs

\* retain representative examples

\* preserve evidence

\* distinguish facts from inferred causes

\* identify likely common causes

\* identify uncertainty

\* avoid making unsupported claims



For example:



Bad:



> The application is using Next.js incorrectly.



Good:



> Lighthouse reports inefficiently sized images on 187 pages. Because the affected pages share the Event template, this may indicate a common image rendering path. Investigate the event image component before making changes.



\---



\# 35. Generate Prompt Feature



Provide a button:



> \*\*Generate AI Prompt\*\*



The prompt should include instructions to the coding AI.



Example:



```text

You are reviewing an existing web application.



Do not make changes yet.



Analyse the attached website audit and determine:



1\. Which issues are genuine problems.

2\. Which issues are likely duplicates of the same underlying problem.

3\. The likely root cause of each significant issue.

4\. Which files/components are likely involved.

5\. The recommended implementation.

6\. Potential risks or regressions.

7\. A prioritised implementation plan.



Do not blindly accept automated audit recommendations.



Use the Lighthouse evidence provided below.



\[REPORT]

```



Then append the condensed audit.



\---



\# 36. AI Prompt Modes



Support:



\## Full Audit



Everything important.



\## Performance



Performance only.



\## Accessibility



Accessibility only.



\## SEO



SEO only.



\## Best Practices



Best Practices only.



\## Issue Investigation



Only the selected issue and relevant evidence.



\## Page Investigation



Only one selected page.



\---



\# 37. AI Output Formats



Support:



```text

Markdown

Plain text

JSON

```



Markdown should be the default.



\---



\# 38. Copy to Clipboard



Every generated AI report should have:



> Copy to clipboard



Also:



> Save Markdown



\---



\# 39. Scan Comparison



Allow selecting two scans.



Example:



```text

Performance



Previous: 69

Current: 78

Change: +9

```



Issues:



```text

Fixed

\- oversized images

\- render-blocking resources



New

\- unused JavaScript

```



Persist previous scans rather than overwriting them.



\---



\# 40. Scan Configuration



Allow the user to configure:



```text

URL

Scan mode

Maximum pages

Device

Concurrency

Timeout

```



Default:



```text

Mode: Standard

Pages: 100

Device: Mobile

Concurrency: 2

```



Concurrency must be conservative.



Do not hammer websites.



\---



\# 41. Rate Limiting



Crawler requests should have configurable delays/concurrency.



Default:



```text

2 concurrent pages

```



Allow users to change it.



Show a warning when increasing concurrency substantially.



\---



\# 42. Respect robots.txt



Default behaviour should respect `robots.txt`.



Provide an explicit advanced option:



```text

Ignore robots.txt

```



The user must actively enable this.



\---



\# 43. Authentication



V1 should only support publicly accessible pages.



Future versions may support:



\* HTTP Basic Auth

\* cookies

\* authentication headers

\* local development sites



\---



\# 44. Localhost Support



The scanner must support:



```text

http://localhost:3000

```



This is important for developers.



It must also support:



```text

http://127.0.0.1:3000

```



and other local development URLs.



\---



\# 45. Production/Preview Support



Support:



```text

https://example.vercel.app

https://example.com

```



No special handling should be required.



\---



\# 46. Scan Progress



The UI should show live progress.



Example:



```text

Scanning...



43 / 87 pages



Current:

https://example.com/events/123



Performance results:

██████████████░░░░░░ 72

```



The backend should emit scan progress events.



\---



\# 47. Failed Pages



A failed Lighthouse run should not abort the entire scan.



Example:



```text

87 pages discovered

84 successfully scanned

3 failed

```



Show failed pages separately.



Store failure details.



Allow:



> Retry failed pages



\---



\# 48. Scan Cancellation



Allow the user to cancel a running scan.



Already completed results should be retained.



Example:



```text

Scan cancelled



43 pages completed

44 pages remaining

```



\---



\# 49. Error Handling



Errors should be human-readable.



Instead of:



```text

Error: spawn ENOENT

```



show:



```text

Chrome could not be started.



Check that Chrome/Chromium is installed and available.

```



Raw error information should still be available in an expandable section.



\---



\# 50. CLI



Provide a CLI in addition to the GUI.



Example:



```bash

pnpm audit https://example.com

```



Options:



```bash

pnpm audit https://example.com --pages 100

pnpm audit https://example.com --mode quick

pnpm audit https://example.com --desktop

pnpm audit https://example.com --output ./reports

```



The CLI should use exactly the same scanning/analyser code as the GUI.



\---



\# 51. GUI and CLI Architecture



Both should use the same core services.



```text

&#x20;            ┌──────────────┐

&#x20;            │ React UI     │

&#x20;            └──────┬───────┘

&#x20;                   │

&#x20;            ┌──────▼───────┐

&#x20;            │ Local API    │

&#x20;            └──────┬───────┘

&#x20;                   │

&#x20;                   ▼

&#x20;            ┌──────────────┐

&#x20;            │ Scanner Core │

&#x20;            └──────┬───────┘

&#x20;                   │

&#x20;       ┌───────────┼───────────┐

&#x20;       ▼           ▼           ▼

&#x20;    Crawler    Lighthouse   Analyzer

```



CLI should bypass the UI but use the same scanner core.



\---



\# 52. Security



Because the tool accepts arbitrary URLs, consider SSRF implications.



The application is primarily local, but still validate URLs.



Potentially dangerous targets include:



```text

localhost

127.0.0.1

169.254.x.x

private network ranges

```



However, localhost must remain supported for legitimate development use.



Clearly document that the tool is designed to be run locally.



\---



\# 53. Privacy



The tool should not transmit scan data anywhere by default.



No analytics.



No telemetry.



No external API calls other than:



\* target website

\* Lighthouse/Chrome requirements

\* resources loaded by the target page



AI generation should be local/export-based in V1.



The user explicitly chooses what to send to an AI.



\---



\# 54. Open Source



Use an OSI-approved licence.



Recommended:



```text

MIT

```



Repository should contain:



```text

README.md

LICENSE

CONTRIBUTING.md

CODE\_OF\_CONDUCT.md

SECURITY.md

```



\---



\# 55. Configuration



Provide a configuration file.



Example:



```text

site-audit.config.ts

```



Potential configuration:



```ts

export default {

&#x20; maxPages: 100,

&#x20; concurrency: 2,

&#x20; device: "mobile",

&#x20; respectRobots: true,

&#x20; ignoredQueryParams: \[

&#x20;   "utm\_source",

&#x20;   "utm\_medium",

&#x20;   "utm\_campaign"

&#x20; ]

};

```



\---



\# 56. Environment



The tool should work on:



\* Windows

\* macOS

\* Linux



Windows should be a first-class supported platform.



\---



\# 57. Installation



Initial development installation:



```bash

git clone <repository>

cd site-audit

pnpm install

pnpm dev

```



Eventually provide:



```bash

pnpm dlx site-audit https://example.com

```



if packaging permits.



\---



\# 58. No Required Cloud Services



A user should not need:



\* Vercel

\* Supabase

\* Neon

\* AWS

\* Cloudflare

\* Docker

\* Redis

\* Postgres



The entire application should run locally.



\---



\# 59. AI Integration — Future



Do not require an AI API for V1.



Potential future support:



\* OpenAI

\* Anthropic

\* Google

\* OpenRouter

\* Ollama

\* LM Studio



A future AI provider interface could be:



```ts

interface AIProvider {

&#x20; generateReport(input: AuditReport): Promise<string>;

}

```



This should not be part of the initial implementation unless it is trivial.



\---



\# 60. Local AI



A particularly useful future feature would be support for local models.



For example:



```text

Ollama

LM Studio

```



The user could select:



```text

AI Provider

○ None

○ Ollama

○ LM Studio

○ OpenAI

○ Anthropic

```



However, V1 should simply generate Markdown that can be pasted into any AI.



\---



\# 61. Report Export



Support:



```text

JSON

Markdown

HTML

CSV

```



CSV should contain issue/page summaries rather than raw Lighthouse data.



\---



\# 62. HTML Report



Generate a standalone HTML report that can be opened without the application.



It should include:



\* summary

\* scores

\* issues

\* pages

\* recommendations

\* charts

\* affected URLs



It should not require a server.



\---



\# 63. Raw Data Export



Allow:



> Export Raw Scan



This should produce a ZIP containing:



```text

metadata.json

summary.json

issues.json

pages/

```



This makes scans easy to archive or attach to bug reports.



\---



\# 64. Dashboard Charts



Keep charts simple.



Useful charts:



\* Score distribution

\* Performance distribution

\* Issue severity

\* Pages affected

\* Core Web Vitals distribution

\* Scan comparison



Avoid unnecessary visualisation.



\---



\# 65. Important UX Principle



The UI should prioritise:



> \*\*What should I fix?\*\*



rather than:



> \*\*What did Lighthouse measure?\*\*



Raw Lighthouse information should be available but secondary.



\---



\# 66. Recommended Dashboard Layout



```text

┌─────────────────────────────────────────────────────────┐

│ Site Audit                                               │

│ https://example.com                         New Scan     │

├─────────────────────────────────────────────────────────┤

│                                                         │

│ Performance    Accessibility   Best Practices   SEO     │

│     78              94               96          100    │

│                                                         │

├─────────────────────────────────────────────────────────┤

│                                                         │

│ 🔴 2 Critical    🟠 7 High    🟡 14 Medium    ⚪ 9 Low │

│                                                         │

├─────────────────────────────────────────────────────────┤

│ Priority Issues                                         │

│                                                         │

│ 🔴 Inefficient images                   187 pages       │

│ 🟠 Excessive JavaScript                  62 pages       │

│ 🟠 Large network payload                 41 pages       │

│ 🟡 Missing form labels                    8 pages       │

│                                                         │

├─────────────────────────────────────────────────────────┤

│                                                         │

│ \[ Generate AI Audit ] \[ Copy AI Prompt ]               │

│                                                         │

└─────────────────────────────────────────────────────────┘

```



\---



\# 67. Issue Page Layout



```text

Inefficiently Sized Images



HIGH PRIORITY



187 pages affected



Average estimated saving:

640 KB



Page types:

Event

Venue

Search



Likely common cause:

External event and venue images are being served

without consistent resizing/optimisation.



Affected pages:

...



\[View Lighthouse Evidence]



\[Generate AI Prompt]

```



\---



\# 68. AI Prompt Per Issue



When viewing an individual issue, provide:



> Generate Investigation Prompt



Output:



```text

Investigate the following website performance issue.



Issue:

Inefficiently sized images



Affected pages:

187



Representative pages:

...



Lighthouse evidence:

...



Determine:



1\. Whether this is a genuine issue.

2\. The likely root cause.

3\. Where in the application it is likely implemented.

4\. How it should be fixed.

5\. Any trade-offs.

6\. How to verify the fix.

```



\---



\# 69. Verification Workflow



A very useful future workflow:



```text

Scan

&#x20;↓

Fix issue

&#x20;↓

Scan again

&#x20;↓

Compare

&#x20;↓

Confirm improvement

```



The tool should make this workflow obvious.



\---



\# 70. Important Technical Principle



The scanner must \*\*not assume that a Lighthouse recommendation is automatically correct\*\*.



Automated tools can produce:



\* false positives

\* low-value warnings

\* contextually irrelevant recommendations

\* duplicated findings

\* recommendations that conflict with application requirements



The AI report should explicitly encourage verification.



\---



\# 71. Example AI Report



```markdown

\# Website Technical Audit



\## Overview



Site: https://example.com

Pages scanned: 87

Scan type: Standard

Device: Mobile



\## Scores



| Category | Median |

|---|---:|

| Performance | 78 |

| Accessibility | 94 |

| Best Practices | 96 |

| SEO | 100 |



\## Executive Summary



The site is generally healthy, but the primary performance

problem appears to be image delivery.



187 pages report inefficient image sizing, with an estimated

average saving of approximately 640 KB per affected page.



The issue appears across Event and Venue pages, suggesting

that it is likely caused by a shared image-rendering path.



\## High Priority Issues



\### 1. Inefficiently Sized Images



Affected pages: 187 / 200



Estimated average saving: 640 KB



Likely affected templates:

\- Event

\- Venue

\- Search



Representative pages:

\- /events/123

\- /events/456

\- /venues/example



The evidence suggests this may be a shared image component

issue, but this should be confirmed against the application

code.



\## Recommended Order



1\. Investigate shared image rendering.

2\. Determine whether external image URLs can be resized.

3\. Verify whether Next.js image optimisation is appropriate.

4\. Re-run the audit after changes.



\## AI Investigation Instructions



Do not make changes immediately.



Review the findings above and determine whether the

recommendations are appropriate for the application.



Identify likely source files/components before proposing

implementation changes.

```



\---



\# 72. V1 Milestones



\## Milestone 1 — Scanner Core



Implement:



\* URL input

\* sitemap discovery

\* basic crawler

\* Lighthouse runner

\* raw JSON storage

\* CLI



Success criteria:



```bash

pnpm audit https://example.com

```



produces a complete scan.



\---



\## Milestone 2 — Analysis



Implement:



\* score extraction

\* metrics extraction

\* audit extraction

\* issue normalisation

\* aggregation

\* severity



\---



\## Milestone 3 — Reports



Implement:



\* summary JSON

\* Markdown report

\* AI report

\* HTML report

\* raw report preservation



\---



\## Milestone 4 — Web UI



Implement:



\* dashboard

\* scan progress

\* issue explorer

\* page explorer

\* report links

\* AI prompt generation



\---



\## Milestone 5 — Scan History



Implement:



\* previous scans

\* comparison

\* issue fixed/new detection

\* trend information



\---



\## Milestone 6 — Open Source Release



Implement:



\* documentation

\* installation instructions

\* Windows/macOS/Linux testing

\* example scans

\* screenshots

\* contribution guidelines

\* issue templates



\---



\# 73. V1 Definition of Done



The project is considered successful when a developer can:



1\. Clone the repository.

2\. Run `pnpm install`.

3\. Start the application.

4\. Enter a website URL.

5\. Run a scan.

6\. See live progress.

7\. See all discovered pages.

8\. See Lighthouse scores.

9\. See aggregated issues.

10\. See which pages are affected.

11\. Open the original Lighthouse report.

12\. Generate a condensed technical report.

13\. Generate an AI-ready prompt.

14\. Copy the prompt to the clipboard.

15\. Save the report as Markdown.

16\. Run another scan later.

17\. Compare the two scans.

18\. Do all of this without creating an account or configuring a database.



\---



\# 74. Guiding Principle



The project's core philosophy should be:



> \*\*Don't give developers more audit data. Give them less, but make it more useful.\*\*



Lighthouse already provides extremely detailed data.



The value of this project is the layer above it:



```text

&#x20;                Lighthouse

&#x20;                    │

&#x20;                    ▼

&#x20;            Raw page results

&#x20;                    │

&#x20;                    ▼

&#x20;             Normalisation

&#x20;                    │

&#x20;                    ▼

&#x20;              Aggregation

&#x20;                    │

&#x20;                    ▼

&#x20;             Pattern detection

&#x20;                    │

&#x20;                    ▼

&#x20;             Prioritisation

&#x20;                    │

&#x20;                    ▼

&#x20;            Human-readable UI

&#x20;                    │

&#x20;                    ▼

&#x20;            AI-ready report

&#x20;                    │

&#x20;                    ▼

&#x20;             Developer action

```



The ultimate goal is to turn:



> \*\*"Here are 87 Lighthouse reports containing thousands of findings."\*\*



into:



> \*\*"Here are the 7 things you should investigate first, why they matter, which pages they affect, the evidence supporting them, and a ready-to-use prompt for your AI coding agent."\*\*



