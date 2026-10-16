// Issue #10 source handoff packager (maintainer tool).
//
// Archives the pinned payload of this repository from a resolved git commit
// using `git archive` only -- never a folder copy -- into a ZIP with a fixed
// archive prefix, plus an adjacent machine-readable manifest.
//
// Unlike hashing raw git blobs directly, this tool re-validates the actual
// produced ZIP archive after `git archive`: it checks the exact entry list,
// regular-file modes (no symlinks), and the uncompressed per-entry bytes and
// SHA-256 against the planned payload BEFORE writing any final outputs. This
// neutralizes .git/info/attributes export-ignore (drops a file from the ZIP)
// and export-subst (rewrites bytes in the ZIP) because a missing entry or a
// byte mismatch causes rejection before outputs are written.
//
// Prerequisites (maintainer only): git >= 2.50.1 (--end-of-options), unzip.
// Built-ins only otherwise (node:fs, node:crypto, node:child_process), no
// dependencies, no shell interpolation: every git/unzip invocation uses an
// argument vector, and no custom ZIP writer is implemented.
//
// Runs from the repository root. Default output: release/. Refuses:
//   * an unresolvable or non-commit ref, missing --ref/--output-dir values,
//   * payload that is not a regular 100644/100755 blob at the resolved commit,
//   * symlinked, missing or untracked HEAD-worktree payload,
//   * uncommitted (dirty) HEAD-worktree payload,
//   * payload failing the conservative content scan (private keys,
//     real-looking assigned credentials, raw OData response dumps),
//   * a ZIP artifact whose entries/modes/bytes do not match the planned payload,
//   * overwriting an existing archive or manifest (lstat-based, so a dangling
//     symlink counts as existing; exclusive write flags O_EXCL).
//
// Console output prints package path / entry count / archive hash only,
// never file content.

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const SCHEMA_VERSION = '1.0.0';
const ARCHIVE_PREFIX = 'plan-review-snapshot-billing-lite/';
const DEFAULT_OUTPUT_DIR = 'release';
const SHORT_LEN = 7;
const ROOT = resolve(process.cwd());

// Regular-file git blob modes accepted for payload files; symlinks (120000)
// and other modes are rejected, including at an older --ref commit.
const REGULAR_MODES = new Set(['100644', '100755']);

const PAYLOAD = [
  'README-SOURCE.md',
  'app/package.json',
  'app/package-lock.json',
  'app/server.js',
  'app/index.html',
  'app/app.mjs',
  'app/styles.css',
  'app/lib/billingAdapter.js',
  'app/lib/config.js',
  'app/lib/contracts.js',
  'app/lib/fixtureData.js',
  'app/lib/httpHandler.js',
  'app/lib/syntheticFixtureData.js',
  'app/tests/browser.mjs',
  'app/tests/issue-8.mjs',
  'app/tests/issue-9.mjs',
  'app/tests/issue-27.mjs',
];

function fail(message) {
  throw new Error(message);
}

// git with an argument vector only; never a shell string.
function git(args, { input } = {}) {
  const options = { cwd: ROOT, encoding: 'utf8' };
  if (input !== undefined) options.input = input;
  return spawnSync('git', args, options);
}

function ensureGitRepo() {
  const dir = git(['rev-parse', '--is-inside-work-tree']);
  if (dir.status !== 0 || dir.stdout.trim() !== 'true') {
    fail('not inside a git working tree; run from the repository root');
  }
}

function resolveRef(ref) {
  if (ref === undefined || ref === '') {
    fail('missing value for --ref');
  }
  // --end-of-options lets an option-looking ref be treated as a revision.
  const resolved = git([
    'rev-parse',
    '--verify',
    '--quiet',
    '--end-of-options',
    `${ref}^{commit}`,
  ]);
  if (resolved.status !== 0) {
    fail(`cannot resolve ref '${ref}' to a commit: ${(resolved.stderr || '').trim() || resolved.status}`);
  }
  const commit = resolved.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail(`ref '${ref}' did not resolve to a full commit id`);
  }
  const type = git(['cat-file', '-t', commit]);
  if (type.status !== 0 || type.stdout.trim() !== 'commit') {
    fail(`ref '${ref}' does not resolve to a git commit`);
  }
  const short = git(['rev-parse', `--short=${SHORT_LEN}`, commit]);
  if (short.status !== 0) {
    fail(`cannot compute short id for commit ${commit}`);
  }
  return { commit, short: short.stdout.trim() };
}

