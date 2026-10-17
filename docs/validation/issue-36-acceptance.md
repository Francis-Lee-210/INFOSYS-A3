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
