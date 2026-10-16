# Issue #10 acceptance: updated clean source handoff and live workflow

16 October 2026 (Pacific/Auckland). [Issue #10](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/10), primary AC25–26 of [parent #4](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/4).

**PASS: inspected 17-file source package, fresh-directory startup, 161/161 fixture groups, 28/28 packaging cases, and a new actual SAP workflow including identical historical reopen and verified reset.** [OpenCode development](../development/issue-10-opencode.md) remains separate from the independent results here.

PR #29 and PR #30 were merged by another maintainer during review. Their merged heads do not contain the follow-up receipt repairs or this updated package. Issue #10 was closed by PR #30; the new repair/source-sync PR remains the code-delivery review gate. Revert PR #31 is CLOSED and was not merged; the primary agent did not close it or change main/protection.

## Tested source and package identity

| Coordinate | Verified value |
|---|---|
| Merged base | `203b200fd81cde6c49cb52d5be0afc5f1e4b89b5` — PR #30 merged `2026-10-16T03:20:30Z`, incorporating PR #29 merge `d4dc8a4b02eca5d5dc30955e93a004d3cfbc5b51` at `2026-10-16T03:06:26Z` |
| Reviewed receipt repair | `81099ce4ff37564dec7099687726a3ed5dd10e41` — independent Standards and Spec closure, full 161/161 run; [record](issue-27-acceptance.md#independent-pr-29-review-and-follow-up-repairs--16-october-2026) |
| Branch / source freeze | `codex/receipt-recovery-source-sync` / `093f5f02879494979c0cda3b0bd1dedc01697666` |
| Archive | `plan-review-snapshot-billing-lite-093f5f0.zip`, **98618 bytes**, 17 payload files |
| SHA-256 | `c25057ab068854765681e6c0109c9fff42eced9af5db33e7dbe7eda6c8cad17d` |
| Packaged at | `2026-10-16T03:36:47.420Z` |
| Post-run byte verification | `2026-10-16T03:42:20.286324+00:00` / `2026-10-16T16:42:20.286324+13:00` |
| Actual live workflow | `2026-10-16T03:38:05.163Z`–`2026-10-16T03:41:22.117Z` |
| Runtime | macOS 15.7.5, Node v26.0.0, Playwright 1.62.1, Chromium 151.0.7922.34 |
| Identity evidence | [Source-package manifest and independent inspection](issue-10-source-package.json) |
| Run evidence | [Independent-run metadata](issue-10-independent-run.json), [28-case packaging output](issue-10-package-test-results.txt), [161-group browser output](issue-10-browser-test-results.txt), [sanitized actual live checks](issue-10-live-evidence.json) |

The repaired application and current browser modules are included, including `app/tests/issue-27.mjs` in both packaging allowlists. The package no longer omits that locally imported module. The earlier 16-file `c9914cc` package and its acceptance remain historical at [2dc5ce4](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/2dc5ce4dfc8c10c0489f5521d10341cb9df65fe4/docs/validation/issue-10-acceptance.md); those results were not reused to certify the new build. Subsequent evidence-only commits do not change these 17 archived payload files.

## Independent run and artifact inspection

1. Extracted the final ZIP into new `/private/tmp/a3-issue10-clean-093f5f0`. Independently checked CRC, exactly 17 regular files, every manifest length/SHA-256, equality to the pinned Git blobs and extracted bytes. No Git metadata or installed dependencies were present.
2. Followed [README-SOURCE](../../README-SOURCE.md): from extracted `app/`, `PORT=6290 npm start` rendered the correct initial screen/title at `2026-10-16T03:37:40.643Z`, **before npm installation**. There are no runtime dependencies or build step. A free loopback port was the only setup choice.
3. Ran `npm ci` and `npx playwright install chromium` in that fresh extraction: both exit 0. Playwright 1.62.1 and its managed Chromium were used from that extraction's `node_modules`.
4. Ran `PORT=7800 npm test` with filter/capture/external-module/browser/Chrome overrides unset: **161/161 PASS, exit 0**. This includes all inherited 146 groups and 15 Issue #27 groups, storage recovery and uncertain reset, keyboard save/reopen/reset, exact persistence/schema and controlled failures. The harness closed its owned servers.
5. Independently ran `node tools/tests/package-source.mjs`: **28/28 PASS, exit 0**. Existing archive-attribute/substitution, commit mode, symlink, missing/dirty payload, credential-literal and output-collision checks still pass with the 17-file allowlist. Syntax and diff checks pass. The future import-reference completeness guard proposed by Rae is a separate tooling task and is not claimed as implemented here.
6. Rechecked all 17 extracted and checkout payload hashes after browser/live execution: unchanged. The archive SHA-256 still matches. Inspected explicit ZIP entries, manifest, source and shared evidence; no real credential literal or raw OData dump was found. Conservative scanning is not represented as a universal secret detector. Screenshots contain empty key/record state only.
7. Parent #4 remains **OPEN** with title/body/state exactly equal to the before snapshot. #10 is CLOSED after the original #30 merge. This follow-up carries reviewed repairs; it does not rewrite the old merge or certify the whole A3.
8. A separate read-only closure review found **no blocking discrepancy** in ZIP identity/all 17 payload bytes, metadata, 161 PASS/28 ok output, AC crosswalk and local links. It did not repeat tests/live or access the key/browser/GitHub; see the independent-run metadata.

## Actual SAP workflow from this extraction

The primary agent exercised the default adapter at `http://127.0.0.1:6290/` from this final ZIP. The existing signed-in SAP Business Accelerator Hub session supplied the key directly to the local password field. It was never printed, copied to the clipboard, given to OpenCode or persisted into evidence. Browser control memory was reset after finishing. No fixture or injected transport was used.

- Actual source `API_BILLING_DOCUMENT_REQUEST_SRV` v1.1.0 returned **10 loaded / 10 usable**. Separate by-key detail matched the chosen key, signed amount, date and currency. Optional items were **partial** and SAP monetary reconciliation remained **unassessed**.
- All available reported net/tax/gross strings, currency and date matched on cost/decision/receipt screens. Billing-request kind, original **Live SAP sandbox** provenance, the date qualification and independent-amount meaning remained visible. Each screen's `h1` and document title matched its purpose, including historical reopen and reset.
- **Later** was confirmed as an intention only, not a scheduled reminder. **Saved — receipt write and read-back verified** appeared. After reload, displayed evidence and exact receipt identity/intent matched; historical notice and original live provenance remained. Key input was empty and startup reported no network request in the new page session.
- Cancelling Reset retained the same saved evidence/identity. Confirming Reset returned to Screen 1 with no key, receipt/reopen or records. Another reload still had no receipt.

[Live evidence](issue-10-live-evidence.json) contains only identity, timestamps, counts, field names and booleans. Read-only browser DOM scope does not expose `localStorage`; no direct live-storage inspection or exported live receipt is claimed. Exact minimal schema and credential exclusions are independently covered by the unchanged validator and packaged storage regressions. Historical B0 and fixture/injected results remain separate.

![Fresh extraction before installing dependencies or entering a key](issue-10-clean-start.jpg)

![After confirmed reset and another reload: no key, receipt or records](issue-10-reset-complete.jpg)

## Every Issue #10 criterion

| # | Required outcome | Result / evidence |
|---|---|---|
| 1 | Runnable source/adapter and runtime/network/key instructions, no keys/raw samples/unrelated output | PASS — inspected 17-file ZIP, matching manifest, self-contained README and fixed GET adapter. |
| 2 | Fresh extraction completes connection → selection → explanation → intent → save → reopen → reset | PASS — new dependency-free startup, full packaged suite and new actual live workflow. |
| 3 | Real selected-source workflow with local key and separate sanitized evidence | PASS — current actual SAP run; no fixture or historical B0 substitution. |
| 4 | Live label and historical original provenance, request/date/amount qualifications | PASS — exact evidence and provenance checked through all screens and reload. |
| 5 | Packaged fixture suite and explicit AC01–26 outcomes | PASS — 161/161 from this ZIP and all 26 criteria mapped below. Old #10 closure remains historical; new repair delivery awaits the follow-up PR. |
| 6 | Deliverable inspection and run/runtime/timestamp/source identity retained | PASS — new manifest, independent/live metadata, both complete test outputs and empty-state screenshots. |
| 7 | AC25/26 handoff and remaining A3 gates | PASS — this record/README; full assessment gates remain separate. |
| 8 | Preserve parent #4 OPEN and body/state | PASS — exact before/after comparison in independent-run JSON. |

## AC01–26 crosswalk


The scenarios and criteria are copied from the current parent contract. Stable per-criterion test identifiers are in the retained [#9 AC02–24 crosswalk](issue-9-acceptance.md#ac02ac24-combined-coverage). The inherited 146 groups and 15 Issue #27 groups all passed from this final ZIP. Controlled errors remain injected scenarios; no actual authentication/rate-limit/malformed-response incident is invented.

| AC | Scenario | Acceptance criterion | Outcome / evidence |
|---|---|---|---|
| AC01 | API validation | B0.1–B0.8 are resolved for one source, with specification/mapping, real non-empty list/detail reads and sanitized evidence from the intended transport. | PASS — historical [B0](issue-5-b0.md)/[frozen mapping](issue-5-field-contract.md) retained; no new B0 claim. |
| AC02 | Happy path | A user connects, selects a usable record, reads its explanation, chooses an intent, confirms, and sees a persisted receipt referring to exactly that record. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC03 | Provenance | Live sandbox, fixture and historical receipt states have distinct visible labels. No state claims to be a real Spark account. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC04 | Primary/alternate source | Both supported contract fixtures retain their document kind. The billing-request variant never becomes an issued or paid bill in the list, explanation or receipt. Only one source is active in a review. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC05 | Amount basis | A fixture with known net/tax/gross shows the expected signed decimal values and currency under correct labels. Neither the header-plus-items sum nor an annual-spend figure appears. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC06 | Missing fields | Missing optional party/tax/item/service-period data is labelled Unknown or Not available. Missing required amount/currency/date produces a contract error, not a zero-valued valid record. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC07 | Date meaning | The displayed date matches the mapped source date and meaning. A request's date is not labelled paid date; absent service-period data is not converted into month coverage. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC08 | Mixed currency | Selecting another currency shows that document's currency correctly. Cross-document or mixed-currency detail is not combined into one total or converted to NZD. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC09 | Partial data | A paginated fixture with a next link shows loaded/partial coverage; a next-page action remains on the validated source. Missing/partial items are not described as a complete breakdown. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC10 | Pagination safety | An invalid continuation or redirect cannot send the key outside the validated sandbox destination. The app shows a recoverable error and keeps the source boundary intact. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC11 | Empty response | A valid empty list shows No records and Retry/back options, creates no snapshot or receipt, and does not imply zero spend. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC12 | Authentication failure | A 401/403 fixture shows a connection/key action, not No records or fabricated data. Recovery does not persist or echo the credential. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC13 | Transient failures | Timeout/network, 429 and 5xx fixtures show distinguishable recoverable states. Retry is controlled, respects a supplied rate-limit delay, and cannot create duplicate receipts. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC14 | Invalid payload | Non-JSON or wrong-shape data, an invalid amount, and a key/detail mismatch are rejected as contract/data failures. No unrelated record is explained. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC15 | All four intents | Keep, Review options, Help and Later can each be confirmed for a valid snapshot; the receipt records the exact choice and intention-only meaning. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC16 | Inconsistent evidence | A material breakdown conflict is visible, does not replace a reported figure with a guessed total, and limits confirmation to Help/Later with the reason in the receipt. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC17 | Correct navigation | Back preserves appropriate reviewed context; choosing another document or refreshing clears an unconfirmed choice tied to the old snapshot. Late responses cannot restore the old selection. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC18 | Successful persistence | Saved is shown only after a write and valid read-back. Refresh reopens the same receipt, intent, original live/fixture provenance and historical evidence without a mandatory API call. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC19 | Save failure | An injected write/read-back failure keeps the decision visibly unsaved, retains the pending intent and permits Retry. A successful retry produces one valid receipt. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC20 | Duplicate confirmation | Repeated confirm/retry on the same review yields one receipt identity, not duplicate outcomes. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC21 | Invalid local state | Corrupt or unsupported-version receipt data produces an understandable recovery/reset path and no false saved history. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC22 | Reset | Cancelling reset preserves the receipt; confirming reset removes it, clears the key/review state and returns to Screen 1. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC23 | Data boundary | Browser storage, shared fixtures, logs, screenshots and package inspection show no API key or raw response dump. Only the specified minimal receipt is persisted. | PASS — packaged 161 exact-schema/storage/transport regressions plus final ZIP/manifest/source/shared-evidence inspection; actual live evidence is counts/booleans only, and screenshots show empty key/records. Direct live-storage inspection is not claimed. |
| AC24 | Accessibility and usability | The full journey is keyboard-operable with labelled controls, visible focus, announced loading/errors and clear Back/Continue/Confirm actions; no error traps the user. | PASS — [161/161 packaged suite](issue-10-browser-test-results.txt); per-criterion scenarios/IDs retained in upstream #9 crosswalk. |
| AC25 | Live workflow | With a locally supplied key, the packaged app completes the real selected-source flow and reopens its receipt. Record this separately from fixture test results. | PASS — [actual SAP evidence](issue-10-live-evidence.json): 10 usable, same-key detail, three-screen review, Later/save/read-back, identical historical reopen, cancel/confirm reset. |
| AC26 | Independent run | Source extracted in a clean directory runs from its instructions, uses the documented runtime/connection setup, and completes the core feature. Missing network/key prerequisites are explicit. | PASS — final ZIP extracted into a fresh directory, documented dependency-free startup, local test installation, full 161 suite and actual selected-source core flow; source/runtime/package identity recorded above. |

## Live workflow handoff and remaining gates

The new extracted package remains at <http://127.0.0.1:6290/> in its reset state. To repeat the flow, locally enter an authorised SAP key and keep the same origin/port/profile for historical reopen. The [README](../../README-SOURCE.md) documents every required step.

The new archive is pinned to `093f5f0`; later evidence-only commits preserve its 17 payload files. All eight #10 criteria and AC01–26 have PASS evidence for this package. The follow-up PR is the remaining code-delivery gate; the merged original PRs are not attributed these repairs. Rae's planned import-reference guard is separate from these already passing package checks.

Whole-assessment gates remain separate: team/API-option rationale and model decisions, actual course MCP deployment, design/client evidence, presentation/recording/groupwork, pitch and authoritative Canvas receipts. Parent #4 stays OPEN. No PowerPoint/video, Signavio or Canvas action occurred.
