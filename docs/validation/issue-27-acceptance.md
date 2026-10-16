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


## Independent PR #29 review and follow-up repairs — 16 October 2026

The original PR head was `c0f9a515f0aab8408f80ea0cb1f6660820f98d1b`.
During this review it was merged by another maintainer at `2026-10-16T03:06:26Z`
as `d4dc8a4b02eca5d5dc30955e93a004d3cfbc5b51`. PR #30 was also merged at
`2026-10-16T03:20:30Z` as `203b200fd81cde6c49cb52d5be0afc5f1e4b89b5`.
Neither merged head includes the following review repairs; those are carried
in the subsequent source-sync pull request, rather than attributed to either
already merged PR.

### Standards review

Two P2 storage-lifecycle findings in the original head: a stale startup
unavailable flag lets confirmed reset skip deletion after a recovered save;
and saving without safely re-reading temporarily unreadable storage can
overwrite unknown existing receipt bytes. Both are resolved. Final read-only
closure review of `81099ce4ff37564dec7099687726a3ed5dd10e41` found no remaining
blocking Standards finding.

### Spec review

Two overlapping P2 findings affect truthful persistence/reset and preserving
existing history under the parent contract and Issue #27. These are the same
two defects above, not two additional unique defects. Recovered saves now
clear stale state; unreadable or unknown existing bytes are preserved until
readable/deliberately reset; exact pending intent survives retries; known,
invalid and possibly partially persisted receipts retain an uncertain-reset
retry path when the storage property itself is denied. The no-write permanent
startup-denial path remains usable. Final read-only closure review of
`81099ce4ff37564dec7099687726a3ed5dd10e41` found no remaining blocking Spec
finding. Screen headings/title behavior remains intact.

### Independent execution

The primary agent ran the full unfiltered suite at the frozen repair commit
`81099ce4ff37564dec7099687726a3ed5dd10e41`: **161/161 PASS, exit 0**,
completed before `2026-10-16T03:31:33Z`. Runtime: macOS 15.7.5, Node v26.0.0,
Playwright 1.62.1, Chromium 151.0.7922.34. See the retained
[complete independent output](issue-27-review-browser-test-results.txt).
`TEST_FILTER`, screenshot capture flags, browser-path and Chrome executable
overrides were unset; only the documented external Playwright-module path
pointed to the earlier independently installed test dependency. This is a
fixture/injected-failure run, not new live SAP acceptance.

The eight new regression groups (15 Issue #27 groups total) exercise one-off
read recovery/save/reset/reload; preserving existing valid history; preserving
corrupt/unsupported bytes; zero writes while unreadable; deletion despite a
read failure; reset before save after recovery; wrong-intent read-back/retry;
and storage-property denial for both verified and partially persisted writes.
The inherited 146 groups also pass. The focused 16-check run includes one
inherited fixture/provenance check and must not be called 16 Issue #27 groups.

OpenCode performed the production/test edits in session
`ses_ebd967a0effe2AjEOHzDkQGAoe`; its actual development record is
[separate](../development/issue-27-opencode.md). Independent review, final
unfiltered execution and Git operations were performed outside that session.
No real key, SAP response or live receipt is present in this record or output.
