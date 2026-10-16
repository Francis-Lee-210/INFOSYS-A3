# Issue #12 documentation reconciliation — 16 October 2026 NZDT

Documentation/source validation by the OpenCode agent, **not a new independent human evaluation, application acceptance run or live SAP test**. [Current acceptance](issue-12-acceptance.md) · [Human report](issue-12-francis-manual-walkthrough-2026-10-16.md) · [Coverage assessment](issue-12-walkthrough.md#16-october-evidence-assessment-against-actual-12-criterion-7) · [Process record](../development/issue-12-opencode.md).

**Current scope:** the earlier documentation-only continuation below ended at `70a157b`. Its unchanged-visual comparisons are historical byte checks, not a guarantee of correct raster output. The subsequent SVG/PNG/capture-script repair and new run are recorded in the dated closeout below; earlier raw outputs and human report remain intact.

## Preserved identities and evidence separation — earlier continuation at `70a157b`

- Existing branch `docs/12-billing-design-adaptation`, original checkout. Clean local head `0b36c40` fast-forwarded to **`5974528c38907caca858846416bec407fcb2c9ff`**, retaining Francis's three commits. Original manual report preserved unchanged from that remote commit; report date **16 October NZDT**, actual session date/time and tested artifact commit **not recorded**.
- Main **`203b200fd81cde6c49cb52d5be0afc5f1e4b89b5`** normally merged as **`c1a88ae425293f0cb7594e6bbae3980c815e79a3`**, conflict-free. All incoming application, packaging and evidence commits remain. No unmerged branch imported.
- PR #28 had no submitted reviews or comments when inspected. #11 has four actual direction confirmations; #12/#15 have no comments. No later model-owner review of these artifacts was present in those checked discussions. This is not a claim about unreported private conversations.
- Human report: four broad groups worked normally; no wireframe change requested. The report does not identify which missing/error/changed-evidence variant was tried, establish assistance or financial-limit comprehension, or prove live access/persistence. No post-change recheck is due because no change was requested. H1–H8 is a prepared protocol, not eight mandatory transcripts.
- Historical **39/39 artifact groups / 81 links** belong to **`1b69b5e81e2611ba548f30833895dbcee6eebd5f`**. HTML/SVG/images are unchanged; that result is retained, not rerun or reassigned to Francis's unknown tested commit.
- [Rationale §7](../design/issue-12-design-rationale.md#7-implementation-cross-reference-read-only-inspection) pins merged #30, closed-unmerged #31, open #32 and open #34 separately. #30's source `c9914cc` / ZIP SHA-256 `5ae2d5a14c806d8a76cd3de28e4828f29dc19a456db046ef9b770784cabaa7c7` is not evidence for #32's repair source `093f5f0` / ZIP SHA-256 `c25057ab068854765681e6c0109c9fff42eced9af5db33e7dbe7eda6c8cad17d`. No SAP/package/application execution was performed here.

## Validation scope — earlier documentation-only continuation

Run the existing read-only check, extended to the preserved human report, all current Issue #12 Markdown, and current README/decision sections:

```sh
python3 docs/validation/issue-12-source-check.py
git diff --check
git diff --check origin/main...HEAD
```

Also compare the manual report byte-for-byte with `5974528`, visual artifacts with `5974528`, and protected application/source/prior-evidence paths with integrated main. Check all four team-confirmation links/timestamps remain present; verify remote/local ancestry and PR draft/diff on publication. No full application suite is appropriate for documentation-only edits; no changed HTML/SVG requires new artifact browser runs or visual inspection.

### Actual execution on `05a3817c4d739910c8845a855806c167ede7275b`

macOS; Python **3.13.9**. `python3 docs/validation/issue-12-source-check.py` exited 0:

```text
PASS all 4 Rae archive byte counts / manifest SHA-256 values
PASS original TO-BE extraction equals DOCX and PPTX embedded bytes; SHA-256 c34cbcd44fdc667d6744d43b0f3ed5f623dcb2cacd137d2d8fdb3a10fd0e7ac3
PASS preserved Pool v4, official request specification and archived V3 hashes
PASS adaptation and existing matrix SVG XML parse; title/description present
PASS HTML parser / unique static IDs / three-screen and separate setup structure
PASS 157 authored relative file/anchor links (historical unbundled references not re-audited)
Source/markup/link checks complete. No API, application suite, Signavio or human evaluation performed.
```

The 157 checks include repeated target occurrences, not 157 distinct files. Historical unbundled source references are not certified. Existing hash values/old test logs remain unchanged. Read-only Python/Git assertions additionally passed:

- `git merge-base --is-ancestor` for `0b36c40`, Francis's `0ca0841`/`bf8625f`/`5974528`, `origin/main`, and the earlier Rae implementation ancestors `498e15d`/`4ab2005`.
- Byte comparison with `git show 5974528:<path>`: original Francis report unchanged, SHA-256 **`3b3214f1cc56d0418fea79659cd3f1815fceaa8847ad8a34d45dcdfd309edf14`**; all **10 HTML/SVG/image artifacts unchanged**. No affected browser run or new visual inspection required/performed.
- `git diff --exit-code origin/main HEAD -- app tools resources references candidates AGENTS.md docs/agents README-SOURCE.md Specification-and-Rubric.docx`: clean. Complete NUL-delimited PR file-list assertion: **24 intended documentation/artifact files**, no other task's historical logs changed.
- All **four original #11 comment URLs and exact UTC timestamps** still present in the canonical comparison, checked against the fetched issue record.
- Python source-check syntax via in-memory `compile(...)`: pass, no generated cache file. `git diff --check` and `git diff --check origin/main...HEAD`: pass. Working tree clean at the tested commit.
- New commit naming check uses `git rev-list HEAD ^5974528 ^origin/main`, covering only this continuation's own commits. An initial overly broad traversal included inherited historical main commit names and tripped the assertion; corrected the **metadata check's scope**, not any history. Own conventional names pass; historical names/disclosures are preserved.

Subsequent result-recording edits do not change the HTML/SVG/images, source-check logic or original human report. No full application suite, packaging suite or SAP request was run. PR draft/head/closure metadata is verified again on publication; historical output files are not edited.

## 16 October visual-review repair closeout

### Review source, actual repair and limits

The user's continuation prompt relayed an independent review at **`70a157b0b7cef98423ec19d80e5607425e5ac2f2`**: **39/39 artifact groups, 157 link checks, hashes and whitespace passed**, yet the SVG status was stale and its PNG clipped the bottom/repeated the heading. Those are the reviewer's results at that identity, not new agent runs. Direct image inspection confirmed the raster defect. Earlier DOM bounds and source/link checks did not detect it; historical visual-completeness claims are superseded for this export, not used to dismiss the review.

Clean original checkout remained on the existing branch at `70a157b`; fetched remote matched it and main stayed `203b200`. No merge was needed. Re-read the original Francis report, current #11/#12/#15 and PR #28 reviews, general and inline comments: no new scenario clarification or model-owner response. No human activity was restarted or fabricated.

Repair commit: **`b1d4cb378e9f12e7450ff3ceae56445c3999e418`**, `fix(design): correct process diagram status and export`:

- SVG footer now says Francis's report is received, specific missing/error clarification and model-owner review remain pending, and formal revision/export is conditional on the route and recorded decision. Reflowed the panel/footer within the unchanged 1440×1840 canvas. No business-flow, source-mapping or scope change; still explicitly simplified notation, not BPMN/Signavio.
- Capture routine derives dimensions from the SVG, constructs a device-scale-1 full-canvas context **before navigation**, awaits load, `document.fonts.ready` and two animation frames, captures without resize/full-page calculation, and checks two consecutive screenshots for identical bytes and correct PNG dimensions. `CAPTURE_ISSUE12_SVG=1` regenerates only this export; unchanged wireframe screenshots are not overwritten. This stability check still does not prove raster semantics; visual inspection is necessary.
- PNG generated directly from the corrected SVG in Chrome, not patched/spliced or copied from the diagnostic reference. A repeat run at the committed repair reproduced its bytes exactly.

### Actual run at `b1d4cb378e9f12e7450ff3ceae56445c3999e418`

macOS; Node **v24.20.0**, Playwright **1.62.1**, installed headless Chrome **155.0.8059.80**. Commands (external dependency and approved scratch directories, no app server):

```sh
ISSUE12_QA_TMP=/private/var/folders/gr/c764x1r91mgcd2r25jm77cn40000gn/T/opencode \
PLAYWRIGHT_MODULE_PATH=/private/var/folders/gr/c764x1r91mgcd2r25jm77cn40000gn/T/opencode/receipt-review-tools/node_modules/playwright \
CHROME_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
CAPTURE_ISSUE12_SVG=1 node docs/validation/issue-12-artifact-check.mjs
python3 docs/validation/issue-12-source-check.py
node --check docs/validation/issue-12-artifact-check.mjs
git diff --exit-code HEAD -- docs/validation/issue-12-process-adaptation.png
git diff --check
git diff --check origin/main...HEAD
```

All exited 0. Complete browser output from the committed-repair run:

```text
Artifact QA only; Node v24.20.0; Chrome/Chromium 155.0.8059.80; widths 1280/1366/390; synthetic memory-only interactions.
PASS design scenario partial at 1280px
PASS design scenario not-checked at 1280px
PASS design scenario unavailable at 1280px
PASS design scenario absent at 1280px
PASS design scenario complete at 1280px
PASS design scenario conflict at 1280px
PASS design scenario pending at 1280px
PASS design scenario empty at 1280px
PASS design scenario failed at 1280px
PASS design scenario invalid at 1280px
PASS design scenario partial at 1366px
PASS design scenario not-checked at 1366px
PASS design scenario unavailable at 1366px
PASS design scenario absent at 1366px
PASS design scenario complete at 1366px
PASS design scenario conflict at 1366px
PASS design scenario pending at 1366px
PASS design scenario empty at 1366px
PASS design scenario failed at 1366px
PASS design scenario invalid at 1366px
PASS design scenario partial at 390px
PASS design scenario not-checked at 390px
PASS design scenario unavailable at 390px
PASS design scenario absent at 390px
PASS design scenario complete at 390px
PASS design scenario conflict at 390px
PASS design scenario pending at 390px
PASS design scenario empty at 390px
PASS design scenario failed at 390px
PASS design scenario invalid at 390px
PASS decision refresh clears old choice; resolution partial
PASS decision refresh clears old choice; resolution conflict
PASS decision refresh clears old choice; resolution unavailable
PASS correction / negative exact amount / obsolete manual result
PASS historical provenance survives another failed scenario
PASS another selection is explicitly not recorded in the old receipt
PASS keyboard select / explain / confirm / return routes
Measured text contrast ratios: 15.24, 7.17, 10.17, 8.68, 8.32
PASS HTML structure / no external resources / readable palette contrast
Process PNG: 1440x1840; viewport set before navigation; fonts ready; two stable captures identical. Visual inspection required.
PASS complete process SVG renders with all text within its canvas
All 39 artifact groups passed. External requests: 0. Browser storage records: 0. Application acceptance suite not run. No human walkthrough or Signavio action claimed.
```

Source/link output at that same repair identity:

```text
PASS all 4 Rae archive byte counts / manifest SHA-256 values
PASS original TO-BE extraction equals DOCX and PPTX embedded bytes; SHA-256 c34cbcd44fdc667d6744d43b0f3ed5f623dcb2cacd137d2d8fdb3a10fd0e7ac3
PASS preserved Pool v4, official request specification and archived V3 hashes
PASS adaptation and existing matrix SVG XML parse; title/description present
PASS HTML parser / unique static IDs / three-screen and separate setup structure
PASS 157 authored relative file/anchor links (historical unbundled references not re-audited)
Source/markup/link checks complete. No API, application suite, Signavio or human evaluation performed.
```

### Visual inspection and preservation

Agent opened the actual regenerated **1440×1840 PNG at full image dimensions, including the bottom**: heading appears once; L1–L8/E1–E4 unchanged; the full bottom panel, conditional-status lines, model/source link and final footer are present/readable. No clipped edge, duplicate top band, overlap or unexpected scaling observed. This is agent visual inspection of a diagram export, not a participant finding or approval. Status/export-only changes do not require repeating Francis's interaction walkthrough.

New SHA-256 values: SVG **`ee91bc91b013458347732c5731e6deb419584037a6cb495b1f6e31cbed188d5a`**; PNG **`d211f0138e354a40d54c6c85f841bda973995060e828ffa9f9cf0f9f9e74c9e0`**; capture script **`5e3782c03ee3a721ef5a5dd99e5906374eac40841841a772f36d6fb879c07ed4`**. The old “all visual artifacts unchanged” assertion does not describe this repair. HTML, original-model PNG, six wireframe screenshots, Francis's report and original/frozen sources remain unchanged. No full application suite, SAP call, packaging work or Signavio operation; no human/model answer invented. Later edits record results/current summaries only, not new SVG/capture logic.

**Post-repair documentation checks:** the same source/link command passes **161 relative-link target checks** after four closeout cross-links were added (157 at the repair commit plus four links; no source-check logic change). In-memory Python/Git assertions confirm raw outputs above recorded verbatim; Francis report bytes/hash unchanged; all **8 other HTML/original-model/wireframe screenshot artifacts unchanged**; SVG bytes above the footer unchanged; original authors/main ancestry preserved; protected `app/`, `tools/`, `resources/`, `references/`, `candidates/`, instructions, source README and V3 specification equal integrated main; old artifact output and source-check script unchanged. `git diff --check` and the PR-range whitespace check pass. The final documentation-recording revision is checked again before push; no new browser results are assigned to that later documentation identity.

## Remaining requirements, not repeated human work

1. Clarify the **specific third-group state and outcome** from Francis's report. Record any answer as a dated sourced supplement, marking recollection versus contemporaneous notes. If no required missing/error case was attempted/established, propose one short targeted supplement only. Session/runtime/artifact identity and assistance/interpretation details are optional if known, otherwise “not recorded”.
2. Model owner verifies **original TO-BE identification, mapping fidelity and whether original export plus disclosed adaptation suffices** or a formal revision is required/adopted. Only the latter requires following the existing construction/export handoff. No universal Option 2 rebuilding requirement.

PR #28 remains draft / **Related to #12** for those precise gaps. Its canonical update supports **Closes #11 on merge**, with all original confirmations, fallback, benefit qualification and personal A1/A2 preservation. #15 final ratification is downstream; do not make its entire audit a prerequisite for completed design evidence. No PR merge or manual issue closure.
