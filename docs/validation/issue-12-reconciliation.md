# Issue #12 documentation reconciliation — 16 October 2026 NZDT

Documentation/source validation by the OpenCode agent, **not a new independent human evaluation, application acceptance run or live SAP test**. [Current acceptance](issue-12-acceptance.md) · [Human report](issue-12-francis-manual-walkthrough-2026-10-16.md) · [Coverage assessment](issue-12-walkthrough.md#16-october-evidence-assessment-against-actual-12-criterion-7) · [Process record](../development/issue-12-opencode.md).

## Preserved identities and evidence separation

- Existing branch `docs/12-billing-design-adaptation`, original checkout. Clean local head `0b36c40` fast-forwarded to **`5974528c38907caca858846416bec407fcb2c9ff`**, retaining Francis's three commits. Original manual report preserved unchanged from that remote commit; report date **16 October NZDT**, actual session date/time and tested artifact commit **not recorded**.
- Main **`203b200fd81cde6c49cb52d5be0afc5f1e4b89b5`** normally merged as **`c1a88ae425293f0cb7594e6bbae3980c815e79a3`**, conflict-free. All incoming application, packaging and evidence commits remain. No unmerged branch imported.
- PR #28 had no submitted reviews or comments when inspected. #11 has four actual direction confirmations; #12/#15 have no comments. No later model-owner review of these artifacts was present in those checked discussions. This is not a claim about unreported private conversations.
- Human report: four broad groups worked normally; no wireframe change requested. The report does not identify which missing/error/changed-evidence variant was tried, establish assistance or financial-limit comprehension, or prove live access/persistence. No post-change recheck is due because no change was requested. H1–H8 is a prepared protocol, not eight mandatory transcripts.
- Historical **39/39 artifact groups / 81 links** belong to **`1b69b5e81e2611ba548f30833895dbcee6eebd5f`**. HTML/SVG/images are unchanged; that result is retained, not rerun or reassigned to Francis's unknown tested commit.
- [Rationale §7](../design/issue-12-design-rationale.md#7-implementation-cross-reference-read-only-inspection) pins merged #30, closed-unmerged #31, open #32 and open #34 separately. #30's source `c9914cc` / ZIP SHA-256 `5ae2d5a14c806d8a76cd3de28e4828f29dc19a456db046ef9b770784cabaa7c7` is not evidence for #32's repair source `093f5f0` / ZIP SHA-256 `c25057ab068854765681e6c0109c9fff42eced9af5db33e7dbe7eda6c8cad17d`. No SAP/package/application execution was performed here.

## Validation scope

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

## Remaining requirements, not repeated human work

1. Clarify the **specific third-group state and outcome** from Francis's report. Record any answer as a dated sourced supplement, marking recollection versus contemporaneous notes. If no required missing/error case was attempted/established, propose one short targeted supplement only. Session/runtime/artifact identity and assistance/interpretation details are optional if known, otherwise “not recorded”.
2. Model owner verifies **original TO-BE identification, mapping fidelity and whether original export plus disclosed adaptation suffices** or a formal revision is required/adopted. Only the latter requires following the existing construction/export handoff. No universal Option 2 rebuilding requirement.

PR #28 remains draft / **Related to #12** for those precise gaps. Its canonical update supports **Closes #11 on merge**, with all original confirmations, fallback, benefit qualification and personal A1/A2 preservation. #15 final ratification is downstream; do not make its entire audit a prerequisite for completed design evidence. No PR merge or manual issue closure.
