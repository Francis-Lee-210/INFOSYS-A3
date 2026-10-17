# Issue #36 acceptance: Billing Review Lite screen hierarchy

17 October 2026. Branch `feat/36-usability-hierarchy`. Code-bearing head tested:
`d71cb9896d092e68f196a842319052a374f5ac3e` (`fix(#36): accurate sample-data wording,
current status line and step indicator test`). Screenshots were captured on this head
("after") and on `origin/main` `28aee9d` ("before").

This is a fixture-based browser check. It is not a live SAP run and not a user test. No SAP
key was used, no upstream request was made, and no participant was involved.

## Change → heuristic → evidence

| Change | Heuristic (Nielsen H1–H10) | Before screenshot | After screenshot | Covering test |
|---|---|---|---|---|
| Step indicator and per-screen lead text | H1 Visibility of system status; H4 Consistency and standards | [issue-36-before-01-start.png](issue-36-before-01-start.png) | [issue-36-after-01-start.png](issue-36-after-01-start.png) | `issue 36: step indicator, lead text and status follow the current screen` |
| Collapsible connection panel with "Change source" | H8 Aesthetic and minimalist design; H3 User control and freedom | [issue-36-before-02-list-detail.png](issue-36-before-02-list-detail.png) | [issue-36-after-02-list-detail.png](issue-36-after-02-list-detail.png) | `issue 36: connection panel collapses after choosing a source and Change source reopens it by keyboard` |
| Technical evidence disclosures | H8 Aesthetic and minimalist design; H2 Match between system and the real world | [issue-36-before-03-cost.png](issue-36-before-03-cost.png) | [issue-36-after-03-cost.png](issue-36-after-03-cost.png) | `issue 36: technical evidence is closed by default and opens by keyboard on each screen` |
| Cost amount card and "What this does not tell you" | H8; H6 Recognition rather than recall; H2 | [issue-36-before-03-cost.png](issue-36-before-03-cost.png) | [issue-36-after-03-cost.png](issue-36-after-03-cost.png) | `issue 36: cost amount card shows exact reported amounts without formatting` |
| Decision summary card and intent descriptions | H6; H2; H5 Error prevention (the restriction is shown next to the options) | [issue-36-before-04-decision.png](issue-36-before-04-decision.png) | [issue-36-after-04-decision.png](issue-36-after-04-decision.png) | `issue 36: saved confirmation names the intent, document and gross amount`; the inherited `issue 9 K05` intent-label check is retained |
| Saved confirmation | H1 Visibility of system status | [issue-36-before-05-saved.png](issue-36-before-05-saved.png) | [issue-36-after-05-saved.png](issue-36-after-05-saved.png) | `issue 36: saved confirmation names the intent, document and gross amount` |
| Plain labels, button hierarchy, plain error copy | H2; H8; H9 Help users recognise, diagnose and recover from errors | [issue-36-before-02-list-detail.png](issue-36-before-02-list-detail.png) | [issue-36-after-02-list-detail.png](issue-36-after-02-list-detail.png) | Updated `'Try with demo data'` button-role lookups across the suite; the `issue 27` unsaved-receipt regex `/^Unsaved — we could not confirm your receipt was saved/` |
| Side-by-side list and detail on wide screens | H8; H6 Recognition rather than recall | [issue-36-before-02-list-detail.png](issue-36-before-02-list-detail.png) | [issue-36-after-02-list-detail.png](issue-36-after-02-list-detail.png) | `issue 36: no horizontal page scroll on all three screens at 390px and 1280px` |

## Test result

- Final `npm test` summary line: **`All 173 tests passed.`** (167 pre-#36 tests + 6 new
  `issue 36` tests), run on `d71cb98`.
- Pre-existing failures carried from the Part 0 baseline at `origin/main` `28aee9d`:
  **none** (the baseline FAIL list was empty).

## Follow-up polish (Part 7)

