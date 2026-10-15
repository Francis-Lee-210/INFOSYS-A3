# Issue #8 acceptance: bounded pages and connection recovery

15 October 2026. [Issue #8](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/8) / [parent #4](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/4), AC09–AC13. English implementation/validation record; no authenticated SAP requests or new AC25 acceptance.

## Baseline, dependency and tested head

| Coordinate | Verified value |
|---|---|
| Starting main | `643755eeb30dacb3b548580948ee6a96d7ee8af3` |
| Starting #23 dependency | `b072e151c19a1829d2cd5604d413bccdc6e5143d` (open when work started) |
| Integrated main after #23 merged externally | `9cb37608352738705ef39fbd1806e18d465e0b91` |
| Normal integration merge | `5c4d9a3a184224e9f79b3fddc2922d235aeca69b` |
| Feature commit | `b7d48ba2a1d5e1a6e8dd9c6b8ac4680130f84e14` |
| Tested code-bearing head | `840c0e962c448a7d680266604b8c0bc0c4fea0cb` (feature + regressions + all HTTP-date forms) |
| Branch / PR base | `feat/8-billing-pagination-recovery` → `main` |

No open #8 implementation PR existed at the initial check. The branch started on #23 as requested. After #23 merged, current main was included with a normal merge, and the final complete validation was run on the integrated branch. No dependency-branch push, history rewriting or replacement of inherited commits. Starting main/dependency and Rae's original head/follow-up commits are retained as ancestors. Both original assignees remain unchanged; no teammate approval is inferred.

## Executed environment and commands

macOS, **Node v24.20.0**, **Playwright 1.62.1**, installed **Google Chrome 155.0.8059.40**, headless via Playwright's Chromium driver. Playwright was installed outside the repository; there is no application runtime dependency or framework migration.

```sh
# From repository root; use the declared Playwright dependency or an external installation.
PLAYWRIGHT_MODULE_PATH=<external-playwright-directory> \
  CHROME_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  npm --prefix app test
# Final run additionally sets CAPTURE_ISSUE8_SCREENSHOTS=1, with no TEST_FILTER.
# Syntax: node --check on every app/**/*.js and app/**/*.mjs.
# Whitespace: git diff --check and git diff --check origin/main...HEAD.
```

**Independent pre-edit baseline: 71/71 PASS.** The inherited scenarios/assertions are retained unchanged; only registration of the new test module was added to the existing runner. Detailed final output is recorded in [issue-8-browser-test-results.txt](issue-8-browser-test-results.txt).

**Final unfiltered integrated-branch result: 113/113 PASS** (71 inherited groups + 42 Issue #8 groups), exit code 0. All application/test JS/MJS syntax checks and working/full-branch `git diff --check` pass. The final code-bearing head above was tested after integrating the merged dependency; later changes are English documentation and screenshots only.

## Every Issue #8 checkbox

Test identifiers are the stable `issue 8 Pxx/Rxx/Sxx/Uxx` prefixes in `app/tests/issue-8.mjs`, registered by `app/tests/browser.mjs`. Each group can include several controlled examples; the reported suite count is test groups, not a fabricated count of every loop iteration.

| #8 checkbox | Scenario / expected behaviour | Observed result and concrete evidence | Status / limitation |
|---|---|---|---|
| 1. Extend list → selection → explanation with supported pages; honest coverage/items | Replace page 1 with distinct page 2; separate by-key detail; exact currency/amount/date semantics; Back restores page 2; changing pages clears old review/intent. Missing/partial items never become complete. | P01 offline two-page fixture and choice invalidation; P02 absolute/service-relative/query-relative injected V2 pages, exact `-0.100 EUR`, separate PAGE2 detail, Back/row focus; P03/P04/P06 counts/empty/cycles; R08 items remain unavailable/partial with unchanged header. | PASS for the bounded supported contract. No annual/account totals or full item pagination. |
| 2. Validate continuation and redirects before credential escape; recover from refusal | Invalid destination never initiates a credential-bearing follow request. Redirect initiates no second request. | S01 HTTP matrix asserts zero upstream calls for foreign host/protocol/port/path, credentials, fragments, duplicate/unknown/bad values; S02 shared parameter/transport bounds; S03 301/302/307/308 spies; S08 Host/Origin/method/static restrictions; S09 streamed byte limit; S10 ambiguous item metadata withheld; P05 visible rejected-navigation recovery. | PASS. Unsupported token/filter contexts are explicitly rejected, not guessed. |
| 3. Empty result, Retry/back, no zero snapshot/receipt | Empty initial or later page with/without next remains empty rather than zero spending; no new financial snapshot; prior historical receipt untouched. | Four P03 variants assert empty wording, actions, absent cost export, exact existing receipt bytes, retry cursor and Back to connection; P04 advances from an empty page only using supplied next. | PASS. Exhaustion is not complete history. |
| 4. Auth versus timeout/network/429/5xx, no fixture fallback | 401 and 403 require key correction; transient types and data failures remain distinct; successful explicit recovery reaches selection/cost explanation. | R01 401/403 verifies replacement key on later requests and no stale selection/storage/leak; R02 AbortError/network/503 with gated retry counts; R03 failed page 2; R04 malformed JSON/wrong shape; R05/R06/R07 rate limits; S03 redirects. | PASS for injected browser/HTTP boundary, not a live SAP service test. |
| 5. Controlled Retry and Retry-After; no stale auto-resume | One manual attempt, duplicate suppression, shared valid cooldown, expiry only enables Retry; generation-bound operation retained. | R02 repeated gated clicks = one attempt; R03 same failed page URL; R05 numeric/HTTP-date equivalent-control blocking and no auto-send; R06 missing/invalid/zero/past headers; R07 long/unrepresentable values; R09 same detail key/page; S04/S07 obsolete source/key/reset state discarded. | PASS. Unrepresentable delay stays blocked until explicit abandonment/correction; no shortened server delay. |
| 6. Session credentials/provenance; optional items incomplete | Key stays in headers/memory, never query/storage/UI/logs. Corrected key replaces old one; fixture/reset clears it. Historical provenance/receipt bytes never follow current connection updates. | P01 fixture uses zero upstream calls; R01 sanitised rejection/key correction; R08 item-only retry with valid header; S04 key/source/reset races; S06 success/failure under an open fixture receipt; S07 cooldown cancellation including confirmed receipt reset; inherited #23 provenance/schema/reset/focus tests. | PASS. Existing minimal receipt and save Retry were not refactored. |
| 7. Public browser tests for loading/selection/explanation after recovery and safety | Exercise actual handler → adapter → injected transport, not only replacement normalized browser responses; assert destinations/counts and semantics. | All new module scenarios use the actual loopback server; P01/P02, R01/R02/R03/R08/R09 progress through real UI; S01/S02/S08/S10 use public HTTP; clocks and response gates are deterministic. Inherited coverage remains. | PASS. Timeouts use injected transport AbortError; there are no external test-destination requests. |
| 8. Primary AC09–13 evidence; #9 owns full join | Publish explicit scenario/results/limits and focused keyboard/layout regressions without claiming full #9 completion. | This crosswalk, AC table below, raw run output, screenshots and development record; U01 keyboard Next/Retry/Back, U02 actual widths/control bounds at 1280/1366/390px; inherited receipt/stale-state tests. | PASS for #8. Full integrated accessibility/acceptance remains #9. |

## AC09–AC13 crosswalk

| AC | Scenario and expected boundary | Observed evidence | Outcome / remaining limits |
|---|---|---|---|
| AC09 | Server-supplied next page on same source; partial/exhausted coverage; no aggregate or fake complete items | P01–P06 and R08: page replacement, separate PAGE2 header, exact decimals, EUR/USD isolation, correct Back page, invalidation, explicit fixture-only bound and item limitations. | PASS (bounded pages; supported `$skip` only). No complete SAP account history or item pagination. |
| AC10 | Validate before key attachment/request; redirects cannot forward key | S01–S03/S08–S10 plus P05/P06: zero rejected-destination transport calls, one call per redirect attempt, exact approved URLs/headers/methods, bounds and recoverable failures. | PASS at HTTP/browser boundary. New live continuation observation is not claimed. |
| AC11 | Genuine empty ≠ zero; usable Retry/back; no snapshot/receipt | P03/P04 show all initial/later, next/exhausted combinations, no cost export or new storage, unchanged prior receipt and explicit recovery. | PASS. No-next does not establish annual/account completeness. |
| AC12 | 401/403 are key/connection problems, sanitised explicit correction | R01 for both statuses: key action rather than empty/downtime, cleared key input/memory contract, replacement sentinel used on all corrected reads, fresh selection and cost view. | PASS with injected transport; no real key requested or used. |
| AC13 | Distinct timeout/network/rate/service recovery, controlled retry/cooldown | R02–R09, S04/S07: correct operation/cursor/key, no duplicate/automatic requests, Retry-After cases, source/key/reset invalidation; reads never write receipts. | PASS. Actual live throttling/service timing remains #10; this run simulates it deterministically. |

## Supported continuation and URL policy

The preserved OpenAPI SHA-256 is **`9dfbb583663bb493584fd62e609c3d37a6fe264c4154256249a6be7c3cd62999`**, unchanged from the frozen #5 contract. Source: `resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json`, collection `paths./A_BillingDocumentRequest.get.parameters`, shared `components.parameters.top/skip`, select/order enums and `servers[1].url`. Historical #5 B0 did not observe a continuation, so no undocumented opaque-token transport was inferred.

- Fixed origin: `https://sandbox.api.sap.com`; fixed service `/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV`; fixed collection `/A_BillingDocumentRequest`.
- Accept absolute, exact root-path, collection-relative and query-relative links, resolved against that fixed collection. Reject protocol-relative URLs, controls/whitespace/backslashes, dot segments, bad percent encoding, userinfo, fragments (including empty `#`), foreign ports/hosts/entities and duplicate/ambiguous options.
- Require server-provided `$skip`, decimal integer 0–1,000,000. Zero canonicalises to the initial page so cycles are detectable. UI never derives it from page size. `$top` is 1–10, default 10. `$format=json`; fixed eight-field header `$select`; stable `$orderby=BillingDocumentRequest`. Optional fixed options are restored canonically; supplied values must match (projection order may differ, duplicate fields may not).
- `$skiptoken`, `skiptoken`, `$filter`, `$expand`, `$inlinecount` and other query contexts are not followed. Some are documented generically, but none belongs to this reader's initial fixed query. Unsupported navigation remains a recoverable failure, not exhaustion/completeness.
- The **same validator** canonicalises outbound list requests immediately before the transport. Keys are attached afterwards only to GET/approved destination. Detail/items retain fixed projection/bounds, manual redirects, default TLS verification and 20-second timeout. Streaming bodies stop at 5 MiB; headers cannot exceed requested top, items cannot exceed 20 rows. Local Host/Origin/static protections stay unchanged.
- Item links are only bounded-coverage metadata, never followed; existing parent/source checks remain and duplicate/ambiguous item query metadata is rejected. No claim that an opaque item link is a newly supported request.

## Retry and state policy

`Retry read` is a separate operation from receipt-save `Retry`. Each user action starts at most one in-flight read; no automatic loop or expiry request. Failed list page/detail key/item coordinates belong to the current connection generation and contain no credential. Page attempts clear old validity immediately; failures show no old rows as the requested page. Restart list and Back to connection are explicit alternatives. A different key/source or disconnect/reset invalidates pending effects/timers. Logical cancellation ignores late HTTP completions; it does not pretend every in-flight network request was physically aborted.

| Retry-After case | Adapter metadata / browser rule |
|---|---|
| Integer delay-seconds | Preserve the full valid delay; no old one-hour cap. Start a conservative monotonic deadline on receipt. Equivalent connect/page/detail/item/read-retry controls cannot bypass it. |
| HTTP-date: IMF-fixdate / RFC850 / asctime | Validate calendar, weekday and time at adapter time; RFC850 two-digit years use the HTTP 50-year future rule. Return a sanitized remaining delay, not the raw header. Past date is explicitly recorded and permits manual retry. |
| Missing, malformed or negative/fractional seconds | For 429, disclose absent/invalid metadata and apply only a labelled one-second local debounce. No automatic request. |
| Zero seconds | Valid immediate **manual** retry, no fallback wait. |
| Very large but representable | Full delay retained; short UI ticks do not shorten it or overflow a long browser timeout. |
| Beyond supported date/clock range | Explicit unrepresentable status, retry remains blocked; user may abandon/correct connection. Never clamp a valid delay to an earlier retry. |

401/403 clear the rejected key and require explicit correction/reconnection; they are not an empty list. Timeout/network/5xx/rate/redirect/data errors remain distinct. Item failures keep independently valid header evidence and a truthful unavailable/partial flag. Receipt writes are never triggered by read Retry. Historical receipt provenance and stored bytes are independent of connection activity; inherited #23 schema/reset/focus behaviour is preserved.

## Visual and keyboard evidence

All screenshots below are **injected live-mode responses with sentinel keys**, not new SAP acceptance. The configured-source badge is part of that tested mode; no external SAP read occurred. Test U02 captures each state at 1280, 1366 and 390px. U01 exercises keyboard Enter on Next/Retry, focus on the resulting visible heading/Review cost evidence, and Back to the selected row. Background result/clock updates do not explicitly focus controls; S06/inherited tests assert input focus survives.

| State | 1280px | 1366px | 390px |
|---|---|---|---|
| Page 2 / exhausted continuation | [image](issue-8-pagination-1280.png) | [image](issue-8-pagination-1366.png) | [image](issue-8-pagination-390.png) |
| Valid empty page / Retry/back | [image](issue-8-empty-1280.png) | [image](issue-8-empty-1366.png) | [image](issue-8-empty-390.png) |
| Authentication / Correct key focus | [image](issue-8-authentication-1280.png) | [image](issue-8-authentication-1366.png) | [image](issue-8-authentication-390.png) |
| Rate-limit cooldown | [image](issue-8-cooldown-1280.png) | [image](issue-8-cooldown-1366.png) | [image](issue-8-cooldown-390.png) |
| Manual Retry ready after expiry | [image](issue-8-retry-ready-1280.png) | [image](issue-8-retry-ready-1366.png) | [image](issue-8-retry-ready-390.png) |

Inspection checks readable wrapping, useful input/control widths, visible focus, disabled versus available recovery actions and no page-level horizontal overflow. The mobile ledger scrolls within its table container, while short empty/error messages remain left-aligned and readable. No real credential or raw live-response screenshot was captured. Earlier #5/#6/#7 screenshots/evidence are unchanged.

## Remaining boundaries

- Supported documented subset only; actual SAP pagination links, live auth/rate/service timing and the end-to-end live receipt journey require #10. Historical B0 evidence is not repurposed as proof of these new flows.
- No full item pagination, complete account history, annual sums, monetary reconciliation or operational account changes.
- Receipt v1 uses existing non-destructive recovery, not invented metadata or automatic deletion.
- Full joined integration/accessibility assessment remains #9. No completion of #4/#9/#10/#11 or course submission is claimed; assignees and issues are not manually changed/closed.
- #23 is already merged and integrated; the Issue #8 PR has no outstanding stacked-base retarget step.
