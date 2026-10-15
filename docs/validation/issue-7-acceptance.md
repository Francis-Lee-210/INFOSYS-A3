# Issue #7 acceptance evidence

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
