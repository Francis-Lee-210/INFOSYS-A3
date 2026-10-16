# Issue #33 acceptance evidence

17 October 2026 (NZDT). Current checks pin code commit `87aaaa42db00ccb8972d89b8af786d9f4e6bafc7` on PR #34,
which preserves Rae/Xuan's original head `b9bb772ab9ad3ec570259b3ec9f94d2eac3e9a52`
and integrates `main` at `28aee9d7390ce69a2a3476d151abe0f9458e2831`.
A later evidence-only commit may update this document and logs; the tested maintainer-file hashes are in
[the independent run record](issue-33-independent-run.json).

## Current results

- Full packaging suite: **56/56 PASS**, exit 0, including all original 37 cases and the macOS symlink checks.
  [Complete output](issue-33-package-test-results.txt).
- Independent committed-repository reproductions: **33/33 PASS**, exit 0. All fixture sources pass Node syntax checks;
  missing targets fail before output, and legal references/non-reference text package successfully.
  [Case sources, diagnostics checks and outcomes](issue-33-independent-repros.json).
- Real ZIP extracted into a fresh directory: `npm ci`, Chromium installation, and unfiltered `npm test` all exit 0;
  **167/167 browser groups PASS**. [Complete browser output](issue-33-browser-test-results.txt).
- Runtime: Node `v26.0.0`, npm `11.12.1`, `git version 2.50.1 (Apple Git-155)` on macOS.
  Browser filters/overrides and `SAP_APIKEY` were removed from the test environment. These are local checks;
  they do not claim a GitHub Actions run or a new live SAP acceptance.

The first unfiltered browser attempt used base port 9300 and passed 166/167; one fixture could not bind
`127.0.0.1:10000` (base + 700), already held by an unrelated local service.
[That complete failed-attempt output is retained](issue-33-browser-port-conflict-results.txt).
After preflighting ports 18100–19000, the same extracted package was rerun unfiltered with `PORT=18100`
and passed 167/167, exit 0. Both attempts are recorded in the machine record; no source or ZIP bytes changed.

## Original defect and review fixes

`browser.mjs` referenced `./issue-27.mjs` while the old fixed `PAYLOAD` omitted it, so a generated ZIP failed
with `ERR_MODULE_NOT_FOUND`. PR #32 restored that entry. Issue #33 adds prevention before any package output.
The PR review then reproduced four additional defects in the original regex guard: legal comments/quoted import
names could hide missing dependencies; comments/strings/template text/member calls could create false dependencies;
JavaScript string escapes were not decoded; and URL query/fragment suffixes were treated as filename characters.
The current guard uses a bounded lexical scanner for literal ESM references and native file-URL resolution.

## Acceptance matrix

| Criterion | Evidence | Result |
|---|---|---|
| All committed payload `.js`/`.mjs` are checked before output directory, temporary archive, ZIP or manifest creation | Guard remains after committed-blob content checks and before output operations; missing-target tests assert no output | PASS |
| Static, side-effect, re-export and literal dynamic imports are covered | Existing and new actual-packager tests, including comments, quoted names and import options | PASS |
| Missing/escaping relative references identify importer and target, with no ZIP/manifest | Original reproducer, decoded missing target, nested import and encoded traversal cases | PASS |
| Bare/built-in and non-literal dynamic imports are ignored | Existing external imports plus concatenated dynamic import case | PASS |
| Comments, ordinary strings, template text and member methods are ignored; real template expressions remain scanned | Packaging cases and independent context probes | PASS |
| String escapes decode without evaluating payload; ESM URLs map to actual files | Escaped slash/dot/codepoint/continuation, query/fragment and percent-encoded filename cases | PASS |
| Existing packaging integrity checks still pass | Full 56-case suite, including attributes, dirty payload, modes, symlinks, safe refs and exclusive outputs | PASS |
| Actual package remains usable | Exact 17-file verification plus clean extraction and 167 browser groups | PASS |

The scanner extracts references from valid JavaScript; it is not a full syntax validator. It does not evaluate
non-literal import arguments or add CommonJS resolution. No external parser/runtime dependency was added.
The lexical reference was supplied by a Codex audit agent and integrated/tested in the actual OpenCode session.
Its author reported 72 isolated lexical probes in the audit session; those are reference-author checks, not the
independent packager reproductions linked above. Separate Spec and Standards closure reviews found no actionable
findings and confirmed the original four P2 defects and the P3 evidence-separation issue were fixed.
The supported maintainer minimum remains Node 22; this run used the runtime stated above.

## Verification package and application freeze

This is a **guard verification artifact**, pinned to `87aaaa42db00ccb8972d89b8af786d9f4e6bafc7`:

- `plan-review-snapshot-billing-lite-87aaaa4.zip`: 100344 bytes; SHA-256 `5d5f1ee8c25cd92c21be3232be974ad29ba4e964fa75bacd270b52b6b3eec358`.
- ZIP CRC, exact entry set, regular-file modes, manifest sizes/hashes and all 17 extracted bytes were checked.
- All 17 file bytes match the tested commit, current integrated main and the existing accepted application freeze
  `463e409f6174e66b3438cad7a756b4bd24e96853`; source and archive hashes remained unchanged after browser tests.

Issue #10's accepted application package/freeze and its SAP evidence remain the existing delivery record.
This maintainer-tool verification does not replace that delivery or assert a repeated live SAP run.
The machine record includes commands' exit codes, environment scope and verification-artifact identity.

## Historical evidence and boundaries

The original OpenCode development rounds reported 34 then **36/36** packaging cases, based on #32 at `f6281c9`.
The original independent clean-package run reported **161/161** browser groups. Those are historical versions,
not the current counts. The original evidence remains in Git:
[acceptance at fa43dcb](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/fa43dcbb690ebef87f9c308abf8c6cdf0f910be1/docs/validation/issue-33-acceptance.md),
[36-case output at baba6f1](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/baba6f1f8291cabb8dbd5d52db4538b92971c2b2/docs/validation/issue-33-package-test-results.txt).

Before these fixes, independent review of original head `b9bb772` on a local main integration reproduced all
12 original adversarial cases (five missed missing targets and seven false refusals), while the existing suite
passed 37/37 and the unchanged application passed 167/167. This showed why passing the old suite was insufficient.
OpenCode then added 12 actual-packager regressions: the old guard passed 40/49 and failed nine; the current green
result is the version pinned above. The OpenCode record contains its own work and runs only:
[development record](../development/issue-33-opencode.md).
