# Issue #9 acceptance: three-screen review consistency and keyboard access

16 October 2026. [Issue #9](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/9) / [parent #4](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/4), AC17, AC23 and AC24 (with the AC02–AC24 combined crosswalk below). English implementation/validation record; no authenticated SAP requests; #10 live workflow remains out of scope.

## Baseline, dependency and tested head

| Coordinate | Verified value |
|---|---|
| Repository | `Francis-Lee-210/INFOSYS-A3` |
| Branch | `feat/9-three-screen-integration` (local; no upstream ref) |
| Base / dependency | `7a368f529b60edae730afe2b8b1a0f9513d65e5e` — merged #8 review head, PR #24 (16 October 2026) |
| Inherited baseline at that base | 125/125 PASS (all #5–#8 scenarios including the review groups) |
| Tested head | `5f1d12f` (fix + test commits on base `7a368f5`) — rework re-run of 16 October 2026; K02 now asserts the missing-key focus |
| New module | `app/tests/issue-9.mjs` (761 lines, 19 groups), registered by `app/tests/browser.mjs` |
| Evidence | 29 `issue-9-*.png` captures; [browser test results](issue-9-browser-test-results.txt) (final unfiltered run) |

All #9 changes are committed locally on the branch as the fix (`3c48fe8`), test (`5f1d12f`), redaction and evidence commits: `app/app.mjs`, `app/index.html`, `app/styles.css`, `app/tests/browser.mjs` modified; `app/tests/issue-9.mjs` and the screenshots added. Nothing was pushed and no #9 PR exists; the commits await team review. Original #5–#8 commits, evidence and screenshots are preserved, except that three earlier evidence files carry one redaction note each from the AC23 cleanup (section below). No history was rewritten.

Test identifiers are the stable `issue 9 Kxx/Sxx/Nxx/Fxx/Txx` prefixes in `app/tests/issue-9.mjs`; upstream evidence uses the `issue 7:` / `issue 7 review:` / `issue 8 Pxx/Rxx/Sxx/Uxx` / `issue 8 review Vxx` prefixes and the unpredixed #5/#6 group names. Every group can contain several controlled cases; counts are test groups, not a fabricated count of every assertion.

## Executed environment and commands

Windows, **Node v24.14.1**, **Playwright 1.62.1** (declared devDependency in `app/package.json`, installed under `app/node_modules`); the executed runs reported **Chromium/Chrome 151.0.7922.34** (Playwright's bundled headless Chromium — the runner uses the installed **Google Chrome 155.0.8059.40** instead only when `CHROME_EXECUTABLE_PATH` is set). Playwright is the only test dependency; there is no application runtime dependency or build step.

```powershell
# From the repository root; complete unfiltered suite (base port 6285):
npm --prefix app test

# Focused Issue #9 diagnostics (from app/): 19 new groups plus the runner's always-included first test:
$env:TEST_FILTER='issue 9'; npm test

# Evidence capture (from app/) that refreshes the 29 docs/validation/issue-9-*.png screenshots:
$env:CAPTURE_ISSUE9_SCREENSHOTS='1'; npm test
```

**Inherited baseline: 125/125 PASS** on the untouched base before editing, matching the merged #8 review head. The focused run passed **20/20**; the final unfiltered run passed **144/144 PASS**, exit 0 (125 inherited + 19 Issue #9 groups); the screenshot-capture run also passed 144/144 with no `TEST_FILTER` and produced every `issue-9-*.png` image. After the rework, the complete suite was re-run on `5f1d12f` (capture flags, no `TEST_FILTER`) and passed **144/144**, exit 0, re-capturing all 29 screenshots. Detailed output is recorded in [issue-9-browser-test-results.txt](issue-9-browser-test-results.txt).

## Every Issue #9 checkbox

| #9 checkbox | Scenario / expected behaviour | Observed result and concrete evidence | Status / limitation |
|---|---|---|---|
| Integrate [#7](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/7)'s receipt lifecycle with [#8](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/8)'s connection/navigation recovery. A new selection, refresh or source change clears the old pending snapshot and unconfirmed choice; Back preserves only appropriate context. | One journey spans receipt lifecycle and recovery; new page/reload/selection/source clear the pending snapshot and unconfirmed choice; Back keeps only same-evidence context. | N01 (Back keeps exact figures and the Keep choice; next page, Reload detail and source change show `Chosen intent: None yet`, Confirm disabled); N02 (reload recovers only the stored receipt; Return to list clears the session); F01/F02 (recovery completes or preserves the journey); K01; T01/T03. | PASS. Tested at the injected public boundary; no upstream refactor. |
| Superseded or delayed API responses cannot restore an older selection, credential state or decision after navigation/reset. Existing confirmed receipts remain historical and are not silently rewritten by new data. | Gated late responses for list, key, disconnect, detail, items and fixture modes never restore older rows, provenance, snapshot or decision; receipt bytes stay identical. | S01 (stale live list vs newer synthetic source), S02 (superseded key), S03 (after Disconnect), S04 (stale detail vs newer selection; Confirm disabled), S05 (stale items), S06 (fixture detail vs synthetic selection), S07 (open historical receipt byte-stable while live loads). | PASS. Every stale case asserts current rows/provenance/storage; `safeCalls` bounds each request. |
| Drive the entire connection → selection → explanation → intention → save/reopen/reset workflow by keyboard, including error and retry controls; ensure labelled controls, visible focus, useful loading/error announcements and understandable navigation. | Keyboard-only Tab/Shift+Tab/arrow/Enter/Space journey through all three screens, error/retry paths included. | K01 (full journey to read-back-verified receipt and reset), K02 (live failure → focused recovery → retry), K03 (detail retry returns to cost entry), K04 (write-failure Retry saves the preserved Later choice), K05 (labels, live regions, 3px focus rings, no trap); screenshots at 1280/1366/390. | PASS. Three real keyboard defects found and fixed (next section); no keyboard-only dead end remains in the tested paths. |
| Verify persistent storage contains only the minimal receipt with provenance. Check observable requests and shared fixtures/logs/screenshots/source package for credentials or raw response dumps; record and fix any findings. | Storage assertions in every group; explicit audit of requests, fixtures, screenshots and tracked files. | T02 (exactly one key — the 15-field receipt — for fixture, live and synthetic journeys; `/SENTINEL/` absent); `expectNoStorage`/`expectOnlyReceipt` across K/S/N/F groups; the [storage and privacy audit](#storage-and-privacy-audit-ac23) below records F1/F2/F3 and their handling. | PASS. F2 remains a packaging instruction (`git archive`), not an application change. |
| Add integration regressions at the same public browser boundary for stale response, refresh, selection/source change, historical receipt preservation, failures during navigation and keyboard recovery. Do not introduce separate internal-helper test contracts. | New groups exercise the real loopback handler/adapter with injected transport and DOM-level assertions. | The 19 groups in `app/tests/issue-9.mjs`, registered by `app/tests/browser.mjs`: K01–K05, S01–S07 (stale), N01–N02 (navigation/refresh), F01–F02 (navigation failure), T01–T03 (three-screen integrity/storage). No new exposed helper API; assertions read visible state. | PASS. Injected servers use `TEST_PORT + 500`; no external destination is contacted. |
| Record an actual usability review against the course's ten heuristics, with observed problems and corrections; do not fabricate participant feedback or claim population-level usability. | Expert heuristic walkthrough with observed problems and corrections. | [Usability review](#usability-review-against-the-ten-heuristics) below: method, ten-heuristic table, remaining observations; three defects corrected. Explicitly no participant testing. | PASS for the required review. No population or user-study claim is made. |
| Publish a reproducible coverage/result table for the combined fixture suite covering AC02–24, with each result traceable to this or an upstream slice and unresolved defects disclosed. Tests have already accompanied each feature; this ticket delivers the integrated user behavior. | One crosswalk for AC02–AC24 with concrete test identifiers and disclosed limits. | The [AC02–AC24 combined coverage](#ac02ac24-combined-coverage) table and [issue-9-browser-test-results.txt](issue-9-browser-test-results.txt); unresolved items are F2 (packaging) and the #10 live boundary. | PASS. |
| Record primary AC17, AC23–24 evidence and demonstrate an uninterrupted three-screen flow. No fourth comparison screen, Care portal or recommendation engine is added. | Primary evidence for AC17/AC23/AC24 plus one uninterrupted flow. | N01/N02 (AC17), T02 + audit (AC23), K01–K05 + fixes + usability review (AC24); T01 asserts exactly three `section.screen` elements and a single visible screen per step (`three-screen-flow` screenshots). | PASS. No fourth screen, portal, engine or real account change exists or is claimed. |

## AC02–AC24 combined coverage

| AC | Requirement (issue #4) | Evidence — this slice or upstream | Outcome / remaining limits |
|---|---|---|---|
| AC02 | Happy path: connect → select → explanation → intent → confirm → persisted receipt for exactly that record | Upstream `issue 7:` happy-path groups; this slice K01 (keyboard journey to a read-back-verified receipt) and F01 (recovered navigation completes to a receipt); T01/T03 | PASS. Fixture/injected transport; the live equivalent is #10. |
| AC03 | Live sandbox, fixture and historical receipt states have distinct visible labels; no state claims a real Spark account | Upstream #5 provenance groups, #6 synthetic profile, `issue 7 review:` historical-badge groups; this slice S07 (open receipt keeps `Fixture demonstration` while live loads), N02, T02 (`fixture-demonstration`, `live-sap-sandbox`, `synthetic-fixture`) | PASS. |
| AC04 | Both supported fixture kinds keep their document kind; the billing-request variant never becomes an issued/paid bill; one active source | Upstream #5 kind/profile groups and #6 `unknown or conflicting source profiles are rejected…`; this slice S01, S06, N01 (source change) | PASS. The second kind is the explicitly synthetic profile. |
| AC05 | Known net/tax/gross show expected signed decimals under correct labels; no header-plus-items sum or annual figure | Upstream #6 `review cost evidence…`, `synthetic exact decimals…`, supplement arithmetic groups; this slice K01 (`250.000`), K03/S04 (`-18.750`), T03 (declared bounded net+tax=gross) | PASS. |
| AC06 | Missing optional data is labelled Unknown/Not available; missing required data is a contract error, not a zero record | Upstream #6 missing-field groups and `bad required header data cannot create a cost snapshot`; this slice cost/decision captures show `Unknown / Not available` context rows | PASS. |
| AC07 | Displayed date matches the mapped source date and meaning; not a paid date; no month inference | Upstream #5/#6 date-meaning groups and `malformed required date and currency types are rejected…`; this slice repeats the documented meaning on cost, decision and receipt | PASS. |
| AC08 | Selecting another currency shows that document's currency; no combined total or NZD default | Upstream #6 `document switching preserves each currency…`; this slice S01/S04/S06 (EUR/USD isolation across page, selection and source changes) | PASS. |
| AC09 | Next link shows loaded/partial coverage; the next-page action stays on the validated source | Upstream `issue 8 P01–P06`; this slice F01 (same `$skip=10` retried; page 2 completes), T03 (complete only for explicitly bounded synthetic coverage) | PASS. No complete-history or annual-coverage claim. |
| AC10 | Invalid continuation or redirect cannot send the key outside the validated destination | Upstream `issue 8 S01–S03, S08–S10`; this slice `safeCalls` asserts GET to the fixed origin with no sentinel in any URL across K02/K03/S01–S07/F01/F02/T02 | PASS at the injected boundary. |
| AC11 | Valid empty list shows No records + Retry/back, creates no snapshot/receipt, implies no zero spend | Upstream `issue 8 P03/P04`; this slice S03 (`No records loaded`, `No list request has returned` after Disconnect), S07 (empty live list while a receipt is open) | PASS. |
| AC12 | 401/403 show a connection/key action, not a fabricated or empty result; no credential persistence | Upstream `issue 8 R01`; this slice missing-key focus fix in `app/app.mjs` and K02's distinct service-failure state with sanitised status | PASS with sentinel keys; no real credential used. |
| AC13 | Timeout/network, 429 and 5xx are distinguishable and recoverable; Retry is controlled | Upstream `issue 8 R02–R09, S04/S07`; this slice K02 (gated 503), K03 (detail 503), F01/F02 (failed page read) with one-attempt Retry and focused recovery | PASS for injected transport. |
| AC14 | Non-JSON/wrong-shape data, invalid amount and key/detail mismatch are contract/data failures; no unrelated record is explained | Upstream #6 strict-validation supplement groups and `issue 8 R04`; this slice S02 (superseded key), S05/S06 (stale item/detail evidence never bleeds into the newer selection) | PASS. |
| AC15 | Keep, Review options, Help and Later are each confirmable; the receipt records the exact choice | Upstream `issue 7:` four-intent groups; this slice K01 (Help), K04/T01/T02 (Later), T03/F01 (Keep) | PASS. Intention only; no real change. |
| AC16 | Material conflict is visible, no guessed total, confirmation limited to Help/Later with the reason retained | Upstream #6 conflict groups, #7 restriction groups, `issue 8 review V01/V02/V04`; this slice S05 (superseded item evidence cannot create or carry a conflict) | PASS. |
| AC17 | Back preserves appropriate context; new selection/refresh clears an unconfirmed choice; late responses cannot restore the old state | Upstream #6 Back groups, `issue 7:` invalidation group, `issue 8 P01`; this slice N01, N02, S01–S07 | PASS — primary criterion for this slice. |
| AC18 | Saved only after write + read-back; refresh reopens the same receipt, provenance and limitations without an API call | Upstream `issue 7:` refresh/reopen groups; this slice K01 (`read-back verified`), N02 (zero requests), S07 (bytes unchanged), T02 (exact schema) | PASS. |
| AC19 | Failed save stays visibly unsaved, keeps the pending intent, Retry produces one valid receipt | Upstream `issue 7:` write/read-back failure groups, `issue 8 review V05`; this slice K04 (injected write failure; Retry is the next Tab stop; two identical payloads) | PASS. |
| AC20 | Repeated confirm/retry on the same review yields one receipt identity | Upstream `issue 7: duplicate confirmation records one receipt identity…`; this slice K04 (identical write payloads) and F01 (single saved receipt after recovery) | PASS. |
| AC21 | Corrupt or unsupported local receipt data gives a recovery path and no invented history | Upstream `issue 7 review:` v1 and metadata-recovery groups; this slice N02 (reload recovers only a valid stored receipt; Return to list clears the session) | PASS. |
| AC22 | Cancelling reset keeps the receipt; confirming removes it, clears key/review and returns to Screen 1 | Upstream `issue 7:` / `issue 7 review:` reset groups including removal/verification failure; this slice K01 (keyboard cancel keeps, confirm clears; empty storage; `use-fixture` focus) and T02 | PASS. |
| AC23 | Data boundary: only the minimal receipt persisted; no API key or raw dump in storage, fixtures, logs, screenshots or package | Upstream #5 storage-free browser flow and #7 exact receipt schema; this slice T02 plus per-group storage assertions; audit below | PASS with the F2 packaging condition. |
| AC24 | Full journey keyboard-operable with labelled controls, visible focus, announced loading/errors and clear actions; no error traps the user | Upstream #6 focus groups, `issue 7 review:` confirmation focus and layout groups, `issue 8 U01/U02`; this slice K01–K05 and the three keyboard fixes; expert usability review below | PASS for tested widths/states; no participant-testing claim. |

## Integration and stale-response policy

An unconfirmed decision belongs to one reviewed snapshot of one selected document under one connected source. A new selection, refresh or source change invalidates the pending snapshot and the unconfirmed choice before any deliberately new evidence exists; Back preserves only same-evidence context. Superseded or delayed responses are consumed and discarded by request-generation checks: they can never restore an older selection, credential state, rows, provenance, item evidence or a pending decision. Confirmed receipts remain historical — their identity, provenance and bytes are independent of connection activity and are not silently rewritten by new data.

| Group | Scenario and assertion | Result |
|---|---|---|
| S01 | Gated live list released after switching to the synthetic source: `STALELIST` rows never appear; synthetic rows, `Synthetic fixture` provenance and `Page 1` remain; no cost snapshot; zero storage; one upstream call. | PASS |
| S02 | Gated response from `SENTINEL-OLD9` released after reconnecting with a new key: old rows cannot return; new rows and `Loaded 1 record` stand; the key input is cleared; no recovery panel. | PASS |
| S03 | Response released after Disconnect: `No records loaded`, `No list request has returned`, `Not connected`; no snapshot, no storage. | PASS |
| S04 | Gated `PAGE1` detail released after selecting PAGE2 and opening cost: summary/snapshot stay PAGE2 (`-18.750`), no `PAGE1` text, and the decision requires a fresh choice (no radio checked, Confirm disabled). | PASS |
| S05 | Gated PAGE1 items released after the PAGE2 review: `999.999` never appears; items stay `not-checked (0 rows)`; snapshot belongs to PAGE2. | PASS |
| S06 | Gated fixture detail released after a synthetic selection: cost shows SYN-0001 `10.000`, not `250.000`; snapshot is SYN-0001; zero upstream calls. | PASS |
| S07 | Gated live list released while the fixture receipt is open: receipt title, summary and stored bytes unchanged; `Fixture demonstration` stays on the receipt; Return to list shows the current live connection; only the receipt is stored. | PASS |
| N01 | Back to cost keeps exact figures, snapshot and the Keep choice with Continue focused; next page + new selection, Reload detail and source change each show `Chosen intent: None yet` with Confirm disabled; no storage. | PASS |
| N02 | Reload reopens only the receipt as `Saved receipt (historical)` (focused heading, fixture provenance, identical bytes); Return to list clears the in-memory session while keeping the receipt; a second reload makes zero requests. | PASS |
| F01 | Failed page-2 read leaves no selectable rows and no snapshot; the recovery title is focused; Retry read repeats `$skip=10`; the recovered page completes the keyboard journey to a saved receipt (5 bounded, GET-only calls). | PASS |
| F02 | Failed navigation with an open historical receipt keeps its bytes; `reopen-receipt` shows it over the failure; Return to list then Retry read completes page 2 with the receipt untouched. | PASS |
| T01 | Exactly three `section.screen` elements (`screen-list`, `screen-cost`, `screen-decision`), one visible at a time through the flow; Return to list focuses the selected row. | PASS |
| T02 | After fixture, live and synthetic journeys, storage holds exactly one key — the receipt — with the exact 15-field schema and no sentinel string; reset leaves both stores empty. | PASS |
| T03 | The synthetic journey with complete item coverage and the declared net+tax=gross relation reaches `assessmentStatus: consistent` and coverage complete; the receipt retains it. | PASS |

**Back semantics.** `Back to list` and `Back to cost evidence` are in-app navigation that preserves the reviewed context; browser history is not intercepted. This is the intended behaviour tested by N01/N02.

**Reset semantics.** Confirming a reset runs the same `resetSession()` as Disconnect (the `confirm-reset` handler in `app/app.mjs`), so the S03 late-response scenario covers that path as well; there is no separate late-response test for Reset.

## Keyboard accessibility evidence

The new module found and fixed three real keyboard defects, all minimal and surgical:

| Defect found (severity) | Fix (file) | Evidence |
|---|---|---|
| Activating a source button dropped focus to `<body>` when the button disabled itself during loading (moderate) | `app/app.mjs`: connect reuses the outcome-focus pattern, `loadPage(operation, true)` | K01 asserts `#records-title` is focused and visible after fixture load; `issue-9-keyboard-list-1366.png` |
| The records scroll region was focusable but unnamed and had no focus ring, unlike the amounts region (minor) | `app/index.html`: `role="region" aria-label="Loaded billing records table"`; `app/styles.css`: `.table-wrap:focus-visible` 3px outline | K05 asserts both regions' role/label/tabindex and the `solid 3px` outline; `issue-9-keyboard-focus-region-1366.png` |
| Confirming Connect with an empty key showed the error but left no focus target (minor) | `app/app.mjs`: the missing-key error path focuses the labelled key input | K02 asserts the focus outcome at the start of the live-failure journey (added during rework); the retained inherited missing-key error scenario still covers the message |

- K01: a Tab/arrow/Enter/Space journey across all three screens reaches a read-back-verified receipt and a deliberate reset (cancel keeps the receipt; confirm clears it and returns focus to `use-fixture`).
- K02: a gated live 503 announces `Connecting…` then `Loading page 1`, focuses the recovery title, exposes the error as `role="alert"`, and Retry read loads the row.
- K03: a failed detail keeps the row focused, then Retry read restores `Review cost evidence` focus and the correct EUR `-18.750` cost view.
- K04: an injected receipt-write failure stays visibly `Unsaved`; Retry is the next Tab stop and saves the preserved Later choice with two identical payloads.
- K05: every visible button has an accessible name; the intent group has a legend and four labelled radios; both table regions are named and keyboard reachable; 45 Tab presses cycle without a trap and Shift+Tab reverses.

Labelled controls and announcements: `#status` (`role="status"`, `aria-live="polite"`), `#error` (`role="alert"`), `#read-recovery-message` (`role="status"`), `#receipt-status` (`aria-live="polite"`), `#cost-update-status` (`role="status"`, `tabindex="-1"`), `#provenance` (`aria-live="polite"`). Visible focus: a 3px focus ring on inputs, buttons, rows and both `.table-wrap` regions at 1280/1366/390px. Focus outcomes after actions were checked as listed above; background updates do not move focus (retained inherited checks).

## Storage and privacy audit (AC23)

Read-only audit of the working tree before it was committed: static inspection of the tracked files, the storage assertions in the public suite, and the captured screenshots. It is observation, not a forensic machine scan.

| Check | Result |
|---|---|
| Storage writes in shipped code | Exactly one: the minimal receipt (`planReviewSnapshot.receipt`, `issue-7-receipt-v2`) |
| Receipt content | Exact 15-field whitelist verified in T02 (identity, provenance, document, amounts, date context, coverage/assessment/missing flags, intent, confirmation time). No key, raw response, names or contacts |
| API key lifetime | Request headers only during live mode; never in URLs, storage, files or logs; cleared on correction, fixture modes, Disconnect/reset and reload; `/SENTINEL/` absent from stored bytes |
| Observable requests | `safeCalls` in every live group: HTTPS GET, fixed SAP origin, `redirect: manual`, no sentinel in any URL |
| Fixtures and screenshots | Fully synthetic/sentinel data; none of the 29 captures contains a real credential or raw live response |
| Test harness | Writes no files during test execution; injected loopback servers only |
| Repository scan | No secrets found in the 138 tracked files |

| Finding | Detail | Handling |
|---|---|---|
| F1 scratch probes | `app/tests/probe-issue9.mjs` and `app/tests/probe-s07.mjs` existed during development | Deleted before final; `git status` shows no probe files |
| F2 live-sandbox sample | `tools/sap_api_probe_result.json` is gitignored (61 KB) and contains live-sandbox sample data, including an employee userId | Must not ship in the course ZIP; packaging must use `git archive`, never a folder copy. Left unchanged here (packaging-stage action) |
| F3 machine paths | Earlier evidence files (`issue-7-browser-test-results.txt`, `issue-8-browser-test-results.txt`, `issue-8-acceptance.md`) contained local machine paths | Redacted to `<local-checkout>`/`<task-temp>` with one Redaction-note line appended per file; no test output, counts or conclusions altered |

## Usability review against the ten heuristics

**Method.** Expert heuristic walkthrough against the course-cited Nielsen (1994) ten heuristics, performed 16 October 2026 on captured Issue #9 evidence: the 1366px keyboard states (connect, loaded list, cost evidence, decision, saved receipt) and the 1366px focus-region state, plus the 390px loaded-list, cost-ledger and failed-navigation recovery states, cross-checked against the `issue 9` test groups and source inspection of `app/index.html` and `app/styles.css`. **No participant testing was conducted and none is fabricated**; this is an expert interface inspection, not a population-level usability claim. Severity uses minor/moderate only; no major problem was observed.

| Heuristic | Observation (screen / state) | Problem found (severity) | Correction (where/when) | Evidence |
|---|---|---|---|---|
| 1. Visibility of system status | Connect → loading → `Loaded 2 record(s)`; persistent status, error and recovery panels; `Not connected`/`Fixture demonstration` badge | **Focus loss on load (moderate)** — activating a source button moved focus to `<body>` while the button disabled itself, so keyboard/screen-reader users lost their position | `app/app.mjs`: connect reuses the outcome-focus pattern; the visible list heading receives focus after load | K01; `issue-9-keyboard-list-1366.png` |
| 2. Match between the system and the real world | Cost evidence names amounts and basis as reported SAP fields; `Unknown / Not available` where data is absent; explicit "not a payment or service-coverage date" wording | No problem observed | — | `issue-9-keyboard-cost-1366.png`; inherited #5/#6 mapping tests |
| 3. User control and freedom | Back to list / Back to cost evidence preserve reviewed context; Cancel reset is non-destructive; Tab cycles without a trap | No problem observed | — | N01; K01 reset cancel/confirm; K05 45-Tab cycle and Shift+Tab reversal |
| 4. Consistency and standards | Two scrollable evidence tables; consistent button naming; exactly three screens | **Unnamed scroll region (minor)** — the records table was focusable but had no accessible name or focus ring while the amounts table had both, inconsistent assistive-technology behaviour | `app/index.html` adds `role="region"` + `aria-label`; `app/styles.css` adds the 3px `.table-wrap:focus-visible` outline | K05; `issue-9-keyboard-focus-region-1366.png` |
| 5. Error prevention | Confirm disabled until an intent is chosen; stale evidence cannot restore a confirmable decision; one user-initiated attempt per read; reset requires confirmation | No problem observed | — | N01/S04 (no checked radio; Confirm disabled); K04 (identical payloads); F01 retry counts |
| 6. Recognition rather than recall | Decision summary repeats document, provenance, amounts, date, coverage and flags; receipt repeats identity and provenance | No problem observed | — | `issue-9-keyboard-decision-1366.png`, `issue-9-keyboard-receipt-1366.png` |
| 7. Flexibility and efficiency of use | Two offline fixture modes; Next page; Reopen receipt without reconnecting; the radio group is entered with one Tab and arrow keys | No problem observed | — | N02 (reopen with zero requests); K01 (Tab then ArrowDown ×2 selects Help) |
| 8. Aesthetic and minimalist design | Exactly three screens; evidence density is deliberate; scroll regions are contained | No problem observed | — | T01; `issue-9-keyboard-cost-390.png` |
| 9. Help users recognize, diagnose, and recover from errors | Missing-key Connect; focused recovery panels; error exposed as `role="alert"` | **No focus target after the missing-key error (minor)** — the message appeared but focus stayed on the call site, so a keyboard user had to navigate back to the input to fix it | `app/app.mjs`: the error path focuses the labelled key input | `git diff app/app.mjs`; inherited missing-key scenario; K02 keyboard journey |
| 10. Help and documentation | Inline hints (session-only key, "Loaded records, not complete history", coverage and evidence limits, historical receipt label); scroll regions announce their names when focused | No problem observed after the row-4 fix | — | `issue-9-keyboard-connect-1366.png` hint; K05 region labels |

**Remaining observations.**

- Back is in-app only: `Back to list`/`Back to cost evidence` keep the review context and browser history is not intercepted; this is documented intent and the behaviour N01/N02 test.
- At 390px the amounts table keeps horizontal scrolling by design; the visible caption ("Scroll the table horizontally to compare all columns.") explains it, and the scroll stays inside the container with no page-level overflow.
- The three corrected defects above were interaction-level only; no layout, contrast or wording problem was identified in the inspected states.

## Visual and keyboard evidence

All screenshots are fixture or injected live-mode captures with sentinel keys — not new SAP acceptance. Inspection checked visible focus rings at each width, readable wrapping, contained table scrolling, announced status/error panels and no page-level overflow.

| Keyboard journey state (K01) | 1280px | 1366px | 390px |
|---|---|---|---|
| Connection ready | [image](issue-9-keyboard-connect-1280.png) | [image](issue-9-keyboard-connect-1366.png) | [image](issue-9-keyboard-connect-390.png) |
| Loaded records | [image](issue-9-keyboard-list-1280.png) | [image](issue-9-keyboard-list-1366.png) | [image](issue-9-keyboard-list-390.png) |
| Cost evidence | [image](issue-9-keyboard-cost-1280.png) | [image](issue-9-keyboard-cost-1366.png) | [image](issue-9-keyboard-cost-390.png) |
| Decision / chosen intent | [image](issue-9-keyboard-decision-1280.png) | [image](issue-9-keyboard-decision-1366.png) | [image](issue-9-keyboard-decision-390.png) |
| Saved receipt | [image](issue-9-keyboard-receipt-1280.png) | [image](issue-9-keyboard-receipt-1366.png) | [image](issue-9-keyboard-receipt-390.png) |

| Recovery, stale and flow states | 1366px | 390px |
|---|---|---|
| Live read failure / focused recovery (K02) | [image](issue-9-keyboard-live-recovery-1366.png) | — |
| Detail retry at cost entry (K03) | [image](issue-9-keyboard-detail-retry-1366.png) | — |
| Receipt write failure / Retry (K04) | [image](issue-9-keyboard-save-retry-1366.png) | — |
| Named focusable scroll region (K05) | [image](issue-9-keyboard-focus-region-1366.png) | — |
| Failed Next page navigation (F01) | [image](issue-9-navigation-failure-1366.png) | [image](issue-9-navigation-failure-390.png) |
| Stale source cleared (S01) | [image](issue-9-stale-source-cleared-1366.png) | [image](issue-9-stale-source-cleared-390.png) |
| Stale selection cleared (S04) | [image](issue-9-stale-selection-cleared-1366.png) | — |
| Historical receipt kept (S07) | [image](issue-9-historical-receipt-kept-1366.png) | [image](issue-9-historical-receipt-kept-390.png) |
| History with navigation failure (F02) | [image](issue-9-history-with-navigation-failure-1366.png) | — |
| Three-screen flow (T01) | [image](issue-9-three-screen-flow-1366.png) | [image](issue-9-three-screen-flow-390.png) |

## Remaining boundaries

- **#10/#11 out of scope.** No authenticated SAP read is claimed: every scenario uses fixtures, the bounded synthetic profile, or injected loopback transport with sentinel keys. AC25 (live workflow) and AC26 (independent package run) remain #10/course-packaging responsibilities; #11 comparison work is untouched.
- **F2 packaging instruction.** `tools/sap_api_probe_result.json` (gitignored live-sandbox sample data) must not ship in the course ZIP. Package with `git archive`, never a folder copy; this audit made no change to it.
- **Tested-head caveat.** The tested head is `5f1d12f` — the fix and test commits on base `7a368f5` (16 October 2026). The 144/144 result, the filtered 20/20 and the 29 screenshot captures describe exactly this head; any later edit invalidates the counts until rerun. Pushing, merging and issue-state changes remain with the maintainers.
- **Redaction note.** Three earlier evidence files carry one appended line recording the F3 machine-path redaction; their test output, counts and conclusions are unchanged.
- **Usability claim limit.** The review above is an expert heuristic inspection; no participant testing was conducted or fabricated, and no population-level usability is claimed.
- **Documented behaviour.** In-app Back semantics and the contained horizontal scroll of the amounts table at 390px are intended choices, not defects.

See also the [Issue #9 development record](../development/issue-9-opencode.md) and the raw [browser test results](issue-9-browser-test-results.txt).
