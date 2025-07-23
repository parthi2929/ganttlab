# Issue Search Filter PRD

## Purpose
Provide users with a quick, intuitive way to filter the list of issues displayed in GanttLab’s Gantt chart view by typing a search term. This improves focus and productivity when working with large backlogs.

## Problem Statement
When projects contain dozens (or hundreds) of issues, visually scanning the Gantt chart becomes cumbersome. Users need a lightweight filter to narrow the visible issues to those that matter at a given moment (e.g. issues containing a given keyword).

## Goals & Success Criteria
1. Allow users to type a keyword into a search box that filters the issues list by **title**.
2. Support two search modes:
   - **Simple** (default): case-insensitive substring match.
   - **Regex**: treat the input as a JavaScript regular expression.
3. Apply the filter **live while the user types** (≤ 150 ms perceived latency).
4. UI sits directly above the issues list / Gantt chart and does **not** hide other controls.
5. When no issue matches, show an empty-state message (not a pop up modal
6. Persist the last entered filter in the session (page refresh keeps the filter until browser tab is closed).

## Non-Goals (Phase-1)
- Filtering on fields other than title (e.g. dates, labels, milestones).
- Boolean operators (AND/OR) or advanced query syntax.
- Persisting filters across browser sessions or devices.

## Personas
| Persona | Scenario |
|---------|----------|
| **Project Manager** | Wants to quickly review “ODE”-related tasks without scrolling. |
| **Developer** | Needs to focus on issues mentioning a specific component while planning. |

## User Stories
1. *As a user* I can type "ODE" and immediately see only issues whose title contains "ODE".
2. *As a power user* I can switch to **Regex** mode and type `^API-\\d+$` to list issues whose title starts with "API-" followed by digits.
3. *As a user* I receive clear feedback if my regex is invalid or if no issue matches.

## UX Requirements
- The **search text field** is placed on the same horizontal line as the "Zoom" selector.
- To the right of the field, a **toggle** (segmented button) allows switching between *Simple* and *Regex*.
- Placeholder text: *“Filter issues…”*.
- Show a small badge with the number of visible issues vs total (e.g. *12 / 87*).
- Regex input errors are highlighted in red with tooltip describing the error.

## Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Render a text input named `issue-filter` in the toolbar above the chart. |
| FR-2 | Debounce keystrokes (≤ 300 ms) before triggering filter logic. |
| FR-3 | *Simple* mode performs case-insensitive `includes` match on issue titles. |
| FR-4 | *Regex* mode compiles the pattern using the `i` flag; invalid patterns show error state and do not filter. |
| FR-5 | Filtering hides (not just dims) non-matching issues in both the list and the timeline bars. |
| FR-6 | Clearing the input restores all issues. |

## Performance Requirements
- Filtering must complete within 100 ms for 1 000 issues on a typical laptop (Chrome, 2023 mid-range).

## Security & Privacy
- Client-side only; no data leaves the browser.

## Analytics / Metrics
- Track (anonymous) how often filters are used and the distribution of Simple vs Regex mode.

## Roll-out Plan
1. **Feature flag** behind `issueSearchFilter` (default *on* in staging, *off* in production).
2. Internal dog-food → Beta users → GA.

## Future Enhancements
- Add field-specific prefixes (e.g. `start:2023-11-01`, `due:<2023-12-31`).
- Combine multiple criteria with spaces interpreted as AND.
- Persist filters in URL query params for sharable links.

## Acceptance Criteria / QA Checklist
- [ ] Typing substring filters issue list live (Simple mode).
- [ ] Switching to Regex mode applies regex matching.
- [ ] Invalid regex shows error and does not crash UI.
- [ ] Performance benchmark passes with 1 000 issues.
- [ ] Unit tests cover Simple & Regex filtering logic.
- [ ] Visual regression tests confirm toolbar layout on desktop & mobile. 