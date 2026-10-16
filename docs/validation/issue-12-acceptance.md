# Issue #12 acceptance and remaining evidence

16 October 2026 NZDT. **One group-member manual walkthrough report received; detailed observations are limited.** Francis reported four task groups working normally and no wireframe change needed. PR remains draft for two precise #12 decisions: identify the reported missing/error/changed-evidence scenario and outcome, and obtain the model owner's identification/mapping/reuse decision (formal revision only if required/adopted). No eight-transcript requirement, full walkthrough replay or post-change recheck is imposed. **Related to #12; Closes #11 on merge** once this canonical update lands. #15's final ratification is downstream, not a prerequisite for #12's design handoff. Starting main: **`7a368f529b60edae730afe2b8b1a0f9513d65e5e`**.

**Integrated main:** `f829c6c` (concurrent PR #26/#9), included conflict-free by normal merge `f885d082bccad9814754032178f16ee6a8f17802`. Its application/earlier evidence changes are preserved, not authored or retested by #12. Final checks below concern only this design package; new repository instructions are applied, with [tool disclosure kept separately](../development/issue-12-tool-disclosure.md).

**Earlier documentation continuation at `70a157b`:** fast-forwarded the existing checkout from `0b36c40` to remote `5974528c38907caca858846416bec407fcb2c9ff`, preserving Francis's three commits and original report; merged main `203b200fd81cde6c49cb52d5be0afc5f1e4b89b5` normally as `c1a88ae425293f0cb7594e6bbae3980c815e79a3`. No app/source/visual artifact edits in that continuation. [Current implementation evidence checkpoint](../design/issue-12-design-rationale.md#7-implementation-cross-reference-read-only-inspection) distinguishes merged #30, closed-unmerged #31 and open #32/#34 with immutable identities. Older live/package evidence does not validate later repairs.

Documentation-only checks on **`05a3817c4d739910c8845a855806c167ede7275b`** are recorded separately in [issue-12-reconciliation.md](issue-12-reconciliation.md): **157 relative-link target checks**, source/hash/markup checks, preserved report/10 visual-artifact byte comparisons, protected-scope/ancestry checks and `git diff --check` passed. The original browser output and Francis report are retained unchanged; no browser/app/SAP/package execution was repeated.

**Current visual repair, 16 October:** fixed stale SVG status and the PNG's clipped bottom/duplicated heading; capture routine now establishes full 1440×1840 viewport before navigation, waits for fonts and stable frames, verifies consecutive captures and writes the PNG directly. Tested repair identity **`b1d4cb378e9f12e7450ff3ceae56445c3999e418`**: **39/39 artifact groups and 157 link-target checks passed**, plus source/hash/markup/syntax/whitespace checks. Full-size visual inspection confirms one heading, complete bottom status panel, readable model/source link and final footer, no clipping/duplicate band/overlap/scaling. [Repair closeout](issue-12-reconciliation.md#16-october-visual-review-repair-closeout) contains actual commands/output and preserved-scope checks. Earlier automation/byte equality did not establish PNG correctness. Only SVG/footer, PNG and capture script changed; business flow, HTML, original report and frozen sources did not. No human clarification has arrived, so the two precise draft conditions remain; #15 is still downstream.

## Artifact index and independent use

| Artifact | Purpose |
|---|---|
| [Design rationale](../design/issue-12-design-rationale.md) | Primary-source index, original-to-Lite map, scope/Option boundary, current alternatives, visual choices and honest Design Thinking trace. |
| [Process adaptation SVG](../design/issue-12-process-adaptation.svg) | Readable new simplified process map, explicitly not BPMN/Signavio. |
| [Original TO-BE image](../design/issue-12-original-tobe.png) | Byte-identical extraction of Rae A2-D1 Figure 2, not a manufactured original. |
| [Model handoff](../design/issue-12-model-handoff.md) | Original model identity/limits, changed actors/steps and exact human Signavio construction/export requirements. |
| [Wireframe HTML](../design/issue-12-wireframes.html) | Standalone synthetic three-screen design simulation, version 1.0, no network/key/storage dependency. |
| [Walkthrough protocol/results](issue-12-walkthrough.md) | Neutral H1–H8 protocol, bounded manual report, incomplete detailed human fields, and separate agent findings. |
| [Development record](../development/issue-12-opencode.md) | Actual task/tool/source/iteration/QA record and limits. |
| [Artifact browser check](issue-12-artifact-check.mjs) / [source-link check](issue-12-source-check.py) / [captured results](issue-12-artifact-check-results.txt) | Reproducible checks of these new artifacts, not the application acceptance suite. |

Open `docs/design/issue-12-wireframes.html` directly in Chrome or another modern browser. No server, SAP key, login, deployment, account record or external service is required. Core controls stay within three screens; collapsed simulation setup is outside the user flow and stages the variants. A receipt exists only in the page's memory; reopening it **does not prove application persistence** and reloading clears it. Open the SVG at native size/zoom for the full map; the model handoff supplies a text equivalent and original source.

## Every Issue #12 criterion (original order)

“Agent-complete” means the authorised preparation is done, not that an external/human gate is satisfied. Earlier implementation test results are historical and were not rerun here.

| #12 criterion | Actual artifact / evidence | Status | Remaining dependency |
|---|---|---|---|
| 1. Genuine #11 choice, Pool v4/#4/#5 mapping; final #15 ratification | [Canonical dated #11 update](../../decisions/A3_Candidate_Comparison.md#11-dated-confirmation-update--16-october-2026-nzdt) records four posted accounts/signatures/timestamps/links and conditions. Rationale §§1/7/8 separates listing, schema, #5 live and source-pinned later package evidence. | #12 selection/source input complete; #11 canonical update closes on merge | #15 later ratifies final source/build/company/domain/route. This is not an additional #11 gate or a requirement to complete all #15 work before #12's handoff. |
| 2. Verify selected original A1/A2/TO-BE; map retained/changed/deferred mechanisms | Rationale §2's six-column map; four original Rae archive hashes checked; A1-D2 §8.2/Figure 4 and A2-D1 §4.3/Table 2, §4.4/Figure 2/Table 3 visually/textually inspected; A2-D2 slides 4–9/14–15 read. | Agent-complete | Author/team must reconcile noted source chronology/economics and final map with #15 evidence; no invented original project identity. |
| 3. Explicit unsupported claims / training data boundary | Rationale §§1–3 and wireframe explanation/meanings: no annual usage/compliance, GB/fit, eligibility, optimal recommendation, savings, payment or actual Spark account change. | Documentation complete | Francis's summary does not demonstrate comprehension of every limitation; make no such claim. Final pitch pruning remains #15 work. |
| 4. Correct route-dependent model rules | Rationale §3 and model handoff §3 distinguish reusable Options 1/2, another member's existing solution, and wholly new solution needing both models. Specific archived Staff response retained with retrieval limits. | Agent-complete for disclosed rule interpretation | Current authenticated course amendments not accessible in this task; course owner/#15 should verify before freeze. Not Staff approval of Lite. |
| 5. Traceable readable model evidence / human Signavio boundary | Original byte-identical image + new labelled simplified SVG + provenance/text equivalent/change table/construction/export instructions. | Model/source preparation complete; formal-tool evidence not claimed | **Pending human/model owner:** verify original applicability and whether disclosed reuse/map suffices for the final route. If formal Signavio revision is required/adopted, supply actual construction/validation/readable exports and identity. Agent blueprint is not a tool-operation record or a universal Option 2 rebuild requirement. |
| 6. Actual empathise/define/ideate/prototype/test trace; no fabricated research | Rationale §6 distinguishes archived human peer, simulated GenAI, current design work and agent QA from Francis's genuine [manual report](issue-12-francis-manual-walkthrough-2026-10-16.md): four broad groups worked normally; no change needed. | Trace and bounded human Test finding recorded | No new quote, research, session date, tested commit or comprehension claim inferred. No change requested, hence no post-change recheck required. Criterion 7's specific coverage question remains separate. |
| 7. Complete select → explain → intention/receipt design walkthrough, error and correction | HTML supports all variants; Francis reports select/explain, return/change selection, attempt missing data/failure/changed evidence, intention/revisit receipt all working normally. | Partial only for missing/error scenario identification | Clarify **which third-group scenario was attempted and what happened**; the disjunction does not establish every H4–H7 variant or necessarily a missing/error case. H1–H8 transcripts and unavailable metadata are not mandatory. If needed, one targeted missing/error recovery supplement only; no default replay. |
| 8. Explain client need and visual choices; no framework scaffolding in flow | Rationale §§1/4/5, text/contrast/amount/date/source/historical notices and consistent Back/Continue/Confirm; setup is clearly separate, no rubric/audit IDs in the three-screen flow. | Agent-complete | Human understanding/appeal not proven by agent/automated checks. |
| 9. Independent early-design evidence; final #15 join, not app-suite rerun | HTML opens locally and uses only inline assets/memory; source/diagram/rationale independent of app runtime. Clearly labelled **current reconstruction/review**, not evidence it preceded the already-built app. | Agent-complete for independent artifact | #15 must reconcile this iteration with #9/#10 final build/usability. No application acceptance suite rerun here. |
| 10. Identify material scope/spec/route revision and obtain real decision before freeze | Rationale §3 flags substantial annual→single-record change; model handoff supplies route-specific revision path. Existing direction confirmed; this continuation does not change the solution or #4 contract. | Scope-change guard and design handoff complete | Final ratification belongs to #15. If later verification changes the solution, obtain the real decision and update affected artifacts before freeze; do not silently expand scope. |

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

### Historical executed artifact checks — before the visual repair

Tested artifact/code identity: **`1b69b5e81e2611ba548f30833895dbcee6eebd5f`**, after integration of main `f829c6c`. macOS; **Node v24.20.0**, **Playwright 1.62.1**, installed headless **Chrome 155.0.8059.80**. The earlier development iterations used Chrome 155.0.8059.40; the final captured browser reports .80. No version is inferred from the old app logs.

- **39/39 artifact groups PASS**, unfiltered: ten states at 1280/1366/390px, three pending-resolution outcomes, correction/credit/stale manual result, history across failed source, old-receipt/new-selection notice, keyboard navigation, structure/selected-palette contrast and full SVG rendering. External requests **0**; browser-storage records **0**.
- **81 authored relative file/anchor links PASS**; HTML parser/unique IDs/three-screen structure and both SVG XML checks pass. All four Rae manifest counts/hashes, v4/spec/V3 hashes and byte-identical original-model extraction pass. External authenticated-source limits remain disclosed, not marked verified by these checks.
- Inline JavaScript and artifact-check syntax pass. Selected normal-text palette ratios: **15.24, 7.17, 10.17, 8.68, 8.32**, all above 4.5:1; this is not a full accessibility certification.
- Visually inspected the complete new map, the existing comparison matrix and the primary original model images. Inspected every wireframe variant/screen, including temporary full-state captures for not-checked/unavailable/absent/complete, invalid/empty, loaded selection, conflict, ordinary decision and changed-selection history. Kept only seven useful screenshot files below; no clipping/overlap/page overflow observed in the inspected design states. All labels/limitations and focus routes agree with the map/rationale.
- **Application suite deliberately not run.** App, frozen sources and earlier evidence are byte-unchanged relative to integrated main. `git diff --check` passes. Subsequent updates record results/links/screenshots only, not changed wireframe/process/QA logic.

These historical outcomes concern only that tested artifact identity. Francis's report is separate human evidence, not another automated pass or live test. Current draft status rests on the two precise #12 gaps above, not on completing #15 or generating more transcripts.

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

1. **Walkthrough clarification only:** preserve the [original report](issue-12-francis-manual-walkthrough-2026-10-16.md). Ask which missing-data/failure/changed-evidence scenario was attempted and what happened; record any answer as a dated sourced supplement, identifying recollection versus contemporaneous notes. If a required missing/error case was not attempted, use one targeted task, not a repeat of the full session. Optional session/browser/artifact details, assistance, amount/intention interpretation and further support for no-change may remain “not recorded”. No wireframe change was requested on the four groups; no post-change recheck is due. See the [criterion-level assessment](issue-12-walkthrough.md#16-october-evidence-assessment-against-actual-12-criterion-7).
2. **Model:** original owner/human verifies applicability and records whether disclosed reuse/map is sufficient for the final route. If formal Signavio revision is required/adopted, follow [the handoff](../design/issue-12-model-handoff.md#3-required-human-model-construction--export), preserving original identity and updating a separate A3 copy. Supply actual model/version/validation identity, readable overview/detail export, BPMN XML where available and a genuine dated Signavio screenshot. Document access/export gaps; do not invent a universal Option 2 rebuilding requirement or tool proof.
3. **Ratification:** #15 team reviews the substantive scope reduction, source chronology/assumption caveats and actual #9/#10 evidence; ratify the final route or revise affected specification/models/canonical scope before freeze. Four #11 direction confirmations do not pre-approve these new artifacts or establish that gate.

PR remains **draft / Related to #12** pending the scenario clarification and bounded model-owner decision, not all of #15. **Closes #11 on merge:** its remaining criterion is this warranted canonical decision update, not the #12 walkthrough or #15 audit. No manual issue closure, assignee change or approval is performed. The separate implementation/package tasks retain their code and execution evidence; this package supplies design findings, not new acceptance of those tasks.
