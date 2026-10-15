# Issue #9: OpenCode development record

16 October 2026. Kevin (Xuan Zeng, GitHub `wanyan2333`)'s implementation of [#9](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/9), under [parent #4](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/4). This record is in English; earlier authors' records remain unchanged.

## Execution and history

This work was performed in OpenCode 2.0.29 on Windows by DeepSeek V4.1 Flash Free (`opencode/deepseek-v4.1-flash-free`, variant `max`), session `ses_ebfe76687ffexiQyVSjBa13zBx` ("查看项目并了解 issue9 内容"). Five subagent sessions on the same model assisted — an independent storage/privacy audit, a repository-conventions study, the test/accessibility implementation, multi-width screenshot capture and documentation drafting — while the coordinating session performed the review, verification and evidence assembly. No invented sessions, teammate approval or user-study results are claimed.

- Read current #9 (all eight checkboxes), its comments, parent #4 (AC02–AC24 matrix and amount/state rules), the #5–#8 development records and acceptance crosswalks, the
  frozen #5 mapping and OpenAPI, the existing application (`app/app.mjs`, `app/index.html`, `app/styles.css`, `app/server.js`, `app/lib/httpHandler.js`) and the inherited
  browser suite. No applicable `AGENTS.md` was present.
- Created `feat/9-three-screen-integration` from the merged #8 review head **`7a368f529b60edae730afe2b8b1a0f9513d65e5e`** (PR #24 merge, 16 October 2026). That base is
  the dependency this slice was authorised to build on; no other branch or worktree was modified and no history was rewritten.
- The #9 work is committed on that base as the fix `3c48fe8`, test `5f1d12f`, F3 redaction `7fe272f` (reverted by `25ba1ed` during PR review), evidence `ce6a81c`, development record `b322c72` and line-count correction `1eb70e5` commits, plus the second-review commits — encoding fix `d9d7a3e`, test `973acac` (new code-bearing head) and the documentation commit that carries this record:
  modified `app/app.mjs`, `app/index.html`, `app/styles.css`, `app/tests/browser.mjs`, new `app/tests/issue-9.mjs`, and 29 `docs/validation/issue-9-*.png` captures.
  The branch is published as PR #26 (after PR #25 was closed) and awaits team approval.
- Depended on, without refactoring: #7's receipt v2 lifecycle (single `planReviewSnapshot.receipt` key, exact validated schema, write-plus-read-back verification, historical
  provenance) and #8's connection/navigation recovery (generation-bound reads, explicit Retry read, bounded continuation, validated destinations).

## Decisions and implementation

1. **The parent's state rules are the integration contract.** A new selection, refresh or source change invalidates the pending snapshot and unconfirmed decision; Back
   preserves only same-evidence context; superseded or delayed responses can never restore an older selection, credential state, rows, provenance or a pending decision;
   confirmed receipts stay historical and their stored bytes are never rewritten by new data. Exactly three screens exist; no fourth comparison screen, Care portal or
   recommendation engine is added.
2. **One public-boundary regression module.** `app/tests/issue-9.mjs` (855 lines, 20 groups) is registered by `app/tests/browser.mjs` and drives the real loopback
   handler/adapter with injected local transport, sentinel keys and deterministic gates; assertions read DOM/UI state and no internal-helper contracts were introduced.
   Injected servers use `TEST_PORT + 500` to avoid inherited offsets and Chromium's blocked-port list.
   - **K01–K05** keyboard: full Tab/arrow/Enter/Space journey to a receipt and through reset; live/detail failures with focused recovery; write-failure Retry preserving
     the choice; labels, live regions, visible focus; per-screen focus-stop coverage with no trap (10 stops on the list screen, 8 on cost, 8 on decision).
   - **S01–S08** stale/superseded responses: newer source, newer key, Disconnect, newer page selection, newer item selection, fixture-to-synthetic, an open
     historical receipt and a confirmed Reset — none can restore old rows, evidence, decisions, keys, provenance or receipt bytes.
   - **N01–N02** navigation: Back keeps only same-evidence context; new page, Reload detail, source change and page reload clear the pending snapshot and unconfirmed
     choice; reload recovers only the stored receipt.
   - **F01–F02** failure during navigation: a failed Next page keeps no old rows, focuses recovery, retries the same `$skip` and completes to a receipt; an open
     historical receipt survives the failure.
   - **T01–T03** integrity: exactly three screens with one uninterrupted flow; only the minimal receipt with provenance is persisted; the bounded synthetic journey stays
     consistent.
