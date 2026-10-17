# Issue #36: OpenCode development record

17 October 2026. OpenCode implementation of [#36](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/36)
("Simplify Billing Review Lite screen hierarchy for usability"), on branch
`feat/36-usability-hierarchy` cut from `origin/main` `28aee9d`.

- **Tool:** OpenCode.
- **Model:** `opencode` / `deepseek-v4.1-flash-free` (DeepSeek V4.1 Flash Free), used for the
  whole task.
- **Session:** one continuous OpenCode session covered Parts 0–7: branch
  `feat/36-usability-hierarchy` (Parts 0–6) and this follow-up branch
  `feat/36-usability-polish` (Part 7). No other project was driven by this session for #36.
- No credentials, keys or tokens are recorded here. Independent review/acceptance evidence is
  kept separately in [issue-36-acceptance.md](../validation/issue-36-acceptance.md), and the
  before/after captures are in `docs/validation/issue-36-*-*.png`.

## Prompts used (Parts 0–7)

The user issued seven sequential work orders, each a self-contained part of the same task.
In summary:

1. **Part 0 — setup and baseline.** Create `feat/36-usability-hierarchy` from `origin/main`;
   read Issue #36 for background only; record the baseline `npm test` result; add a
   legacy-expanded test harness that opens all `<details>` and keeps the connection form
   visible for the pre-#36 tests; commit and stop.
2. **Part 1 — status and control.** Add a step indicator after the title header, per-screen
   lead text, and a collapsible connection panel with a "Change source" button.
3. **Part 2 — disclosures and amount card.** Move technical evidence into "for reviewers"
   `<details>` sections (list hint, B0 evidence, detail diagnostics, cost tables/limits),
   add the Screen 1 detail summary layout and the Screen 2 amount card with a
   "What this does not tell you" box.
4. **Part 3 — decision screen.** Add the short intention line, the decision summary card,
   four intent cards with descriptions outside the labels, the saved confirmation, and the
   button hierarchy/order changes on the decision screen.
5. **Part 4 — labels, layout, copy and tests.** Simplify source-button labels, mark ghost
   buttons, add the wide-screen side-by-side layout, simplify three error strings, update
   the affected test expectations, and add five new `issue 36` tests.
6. **Part 5 — packaging.** Capture before/after screenshots, write this record and the
   acceptance record, commit, push and open the pull request.
7. **Part 6 — review fixes.** Make the sample-data wording true in every data mode; keep
   the top status line current when the decision step opens, when going back to cost
   evidence, and after a verified save; add one test for the step indicator, the lead text
   and those status lines; re-take the "after" screenshots; and refresh both records.
8. **Part 7 — usability polish (follow-up PR).** Make the step names match the screen
   headings; name the "Fixture demonstration" label on the demo button; show the product
   name "Billing Review Lite" in the eyebrow; make Next page a secondary button; move one
   audit sentence into the cost technical section; add a Net/Tax/Gross explanation; use
   plain words in two status texts; add one test; re-take the "after" screenshots. Work is
   on branch `feat/36-usability-polish`.

Only the files named in each part were touched. `app/lib/`, `app/server.js`, `app/package.json`
and `app/package-lock.json` were never modified, no package was installed, and no new file
was added under `app/`.

## Files changed per part and run/test evidence

| Part | Commit | Files changed | `npm test` |
|---|---|---|---|
| 0 | `14c96bcc55262a3bf8a3f2c8662910b35e08f6d7` | `app/tests/browser.mjs` (legacy-expanded harness via `rawNewContext`), `app/tests/issue-9.mjs` (add `summary` to the K05 focus-stop selector) | 167/167 pass; baseline FAIL list empty |
| 1 | `134702a89314a3e61e4474485c98c78351e676d6` | `app/index.html`, `app/styles.css`, `app/app.mjs` | 167/167 pass; FAIL list unchanged |
| 2 | `73bd8f3ff55904dce171d40de12b76204dda6224` | `app/index.html`, `app/styles.css`, `app/app.mjs` | 167/167 pass; FAIL list unchanged |
| 3 | `c5074309cd1244049ab4198f8b1043dc65faedd7` | `app/index.html`, `app/styles.css`, `app/app.mjs` | 167/167 pass; FAIL list unchanged |
| 4 | `d51c9c6e187dfde4d9f7ea63e93ba75e7118da13` | `app/index.html`, `app/styles.css`, `app/app.mjs`, `app/tests/browser.mjs`, `app/tests/issue-27.mjs`, `app/README.md`, `README-SOURCE.md` | 172/172 pass (167 + 5 new); FAIL list unchanged |
| 5 | (this record's commit) | `docs/validation/issue-36-*.png`, `docs/validation/issue-36-acceptance.md`, `docs/development/issue-36-opencode.md` | 172/172 pass on the unchanged code head |
| 6 | `d71cb9896d092e68f196a842319052a374f5ac3e` | `app/index.html`, `app/app.mjs`, `app/tests/browser.mjs`, `docs/validation/issue-36-after-*.png`, `docs/validation/issue-36-acceptance.md`, `docs/development/issue-36-opencode.md` | 173/173 pass; FAIL list empty |
| 7 | `3cb9de943fa9c428539f718d15e7cfbdaacb3268` | `app/index.html`, `app/app.mjs`, `app/tests/browser.mjs`, `app/tests/issue-9.mjs`, `README-SOURCE.md`, `app/README.md`, `docs/validation/issue-36-after-*.png`, `docs/validation/issue-36-acceptance.md`, `docs/development/issue-36-opencode.md` | 174/174 pass; FAIL list empty |

Final summary line on the code-bearing head: **`All 174 tests passed.`** No inherited test
assertion was weakened; the only test-line edits were the exact expected-UI-string
replacements listed below.

## Test-line edits (old → new)

- `app/tests/browser.mjs` (three call sites): button role name `'Use fixture demonstration'`
  → `'Try with demo data'`.
- `app/tests/issue-27.mjs`: regex `/^Unsaved — storage write or read-back verification failed/`
  → `/^Unsaved — we could not confirm your receipt was saved/`.
- `app/tests/issue-9.mjs`: `#receipt-status` regex `/read-back verified/` →
  `/stored and checked/` (plain wording).
- `app/tests/browser.mjs` (in `issue 36: step indicator, lead text and status follow the
  current screen`): step-indicator regex `/Understand the cost/` → `/Review cost evidence/`.
- `app/tests/browser.mjs` (same test): step-indicator regex `/Record your decision/` →
  `/Decide and save a receipt/`.

## New `issue 36` tests (added in Parts 4, 6 and 7)

All seven use `rawNewContext` so the UI runs in its real default state (collapsed connection
panel, closed disclosures). They passed in the final run:

- `issue 36: connection panel collapses after choosing a source and Change source reopens it by keyboard`
- `issue 36: technical evidence is closed by default and opens by keyboard on each screen`
- `issue 36: cost amount card shows exact reported amounts without formatting`
- `issue 36: saved confirmation names the intent, document and gross amount`
- `issue 36: no horizontal page scroll on all three screens at 390px and 1280px`
- `issue 36: step indicator, lead text and status follow the current screen`
- `issue 36: names stay consistent and the amount card explains Net, Tax and Gross`

## Verification

- Every part re-ran `cd app && npm test`; the FAIL list matched the Part 0 baseline
  throughout.
- Part 0 installed the Playwright Chromium browser with `npx playwright install chromium`
  because it was initially missing.
- Part 5 captured the before/after screenshots from a throwaway script outside the
  repository: "before" from a temporary `origin/main` worktree on port 6290 (removed
  afterwards), "after" from this branch on port 6291. No `app/` file was changed in Part 5.
- No live SAP request occurred at any point: all runs used the labelled fixtures and the
  loopback server with no key. The SAP key field stayed empty.

Runtime: macOS, Node.js, Playwright 1.62.1 (declared devDependency) with bundled headless
Chromium; the app served on the loopback interface only.

## Review fixes (Francis's review of 17 Oct 2026)

Francis reviewed PR #40 at `bed8d6b` with seven findings (R40-01 to R40-07) and PR #41 at
`37e2983` with one more (R41-01). The same OpenCode session applied them in two rounds of
work orders.

1. **Round 1.** R40-01: the date explanation follows the data source. R40-02: the specific
   reason is shown next to the restricted intent options. R40-07: the intent help says
   "this record", not "this bill". Extra: after a receipt is saved, opening another document
   explains that only one receipt is kept and that Reset demo is needed. One new test and one
   added assertion. Commit `8de3a3b` on `feat/36-usability-hierarchy`:
   `All 174 tests passed.`
2. **Round 2.** R40-06: the synthetic fixture sits under a collapsed "More data sources", and
   Disconnect / reset appears only after a source is chosen. R40-05: list columns Type /
   Document / Date / Amount / Currency, one missing-value wording ("Not available"), and plain
   read-error wording. R40-04: optional-items status next to "Check optional items". R40-03:
   two new tests run the default UI with no harness. Commit `da05a54655bd301ff50e64c4c37020930e4c9694`: `All 176 tests passed.`

Test-line edits in round 2 (old → new):

- `app/tests/browser.mjs`: `#cost-fields` text `'Unknown / Not available'` → `'Not available'`
  (two places).
- `app/tests/browser.mjs`: `issue6RegressionAmount(p, 'Total tax amount', 'Not reported')` →
  `'Not available'`.
- `app/tests/browser.mjs` (round-1 test): opens "More data sources" before clicking the
  synthetic button.
- `app/tests/issue-8.mjs`: `/Contract \/ data failure.*exceeded the read limit/` →
  `/Data check failed.*exceeded the read limit/`, and `/Contract \/ data failure/` →
  `/Data check failed/`.
- `app/tests/issue-9.mjs` (K05): the Tab sequence after `#use-fixture` is now Disconnect →
  "More data sources" → synthetic button → records table (was synthetic button → Disconnect
  → records table).

Added assertions: `'Reason: '` (round 1), then the specific reason (`different currency` /
`net + tax = gross`) in the restricted-options test, and no `contract|continuation|provenance`
in the issue 8 R04 recovery message (round 2).

New tests:

- `issue 36 review: date wording follows the source, intent help says record, and a second document explains the one-receipt limit` (round 1)
- `issue 36 review: default UI keeps synthetic under More data sources, labels list columns plainly and shows Disconnect only after a source is chosen` (round 2)
- `issue 36 review: Check optional items shows pending, failure and recovery next to the button on the default UI` (round 2)

The after screenshots were re-taken on `da05a54655bd301ff50e64c4c37020930e4c9694`. The legacy-expanded harness for the
pre-#36 tests is kept; the acceptance record explains why.
