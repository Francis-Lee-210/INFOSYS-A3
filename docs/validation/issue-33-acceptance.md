# Issue #33 acceptance evidence

16 October 2026. Branch `fix/packager-import-integrity`, based on `f6281c9` (head of #32, branch
`codex/receipt-recovery-source-sync`). Only `tools/package-source.mjs` and `tools/tests/package-source.mjs` change.

Packaging suite output: [issue-33-package-test-results.txt](issue-33-package-test-results.txt) — **36/36 PASS**
(28 existing cases unchanged + 8 new). macOS, Node v22.18.0.

## Original defect

With #29 and #30 both on `main`, `browser.mjs` imported `./issue-27.mjs` but the fixed `PAYLOAD` list did not include it.
The packager still produced a ZIP, and the extracted `npm test` failed with `ERR_MODULE_NOT_FOUND`. #32 added the entry;
this change makes the same miss fail at packaging time.

## Acceptance matrix

| Criterion | Evidence | Result |
|---|---|---|
| Local module references are checked before any output is written | Check runs after the content scan and before `mkdir`, `git archive` or any temp/final file | PASS |
| Static, side-effect, re-export and string-literal dynamic imports are covered | New packaging cases for each form | PASS |
| A miss names the importing file and the missing target, and writes nothing | Regression cases assert non-zero exit, both names in stderr, and no ZIP/manifest | PASS |
| Repository-escaping relative imports are rejected | `../../outside.mjs` case | PASS |
| Bare/built-in specifiers and non-literal `import()` are ignored | Passing case with `node:*`, `playwright`, `import(variable)` | PASS |
| Imports after `export`, `import.meta` or a non-literal `import()` are not hidden | Regression case with all three statement orders | PASS |
| Real repository still packages and the extracted package works | See below | PASS |

## Real-repository checks

- Packaging this branch produced **17 entries**; extracting it into a fresh directory, running `npm ci` and the unfiltered
  browser suite gave **161/161 PASS**.
- Reproduction: removing `app/tests/issue-27.mjs` from `PAYLOAD` in a throwaway worktree made the packager exit 1 with
  `payload module app/tests/browser.mjs imports ./issue-27.mjs -> app/tests/issue-27.mjs, which is not in the payload`;
  the output directory was not created.
- The local references found in the real payload match a plain text search of its `import … from './…'` lines.

## Independent verification

Outside the OpenCode session, each round was reviewed; the first round's import pattern was tested directly with Node
against three statement orders and found to miss imports hidden behind an earlier `export`, `import.meta` or non-literal
`import()`. That finding was returned to the same session. Each code commit was checked out in a separate worktree and the
packaging suite re-run (28 → 34 → 34 → 36).
