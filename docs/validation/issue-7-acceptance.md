# Issue #7 acceptance evidence

**Review follow-up:** see [PR #21 review validation](#pr-21-review-validation--15-october-2026) below for the new receipt-v2 run. The original evidence and screenshots below are retained as history, not replaced or reinterpreted.

## Original implementation validation (receipt v1)

15 October 2026. Branch `issue-7-intent-receipt`, based on `main` at `e3c18a5` (after #20 merged).
All results below use fixture and synthetic sources plus injected HTTP/Storage behaviour. No live SAP call was made and
no new live acceptance is claimed; AC25 (live workflow) remains with #10.

Full test output: [issue-7-browser-test-results.txt](issue-7-browser-test-results.txt) — **53/53 PASS**
(34 existing #5/#6 regressions unchanged + 19 new #7 tests).

## Acceptance matrix

| AC | Requirement | Evidence (browser tests, prefix `issue 7:`) | Result |
|---|---|---|---|
| AC02 | Happy path: connect → select → explanation → intent → confirm → persisted receipt for exactly that record | `Keep confirms the reviewed evidence with a minimal read-back-verified receipt` (and the other three intents) | PASS |
| AC15 | All four intents can be confirmed; receipt records the exact choice and intention-only meaning | `Keep` / `Review options` / `Help` / `Later confirms the reviewed evidence …` | PASS |
| AC16 | Material inconsistency limits confirmation to Help/Later and the reason is kept in the receipt | `synthetic relation permits only Help or Later …`, `linked currency permits only Help or Later …` | PASS |
| AC17 (part) | New selection / detail refresh / source change clears an unconfirmed choice | `source, detail refresh and selection changes invalidate unconfirmed intent` | PASS |
| AC18 | Saved only after write + valid read-back; refresh reopens the same receipt and provenance with no API call | `refresh reopens original live, fixture and synthetic historical receipts with zero API requests` | PASS |
| AC19 | Injected write / read-back failure stays unsaved, keeps the intent, Retry produces one valid receipt | `write failure stays unsaved …`, `read-back failure stays unsaved …` | PASS |
| AC20 | Repeated confirm/retry gives one receipt identity and one outcome | `duplicate confirmation records one receipt identity and one storage outcome` | PASS |
| AC21 | Corrupt / unsupported-version / missing or unknown provenance → recovery path, no invented history | `corrupt JSON …`, `unsupported version …`, `missing provenance …`, `unknown provenance shows recovery …` | PASS |
| AC22 | Cancel reset keeps the receipt; confirmed reset deletes it, clears key/review and returns to Screen 1 | `cancel reset keeps the receipt; confirmed reset clears receipt, review and API key` | PASS |
| AC23 (part) | Only the minimal receipt is stored; no API key or raw response | Receipt shape is validated with an exact field list on write and read-back; happy-path tests assert the stored fields | PASS |

Additional checks:
- A confirmed receipt is not rewritten by later API results or Disconnect (`disconnect and new API results preserve the confirmed historical receipt`).
- Reviewing a different document while a receipt exists explains that the new document has NOT been recorded and leaves the stored bytes unchanged.
- Screen 3 at 1366px and 390px: no page-level horizontal overflow, heading receives focus on entry.

## Stored receipt (one `localStorage` key: `planReviewSnapshot.receipt`, version `issue-7-receipt-v1`)

Receipt/review identity, version, document kind/key, provenance, source profile, source API and version, retrieval time,
date value and meaning, net/tax/gross text with basis and currency, payer/account availability booleans, assessment status,
material-inconsistency flag and reasons (only when material), missing-evidence flags, chosen intent, confirmation time (ISO 8601, UTC).
Not stored: API key, raw responses, names or contacts.

## Screenshots (saved receipt reopened after page refresh, fixture source)

- Desktop 1366px: [issue-7-desktop.png](issue-7-desktop.png)
- Mobile 390px: [issue-7-mobile.png](issue-7-mobile.png)

## Other checks

- `node --check` on all JS/MJS files and `git diff --check`: pass.
- `resources/` and the #5/#6 validation files are unchanged.

## PR #21 review validation — 15 October 2026

**Integration status:** PR #21 was merged concurrently by `wanyan2333` at **2026-10-15 09:04:24 UTC**, using old head `498e15d2fcfd22e26f50c99d3d864258c63da599` (merge `643755eeb30dacb3b548580948ee6a96d7ee8af3`). This agent did not merge it. The fixes were pushed to the existing shared branch (`3a9c2a2`, `dd11be7`, followed by a documentation-only status note), but are **not in that frozen PR diff or main**. The PR title/body were updated and explicitly distinguish tested branch behaviour from the already-merged snapshot. No replacement PR was created. Integration of the follow-up requires maintainer direction.

**Final unfiltered browser result: 71/71 PASS** (all original 53 scenarios retained, plus 18 review regressions). All application/test JS/MJS syntax checks and `git diff --check` pass. The new run is appended to [issue-7-browser-test-results.txt](issue-7-browser-test-results.txt); earlier output is preserved.

Reviewed and fetched head: `498e15d2fcfd22e26f50c99d3d864258c63da599` (unchanged from the review).
Implementation/test fix commit: `3a9c2a2` (the application/test content exercised by the final run).
Work continued on `issue-7-intent-receipt` in an isolated worktree; Rae's original commits and the other worktrees were preserved.
Current #7 and parent #4 requirements were read from GitHub. No applicable `AGENTS.md` was found.

### Reproduction before implementation changes

The original 53 scenarios passed again. Controlled browser observations on the reviewed implementation reproduced:

- Fixture receipt open during a gated injected live-mode list success: badge became `Live SAP sandbox`; gated failure changed it to `Not connected` while the fixture receipt stayed visible. The successful gate initially used an incorrect expected loaded count (three instead of two); after correcting that test setup, the targeted test failed specifically on the badge mismatch.
- Correctly linked, valid rows with partial coverage and a continuation: the cost snapshot had `status: partial`, `complete: false`, `hasContinuation: true`, `incompleteRows: false`. After saving/reloading, coverage and assessment scope were missing from the receipt; non-material reasons were empty.
- Removal succeeded, verification threw: storage was actually `null`, but the UI said the receipt/session were kept.
- Enter confirmation: `document.activeElement.tagName` was `BODY` after success.
- At 1280px with Reopen visible, the key input/hint were 103.48px wide and the hint was 207.28px tall.

### Resulting behaviour and regression coverage

| Finding / contract | Fix and deterministic browser evidence |
|---|---|
| Historical provenance (AC03/18) | The global badge follows the active historical receipt, while connection mode remains separate. Delayed success **and** failure tests assert receipt identity, visible fixture provenance, unchanged stored bytes and unchanged input focus; Return to list shows the actual live/failed connection state. Live-mode requests are fulfilled locally with a sentinel key, not sent to SAP. |
| Coverage and scope (AC06/09/16/18/23, receipt portion only) | Confirmation and reopened receipts show coverage independently of row validity, continuation and assessment scope. Six coverage scenarios run on both request and synthetic profiles: partial with continuation, unavailable, not checked, absent, explicitly complete, and missing metadata/unknown. Request coverage never becomes complete. Synthetic header checks never imply item reconciliation. Invalid/missing/contradictory receipt metadata is rejected. No item rows, notes or raw response are persisted. |
| Honest reset (AC22) | Removal failure is separate from failed verification. A still-stored receipt is claimed only after matching read-back; uncertainty discards the cached Saved display and unconfirmed review, blocks confirmation and retains a retry/reset path. No rollback is attempted. Separate tests cover remove failure, successful deletion plus verification failure, retry after each, non-destructive cancellation, and normal reset/reload with an injected connected session. Verified success clears key/review and returns to Screen 1. |
| Explicit confirmation focus (AC24, focused portion) | Keyboard-only Tab/Space/Enter journey confirms, focuses the visible saved heading, then tabs to Return to list and Reset. Background source completions do not move focus. Existing entry/Back/cancel/recovery/reset tests remain covered. |
| Connection layout | A bounded input column and shrinkable/wrapping controls replace the intrinsic-width squeeze. Tests measure the actual input/hint, check all visible connection buttons fit and assert no page overflow, with Reopen visible at 1280/1366/390px. |

### Receipt-version and data-minimisation decision

New writes use **`issue-7-receipt-v2`**, keeping the same single storage key. Added exact-schema fields:

- `coverage`: `status` (`not-checked`, `unavailable`, `absent`, `partial`, `complete`, `unknown`), boolean `complete`, and boolean-or-null `hasContinuation` (null means unknown).
- `assessmentScope`: validated source-specific scope and `linkedMonetaryReconciliation: not-assessed`.

Complete means **explicitly bounded synthetic coverage only**, requires an explicit false continuation and no relevant row/source/currency defect, and is never a SAP-history claim. Missing normalized metadata is unknown, not complete. Explanatory assessment text is reconstructed from validated source/scope metadata; material reasons remain retained as before. There are still no full item arrays, free-form item notes, keys, raw responses, names or contacts in storage.

**Older v1 receipts are unsupported, not migrated.** Their missing limitations cannot safely be reconstructed. They enter the existing recovery screen, remain byte-for-byte in storage and are not deleted automatically. Cancel/Return to list are non-destructive; only deliberate confirmed Reset deletes them. The v1 recovery regression checks preservation of the original bytes.

### Runtime, command and visual inspection

macOS; Node **v24.20.0**; Playwright **1.62.1**; installed Google Chrome **155.0.8059.40**, headless through Playwright's Chromium driver. Dependencies were installed outside the worktree; no dependency/lockfile changes were needed.

```sh
# From app/, after installing the declared Playwright dev dependency (or supplying its external module directory):
CHROME_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  CAPTURE_RECEIPT_EVIDENCE=1 npm test
# Optional external installation: set PLAYWRIGHT_MODULE_PATH to that installation's playwright directory.
# With no CHROME_EXECUTABLE_PATH, the runner uses Playwright's installed Chromium as before.
```

New screenshots (original `issue-7-desktop.png` / `issue-7-mobile.png` remain unchanged):

- [Confirmation with partial coverage and continuation](issue-7-review-confirmation.png)
- [Historical receipt retaining that limitation](issue-7-review-historical.png)
- [Verified retained receipt after remove failure](issue-7-review-reset-remove-failure.png)
- [Uncertain storage after deletion verification failure](issue-7-review-reset-verification-failure.png)
- Connection/Reopen layouts: [1280px](issue-7-review-layout-1280.png), [1366px](issue-7-review-layout-1366.png), [390px](issue-7-review-layout-390.png)

Visual inspection checked the confirmation, historical and both reset-failure outputs plus desktop/mobile wrapping. At 1280px and 1366px the input/hint are **450.39px wide**, hint **37.69px tall**; at 390px they are **320px wide**, hint **75.38px tall**. Controls wrap without squeezing the key column; the mobile summary stacks and long receipt identity wraps within the page.

This is fixture/synthetic and injected HTTP/storage validation only. **No new authenticated SAP request or live acceptance.** Wider pagination/recovery #8, full integration/accessibility #9, live workflow #10 and comparison documentation #11 remain outside this follow-up. Resources and #5/#6 evidence are unchanged.
