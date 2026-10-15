# Issue #12 acceptance and remaining evidence

16 October 2026 NZDT. **Agent-executable design package prepared; mandatory human evidence remains pending. PR must remain draft.** Related to [#12](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/12), not an automatic issue closure. Starting main: **`7a368f529b60edae730afe2b8b1a0f9513d65e5e`** (includes #24 and its item-retry correction).

## Artifact index and independent use

| Artifact | Purpose |
|---|---|
| [Design rationale](../design/issue-12-design-rationale.md) | Primary-source index, original-to-Lite map, scope/Option boundary, current alternatives, visual choices and honest Design Thinking trace. |
| [Process adaptation SVG](../design/issue-12-process-adaptation.svg) | Readable new simplified process map, explicitly not BPMN/Signavio. |
| [Original TO-BE image](../design/issue-12-original-tobe.png) | Byte-identical extraction of Rae A2-D1 Figure 2, not a manufactured original. |
| [Model handoff](../design/issue-12-model-handoff.md) | Original model identity/limits, changed actors/steps and exact human Signavio construction/export requirements. |
| [Wireframe HTML](../design/issue-12-wireframes.html) | Standalone synthetic three-screen design simulation, version 1.0, no network/key/storage dependency. |
| [Walkthrough protocol/results](issue-12-walkthrough.md) | Ready-to-run neutral human protocol, all human fields pending, separate agent findings and rechecks. |
| [Development record](../development/issue-12-opencode.md) | Actual task/tool/source/iteration/QA record and limits. |
| [Artifact browser check](issue-12-artifact-check.mjs) / [source-link check](issue-12-source-check.py) / [captured results](issue-12-artifact-check-results.txt) | Reproducible checks of these new artifacts, not the application acceptance suite. |

Open `docs/design/issue-12-wireframes.html` directly in Chrome or another modern browser. No server, SAP key, login, deployment, account record or external service is required. Core controls stay within three screens; collapsed simulation setup is outside the user flow and stages the variants. A receipt exists only in the page's memory; reopening it **does not prove application persistence** and reloading clears it. Open the SVG at native size/zoom for the full map; the model handoff supplies a text equivalent and original source.

## Every Issue #12 criterion (original order)

“Agent-complete” means the authorised preparation is done, not that an external/human gate is satisfied. Earlier implementation test results are historical and were not rerun here.

| #12 criterion | Actual artifact / evidence | Status | Remaining dependency |
|---|---|---|---|
| 1. Genuine #11 choice, Pool v4/#4/#5 mapping; final #15 ratification | [Canonical dated #11 update](../../decisions/A3_Candidate_Comparison.md#11-dated-confirmation-update--16-october-2026-nzdt) records four posted accounts/signatures/timestamps/links and conditions. Rationale §§1/8 separates Pool listing, schema, historical live #5 and current app evidence. | Agent-complete; external final gate pending | #15 team ratification of actual final source/build/company/domain/route, using #10 rather than this simulation. |
| 2. Verify selected original A1/A2/TO-BE; map retained/changed/deferred mechanisms | Rationale §2's six-column map; four original Rae archive hashes checked; A1-D2 §8.2/Figure 4 and A2-D1 §4.3/Table 2, §4.4/Figure 2/Table 3 visually/textually inspected; A2-D2 slides 4–9/14–15 read. | Agent-complete | Author/team must reconcile noted source chronology/economics and final map with #15 evidence; no invented original project identity. |
| 3. Explicit unsupported claims / training data boundary | Rationale §§1–3 and wireframe explanation/meanings: no annual usage/compliance, GB/fit, eligibility, optimal recommendation, savings, payment or actual Spark account change. | Agent-complete | Human comprehension check and final pitch pruning still required; no outcome claim is made. |
| 4. Correct route-dependent model rules | Rationale §3 and model handoff §3 distinguish reusable Options 1/2, another member's existing solution, and wholly new solution needing both models. Specific archived Staff response retained with retrieval limits. | Agent-complete for disclosed rule interpretation | Current authenticated course amendments not accessible in this task; course owner/#15 should verify before freeze. Not Staff approval of Lite. |
| 5. Traceable readable model evidence / human Signavio boundary | Original byte-identical image + new labelled simplified SVG + provenance/text equivalent/change table/construction/export instructions. | Model/source preparation complete; formal-tool evidence not claimed | **Pending human/model owner:** verify original applicability and whether disclosed reuse/map suffices for the final route. If formal Signavio revision is required/adopted, supply actual construction/validation/readable exports and identity. Agent blueprint is not a tool-operation record or a universal Option 2 rebuild requirement. |
| 6. Actual empathise/define/ideate/prototype/test trace; no fabricated research | Rationale §6 distinguishes archived human peer, simulated GenAI, current needs/alternatives, newly authored artifacts and agent QA. Original 17 August design-date inconsistency is disclosed, not repaired by invention. | Partial — honest trace/artifact work complete | **Pending human:** actual walkthrough observations and any justified design change/recheck. No new interview/meeting/backdated chronology. |
| 7. Complete select → explain → intention/receipt design walkthrough, error and correction | Self-contained HTML demonstrates all steps/variants; protocol H1–H8 prepared in advance; separate artifact/browser checks exercise navigation/state/keyboard. | Partial — simulation and protocol complete | **Mandatory human result Pending — not yet conducted.** No participant, attributable comment, observed change or recheck is invented. |
| 8. Explain client need and visual choices; no framework scaffolding in flow | Rationale §§1/4/5, text/contrast/amount/date/source/historical notices and consistent Back/Continue/Confirm; setup is clearly separate, no rubric/audit IDs in the three-screen flow. | Agent-complete | Human understanding/appeal not proven by agent/automated checks. |
| 9. Independent early-design evidence; final #15 join, not app-suite rerun | HTML opens locally and uses only inline assets/memory; source/diagram/rationale independent of app runtime. Clearly labelled **current reconstruction/review**, not evidence it preceded the already-built app. | Agent-complete for independent artifact | #15 must reconcile this iteration with #9/#10 final build/usability. No application acceptance suite rerun here. |
| 10. Identify material scope/spec/route revision and obtain real decision before freeze | Rationale §3 flags substantial annual→single-record change and possible loss of business-purpose continuity; model handoff gives route-specific revision path. Existing direction confirmed, no new solution selected silently. | Guard/handoff prepared; final team gate pending | If team rejects Option 2 continuity, actual decision + #4/#12/#15/canonical/model changes are required before freeze. No procurement detour or assumed extension. |

## Actual validation scope and commands

Only the new documentation/model/wireframe artifacts are validated. No `app/` edits, app server, complete application test rerun, authenticated SAP request, deployment, Signavio operation, slides/video production or Canvas submission.

```sh
python3 docs/validation/issue-12-source-check.py
# Use installed Playwright or provide its external directory; no app test command:
PLAYWRIGHT_MODULE_PATH=<external-playwright-directory> \
  CHROME_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  CAPTURE_ISSUE12=1 node docs/validation/issue-12-artifact-check.mjs
git diff --check
```

`ISSUE12_QA_TMP` optionally selects a scratch directory for the inline-script syntax check. This execution used OpenCode's approved temporary directory, not repository build output. Runtime/browser, tested artifact identity, actual pass counts, source/link checks and visual notes are recorded with the final run below and in the [output file](issue-12-artifact-check-results.txt). Automated checks are not an actual human walkthrough or full accessibility audit.

### Focused screenshot evidence

- [Select / source / scope](issue-12-wireframe-select-desktop.png)
- [Explain / exact amount and partial detail](issue-12-wireframe-explain-desktop.png)
- [Conflict / Help-Later-only illustration](issue-12-wireframe-conflict-desktop.png)
- [Pending evidence / blocked confirmation](issue-12-wireframe-pending-mobile.png)
- [Failed connection versus empty](issue-12-wireframe-failure-mobile.png)
- [Historical receipt simulation](issue-12-wireframe-receipt-mobile.png)
- [Complete process map](issue-12-process-adaptation.png)

These are synthetic design screenshots, not application/live evidence or human-test results. Open the actual HTML and SVG for every state and readable native-scale text.

## Exact human/external handoff

1. **Walkthrough:** run the [neutral protocol](issue-12-walkthrough.md#ready-to-run-human-session) with a consenting real teammate/proxy. Record role, actual date/time, commit/version, scenarios, observable actions and attributable words, assistance/limits, resulting change (or reason for no change), and any actual recheck. All current result slots remain pending. Do not relabel agent inspection as a participant.
2. **Model:** original owner/human verifies applicability and records whether disclosed reuse/map is sufficient for the final route. If formal Signavio revision is required/adopted, follow [the handoff](../design/issue-12-model-handoff.md#3-required-human-model-construction--export), preserving original identity and updating a separate A3 copy. Supply actual model/version/validation identity, readable overview/detail export, BPMN XML where available and a genuine dated Signavio screenshot. Document access/export gaps; do not invent a universal Option 2 rebuilding requirement or tool proof.
3. **Ratification:** #15 team reviews the substantive scope reduction, source chronology/assumption caveats and actual #9/#10 evidence; ratify the final route or revise affected specification/models/canonical scope before freeze. Four #11 direction confirmations do not pre-approve these new artifacts or establish that gate.

PR status must be **draft / Related to #12** while these mandatory dependencies remain. No issue/assignee/approval state is changed by this task. The separate #9 owner retains integrated app/heuristic work; #10 retains real live/clean-package acceptance. This package supplies design findings for that later join, not completion of those tickets.
