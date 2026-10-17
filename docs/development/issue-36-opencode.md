# Issue #36: OpenCode development record

17 October 2026. OpenCode implementation of [#36](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/36)
("Simplify Billing Review Lite screen hierarchy for usability"), on branch
`feat/36-usability-hierarchy` cut from `origin/main` `28aee9d`.

- **Tool:** OpenCode.
- **Model:** `opencode` / `deepseek-v4.1-flash-free` (DeepSeek V4.1 Flash Free), used for the
  whole task.
- **Session:** one continuous OpenCode session covered Parts 0–5 on this single branch. No
  other project or branch was driven by this session for #36.
- No credentials, keys or tokens are recorded here. Independent review/acceptance evidence is
  kept separately in [issue-36-acceptance.md](../validation/issue-36-acceptance.md), and the
  before/after captures are in `docs/validation/issue-36-*-*.png`.

## Prompts used (Parts 0–5)

The user issued five sequential work orders, each a self-contained part of the same task,
plus this final packaging part. In summary:

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

Final summary line on the code-bearing head: **`All 172 tests passed.`** No inherited test
assertion was weakened; the only test-line edits were the exact expected-UI-string
replacements listed below.

## Test-line edits (old → new)

- `app/tests/browser.mjs` (three call sites): button role name `'Use fixture demonstration'`
  → `'Try with demo data'`.
- `app/tests/issue-27.mjs`: regex `/^Unsaved — storage write or read-back verification failed/`
  → `/^Unsaved — we could not confirm your receipt was saved/`.

## New `issue 36` tests (added in Part 4)

All five use `rawNewContext` so the UI runs in its real default state (collapsed connection
panel, closed disclosures). They passed in the final run:

- `issue 36: connection panel collapses after choosing a source and Change source reopens it by keyboard`
- `issue 36: technical evidence is closed by default and opens by keyboard on each screen`
- `issue 36: cost amount card shows exact reported amounts without formatting`
- `issue 36: saved confirmation names the intent, document and gross amount`
- `issue 36: no horizontal page scroll on all three screens at 390px and 1280px`

## Verification

- Every part re-ran `cd app && npm test`; the FAIL list matched the Part 0 baseline
  throughout.
- Part 0 installed the Playwright Chromium browser with `npx playwright install chromium`
  because it was initially missing.
- The five new tests were additionally checked by hand in a real browser at 1280px and
  390px (collapse/reopen, keyboard disclosure open, exact amount strings, saved
  confirmation, no page-level horizontal scroll).
- Part 5 captured the before/after screenshots from a throwaway script outside the
  repository: "before" from a temporary `origin/main` worktree on port 6290 (removed
  afterwards), "after" from this branch on port 6291. No `app/` file was changed in Part 5.
- No live SAP request occurred at any point: all runs used the labelled fixtures and the
  loopback server with no key. The SAP key field stayed empty.

Runtime: macOS, Node.js, Playwright 1.62.1 (declared devDependency) with bundled headless
Chromium; the app served on the loopback interface only.