// Inspect ls-tree modes at the resolved commit: accept only regular
// 100644/100755 blobs for every payload path. Rejects a payload stored as a
// symlink (or any non-regular mode) at an older --ref commit even when HEAD
// holds a clean regular file.
function verifyCommitModes(commit) {
  const ls = git(['ls-tree', '-r', commit, '--', ...PAYLOAD]);
  if (ls.status !== 0) {
    fail(`cannot list payload at commit ${commit}: ${(ls.stderr || '').trim() || ls.status}`);
  }
  const modes = new Map();
  for (const line of ls.stdout.split('\n')) {
    if (!line.trim()) continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const meta = line.slice(0, tab).split(/\s+/);
    const mode = meta[0];
    const path = line.slice(tab + 1);
    modes.set(path, mode);
  }
  for (const path of PAYLOAD) {
    const mode = modes.get(path);
    if (mode === undefined) {
      fail(`payload is missing at resolved commit ${commit}: ${path}`);
    }
    if (!REGULAR_MODES.has(mode)) {
      fail(`payload is not a regular blob at commit ${commit} (mode ${mode}): ${path}`);
    }
  }
}

function lstatExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function verifyHeadPayload() {
  for (const path of PAYLOAD) {
    const tracked = git(['ls-files', '--error-unmatch', path]);
    if (tracked.status !== 0) {
      fail(`payload is not tracked in the index: ${path}`);
    }
    let stat;
    try {
      stat = lstatSync(join(ROOT, path));
    } catch (error) {
      if (error.code === 'ENOENT') fail(`payload is missing: ${path}`);
      throw error;
    }
    if (stat.isSymbolicLink()) fail(`payload is a symlink, refusing: ${path}`);
    if (!stat.isFile()) fail(`payload is not a regular file: ${path}`);
  }
  const status = git(['status', '--porcelain', '--', ...PAYLOAD]);
  if (status.stdout.trim()) {
    fail('payload has uncommitted changes or untracked required files; refusing to package dirty source');
  }
}

