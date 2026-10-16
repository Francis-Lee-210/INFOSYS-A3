# Issue #10: OpenCode development record

16 October 2026. Session `ses_ebe2a7a6effe8GTGhdYP6IocPO`, base `f829c6c9f1107652e0affa9c894eca962e75662c` (merged PR #26), branch
`codex/issue-10-source-handoff`. This record describes only actual OpenCode
work performed in this session; it makes no claim about parent's future
verification. Original packaging suite result (16 passed) and the prior
repair result (24 passed) are kept historical; the final suite result is
28 passed / 0 failed.

## Execution and history

- Re-read AGENTS.md, `app/server.js`, `app/lib/config.js`, `app/package.json`,
  `app/README.md`, and `app/index.html` (UI labels: "Connect to live SAP
  sandbox", "Review cost evidence", "Continue to decision", "Confirm intent",
  "Reset demo", "Confirm reset").
- Generated `app/package-lock.json` via `npm install --package-lock-only
  --ignore-scripts` in `app` for the existing exact Playwright 1.62.1; did not
  modify `app/package.json`. `node --check` passed.
- Rewrote `tools/package-source.mjs` to address independent review findings:
  - After `git archive`, independently validates the produced ZIP artifact
    (exact entry list limited to the fixed prefix plus ancestor directories,
    regular-file modes/no symlinks, no traversal, uncompressed per-entry
    bytes/SHA-256 equal to the planned payload blobs) before writing any final
    output. This neutralizes `.git/info/attributes` and committed
    `.gitattributes` export-ignore (drops a file) and export-subst (rewrites
    bytes). Uses `unzip` only; no custom ZIP writer; safe execFileSync
    argument arrays.
  - Extended the conservative credential scanner to match both unquoted and
    quoted property keys/values (JS object and JSON forms, including
    `APIKey`/`SAP_API_KEY` variants). Code expressions, mere header names and
    fictional sentinels keep passing; errors print only path/category, never
    credential literals; not a complete secret detector.
  - Inspects `git ls-tree` modes at the resolved commit and accepts only
    regular 100644/100755 blobs, so an old `--ref` commit storing a payload as
    a symlink is rejected even when HEAD holds a clean regular file.
  - Refuses missing `--ref`/`--output-dir` values; uses `rev-parse
    --end-of-options` so option-looking refs are treated as revisions (git
    2.50.1).
  - Existing-output detection uses `lstat` so a dangling symlink counts as
    existing and is refused, not followed.
  - Uses exclusive write flags (`wx`) so a concurrent-created output cannot be
    overwritten; removes only the archive this process itself exclusively
    created if the manifest sidecar write fails, never somebody else's output.
  - Keeps the dirty/untracked/symlink/missing payload refusals. Console output
    prints package path / entry count / archive hash only, never content.
- Rewrote `tools/tests/package-source.mjs` (27 cases): all prior 24 cases
  plus quoted JS object credential refusal, quoted JSON credential refusal, and
  committed `.gitattributes` export-ignore refusal. Clean repo produces ZIP and
  manifest with verified entry bytes/hashes; dirty, untracked-required, missing,
  symlinked payload refused; private key, real-looking credential, quoted-key
  credential, and raw OData dump refused before outputs; clearly fictional
  SENTINEL not flagged; existing archive/manifest not overwritten; dangling
  symlink at output path refused (lstat); pre-existing output not touched
  (exclusive write); different output dir allowed; `--ref` pins commit content
  and old-symlink/new-regular regression passes; unresolvable ref refused;
  refuses outside a git repo; untracked `.env`/probe/decoys never leak;
  export-ignore (both `.git/info/attributes` and committed `.gitattributes`)
  and export-subst regressions rejected before outputs via actual ZIP
  validation; missing `--ref`/`--output-dir` values refused. All temp repos are
  created with test-only author metadata (`-c` flags only, no global git
  config), removed recursively in a finally block and via process `exit`/
  `uncaughtException`/`unhandledRejection` handlers (including on unexpected
  exceptions), and directories are made with `fs.mkdirSync` recursive (no
  external `mkdir` spawn). Verification is through externally observable
  results (exit code, produced files, archive listing/extraction), not an
  exported internal helper contract. No decoys are created in the real project;
  no network/SAP/browser use.
- Updated `.gitignore` to ignore `release/` and `*.manifest.json`.
- Rewrote `README-SOURCE.md` as self-contained evaluator instructions: package
  identity (base `f829c6c` is the dependency/base, package `sourceCommit` is
  newer and must not be forced to equal it), exact POSIX and PowerShell
  extraction into a new empty dir then `cd .../plan-review-snapshot-billing-lite/app`,
  ZIP and sidecar adjacent (no mysterious `release/` subdirectory), `shasum -a
  256` (macOS) / `sha256sum` (Linux) / `Get-FileHash`, choose exactly one
  package with globs, key entered in the password input before Connect with a
  locally supplied course sandbox key from SAP Business Accelerator Hub (no
  invented navigation), actual UI controls
  (Review cost evidence → Continue to decision → intent → Confirm intent,
  receipt heading/read-back verified, then refresh/reopen and Reset demo/
  Confirm reset), credential cleared from memory/input while the minimal receipt
  (metadata/amounts/limits/provenance, no raw response/names/contacts) persists,
  explicit `unset TEST_FILTER CAPTURE_*` / `Remove-Item Env:...` before
  unfiltered `npm test`, quoted space-containing Chrome path, collision-free
  test `PORT`, tests-only downloads, concise actual limitations, and absolute
  upstream evidence links pinned to the base. Removed subjective proxy language
  beyond required TLS verification and internal "parent" workflow language.
- Verification: `node --check` passed for both `.mjs` files; `git diff --check`
  clean; the packaging acceptance suite passed **28 passed / 0 failed of 28**;
  a committed copy of the real payload packaged successfully (16 entries,
  manifest bytes/SHA-256 verified); quoted-JS, quoted-JSON, `.git/info/attributes`
  and committed `.gitattributes` and equal-size export-subst regressions were
  confirmed rejected before outputs. No app runtime/test files or older evidence
  were modified. No git commit/push/branch changes, no GitHub mutations, no SAP
  reads, no credentials, no browser use, no screenshots, no fabricated results.
  The final commit/archive/clean-run and live evidence remain with the parent.


## Reviewed final correction

OpenCode applied the supplied review patch: artifact comparison uses exact Buffer equality, including equal-size export-subst; failure throws through owned temporary-file cleanup; the README uses complete extraction paths, correct receipt/key semantics and actual controls. Generated-output ignores are scoped to release/. Independent acceptance remains in the separate validation record.

## PR29 sync preparation (bounded, pre-integration)

OpenCode added `app/tests/issue-27.mjs` to the explicit PAYLOAD allowlist in both `tools/package-source.mjs` and `tools/tests/package-source.mjs` (17 payload entries total) and updated README-SOURCE counts accordingly (17 payload paths; four browser test modules). `app/tests/issue-27.mjs` is now present in this worktree (implemented and independently reviewed by another OpenCode session); no placeholder was created. No app files, lockfile, validation evidence, .gitignore, branches or Git history were changed. No GitHub, SAP/key, browser or live acceptance actions were taken. Independent full acceptance and the final source commit/archive identity remain with the parent after PR29 integration.

## README finish and source-sync verification (this session)

Session `ses_ebe2a7a6effe8GTGhdYP6IocPO` on branch `codex/receipt-recovery-source-sync`. OpenCode finished README-SOURCE.md: updated the dependency/source identity to merged main `203b200fd81cde6c49cb52d5be0afc5f1e4b89b5` (PR #30 source package) plus the reviewed receipt recovery repair `81099ce4ff37564dec7099687726a3ed5dd10e41` carried by this follow-up source freeze, kept the historical B0/contract links pinned to `f829c6c9f1107652e0affa9c894eca962e75662c` labelled historical (not claiming byte-identity to that old base), retained 17 payload paths / four browser test modules, and added concise storage semantics (temporarily unreadable old data not overwritten; Retry retains pending intent; known/possibly written receipts retain uncertain reset/retry until removal verified). No review history was added to the user flow and no clean-run/live results are claimed for the new source package.

Verification: `node --check` passed for both `tools/package-source.mjs` and `tools/tests/package-source.mjs`; `git diff --check` clean; `node tools/tests/package-source.mjs` ran 28 passed / 0 failed of 28 (output redirected to /private/tmp/a3-source-sync-opencode-package-tests.txt). These are this session's targeted packaging results, distinct from the parent's independent frozen acceptance (161/161 belongs to the parent). The full 161/161 browser result and final artifact identity are not claimed here. No GitHub, SAP/key, browser, install, commit, push, merge or branch operations were performed.

## README precision correction (final)

Session `ses_ebe2a7a6effe8GTGhdYP6IocPO`: OpenCode corrected README-SOURCE.md storage wording for precision — the app reports Saved only after write plus an identical validated read-back (a successful write plus failed read-back may have persisted bytes, one repaired uncertain-reset scenario); failed or unverifiable resets remain visible and retryable, deletion claimed only after verification. Temporarily unreadable old bytes remain protected and Retry retains pending intent. No other README changes; no app/test/Git/GitHub/SAP/key actions; no acceptance claims.
