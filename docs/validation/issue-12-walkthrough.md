# Issue #12 walkthrough: protocol, observations and evidence separation

**Artifact:** [standalone wireframe](../design/issue-12-wireframes.html). [Rationale/source map](../design/issue-12-design-rationale.md) · [Model handoff](../design/issue-12-model-handoff.md). **Initial summary and later screenshot-guided manual supplement received from Francis.** The supplement resolves the specific missing/error/evidence-change question. Guidance and evidence limits remain explicit; agent checks and reviewer conclusions are separate. No new full session or interaction recheck is required. H1–H8 is a prepared protocol, not eight mandated transcripts.

**Superseded repair checkpoint:** at `b1d4cb3` the two human questions were pending; the [recorded repair checks](issue-12-reconciliation.md#16-october-visual-review-repair-closeout) concern that identity. **Current evidence:** Francis's human-authored supplement at `1468d12` is preserved intact; Rae's [16 October model-owner comment](https://github.com/Francis-Lee-210/INFOSYS-A3/pull/28#issuecomment-6210567463) accepts reuse with original step 5 explicitly Modified. Current edits clarify that mapping/status and regenerate the process image, not the HTML interaction.

## Ready-to-run human session

**Retained protocol, not an outstanding recruitment request.** Francis has already reported evaluating the standalone wireframe. Use the protocol only as a reference or for a genuinely needed targeted supplement; do not infer that every variant below was attempted. Optional metadata may remain “not recorded”. A no-change result is legitimate and does not require a fabricated defect or post-change recheck.

**Suggested session:** one consenting teammate/classmate or other suitable consumer proxy, moderated by a different person if practicable. This is formative, not a representative sample or Spark customer/employee study. Do not recruit Spark employees or ask for account/key/contact information. A teammate may have prior implementation knowledge; record that confound. The suggested 10–15-minute slot is planning, not an observed task duration or success threshold.

1. Open `docs/design/issue-12-wireframes.html` directly in a modern browser; no server, key, login or network is needed. Verify the page says **Synthetic design simulation** and v1.0. Record the actual Git commit, browser/device, date/time/timezone and version used.
2. Keep the *Design simulation setup* panel closed during the participant's core tasks. The moderator may stage a named scenario between tasks. Reload/confirmed Reset starts a clean illustration; **reload clears this wireframe**, unlike the real app's saved receipt. Do not let simulation persistence become a claimed app result.
3. Read the neutral introduction: “We are reviewing this design, not testing you. The records and actions are synthetic. Please say what you think the screen means and what you would do next. You may stop. May we record your actions and comments as notes, without account or personal details?” Record actual consent; do not pre-fill it.
4. Ask the task prompt, observe silently first, and record actions plus the participant's own words. Use neutral follow-ups such as “What leads you to that conclusion?” Mark any moderator hint/help and preserve qualifiers. Do not supply the expected answer before an unaided response.
5. After the session, identify a concrete design change or explain why no change is justified. Recheck changed tasks with an actual person if possible; record that recheck separately. Do not invent positive feedback, timings or rechecks to close the issue.

### Participant prompts (read these, not the answer key)

| Task | Moderator setup / neutral prompt |
|---|---|
| H1 Select | Fresh load, default partial scenario. “Open the examples and choose the first record. Show me where you would start understanding its amount.” |
| H2 Meaning | On its evidence screen: “What do the amount, currency, date and source let you conclude? What, if anything, remains unknown?” |
| H3 Correct | “Go back, choose the other record and return to its explanation. Tell me what changed and why that matters.” |
| H4 Missing/partial evidence | Fresh illustration, moderator stages unavailable, then partial as a separate example. “What more would you need, if anything, before choosing what to do next? How would you proceed from here?” |
| H5 Empty versus failed read | Fresh illustration for each: stage empty; then failed. “What does this result tell you? What would you do if you wanted to continue or correct it?” Let the participant find Retry/Back; don't announce “zero spending” as the correct distinction. |
| H6 Conflict | Fresh conflict example. “Inspect this evidence and record whichever next intention you consider appropriate. Explain any choices that are unavailable.” Do not tell them to select Help/Later. |
| H7 Evidence changes | Fresh partial example; ask them to choose Keep but not confirm, then activate Review updated evidence. “What can you do while this check is pending?” Moderator resolves the simulated response as conflicting, using setup outside the flow. “What would you review or do now?” |
| H8 Intention/history/reset | Fresh normal example. “Record an intention, return to the list, and reopen what you recorded. What has actually happened, and how current is this evidence?” Ask them to cancel a Reset once, then deliberately reset. Do not imply a real switch/ticket/reminder or storage test occurred. |

### Observer answer key / predefined observations (not participant coaching)

Record whether the participant:

- mistakes a billing **request** or the processing/booking date for payment or a service month;
- drops the currency, interprets a credit as positive spend, confuses net with gross, or sums header/items;
- treats loaded examples, absent next/partial items or an empty result as complete annual history / zero spending;
- misses synthetic provenance or mistakes a wireframe receipt for live Spark/customer data or actual persistence;
- can locate Back/correction, distinguish failed from empty, and find an appropriate recovery action;
- understands that pending refresh invalidates the old choice and known conflict limits Help/Later—not a plan-suitability judgement;
- assumes Keep proves fit, Review options changes an account, Help submits a ticket, or Later schedules a reminder;
- recognises the reopened receipt as an old illustration retaining original source/limits, not a newly refreshed bill;
- encounters unreadable text, hidden currency/basis, clipping, confusing focus or an unusable control.

An action/statement can be recorded as correct, ambiguous or mistaken **for this task**, with supporting words/actions, not as a population satisfaction or success percentage. Understanding one record does not demonstrate the original A2 financial/retention benefit.

## Human results — initial summary and guided supplement

Francis, group member, supplied an initial four-group summary: steps worked normally, no wireframe change needed. Its **16 October NZDT report date is not an established session timestamp**. The [latest human-authored record](issue-12-francis-manual-walkthrough-2026-10-16.md), preserved at [commit `1468d12`](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/1468d12bc2d6044f88e2eafc7307a1ca5988c838/docs/validation/issue-12-francis-manual-walkthrough-2026-10-16.md), separately adds screenshot-guided manual actions and interface text. Earlier versions remain in Git; **do not revert the supplement to satisfy an obsolete byte-unchanged assertion**. Neither the report commit nor the synthetic receipt time establishes the tested artifact commit or human session time. #11 comments, Rae's archived research and her later model review are distinct evidence.

| Result field | Reported value |
|---|---|
| Tester role / prior familiarity | Francis, group member; prior familiarity not recorded |
| Session date/time / consent | Initial session timing/consent not recorded; supplement headed 16 October, exact session time unknown |
| Artifact version / commit / browser/device | Footer reported v1.0 / 16 October NZDT; tested commit/hash and runtime versions unknown |
| Tasks attempted / assistance | Initial four groups plus guided sequence below; prompted step-by-step manual interactions, not unaided task success |
| Observed behaviour / comments | Reported screenshot-visible amounts, limits, error, pending, conflict and historical receipt; screenshots not archived; no verbatim participant comments |
| Change needed | Initial report requested none; reviewer concludes no interaction change justified by the supplement. Step-5 documentation clarification comes from Rae, not a fabricated participant defect |
| Actual recheck / remaining issue | No interaction change, hence no post-change human recheck required. Missing/error scenario question resolved; failed-read recovery-button activation remains unrecorded, not claimed |

### Guided sequence and evidence limits (not eight reconstructed transcripts)

| Francis's reported guided action | Interface recorded in his supplement | Reviewer interpretation / limit |
|---|---|---|
| Select first record, explain; Back, select second and explain | USD 250.000 net / 37.500 tax / 287.500 gross; then -18.750 EUR net/gross and 0.000 tax | Selection→explanation and correction/Back demonstrated with guidance; not proof of unaided financial comprehension |
| Stage optional detail absent and continue | Explicit bounded-read absence and not-complete-history limitation | Required valid header remains reviewable despite optional gap |
| Stage failed read and load | No usable rows, explicit failure-not-empty alert, Retry/Back shown, Review cost evidence disabled | Error state and block observed. Activation of recovery buttons not recorded; do not claim it |
| Review updated evidence; resolve as conflicting item currency | Pending message clears previous intention and blocks continuation; later EUR-item/USD-header conflict, Help/Later only | Specific changed-evidence and conflict scenario recorded, not every prepared H4–H7 variant |
| Confirm Later, return to list, reopen receipt | Historical receipt retains original record/conflict limits, says memory-only and clears on reload | Full intention/history endpoint recorded; synthetic `2026-10-16T04:05:00.000Z` is not the human session time or real persistence |

### 16 October evidence assessment against actual #12 criterion 7

This is a reviewer assessment of Francis's initial summary **and later committed supplement**, not new participant observation. The latest human-authored file is unchanged from `1468d12`.

| Required design evidence | What the report supports | Remaining limit |
|---|---|---|
| Who evaluated / scenario | Francis, group member, performed guided manual sequence above | Not an unaided usability study; screenshots reported in conversation, not stored; tested commit/runtime/time unknown |
| Select → explain → intention/receipt and correction/Back | First record, Back/negative EUR correction, Later confirmation and historical reopen recorded | Guided operation only; no general comprehension, live access or app-persistence claim |
| A missing/error state | Optional detail absent with continuation; failed read with disabled evidence review; pending/cleared choice→currency conflict recorded | Prior disjunction resolved. Failed-read recovery activation and every H1–H8 variant not proven; neither is an extra requirement for this bounded #12 criterion |
| Observations / resulting changes | Initial no-change result plus specific guided interface observations | No interaction change justified; status/mapping/export documentation corrected, with automated checks/visual inspection separate. No fabricated defect or human recheck |

**Criterion 7 is supported by the bounded guided record.** No full replay, additional participant, eight transcripts or post-change interaction recheck is required. Unknown metadata remains unknown. The screenshots are a human-reported source, not independently inspectable repository images; no new quotation or population-level result is inferred. Ready for review is not lecturer/course acceptance or #15 completion.

## Agent inspection and automated artifact checks

**Evaluator:** OpenCode agent, not a human participant. **Date:** 16 October 2026 NZDT. **Scope:** source extraction/visual reading, new process map and wireframe only. No full app acceptance suite, live SAP workflow, Signavio operation or customer interview.

| Finding | Actual agent observation / correction | Evidence / recheck |
|---|---|---|
| A01 Record selection lost useful focus | First browser artifact check failed `Selection must leave useful focus, not BODY`: rendering replaced the focused radio. Changed the wireframe to focus Review cost evidence after explicit selection. | First QA output retained in the task's temporary run record; subsequent scenario/keyboard checks pass this assertion. This is a wireframe correction, not a new #9 app finding. |
| A02 Ambiguous partial-currency copy | Source inspection found the partial-detail sentence used a generic “USD/EUR” placeholder. Replaced it with the selected header's actual synthetic currency. | Scenario checks inspect USD header; negative EUR correction path and visual inspection verify current labels. No human comprehension claim. |
| A03 Old receipt versus new selection | Inspection of the one-receipt flow identified that an older illustration could be shown after a different selection without an explicit “not recorded” note. Added that clarification while keeping original history unchanged. | Historical/changed-selection checks distinguish the old summary/source from the current record. The real app already has related history controls; no claim that #9 lacks them. |
| A04 Empty/error clarity in the new artifacts | Visual inspection found transport-jargon in the simulation failure copy and an over-broad failure heading beside the map's empty-result note. Shortened the user-facing recovery copy; E1 now explicitly separates failure recovery from a valid empty result. | Browser scenario checks retain the empty-versus-failed distinction and disabled financial review; complete diagram/viewport checks remain. This is agent visual/source inspection, not participant feedback. |
| QA capture limitation (not a design defect) | Playwright's HTML `fullPage` screenshot calculation timed out on a standalone SVG document after the other checks passed. Switched the diagram capture to its exact 1440×1840 canvas viewport, without changing the diagram or relaxing text-bound checks. | A separate actual-browser complete SVG viewport capture succeeded; final artifact run records the complete SVG check. |
| A05 Review correction — stale diagram status / malformed PNG | User-relayed independent review at `70a157b` identified a footer still calling the human walkthrough pending and a PNG with a clipped bottom/repeated heading. Agent visually confirmed the malformed committed image. Corrected only status/footer wording and its layout; set full canvas viewport before SVG navigation, awaited fonts/stable frames, regenerated PNG directly. | New run at `b1d4cb3`: 39/39 artifact groups pass, full 1440×1840 PNG stable across repeated captures; agent visually inspected heading once, complete panel/source link/final footer, no clipping/duplicate band/overlap/scaling. Existing DOM/source checks had missed the raster problem; they do not replace visual inspection. No interaction defect or new human finding. |
| Source/model caveats for #15 | Original annual suitability/fulfilment/KPI semantics cannot be reused unchanged. Archived GenAI-design date and benefit/payback qualifiers require author/team reconciliation. | [Rationale §3](../design/issue-12-design-rationale.md#3-route-and-model-decision-not-automatic-justification), original locators and [human model handoff](../design/issue-12-model-handoff.md#3-required-human-model-construction--export). These are not new measured business outcomes. |

Automated checks are reproducible with `node docs/validation/issue-12-artifact-check.mjs` using Playwright and an installed browser (instructions in the acceptance record). They stage ten synthetic variants at desktop/mobile widths, test correction/choice/receipt/pending guards, inspect layout/contrast and render the complete SVG. The final command output is linked from acceptance. **Neither a pass nor agent visual inspection fills the human-results table above.**

Historical artifact run on `1b69b5e81e2611ba548f30833895dbcee6eebd5f`: **39/39 PASS**, with 81 authored relative links/source/markup checks passing separately. Node v24.20.0, Playwright 1.62.1 and installed headless Chrome 155.0.8059.80 on macOS. Zero external requests and browser-storage records. Full diagram and all state variants were visually inspected, with representative captures retained. These are retained historical agent results, separate from Francis's later-received manual report and any live SAP/package run; the documentation continuation does not rerun them or extend their tested identity.

### Handoff to #9 / #15—not changes to another member's work

- **#9:** check comprehension of source/date/basis, keyboard correction/recovery and pending-choice invalidation in the integrated app, using its actual participant/heuristic evidence. This wireframe has related semantics but is not a replacement acceptance run or a report of newly reproduced app bugs.
- **#15:** retain Rae's benefit warning, distinguish selected direction from final Option 2/API-fit ratification, reconcile the original model/source chronology and economics, and use the actual #9/#10 results before pitch freeze. Do not promote this agent QA or the synthetic receipt into live/customer evidence.
