# Issue #36 acceptance: Billing Review Lite screen hierarchy

17 October 2026. Branch `feat/36-usability-hierarchy`. Code-bearing head tested:
`d51c9c6e187dfde4d9f7ea63e93ba75e7118da13` (`feat(#36): plain labels, button hierarchy,
wide layout, error copy and #36 tests`). Screenshots were captured on this head ("after")
and on `origin/main` `28aee9d` ("before").

This is a fixture-based browser check. It is not a live SAP run and not a user test. No SAP
key was used, no upstream request was made, and no participant was involved.

## Change → heuristic → evidence

| Change | Heuristic (Nielsen H1–H10) | Before screenshot | After screenshot | Covering test |
|---|---|---|---|---|
| Step indicator and per-screen lead text | H1 Visibility of system status; H4 Consistency and standards | [issue-36-before-01-start.png](issue-36-before-01-start.png) | [issue-36-after-01-start.png](issue-36-after-01-start.png) | `issue 36: no horizontal page scroll on all three screens at 390px and 1280px` (walks all three screens); the retained headings/titles are still asserted by the inherited tests |
| Collapsible connection panel with "Change source" | H8 Aesthetic and minimalist design; H3 User control and freedom | [issue-36-before-02-list-detail.png](issue-36-before-02-list-detail.png) | [issue-36-after-02-list-detail.png](issue-36-after-02-list-detail.png) | `issue 36: connection panel collapses after choosing a source and Change source reopens it by keyboard` |
| Technical evidence disclosures | H8 Aesthetic and minimalist design; H2 Match between system and the real world | [issue-36-before-03-cost.png](issue-36-before-03-cost.png) | [issue-36-after-03-cost.png](issue-36-after-03-cost.png) | `issue 36: technical evidence is closed by default and opens by keyboard on each screen` |
| Cost amount card and "What this does not tell you" | H8; H6 Recognition rather than recall; H2 | [issue-36-before-03-cost.png](issue-36-before-03-cost.png) | [issue-36-after-03-cost.png](issue-36-after-03-cost.png) | `issue 36: cost amount card shows exact reported amounts without formatting` |
| Decision summary card and intent descriptions | H6; H2; H5 Error prevention (the restriction is shown next to the options) | [issue-36-before-04-decision.png](issue-36-before-04-decision.png) | [issue-36-after-04-decision.png](issue-36-after-04-decision.png) | `issue 36: saved confirmation names the intent, document and gross amount`; the inherited `issue 9 K05` intent-label check is retained |
| Saved confirmation | H1 Visibility of system status | [issue-36-before-05-saved.png](issue-36-before-05-saved.png) | [issue-36-after-05-saved.png](issue-36-after-05-saved.png) | `issue 36: saved confirmation names the intent, document and gross amount` |
| Plain labels, button hierarchy, plain error copy | H2; H8; H9 Help users recognise, diagnose and recover from errors | [issue-36-before-02-list-detail.png](issue-36-before-02-list-detail.png) | [issue-36-after-02-list-detail.png](issue-36-after-02-list-detail.png) | Updated `'Try with demo data'` button-role lookups across the suite; the `issue 27` unsaved-receipt regex `/^Unsaved — we could not confirm your receipt was saved/` |
| Side-by-side list and detail on wide screens | H8; H6 Recognition rather than recall | [issue-36-before-02-list-detail.png](issue-36-before-02-list-detail.png) | [issue-36-after-02-list-detail.png](issue-36-after-02-list-detail.png) | `issue 36: no horizontal page scroll on all three screens at 390px and 1280px` |

## Test result

- Final `npm test` summary line: **`All 172 tests passed.`** (167 pre-#36 tests + 5 new
  `issue 36` tests), run on `d51c9c6`.
- Pre-existing failures carried from the Part 0 baseline at `origin/main` `28aee9d`:
  **none** (the baseline FAIL list was empty).

## Limits

This is a fixture-based browser check of the shipped `app/` UI at 1280×900 and 390×844. It
is not a live SAP run and not a user study; no usability participants were involved and no
task-success or satisfaction numbers are claimed. The heuristic column is an analytic
mapping, not a measured outcome. Live SAP sandbox verification and repackaging happen after
merge.

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
