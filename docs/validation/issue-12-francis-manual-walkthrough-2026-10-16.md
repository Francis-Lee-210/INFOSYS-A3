# Issue #12 manual walkthrough record

**Report date:** 16 October 2026 (NZDT; date the report was supplied). **Tester:** Francis, group member. **Artifact:** Ryan's standalone `issue-12-wireframes.html` walkthrough.

This record has two distinct parts. The original summary below records Francis's initial report. A later screenshot-guided sequence performed by Francis is recorded separately. The initial session's exact date/time, artifact commit, and browser/device details were not recorded.

## Initial walkthrough summary reported by Francis

Ryan's four requested step groups were covered:

1. Select a record and inspect its amount explanation.
2. Return and change the selected record.
3. Try to continue through missing data, a read failure, or changed evidence.
4. Record an intended next step and revisit the receipt.

**Reported result:** Francis said all steps worked normally and no wireframe change was needed. The original summary did not specify step-by-step observations or verbatim comments.

## Evidence boundary for the initial summary

This is Francis's summary of a manual walkthrough of the standalone wireframe. It is not a live SAP/API test or evidence that the illustrative receipt persists in the application. The original report did not identify which specific missing/error/evidence-change case was tried. No post-change recheck was reported because no change was requested.

## Additional screenshot-guided manual record — 16 October 2026

**Operator:** Francis. Francis performed the browser interactions step by step with prompts in this conversation and supplied screenshots of the screens. This addendum records the actions and interface text visible in those screenshots; it does not include an assistant review or pass/fail assessment. The exact browser/OS version, artifact commit/hash, and session time were not recorded. The page footer displayed “Design artifact v1.0 · 16 October 2026 NZDT.” The screenshots were shared in the conversation and are not stored in this repository.

| Scenario and action | Interface shown in Francis's screenshots |
|---|---|
| Loaded the synthetic examples, selected the first record, and opened its cost evidence. | Two synthetic records were available. The amount explanation showed net **250.000 USD**, tax **37.500 USD**, and gross **287.500 USD**. Source/date context identified the record as synthetic and the payer/account/service period/payment as unknown or unavailable. |
| Returned to the list, selected the other record, and opened its cost evidence. | The amount explanation showed net **-18.750 EUR**, tax **0.000 EUR**, and gross **-18.750 EUR**, with the same bounded-example and evidence-limit framing. |
| Staged **Optional detail absent**, loaded the example, and continued to the intention screen. | Evidence text read: “Optional detail: absent in this bounded synthetic read. Not proof of complete account history.” |
| Staged **Connection / read failed** and loaded the example. | The page said “Illustrated read failed; no usable rows.” The alert read: “Connection / read failed (simulation). This is not an empty result. Retry or return to connection. No live account or financial evidence was loaded.” It showed **Retry illustrated read** and **Back to connection**; **Review cost evidence** was disabled. Whether either recovery button was activated is not recorded in the screenshots. |
| Opened the first record's evidence, started **Review updated evidence**, and waited for the simulated check. | The status read: “Checking updated evidence. The previous intention was cleared. Continue and confirmation are unavailable until a current result is reviewed.” The evidence limitation said optional detail was checking; the continue and check controls were disabled. |
| In the simulation setup, chose **Conflicting item currency** and resolved the pending simulated check. | The status changed to: “Updated evidence is ready. Review its current limits or conflict before choosing a new intention.” The evidence text said optional detail was partial with a known currency conflict against the USD header and not to combine the item and header. The conflict message said the item currency EUR differed from header USD and only **Help** or **Later** could be confirmed. |
| Continued to the intention screen, selected **Later**, and confirmed the simulated intention. | The historical receipt showed **Chosen intention: Later**, receipt identity **DEMO-RECEIPT-01**, and synthetic confirmation time **2026-10-16T04:05:00.000Z**. The receipt said it was an illustration held in the page's memory, not application persistence, and that reloading the file clears it. |
| Returned to the list and reopened the illustrative receipt. | The later screenshot showed the historical receipt again, retaining the original record and conflict limitation. |

No verbatim participant comments were supplied. No statement about the assistant's double-check, independent technical validation, or overall acceptance result is part of this manual record.