// Conservative content scan on the committed blob bytes. Field names and
// header names are not flagged; clearly fictional SENTINEL strings are
// allowlisted. This is not a complete secret detector.
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
// Unquoted property key: apiKey = '...' / apiKey: "..." / apikey=...
const UNQUOTED_KEY_CRED = /(?:api[._-]?key|secret|password|passwd|token|authorization)\b\s*[=:]\s*["']?([^"';\s]{12,})["']?/gi;
// Quoted property key: { 'APIKey': '...' } / { "SAP_API_KEY": "..." } (JS object or JSON)
const QUOTED_KEY_CRED = /["']\w*?(?:api[._-]?key|secret|password|passwd|token|authorization)\w*?["']\s*:\s*["']([^"';\s]{12,})["']/gi;
const ODATA_DUMP = /("__metadata"|\b"d"\s*:\s*\{|"results"\s*:\s*\[)/;
const FICTIONAL = /sentinel|placeholder|demo|example|test-?key|dummy|fake|sample|your-?key-?here|^(x+|xxx+)$/i;

function isFictional(value) {
  return FICTIONAL.test(value) || value.length < 20;
}

function isCodeExpression(value) {
  return /[.(\[\]+*/=,<>]/.test(value) || /^(?:state|options|this|process|import)\./.test(value);
}

function scanPayload(blobs) {
  const findings = [];
  for (const path of PAYLOAD) {
    const text = blobs.get(path).toString('utf8');
    if (PRIVATE_KEY.test(text)) {
      findings.push({ path, category: 'private-key-like content' });
      continue;
    }
    for (const re of [UNQUOTED_KEY_CRED, QUOTED_KEY_CRED]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(text)) !== null) {
        const value = match[1];
        if (isFictional(value)) continue;
        // Code expressions (state tokens, option helpers, ++ counters) are not
        // assigned credentials; only opaque literal values are flagged.
        if (isCodeExpression(value)) continue;
        findings.push({ path, category: 'real-looking assigned credential' });
        break;
      }
      if (findings.some((f) => f.path === path)) break;
    }
    if (findings.some((f) => f.path === path)) continue;
    if (ODATA_DUMP.test(text)) {
      findings.push({ path, category: 'raw OData response dump' });
    }
  }
  return findings;
}

// Keep this deliberately small: local ES module imports/exports are covered;
// require()/createRequire() are not used for local modules in this payload.
function scanPayloadImports(blobs) {
  const payload = new Set(PAYLOAD);
  const missing = [];
  const specifierPattern = /\bimport\s*(?:\(\s*(['"])([^'"\n]+)\1\s*\)|(['"])([^'"\n]+)\3|[\s\S]*?\bfrom\s*(['"])([^'"\n]+)\5)|\bexport\s*[\s\S]*?\bfrom\s*(['"])([^'"\n]+)\7/g;
  for (const path of PAYLOAD) {
    if (!/\.(?:js|mjs)$/.test(path)) continue;
    const text = blobs.get(path).toString('utf8');
    specifierPattern.lastIndex = 0;
    let match;
    while ((match = specifierPattern.exec(text)) !== null) {
      const specifier = match[2] ?? match[4] ?? match[6] ?? match[8];
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) continue;
      const resolved = posix.normalize(posix.join(posix.dirname(path), specifier));
      if (resolved === '..' || resolved.startsWith('../') || !payload.has(resolved)) {
        missing.push({ path, specifier, resolved });
      }
    }
  }
  return missing;
}

// Ancestor directories (repo-relative, without the archive prefix) of a file.
function ancestorDirs(path) {
  const parts = path.split('/');
  const dirs = [];
  for (let i = parts.length - 1; i >= 1; i--) {
    dirs.push(parts.slice(0, i).join('/'));
  }
  return dirs;
}

// Expected ZIP entry set (repo-relative, archive prefix stripped): exactly the
// payload files plus their ancestor directories, no extras, no missing.
function expectedEntrySet() {
  const entries = new Set();
  for (const path of PAYLOAD) {
    entries.add(path);
    for (const dir of ancestorDirs(path)) entries.add(dir);
  }
  return entries;
}

function normalizeEntryName(name) {
  return name.endsWith('/') ? name.slice(0, -1) : name;
}

// Independently validate the produced ZIP archive before any final outputs:
// exact entry list (prefix + ancestor directories only), regular-file modes
// (no symlinks), no traversal, and uncompressed per-entry bytes/SHA-256 equal
// to the planned payload blob bytes. Uses unzip only; no custom ZIP writer.
function verifyArchiveArtifact(archivePath, blobs) {
  const extractDir = join(tmpdir(), `pkg-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let cleanupError;
  try {
    // Guard traversal before extraction: every listed entry must live under the
    // fixed prefix and must not escape it.
    const listing = execFileSync('unzip', ['-l', archivePath], { encoding: 'utf8' });
    const listed = new Set();
    let inEntries = false;
    for (const line of listing.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('Archive:')) continue;
      if (trimmed.startsWith('--------')) {
        inEntries = !inEntries;
        continue;
      }
      if (!inEntries) continue;
      // Length Date Time Name; name may contain spaces.
      const m = line.match(/^\s*(\d*|)\s+(\S+)\s+(\S+)\s+(.*)$/);
      if (!m) continue;
      const name = normalizeEntryName(m[4].trim());
      if (!name || name === 'Name') continue;
      if (name === ARCHIVE_PREFIX.slice(0, -1)) continue; // the prefix root itself is fine
      if (!name.startsWith(ARCHIVE_PREFIX)) {
        fail(`archive entry escapes the fixed prefix: ${name}`);
      }
      if (name.includes('..')) {
        fail(`archive entry uses path traversal: ${name}`);
      }
      listed.add(name.slice(ARCHIVE_PREFIX.length));
    }

    const expected = expectedEntrySet();
    for (const name of expected) {
      if (!listed.has(name)) {
        fail(`archive is missing expected entry: ${name}`);
      }
    }
    for (const name of listed) {
      if (!expected.has(name)) {
        fail(`archive has unexpected entry: ${name}`);
      }
    }

    execFileSync('unzip', ['-o', archivePath, '-d', extractDir], { encoding: 'utf8' });

    const payloadEntries = [];
    const prefixRoot = ARCHIVE_PREFIX.slice(0, -1);
    for (const path of [...PAYLOAD].sort()) {
      const extracted = join(extractDir, prefixRoot, path);
      let st;
      try {
        st = lstatSync(extracted);
      } catch (error) {
        if (error.code === 'ENOENT') {
          fail(`extracted archive is missing payload entry: ${path}`);
        }
        throw error;
      }
      if (st.isSymbolicLink()) fail(`extracted archive entry is a symlink: ${path}`);
      if (!st.isFile()) fail(`extracted archive entry is not a regular file: ${path}`);
      const actual = readFileSync(extracted);
      const planned = blobs.get(path);
      if (!actual.equals(planned)) {
        fail(`archive entry bytes/SHA-256 do not match planned payload: ${path}`);
      }
      payloadEntries.push({
        path,
        bytes: actual.length,
        sha256: createHash('sha256').update(actual).digest('hex'),
      });
    }
    return payloadEntries;
  } finally {
    try { rmSync(extractDir, { recursive: true, force: true }); } catch (e) { cleanupError = e; }
  }
}

function main() {
  const args = process.argv.slice(2);
  let ref = 'HEAD';
  let outputDir = DEFAULT_OUTPUT_DIR;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--ref') {
      const v = args[++i];
      if (v === undefined) fail('missing value for --ref');
      ref = v;
    } else if (arg === '--output-dir') {
      const v = args[++i];
      if (v === undefined) fail('missing value for --output-dir');
      outputDir = v;
    } else if (arg.startsWith('--ref=')) {
      ref = arg.slice('--ref='.length);
      if (ref === '') fail('missing value for --ref');
    } else if (arg.startsWith('--output-dir=')) {
      outputDir = arg.slice('--output-dir='.length);
      if (outputDir === '') fail('missing value for --output-dir');
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }

  ensureGitRepo();
  const { commit, short } = resolveRef(ref);

  // Read exact blob bytes once; they are the planned payload content and are
  // used for the content scan and for validating the produced archive.
  const blobs = new Map();
  for (const path of PAYLOAD) {
    const present = git(['cat-file', '-e', `${commit}:${path}`]);
    if (present.status !== 0) {
      fail(`payload is missing in resolved commit ${commit}: ${path}`);
    }
    blobs.set(path, execFileSync('git', ['cat-file', 'blob', `${commit}:${path}`], { cwd: ROOT }));
  }

  verifyCommitModes(commit);
  verifyHeadPayload();

  const findings = scanPayload(blobs);
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`Reject: ${finding.path}: ${finding.category}`);
    }
    fail(`content check found ${findings.length} issue(s); refusing to create packaged outputs`);
  }

  const missingImports = scanPayloadImports(blobs);
  if (missingImports.length > 0) {
    for (const item of missingImports) {
      console.error(`payload module ${item.path} imports ${item.specifier} -> ${item.resolved}, which is not in the payload`);
    }
    fail(`import integrity check found ${missingImports.length} missing module(s); refusing to create packaged outputs`);
  }

  const outDir = resolve(ROOT, outputDir);
  mkdirSync(outDir, { recursive: true });

  const archiveBase = `plan-review-snapshot-billing-lite-${short}`;
  const archiveName = `${archiveBase}.zip`;
  const manifestName = `${archiveBase}.manifest.json`;
  const archivePath = join(outDir, archiveName);
  const manifestPath = join(outDir, manifestName);

  // Existing-output detection uses lstat: a dangling symlink counts as
  // existing and is refused, not followed.
  if (lstatExists(archivePath) || lstatExists(manifestPath)) {
    const existing = lstatExists(archivePath) ? archivePath : manifestPath;
    fail(`refusing to overwrite existing output: ${existing}`);
  }

  // Source archive from git, never a folder copy. Written to a temporary file
  // for independent artifact verification before final outputs are created.
  let archiveBytes;
  try {
    archiveBytes = execFileSync('git', [
      'archive',
      `--format=zip`,
      `--prefix=${ARCHIVE_PREFIX}`,
      commit,
      '--',
      ...PAYLOAD,
    ], { cwd: ROOT });
  } catch (error) {
    fail(`git archive failed: ${(error.stderr && error.stderr.toString().trim()) || error.message}`);
  }

  const tempArchive = join(tmpdir(), `pkg-archive-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
  let tempArchiveCreated = false;
  let cleanupError;
  try {
    writeFileSync(tempArchive, archiveBytes, { flag: 'wx' });
    tempArchiveCreated = true;

    // Independently validate the ZIP artifact against the planned payload.
    const payloadEntries = verifyArchiveArtifact(tempArchive, blobs);

    const archiveSha = createHash('sha256').update(archiveBytes).digest('hex');
    const manifest = {
      schemaVersion: SCHEMA_VERSION,
      sourceCommit: commit,
      sourceCommitShort: short,
      packagedAt: new Date().toISOString(),
      archive: { basename: archiveName, bytes: archiveBytes.length, sha256: archiveSha },
      payload: payloadEntries,
    };

    // Exclusive writes (O_EXCL): a concurrent-created output cannot be
    // overwritten. Only the archive this process itself created is removed if
    // the second sidecar write fails.
    let archiveWritten = false;
    try {
      writeFileSync(archivePath, archiveBytes, { flag: 'wx' });
      archiveWritten = true;
      try {
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
      } catch (manifestError) {
        if (archiveWritten) {
          try { rmSync(archivePath, { force: true }); } catch {}
        }
        throw manifestError;
      }
    } finally {
      try { rmSync(tempArchive, { force: true }); } catch (e) { cleanupError = e; }
    }

    if (cleanupError) throw cleanupError;

    console.log(`Packaged: ${archivePath}`);
    console.log(`Entries: ${payloadEntries.length}`);
    console.log(`Archive SHA-256: ${manifest.archive.sha256}`);
    console.log(`Manifest: ${manifestPath}`);
  } finally {
    if (tempArchiveCreated) {
      try { rmSync(tempArchive, { force: true }); } catch {}
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`package-source: ${error.message}`);
  process.exitCode = 1;
}
