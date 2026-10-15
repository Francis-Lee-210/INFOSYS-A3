# Issue #27 acceptance evidence

16 October 2026. Branch `fix/27-storage-and-screen-titles`, based on `main` at `f829c6c` (after #26).
Fixture and injected browser behaviour only; no SAP call and no API key were used.

Full unfiltered output: [issue-27-browser-test-results.txt](issue-27-browser-test-results.txt) — **153/153 PASS**
(146 existing groups unchanged + 7 new `issue 27:` groups). macOS, Node v22.18.0, Playwright 1.62.1, headless Chromium.

## Defects reproduced before the change

- With `window.localStorage` throwing on access, the app opened on Screen 3 titled "Receipt could not be recovered" and
  told the user to reset a stored receipt, although nothing had been stored.
- `<h1>` stayed "Choose a document to review" and `<title>` stayed fixed on the cost-evidence and decision screens.

## Acceptance matrix

| Criterion | Evidence (`issue 27:` tests) | Result |
|---|---|---|
| Unreadable storage at start-up opens Screen 1 with a notice; no recovery screen or stored-receipt claim | `blocked storage at start-up stays on Screen 1 with a clear notice`; `getItem failure at start-up is treated as unavailable storage` | PASS |
| Corrupt / unsupported / missing-provenance data keeps the #7 recovery path | `corrupt receipt JSON still opens the existing recovery screen`; existing #7 recovery tests unchanged | PASS |
| Review still works without storage; confirmation stays unsaved with Retry; Reset makes no stored-data claim | `blocked storage still permits fixture review and leaves confirmation unsaved with Retry`; `reset with unavailable storage clears the session and reports no receipt was readable` | PASS |
| Each screen sets its own `<h1>` and `document.title`, including reopen, recovery and every Back/Return path | `heading and title follow list, cost, decision, Back to cost, and Back to list`; `saved receipt refresh and Return to list update heading and title`; recovery title asserted in the corrupt-data test | PASS |
| Existing suite passes unfiltered | 146 inherited groups pass; each of the six code commits was checked out separately and its suite passed | PASS |

## Screen names

| Screen | `<h1>` | `document.title` |
|---|---|---|
| 1 — list | Choose a document to review | Choose a document – Plan Review Snapshot |
| 2 — cost evidence | Review cost evidence | Cost evidence – Plan Review Snapshot |
| 3 — decision / receipt | Decide and save a receipt | Decision and receipt – Plan Review Snapshot |

The existing Screen 3 `<h2>` keeps its state text (for example "Saved receipt (historical)"). Focus behaviour is unchanged.

## Screenshots

- Blocked storage at start-up: [1366px](issue-27-blocked-storage-start-1366.png), [390px](issue-27-blocked-storage-start-390.png) — no page-level horizontal overflow.
- Screen headings: [cost evidence](issue-27-cost-heading-1366.png), [decision](issue-27-decision-heading-1366.png).

## Independent verification

Outside the OpenCode session, every OpenCode round was reviewed against the issue, gaps were returned to the same session,
and each commit was checked out in a separate worktree and its unfiltered suite re-run (146 → 149 → 149 → 151 → 151 → 153).
`node --check` on all JS/MJS files and `git diff --check` pass. `resources/` and earlier issues' evidence are unchanged.
