# Accessibility Analysis

## Objective

Perform a comprehensive accessibility assessment of this application.

The goal is to evaluate whether the application is usable by people with a wide range of abilities and whether it complies with modern accessibility standards.

Assess both technical accessibility and overall usability.

This review focuses **only on accessibility**.

Do **not** perform detailed reviews of performance, SEO, architecture or UI design except where they directly impact accessibility.

All findings and scoring must follow the standards defined in:

```
framework/20-review-framework.md
```

---

# Phase 1 - Accessibility Documentation

Create:

```
docs/ai-review/reports/[project-name]-80-accessibility.md
```

Document the application's accessibility implementation.

Do not assess quality yet.

---

## 1. Accessibility Strategy

Document:

- Accessibility goals
- Accessibility standards
- WCAG compliance target
- ARIA usage
- Semantic HTML usage

---

## 2. Navigation

Document:

- Navigation structure
- Keyboard navigation
- Skip links
- Landmarks
- Focus management

---

## 3. Forms

Document:

- Labels
- Validation
- Error messages
- Required fields
- Input assistance

---

## 4. Interactive Components

Document:

- Buttons
- Links
- Dialogs
- Menus
- Dropdowns
- Tabs
- Accordions

Explain how accessibility has been implemented.

---

## 5. Media

Document:

- Images
- Icons
- Videos
- Audio
- Animations

---

## 6. Typography

Document:

- Heading hierarchy
- Font sizing
- Responsive typography
- Text spacing

---

## 7. Colour & Contrast

Document:

- Colour palette
- Contrast strategy
- Theme support
- Dark mode

---

## 8. Assistive Technology Support

Document:

- Screen reader support
- Keyboard support
- Voice control
- Zoom support

---

# Phase 2 - Accessibility Assessment

Create:

```
docs/ai-review/reports/[project-name]-80-accessibility-review.md
```

Follow the format defined in:

```
framework/20-review-framework.md
```

---

# WCAG Compliance

Assess the application against the latest WCAG recommendations.

Consider:

- Perceivable
- Operable
- Understandable
- Robust

Identify areas of non-compliance.

---

# Semantic HTML

Review:

- Heading hierarchy
- Lists
- Tables
- Forms
- Buttons
- Navigation
- Landmarks

Identify incorrect semantic usage.

---

# Keyboard Accessibility

Verify that all functionality can be accessed using only the keyboard.

Review:

- Tab order
- Focus visibility
- Focus trapping
- Keyboard shortcuts
- Dialog navigation
- Menus

Attempt to identify keyboard traps.

---

# Screen Reader Support

Review:

- Accessible names
- Labels
- ARIA attributes
- Live regions
- Announcements
- Hidden content

Evaluate compatibility with screen readers.

---

# Forms

Review:

- Labels
- Instructions
- Validation
- Error messages
- Required fields
- Auto-complete
- Accessible help text

Evaluate whether forms are usable without visual cues.

---

# Interactive Components

Review:

- Buttons
- Links
- Dropdowns
- Tabs
- Accordions
- Modals
- Toasts
- Menus

Verify interactive elements are accessible.

---

# Focus Management

Review:

- Initial focus
- Focus restoration
- Visible focus indicators
- Modal behaviour
- Dynamic content

Evaluate focus consistency.

---

# Colour & Contrast

Review:

- Contrast ratios
- Colour-only communication
- Error colours
- Success colours
- Dark mode
- High contrast compatibility

Verify sufficient contrast throughout the application.

---

# Typography

Review:

- Heading structure
- Font sizes
- Responsive scaling
- Text spacing
- Readability

Evaluate overall reading experience.

---

# Images & Media

Review:

- Alternative text
- Decorative images
- Captions
- Transcripts
- Media controls

Identify inaccessible media.

---

# Responsive Accessibility

Review accessibility across:

- Mobile
- Tablet
- Desktop
- Zoomed layouts
- Large text
- Orientation changes

Identify usability issues.

---

# Motion & Animation

Review:

- Reduced motion support
- Auto-playing content
- Animations
- Transitions
- Flashing content

Respect user accessibility preferences.

---

# Error Prevention

Review:

- Validation
- Confirmation dialogs
- Destructive actions
- Recovery options
- User guidance

Evaluate whether users can recover from mistakes.

---

# Developer Experience

Evaluate:

- Accessibility documentation
- Reusable accessible components
- Accessibility testing
- Consistency

Identify opportunities to improve accessibility throughout the development process.

---

# Technical Debt

Identify:

- Missing labels
- Incorrect semantics
- Missing ARIA
- Accessibility workarounds
- Inconsistent implementations

Estimate long-term impact.

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

- Slow page loading → Performance Analysis
- Poor SEO metadata → SEO Analysis
- Component complexity → Code Quality Analysis

Reference the appropriate review instead.

---

# Positive Findings

Identify accessibility practices worth keeping.

Explain why they improve usability and inclusivity.

---

# Reusable Accessibility Patterns

Highlight reusable accessibility patterns.

Examples:

- Accessible forms
- Dialogs
- Navigation
- Focus management
- Validation
- Keyboard interactions

---

# Final Recommendation

Provide:

- Overall Accessibility Score
- Category Scores
- WCAG Readiness
- Production Readiness (Accessibility only)
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

Inspect the application's components, markup and interaction patterns before making recommendations.

Prioritise real-world usability over automated accessibility scores.

Consider users with a wide range of abilities and assistive technologies.

Recognise excellent accessibility practices as well as weaknesses.

Avoid duplicate findings across review standards.

When uncertain, clearly state assumptions.