Branch `feat/36-usability-polish`, based on `feat/36-usability-hierarchy` (PR #40).
Code-bearing head tested: `3cb9de943fa9c428539f718d15e7cfbdaacb3268`
(`feat(#36): consistent names, Net/Tax/Gross help and plainer status copy`). The "after"
screenshots were re-taken on this head; the "before" screenshots are unchanged.

| Change | Heuristic (Nielsen H1–H10) |
|---|---|
| Step names now match the screen headings ("2. Review cost evidence", "3. Decide and save a receipt") | H4 Consistency and standards |
| The demo button names its own label ("Try with demo data (Fixture demonstration)"), matching the "Fixture demonstration" provenance shown after loading | H4 Consistency and standards |
| The eyebrow shows the product name "Billing Review Lite" instead of a screen-specific label | H4 Consistency and standards |
| Screen 1 has a single filled main button, and "Next page" became a secondary button | H8 Aesthetic and minimalist design |
| The "Reported figures remain exactly as returned…" audit sentence moved from the top of the cost screen into the "Technical evidence (for reviewers)" disclosure | H8 Aesthetic and minimalist design |
| New "Net is the amount before sales tax…" explanation in the amount card | H10 Help and documentation |
| Plain status texts: "Partial coverage: more records are available with Next page." and "Saved — your receipt was stored and checked." | H2 Match between system and the real world |

Covering test: `issue 36: names stay consistent and the amount card explains Net, Tax and
Gross`. Final `npm test` summary line on this head: **`All 174 tests passed.`** (167 pre-#36
tests + 7 new `issue 36` tests); FAIL list empty.

## Limits

This is a fixture-based browser check of the shipped `app/` UI at 1280×900 and 390×844. It
is not a live SAP run and not a user study; no usability participants were involved and no
task-success or satisfaction numbers are claimed. The heuristic column is an analytic
mapping, not a measured outcome. Live SAP sandbox verification and repackaging happen after
merge.

## Review fixes (R40-01 to R40-07)

Fixes for Francis's review of `bed8d6b`. Code-bearing head tested: `da05a54655bd301ff50e64c4c37020930e4c9694`. Final
`npm test` summary line on this head: **`All 176 tests passed.`**; FAIL list empty. The "after"
screenshots were re-taken on this head.

| Finding | Change | Heuristic (Nielsen H1–H10) | Covering test |
|---|---|---|---|
| R40-01 | The date explanation follows the data source: a synthetic processing date for the synthetic fixture, and the date the follow-on billing document is to be processed for billing requests. Neither is called a payment date. | H2 Match between system and the real world | `issue 36 review: date wording follows the source, …` |
| R40-02 | When only Help or Later is allowed, the specific reason is shown next to the options | H5 Error prevention; H9 Help users recognise, diagnose and recover from errors | `issue 7: … permits only Help or Later and retains material reasons` (reason assertions added) |
| R40-03 | Two new tests run the default UI with no harness: the source controls by keyboard, and optional-items loading, failure and Retry read | Test coverage | the two round-2 `issue 36 review` tests |
| R40-04 | "Check optional items" shows checking, finished or could-not-be-checked next to the button, in addition to the top status line | H1 Visibility of system status | `issue 36 review: Check optional items shows pending, failure and recovery …` |
| R40-05 | List columns Type, Document, Date, Amount, Currency (the basis is shown inside the Amount cell); missing values read "Not available"; read errors say "Data check failed" and use plain words instead of "contract", "continuation" and "provenance" | H2; H4 Consistency and standards; H9 | `issue 36 review: default UI keeps synthetic …`; `issue 8 S09`; `issue 8 R04` |
| R40-06 | The synthetic fixture sits under a collapsed "More data sources"; Disconnect / reset appears only after a source is chosen, and using it moves focus to "Connect to SAP sandbox" | H8 Aesthetic and minimalist design; H3 User control and freedom | `issue 36 review: default UI keeps synthetic …` |
| R40-07 | The intent help says "this record", never "this bill" | H2 | `issue 36 review: date wording follows the source, …` |
| Extra | After a receipt is saved, opening another document explains that only one receipt is kept and that Reset demo is needed | H1; H9 | `issue 36 review: date wording follows the source, …` |

**Round 3 (Francis's re-review of `ea72539`).** R40-03 and R40-05 were still partial.
Code-bearing head tested: `8d4bcd770055757d392e7d01b68a7edcfcc715a9`. Final `npm test` summary line on this head:
**`All 180 tests passed.`**; FAIL list empty. No visible main-flow screen changed, so the "after"
screenshots were not re-taken.

- R40-03 (test coverage): on the default UI with no harness, a failed detail read expands the
  collapsed connection panel and keyboard Retry read recovers, with focus on "Review cost
  evidence"; a key failure expands it, keyboard Correct key moves focus to the key field, and
  a keyboard reconnect collapses the panel again; the decision-screen "Technical evidence (for
  reviewers)" opens and closes by keyboard with focus kept on its summary. Tests: `issue 36
  review: a failed read expands …`, `issue 36 review: a key failure expands …`, and the added
  assertions in `issue 36: technical evidence is closed by default and opens by keyboard on
  each screen`.
- R40-05 (H2; H4 Consistency and standards; H9): service period, payment status and missing
  linked-row amounts display "Not available"; the stored snapshot and receipt keep their
  original values. A failed Reset of an unreadable saved receipt now says "Reset could not
  delete the unreadable saved receipt. It is still stored. Try Confirm reset again." Tests:
  `issue 36 review: cost evidence shows Not available …` and `issue 36 review: a failed Reset
  of an unreadable saved receipt …`.

**Why the legacy-expanded harness stays (R40-03).** Removing it would mean rewriting the setup
of 167 inherited tests just before submission, with a high risk of breaking assertions that
pass today. Instead, the paths the collapsed defaults can affect are covered on the real
default UI, with no harness: connection panel collapse and Change source by keyboard,
technical-evidence disclosures by keyboard, More data sources and Disconnect by keyboard, and
optional-items loading, failure and Retry read. The inherited tests keep checking behaviour;
the `issue 36` tests check the shipped defaults.

**Deviations below that no longer apply:** the unchanged list column headers and
"Contract / data failure" label (fixed by R40-05), the visible synthetic button (R40-06),
"P1-4 is not implemented" (R40-04), and Disconnect shown before connecting (R40-06). The other
deviations still apply.

**On PR #41 (`feat/36-usability-polish`):** R41-01 is fixed in `ba5a540`: the list summary now
says "Partial coverage: you can check the next page for more records." instead of promising
that more records exist. Both review rounds were merged in (`2e4d754`, `506b3f22ffd448e693507eef887220ed499ed652`). Final
`npm test` on this branch: **`All 177 tests passed.`**; FAIL list empty. The "after" screenshots were
re-taken on this branch.

## Deviations from #36

- Provenance labels, list column headers, the cost-table row labels and the
  "Contract / data failure" error label are unchanged, to avoid changing stored receipts and
  widely asserted strings.
- Technical evidence sections sit after the main controls of each panel or screen (not
  directly under headings), so keyboard order stays heading → main action.
- The synthetic fixture button stays visible as a text button instead of moving into a
  disclosure.
- Instead of a new "Review another document" button, the existing "Return to list" became
  the primary action after saving.
- Status messages stay in the connection area, which remains visible when collapsed.
- Pre-#36 browser tests run through a harness that opens all disclosures and keeps the
  connection form visible. New `issue 36` tests check the real collapsed defaults.
- P1-4 (loading and error messages next to the action) is not implemented. Status and error
  messages stay in the top status area, which remains visible on every screen when the
  connection panel is collapsed, and it is updated at each step.
- Disconnect / reset is still shown before a source is connected.
- The list summary on the last page ("Explicitly bounded fixture coverage exhausted…" /
  "Continuation exhausted…") keeps its existing wording, because existing tests assert it.