3. **Three real keyboard defects found by the new journey, fixed minimally.** (1) `app/app.mjs`: the missing-key error path now focuses the key input. (2) `app/app.mjs`:
   connecting loads reuse the outcome-focus pattern (`loadPage(operation, true)`), so focus is not dropped to `<body>` when a source button disables itself. (3)
   `app/index.html` + `app/styles.css`: the records scroll region gained `role="region" aria-label="Loaded billing records table"` and a `.table-wrap:focus-visible` 3px
   outline, matching the amounts region. No other application behaviour changed.
4. **AC23 storage/privacy audit (read-only).** Exactly one storage write exists in shipped code — the minimal receipt with whitelisted fields; keys travel only in request
   headers, never URLs; fixtures are synthetic; default test runs write no files; explicit capture writes synthetic screenshots. Findings: **F1** development scratch probes were deleted before final (confirmed
   absent); **F2** `tools/sap_api_probe_result.json` (gitignored, 61 KB) contains live-sandbox sample data — packaging must use `git archive`, never a folder copy; **F3**
   earlier evidence files contained local machine paths — first redacted with placeholders, then reverted during PR review because paths are neither credentials
   nor raw API responses (see the PR review follow-up below).

## Verification and defects found

- Independently ran the untouched inherited suite before editing: **125/125 PASS** at the branch base, matching the merged #8 review head.
- First-pass focused run with the new module: `TEST_FILTER='issue 9'` → **20/20 PASS** (19 new groups plus the runner's always-included first test). No inherited assertion was weakened.
- **First-pass unfiltered integrated result: 144/144 PASS**, exit 0 (125 inherited + 19 Issue #9 groups). The screenshot-capture run (`CAPTURE_ISSUE9_SCREENSHOTS=1`) also passed
  144/144 and refreshed the 29 `issue-9-*.png` files: the keyboard journey at 1280/1366/390px, the stale-source, navigation-failure, historical-receipt and
  three-screen-flow states at 1366/390px, and the remaining recovery/stale states at 1366px. Detailed output: [browser test results](../validation/issue-9-browser-test-results.txt).
- The three defects above were found during the keyboard journey and fixed before the final run; K01 asserts the load-focus fix directly and K05 the named regions and 3px
  outline. The missing-key focus fix is now asserted at the start of K02 (added during rework); the retained inherited missing-key error scenario still covers the message itself.
- Visually inspected representative keyboard, recovery, stale-clearing and historical-receipt states: visible focus rings, labelled controls, no page-level overflow,
  contained mobile table scrolling with its explicit caption.
- No live SAP request occurred: all runs used fixtures, the synthetic profile and injected loopback transport with sentinel keys. AC25 live workflow remains #10.

## Independent review and rework

- 16 October 2026: Kevin deliberately kept the implementation uncommitted so the complete working tree could be reviewed first; commits were made only after the review below.
- Claude Code (Claude Opus 5.5) performed an independent review on 2026-10-16 and re-ran the complete suite: 144/144 PASS; the implementation and test quality were accepted and no functional rework was requested.
- The review raised five points, all addressed in this rework: the wrong attribution on this record; missing tool/model/session information; no automated coverage for the missing-key focus fix; mixed encoding (BOM/CRLF) in the results file; and out-of-scope edits to #7/#8 evidence files (the F3 redactions, now isolated in their own commit).
- Rework changes: attribution corrected to Kevin (Xuan Zeng, `wanyan2333`); tool/model/session details added above; a missing-key focus assertion added at the start of K02 (no new group — the total stays 144); the results file normalised to UTF-8 without BOM and LF line endings; the F3 redactions split into a dedicated commit; and the acceptance record updated for the Reset/Disconnect shared `resetSession()` path and the new K02 assertion.
- The complete suite was re-run on the code-bearing head `5f1d12f` with screenshot capture: **144/144 PASS, exit 0**; the raw output is appended to [browser test results](../validation/issue-9-browser-test-results.txt) as the rework section.

## Second review rework (16 October 2026)

- Claude Code (Claude Opus 5.5) performed the second independent review on 2026-10-16 and re-ran the complete suite on `1eb70e5`: 144/144 PASS; the first rework was accepted and the remaining points were fixed in this round.
- The results file's console-encoding artifacts were restored: three T01 test-name arrows and nine multiplication signs had been decoded through a GBK console code page during capture. Captures now pipe the raw UTF-8 bytes through Node straight into the log file, so no console code page is involved.
- K05 was strengthened from a 45-Tab smoke check to per-screen verification: the expected focus stops are computed from the rendered page (10 on the list screen, 8 on cost, 8 on decision — one stop per radio group, hidden screens and hidden controls excluded), every expected stop must be reached within one full cycle plus a wrap, no stop may repeat consecutively, and Shift+Tab must return to the previous stop. The no-repeat check is scoped to consecutive in-set steps because Chromium moves focus to `<body>` when Tab passes the last stop.
- S08 was added: a gated live list released after `Reset demo` → `Confirm reset` cannot restore rows, provenance, the key or storage; focus stays on `use-fixture` and the list shows `No records loaded`.
- The complete suite was re-run on the new code-bearing head `973acac` with screenshot capture: **145/145 PASS, exit 0** (125 inherited + 20 Issue #9 groups); the focused run passed **21/21**. Both raw outputs are appended to [browser test results](../validation/issue-9-browser-test-results.txt) as the second-review section. The capture run re-generated all 29 screenshots; the 17 that changed byte-wise were re-committed.

## PR review follow-up (16 October 2026)

- After the second review the branch was pushed and opened as PR #25. The second review also ran a mutation check in a throwaway worktree: removing the list
  or detail stale-response guards in full, disabling Disconnect/Reset invalidation, keeping an unconfirmed intent across a new selection, or reverting any of the
  three keyboard fixes is caught by the issue 9 groups (S01/S08, S04, S03/S08, N01, K01/K02/K05). Removing a single guard layer alone is masked by the redundant
  guards, which is by design. No repository file was changed by that check.
- At Kevin's request, Claude Code (Claude Opus 5.5) reverted the F3 redaction with a normal revert commit `25ba1ed` (no history rewritten). Local checkout
  paths are neither credentials nor raw API responses, so they fall outside the AC23 boundary, and the #7/#8 authors' evidence is restored exactly as they
  recorded it. This record and the acceptance document were updated to match. No application or test code changed, so the 145/145 result at `973acac` still applies.
- The two PR follow-up commits were re-committed once with corrected commit messages (file content unchanged) and force-pushed with lease before any team review.
- PR #25 was then closed and the same branch was reopened as PR #26. The only later commits, made by Claude Code at Kevin's request, update these two records for the
  new PR number; no application or test code changed.

## Scope and handoff

The branch is published as PR #26 and awaits team approval; no issue or assignee state was changed, and no automatic merge is implied. This slice claims AC17/AC23/AC24
integration evidence and the AC02–AC24 combined crosswalk only. #10 live SAP workflow, #11 comparison work and course-submission packaging (including the F2 `git archive`
requirement) remain open. Earlier #5–#8 evidence is preserved unchanged; the F3 redaction was reverted.

See [Issue #9 acceptance](../validation/issue-9-acceptance.md) and `issue-9-*.png`. Runtime: Windows, Node v24.14.1, Playwright 1.62.1 (declared devDependency); the harness
reported Chromium/Chrome 151.0.7922.34 (bundled headless Chromium; installed Google Chrome 155.0.8059.40 is used only when `CHROME_EXECUTABLE_PATH` is set). No local SAP
credential files were read and no authenticated SAP requests were made.

## OpenCode review repair — 16 October 2026

OpenCode session ses_ebe3f1f68ffe5MMlpojcPT6Fsi (A3 PR26 review repairs)
applied the reviewed repair: both direct read actions use guarded outcome focus;
K06 covers six public keyboard/read cases; T03 uses the shared exact receipt
field whitelist; reproduction commands and screenshot-write wording are corrected.
OpenCode syntax checks passed for app/app.mjs and app/tests/issue-9.mjs.
The independent acceptance results are recorded in the validation document,
separate from this OpenCode development record. Earlier history remains intact.
