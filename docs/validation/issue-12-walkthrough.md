# Issue #12 walkthrough: protocol, observations and evidence separation

**Artifact:** [standalone wireframe](../design/issue-12-wireframes.html), v1.0, authored 16 October 2026 NZDT. [Rationale/source map](../design/issue-12-design-rationale.md) · [Model handoff](../design/issue-12-model-handoff.md). This protocol is prepared **before requesting a human evaluation**. Human results: **Pending — not yet conducted**. Agent inspection and automated interaction checks are recorded separately below and do not satisfy that dependency.

## Ready-to-run human session

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

## Human results — Pending, not yet conducted

There is **no actual participant for this Issue #12 artifact yet**. #11 direction-confirmation comments and Rae's archived A1 interviews are not a walkthrough of these new wireframes.

| Result field | Current value |
|---|---|
| Actual participant role / prior familiarity | Pending — not yet conducted |
| Actual moderator / consent / date and timezone | Pending — not yet conducted |
| Artifact version / commit / browser/device used | Pending — not yet conducted |
| Tasks actually attempted / assistance given | Pending — not yet conducted |
| Observed behaviour and attributable comments | Pending — not yet conducted |
| Evidence-based change (or reason for no change) | Pending — not yet conducted |
| Actual recheck / outcome / remaining issue | Pending — not yet conducted |

### Copy-ready per-task record

| Actual date / role / artifact commit | Task / scenario | Observable action | Verbatim or explicitly paraphrased attributable comment | Interpretation / limitation | Change made and commit | Actual recheck |
|---|---|---|---|---|---|---|
| Pending — not yet conducted | Pending | Pending | Pending | Pending | Pending | Pending |

The user/team must fill only what actually occurred, keeping role (e.g. teammate/proxy) without unnecessary PII. If a task was skipped or no recheck occurred, say so. Attach useful annotated screenshots only with permission; no account details, real key, names/contacts or retrospective fabricated quotes. Commit the genuine record as a new change, then rerun artifact checks affected by any design change. Keep this PR draft until mandatory human/model evidence is addressed and #12 acceptance is reviewed; do not mark #9/#10 complete.

## Agent inspection and automated artifact checks

**Evaluator:** OpenCode agent, not a human participant. **Date:** 16 October 2026 NZDT. **Scope:** source extraction/visual reading, new process map and wireframe only. No full app acceptance suite, live SAP workflow, Signavio operation or customer interview.

| Finding | Actual agent observation / correction | Evidence / recheck |
|---|---|---|
| A01 Record selection lost useful focus | First browser artifact check failed `Selection must leave useful focus, not BODY`: rendering replaced the focused radio. Changed the wireframe to focus Review cost evidence after explicit selection. | First QA output retained in the task's temporary run record; subsequent scenario/keyboard checks pass this assertion. This is a wireframe correction, not a new #9 app finding. |
| A02 Ambiguous partial-currency copy | Source inspection found the partial-detail sentence used a generic “USD/EUR” placeholder. Replaced it with the selected header's actual synthetic currency. | Scenario checks inspect USD header; negative EUR correction path and visual inspection verify current labels. No human comprehension claim. |
| A03 Old receipt versus new selection | Inspection of the one-receipt flow identified that an older illustration could be shown after a different selection without an explicit “not recorded” note. Added that clarification while keeping original history unchanged. | Historical/changed-selection checks distinguish the old summary/source from the current record. The real app already has related history controls; no claim that #9 lacks them. |
| A04 Empty/error clarity in the new artifacts | Visual inspection found transport-jargon in the simulation failure copy and an over-broad failure heading beside the map's empty-result note. Shortened the user-facing recovery copy; E1 now explicitly separates failure recovery from a valid empty result. | Browser scenario checks retain the empty-versus-failed distinction and disabled financial review; complete diagram/viewport checks remain. This is agent visual/source inspection, not participant feedback. |
| QA capture limitation (not a design defect) | Playwright's HTML `fullPage` screenshot calculation timed out on a standalone SVG document after the other checks passed. Switched the diagram capture to its exact 1440×1840 canvas viewport, without changing the diagram or relaxing text-bound checks. | A separate actual-browser complete SVG viewport capture succeeded; final artifact run records the complete SVG check. |
| Source/model caveats for #15 | Original annual suitability/fulfilment/KPI semantics cannot be reused unchanged. Archived GenAI-design date and benefit/payback qualifiers require author/team reconciliation. | [Rationale §3](../design/issue-12-design-rationale.md#3-route-and-model-decision-not-automatic-justification), original locators and [human model handoff](../design/issue-12-model-handoff.md#3-required-human-model-construction--export). These are not new measured business outcomes. |

Automated checks are reproducible with `node docs/validation/issue-12-artifact-check.mjs` using Playwright and an installed browser (instructions in the acceptance record). They stage ten synthetic variants at desktop/mobile widths, test correction/choice/receipt/pending guards, inspect layout/contrast and render the complete SVG. The final command output is linked from acceptance. **Neither a pass nor agent visual inspection fills the human-results table above.**

Final artifact run on `1b69b5e81e2611ba548f30833895dbcee6eebd5f`: **39/39 PASS**, with 81 authored relative links/source/markup checks passing separately. Node v24.20.0, Playwright 1.62.1 and installed headless Chrome 155.0.8059.80 on macOS. Zero external requests and browser-storage records. Full diagram and all state variants were visually inspected, with representative captures retained; human evaluation is still **Pending — not yet conducted**.

### Handoff to #9 / #15—not changes to another member's work

- **#9:** check comprehension of source/date/basis, keyboard correction/recovery and pending-choice invalidation in the integrated app, using its actual participant/heuristic evidence. This wireframe has related semantics but is not a replacement acceptance run or a report of newly reproduced app bugs.
- **#15:** retain Rae's benefit warning, distinguish selected direction from final Option 2/API-fit ratification, reconcile the original model/source chronology and economics, and use the actual #9/#10 results before pitch freeze. Do not promote this agent QA or the synthetic receipt into live/customer evidence.
