// Issue #10: source packager acceptance suite.
//
// Creates throwaway Git repositories with copied source payload and obvious
// test-only Git author metadata, then verifies the packager artifact and
// refusal behavior. Built-ins only, no network, no SAP, no browser, no global
// git configuration changes (per-invocation -c author flags only). All decoys
// and repositories live inside throwaway directories -- never in the real
// project. All own temporary directories are removed in a finally block,
// including on failures. node:fs mkdirSync (recursive) is used instead of
// spawning external mkdir.
//
// Verification is through externally observable results (exit code, produced
// files, archive listing/extraction), not an exported internal helper contract.

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, copyFileSync, mkdirSync, lstatSync, statSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const PACKAGER = join(ROOT, 'tools/package-source.mjs');

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

const PREFIX = 'plan-review-snapshot-billing-lite/';
let pass = 0;
let fail = 0;
const kept = [];

function cleanupTemp() {
  for (const d of kept) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
}
process.on('exit', cleanupTemp);
process.on('uncaughtException', (error) => {
  console.error(`uncaught: ${error}`);
  cleanupTemp();
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error(`unhandled rejection: ${reason}`);
  cleanupTemp();
  process.exit(1);
});

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function packager(cwd, ...args) {
  return spawnSync(process.execPath, [PACKAGER, ...args], { cwd, encoding: 'utf8' });
}

function authorFlags() {
  return ['-c', 'user.name=Test Author', '-c', 'user.email=test@invalid'];
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function ok(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`ok ${name}`);
  } catch (error) {
    fail += 1;
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function listZipEntryNames(archive) {
  const out = execFileSync('unzip', ['-l', archive], { encoding: 'utf8' });
  const names = new Set();
  let inEntries = false;
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('Archive:')) continue;
    if (trimmed.startsWith('--------')) { inEntries = !inEntries; continue; }
    if (!inEntries) continue;
    const m = line.match(/^\s*(\d*|)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    let name = m[4].trim().replace(/\/$/, '');
    if (!name || name === 'Name') continue;
    const prefixRoot = PREFIX.slice(0, -1);
    if (name === prefixRoot) continue; // the prefix root directory entry itself
    if (!name.startsWith(PREFIX)) {
      // still record it so the exact-set check can flag it as unexpected
      names.add(name);
      continue;
    }
    if (name.includes(`${PREFIX}..`)) names.add(name); // traversal flagged by exact-set check
    names.add(name.slice(PREFIX.length));
  }
  return names;
}

function extractZip(archive, dest) {
  execFileSync('unzip', ['-o', archive, '-d', dest], { encoding: 'utf8' });
}

function readDirectory(d) {
  try { return readdirSync(d); } catch { return []; }
}

function writeFile(p, content) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
}

function appendFile(p, content) {
  writeFileSync(p, content, { flag: 'a', encoding: 'utf8' });
}

// Init a throwaway repo, copy the real source payload into it, commit it, and
// return the repo dir. Payload files are committed cleanly.
function initRepoWithPayload() {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-src-test-'));
  kept.push(dir);
  assert(git(dir, 'init', '-b', 'main', '-q').status === 0, `git init failed`);
  for (const path of PAYLOAD) {
    const dest = join(dir, path);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(ROOT, path), dest);
  }
  assert(git(dir, ...authorFlags(), 'add', '--', ...PAYLOAD).status === 0, `git add failed`);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'test payload').status === 0, `git commit failed`);
  return dir;
}

function headRef(dir) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// Prerequisites
// ---------------------------------------------------------------------------

ok('git and unzip available, node >= 22', () => {
  assert(spawnSync('git', ['--version']).status === 0, 'git missing');
  assert(spawnSync('unzip', ['-v']).status === 0, 'unzip missing');
  const major = Number(process.version.slice(1).split('.')[0]);
  assert(major >= 22, `node ${process.version} < 22`);
});

// ---------------------------------------------------------------------------
// Clean repo: exact ZIP entries, manifest hashes, decoys excluded
// ---------------------------------------------------------------------------

ok('clean repo produces ZIP and manifest', () => {
  const dir = initRepoWithPayload();
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status === 0, `packager failed: ${result.stderr.trim() || result.stdout.trim()}`);
  const outFiles = readdirSync(out);
  assert(outFiles.length === 2, `expected zip + manifest, got: ${outFiles.join(',')}`);
  const zipName = outFiles.find((f) => f.endsWith('.zip'));
  const manifestName = outFiles.find((f) => f.endsWith('.manifest.json'));
  assert(zipName && manifestName, 'missing zip or manifest');
  const stem = manifestName.slice(0, -'.manifest.json'.length).split('-').pop();
  assert(zipName === `plan-review-snapshot-billing-lite-${stem}.zip`, 'zip/manifest stem mismatch');
  assert(/plan-review-snapshot-billing-lite-[0-9a-f]{7}\.zip/.test(zipName), 'short commit not in zip filename');

  const archive = join(out, zipName);
  const manifestPath = join(out, manifestName);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert(manifest.schemaVersion === '1.0.0', 'bad schemaVersion');
  assert(/^[0-9a-f]{40}$/.test(manifest.sourceCommit), 'bad sourceCommit');
  assert(manifest.sourceCommitShort.length === 7, 'bad sourceCommitShort');
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(manifest.packagedAt), 'packagedAt not UTC ISO');
  assert(manifest.archive.basename === zipName, 'archive basename mismatch');
  const archiveBytes = readFileSync(archive);
  assert(manifest.archive.bytes === archiveBytes.length, 'archive bytes mismatch');
  assert(manifest.archive.sha256 === sha256(archiveBytes), 'archive sha256 mismatch');

  const zipNames = listZipEntryNames(archive);
  const expected = new Set(PAYLOAD);
  for (const path of PAYLOAD) {
    const parts = path.split('/');
    for (let i = parts.length - 1; i >= 1; i--) expected.add(parts.slice(0, i).join('/'));
  }
  assert(zipNames.size === expected.size, `entry count ${zipNames.size} != ${expected.size}`);
  for (const name of expected) assert(zipNames.has(name), `missing zip entry: ${name}`);
  for (const name of zipNames) assert(expected.has(name), `unexpected zip entry: ${name}`);
  for (const decoy of ['.env', 'tools/sap_api_probe.mjs', 'tools/sap_api_probe_result.json', 'docs/development/issue-10-opencode.md', 'app/notes.tmp', 'pkg.json.tmp']) {
    assert(!zipNames.has(`${PREFIX}${decoy}`) && !zipNames.has(decoy), `decoy leaked: ${decoy}`);
  }

  assert(Array.isArray(manifest.payload) && manifest.payload.length === PAYLOAD.length, 'payload list wrong length');
  const sorted = [...PAYLOAD].sort();
  for (let i = 0; i < sorted.length; i++) assert(manifest.payload[i].path === sorted[i], 'payload not sorted');
  const extractDir = join(dir, 'extracted');
  extractZip(archive, extractDir);
  const prefixRoot = PREFIX.slice(0, -1);
  for (const entry of manifest.payload) {
    const extracted = join(extractDir, prefixRoot, entry.path);
    const extractedStat = lstatSync(extracted);
    assert(!extractedStat.isSymbolicLink(), `symlink in extracted tree: ${entry.path}`);
    assert(extractedStat.isFile(), `not a regular file: ${entry.path}`);
    const actual = readFileSync(extracted);
    assert(actual.length === entry.bytes, `bytes mismatch for ${entry.path}`);
    assert(sha256(actual) === entry.sha256, `sha256 mismatch for ${entry.path}`);
  }
  assert(!zipNames.has(`${PREFIX}${manifestName}`), 'manifest packed inside itself');
  const manifestString = JSON.stringify(manifest);
  assert(!manifest.payload.some((entry) => entry.sha256 === sha256(archiveBytes)), 'archive hash collides with a payload entry hash');
  const manifestOwnHash = sha256(readFileSync(manifestPath));
  assert(!manifestString.includes(manifestOwnHash), 'manifest must not contain its own hash');
  console.log(`    archive ${zipName} (${archiveBytes.length} bytes), manifest verified`);
});

function assertImportRejected(name, source, expectedSpecifier, expectedPath = expectedSpecifier) {
  ok(name, () => {
    const dir = initRepoWithPayload();
    appendFile(join(dir, 'app/tests/browser.mjs'), `\n${source}\n`);
    assert(git(dir, ...authorFlags(), 'add', '--', 'app/tests/browser.mjs').status === 0);
    assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add missing import').status === 0);
    const out = join(dir, 'out');
    const result = packager(dir, '--output-dir', out);
    assert(result.status !== 0, 'missing local import should fail');
    assert(result.stderr.includes('browser.mjs') && result.stderr.includes(expectedSpecifier), `diagnostic omitted importing file or specifier: ${result.stderr}`);
    assert(result.stderr.includes(expectedPath), `diagnostic omitted resolved path: ${result.stderr}`);
    assert(readDirectory(out).length === 0, 'output created despite missing import refusal');
  });
}

// ---------------------------------------------------------------------------
// Import integrity
// ---------------------------------------------------------------------------

assertImportRejected('missing static import is rejected before outputs', "import './issue-28.mjs';", './issue-28.mjs', 'app/tests/issue-28.mjs');
assertImportRejected('missing side-effect import is rejected', "import './x.mjs';", './x.mjs', 'app/tests/x.mjs');
assertImportRejected('missing re-export is rejected', "export * from './y.js';", './y.js', 'app/tests/y.js');
assertImportRejected('missing dynamic string import is rejected', "import('./z.mjs');", './z.mjs', 'app/tests/z.mjs');
assertImportRejected('import escaping repository root is rejected', "import '../../../outside.mjs';", '../../../outside.mjs', '../outside.mjs');
assertImportRejected('missing import with quotes, semicolons and parentheses in clause comments is rejected', "import {\n  a, // don't drop; (legacy)\n  /* b's (old); */ b,\n} from './w.mjs';\nexport { c /* (c); */ } from './v.mjs';", './w.mjs', 'app/tests/w.mjs');

ok('bare, built-in and variable imports are ignored', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/tests/browser.mjs'), "\nimport 'node:fs';\nimport 'playwright';\nimport(variable);\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/tests/browser.mjs').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add external imports').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status === 0, `valid non-local imports failed: ${result.stderr.trim()}`);
  assert(readDirectory(out).some((file) => file.endsWith('.zip')), 'successful packaging produced no ZIP');
});

ok('imports after function exports, declarations, and import.meta are detected', () => {
  const dir = initRepoWithPayload();
  const cases = [
    ['app/tests/browser.mjs', "export function f() {\n  return import('./miss-function.mjs');\n}\nexport * from './issue-27.mjs';"],
    ['app/tests/issue-8.mjs', "export const a = 1;\nimport './miss-declaration.mjs';\nimport z from './issue-27.mjs';"],
    ['app/tests/issue-9.mjs', "const u = import.meta.url;\nimport './miss-meta.mjs';\nimport y from './issue-27.mjs';"],
  ];
  for (const [path, content] of cases) {
    appendFile(join(dir, path), `\n${content}\n`);
    assert(git(dir, ...authorFlags(), 'add', '--', path).status === 0);
  }
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add imports after declarations').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'missing imports should fail');
  for (const target of ['miss-function.mjs', 'miss-declaration.mjs', 'miss-meta.mjs']) {
    assert(result.stderr.includes(target), `diagnostic omitted ${target}: ${result.stderr}`);
  }
  assert(readDirectory(out).length === 0, 'output created despite missing imports');
});

ok('multiline import list with a comment, import.meta and export default package successfully', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/tests/browser.mjs'), "\nimport {\n a,\n b, // moved from './gone.mjs'; don't re-add\n} from './issue-27.mjs';\nconst url = import.meta.url;\nexport default function () {}\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/tests/browser.mjs').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add multiline import').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status === 0, `valid multiline import failed: ${result.stderr.trim()}`);
  assert(readDirectory(out).some((file) => file.endsWith('.zip')), 'successful packaging produced no ZIP');
});

// ---------------------------------------------------------------------------
// Refusal behaviors
// ---------------------------------------------------------------------------

ok('dirty payload is refused', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/server.js'), "\n// dirty uncommitted change\n");
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'dirty payload should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite dirty refusal');
});

ok('untracked required file is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-src-test-'));
  kept.push(dir);
  assert(git(dir, 'init', '-b', 'main', '-q').status === 0);
  const present = PAYLOAD.filter((p) => p !== 'app/tests/issue-8.mjs');
  for (const path of present) {
    const dest = join(dir, path);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(ROOT, path), dest);
  }
  assert(git(dir, ...authorFlags(), 'add', '--', ...present).status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'test payload').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'untracked required file should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite untracked refusal');
});

ok('missing payload file is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-src-test-'));
  kept.push(dir);
  assert(git(dir, 'init', '-b', 'main', '-q').status === 0);
  const present = PAYLOAD.filter((p) => p !== 'app/styles.css');
  for (const path of present) {
    const dest = join(dir, path);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(ROOT, path), dest);
  }
  assert(git(dir, ...authorFlags(), 'add', '--', ...present).status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'test payload').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'missing payload should fail');
});

ok('symlinked HEAD-worktree payload is refused', () => {
  const dir = initRepoWithPayload();
  const target = join(dir, 'pkg.json.tmp');
  copyFileSync(join(ROOT, 'app/package.json'), target);
  const link = join(dir, 'app/lib/config.js');
  rmSync(link, { force: true });
  symlinkSync(target, link);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'symlink payload should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite symlink refusal');
});

ok('private key in payload is refused before outputs', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/lib/config.js'), "\n-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add private key').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'private key payload should fail');
  assert(result.stderr.includes('Reject:'), 'rejection should name the category');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite content refusal');
});

ok('real-looking assigned credential in payload is refused', () => {
  const dir = initRepoWithPayload();
  writeFile(join(dir, 'app/lib/config.js'), readFileSync(join(ROOT, 'app/lib/config.js'), 'utf8') + "\nconst SAP_API_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab'; // real-looking\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add credential').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'credential payload should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite credential refusal');
});

ok('quoted JS object credential property is refused', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/lib/config.js'), "\nconst headers = { 'APIKey': '0123456789abcdef0123456789abcdef' };\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add quoted js credential').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'quoted js credential payload should fail');
  assert(result.stderr.includes('Reject:'), 'rejection should name the category');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite quoted js credential refusal');
});

ok('quoted JSON credential property is refused', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/lib/config.js'), "\nconst headers = {\"SAP_API_KEY\":\"0123456789abcdef0123456789abcdef0123456789ab\"};\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add json credential').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'json credential payload should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite json credential refusal');
});

ok('raw OData response dump in payload is refused', () => {
  const dir = initRepoWithPayload();
  writeFile(join(dir, 'app/lib/config.js'), readFileSync(join(ROOT, 'app/lib/config.js'), 'utf8') + "\n" + JSON.stringify({ d: { results: [{ __metadata: { uri: 'x' } }] } }) + "\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add OData dump').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'OData dump payload should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite OData refusal');
});

ok('clearly fictional SENTINEL string is not flagged', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/lib/config.js'), "\nconst KEY = 'SENTINEL-KEY-DO-NOT-REAL'; // clearly fictional\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add sentinel').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status === 0, `sentinel payload should pass: ${result.stderr.trim()}`);
  assert(readDirectory(out).some((f) => f.endsWith('.zip')), 'sentinel payload produced no output');
});

ok('existing archive is not overwritten', () => {
  const dir = initRepoWithPayload();
  const out = join(dir, 'out');
  const first = packager(dir, '--output-dir', out);
  assert(first.status === 0, `first run failed: ${first.stderr.trim()}`);
  const zip = readdirSync(out).find((f) => f.endsWith('.zip'));
  const zipPath = join(out, zip);
  const before = sha256(readFileSync(zipPath));
  const mtimeBefore = statSync(zipPath).mtimeMs;
  const second = packager(dir, '--output-dir', out);
  assert(second.status !== 0, 'repeat run should refuse overwrite');
  const after = sha256(readFileSync(zipPath));
  assert(before === after, 'existing archive was modified');
  assert(statSync(zipPath).mtimeMs === mtimeBefore, 'existing archive was touched');
  const manifest = readdirSync(out).find((f) => f.endsWith('.manifest.json'));
  const m2 = statSync(join(out, manifest)).mtimeMs;
  const third = packager(dir, '--output-dir', out);
  assert(third.status !== 0, 'repeat run with manifest should refuse');
  assert(statSync(join(out, manifest)).mtimeMs === m2, 'existing manifest was touched');
});

ok('different output dir is allowed', () => {
  const dir = initRepoWithPayload();
  const a = packager(dir, '--output-dir', join(dir, 'out-a'));
  const b = packager(dir, '--output-dir', join(dir, 'out-b'));
  assert(a.status === 0 && b.status === 0, 'second output dir should be allowed');
  const fa = readdirSync(join(dir, 'out-a')).find((f) => f.endsWith('.zip'));
  const fb = readdirSync(join(dir, 'out-b')).find((f) => f.endsWith('.zip'));
  assert(fa === fb, 'same commit should yield same archive name');
});

ok('pinned commit behavior: --ref uses archived commit content', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/server.js'), "\n// release-two marker\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/server.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'second commit').status === 0);
  const expectedOld = execFileSync('git', ['show', 'HEAD~1:app/server.js'], { cwd: dir, encoding: 'utf8' });
  assert(expectedOld.includes('Plan Review Snapshot') && !expectedOld.includes('release-two'), 'setup check');
  const out = join(dir, 'out');
  const result = packager(dir, '--ref', 'HEAD~1', '--output-dir', out);
  assert(result.status === 0, `packager --ref failed: ${result.stderr.trim()}`);
  const zip = readdirSync(out).find((f) => f.endsWith('.zip'));
  const extractDir = join(dir, 'extracted-ref');
  extractZip(join(out, zip), extractDir);
  const archived = readFileSync(join(extractDir, PREFIX, 'app/server.js'), 'utf8');
  assert(archived === expectedOld, '--ref did not archive the pinned commit content');
  assert(!archived.includes('release-two'), '--ref archived newer content');
});

ok('unresolvable ref is refused', () => {
  const dir = initRepoWithPayload();
  const out = join(dir, 'out');
  const result = packager(dir, '--ref', 'no-such-ref-12345', '--output-dir', out);
  assert(result.status !== 0, 'bad ref should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite bad ref');
});

ok('packager refuses outside a git repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-src-notgit-'));
  kept.push(dir);
  const result = packager(dir, '--output-dir', join(dir, 'out'));
  assert(result.status !== 0, 'non-git dir should fail');
});

// ---------------------------------------------------------------------------
// Decoys cannot leak (untracked .env / raw probe / unrelated files)
// ---------------------------------------------------------------------------

ok('untracked decoys never enter the archive', () => {
  const dir = initRepoWithPayload();
  mkdirSync(join(dir, 'tools'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'development'), { recursive: true });
  writeFile(join(dir, '.env'), 'SAP_APIKEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab\n');
  writeFile(join(dir, 'tools', 'sap_api_probe.mjs'), '// raw probe decoy\nfetch("https://sandbox.api.sap.com/...");\n');
  writeFile(join(dir, 'tools', 'sap_api_probe_result.json'), JSON.stringify({ d: { results: [{ __metadata: {} }] } }));
  writeFile(join(dir, 'docs', 'development', 'issue-10-opencode.md'), 'dev record decoy\n');
  writeFile(join(dir, 'app', 'notes.tmp'), 'unrelated scratch\n');
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status === 0, `decoy repo packaging failed: ${result.stderr.trim()}`);
  const zip = readdirSync(out).find((f) => f.endsWith('.zip'));
  const zipNames = listZipEntryNames(join(out, zip));
  for (const decoy of ['.env', 'tools/sap_api_probe.mjs', 'tools/sap_api_probe_result.json', 'docs/development/issue-10-opencode.md', 'app/notes.tmp']) {
    assert(!zipNames.has(`${PREFIX}${decoy}`), `untracked decoy leaked: ${decoy}`);
  }
});

// ---------------------------------------------------------------------------
// Regression: export-ignore / export-subst / .git/info/attributes
// ---------------------------------------------------------------------------

ok('export-ignore on a payload file is rejected before outputs', () => {
  const dir = initRepoWithPayload();
  writeFile(join(dir, '.git', 'info', 'attributes'), 'app/server.js export-ignore\n');
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'export-ignore payload should fail');
  assert(result.stderr.includes('missing expected entry'), 'should report the omitted entry');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite export-ignore refusal');
});

ok('committed .gitattributes export-ignore is rejected before outputs', () => {
  const dir = initRepoWithPayload();
  writeFile(join(dir, '.gitattributes'), 'app/server.js export-ignore\n');
  assert(git(dir, ...authorFlags(), 'add', '--', '.gitattributes').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'add gitattributes export-ignore').status === 0);
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'committed .gitattributes export-ignore should fail');
  assert(result.stderr.includes('missing expected entry'), 'should report the omitted entry');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite .gitattributes export-ignore refusal');
});

ok('export-subst changing payload bytes is rejected before outputs', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/server.js'), '// $Format:%H$\n');
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/server.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'format keyword').status === 0);
  writeFile(join(dir, '.git', 'info', 'attributes'), 'app/server.js export-subst\n');
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'export-subst payload should fail');
  assert(result.stderr.includes('bytes/SHA-256 do not match'), 'should report the byte mismatch');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite export-subst refusal');
});

// ---------------------------------------------------------------------------
// Regression: ls-tree modes at resolved commit (old symlink / new regular)
// ---------------------------------------------------------------------------

ok('--ref to a commit where payload is a symlink is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-src-test-'));
  kept.push(dir);
  assert(git(dir, 'init', '-b', 'main', '-q').status === 0);
  // commit 1: app/lib/config.js stored as a symlink
  for (const path of PAYLOAD) {
    const dest = join(dir, path);
    mkdirSync(dirname(dest), { recursive: true });
    if (path === 'app/lib/config.js') {
      copyFileSync(join(ROOT, 'app/package.json'), join(dir, 'pkg.json.tmp'));
      symlinkSync(join(dir, 'pkg.json.tmp'), dest);
    } else {
      copyFileSync(join(ROOT, path), dest);
    }
  }
  assert(git(dir, ...authorFlags(), 'add', '--', ...PAYLOAD).status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'symlink commit').status === 0);
  const symlinkCommit = headRef(dir);
  // commit 2 (HEAD): app/lib/config.js is a clean regular file
  rmSync(join(dir, 'app/lib/config.js'), { force: true });
  copyFileSync(join(ROOT, 'app/lib/config.js'), join(dir, 'app/lib/config.js'));
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/lib/config.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'regular commit').status === 0);
  const out = join(dir, 'out');
  const oldRef = packager(dir, '--ref', symlinkCommit, '--output-dir', out);
  assert(oldRef.status !== 0, '--ref to symlink commit should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite symlink-commit refusal');
  const headRun = packager(dir, '--output-dir', join(dir, 'out-head'));
  assert(headRun.status === 0, 'HEAD with regular file should succeed');
});

ok('--ref to an older commit archives exactly that commit content', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/server.js'), "\n// release-two marker\n");
  assert(git(dir, ...authorFlags(), 'add', '--', 'app/server.js').status === 0);
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'second commit').status === 0);
  const expectedOld = execFileSync('git', ['show', 'HEAD~1:app/server.js'], { cwd: dir, encoding: 'utf8' });
  const out = join(dir, 'out-ref');
  const result = packager(dir, '--ref', 'HEAD~1', '--output-dir', out);
  assert(result.status === 0, `packager --ref failed: ${result.stderr.trim()}`);
  const zip = readdirSync(out).find((f) => f.endsWith('.zip'));
  const extractDir = join(dir, 'extracted-ref2');
  extractZip(join(out, zip), extractDir);
  const archived = readFileSync(join(extractDir, PREFIX, 'app/server.js'), 'utf8');
  assert(archived === expectedOld, '--ref did not archive the pinned commit content');
});

// ---------------------------------------------------------------------------
// Regression: option values and existing/dangling outputs
// ---------------------------------------------------------------------------

ok('missing --ref value is refused', () => {
  const dir = initRepoWithPayload();
  const out = join(dir, 'out');
  const result = packager(dir, '--ref');
  assert(result.status !== 0, 'missing --ref value should fail');
  assert(!readDirectory(out).some((f) => f.endsWith('.zip')), 'output created despite missing value refusal');
});

ok('missing --output-dir value is refused', () => {
  const dir = initRepoWithPayload();
  const result = packager(dir, '--output-dir');
  assert(result.status !== 0, 'missing --output-dir value should fail');
});

ok('dangling symlink at output path counts as existing and is refused', () => {
  const dir = initRepoWithPayload();
  const out = join(dir, 'out');
  mkdirSync(out, { recursive: true });
  const short = headRef(dir).slice(0, 7);
  const link = join(out, `plan-review-snapshot-billing-lite-${short}.zip`);
  symlinkSync('/does/not/exist.zip', link); // dangling symlink
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'dangling symlink output should fail');
  assert(readDirectory(out).includes(basename(link)), 'dangling symlink must remain, not be followed');
});

ok('pre-existing output file is not overwritten (exclusive write)', () => {
  const dir = initRepoWithPayload();
  const out = join(dir, 'out');
  mkdirSync(out, { recursive: true });
  const short = headRef(dir).slice(0, 7);
  const link = join(out, `plan-review-snapshot-billing-lite-${short}.zip`);
  writeFileSync(link, 'someone else bytes\n');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'pre-existing output should fail');
  assert(readFileSync(link, 'utf8') === 'someone else bytes\n', "someone else's output must not be touched");
});

ok('equal-size export-subst is rejected by actual bytes, not only file length', () => {
  const dir = initRepoWithPayload();
  appendFile(join(dir, 'app/server.js'), '\n// $Format:%s$\n');
  writeFile(join(dir, '.git', 'info', 'attributes'), 'app/server.js export-subst\n');
  assert(git(dir, 'add', '--', 'app/server.js').status === 0, 'add failed');
  assert(git(dir, ...authorFlags(), 'commit', '-q', '-m', 'same-length').status === 0, 'commit failed');
  // "$Format:%s$" and "same-length" are each 11 bytes. A length-only guard misses this.
  const out = join(dir, 'out');
  const result = packager(dir, '--output-dir', out);
  assert(result.status !== 0, 'equal-size archive substitution must be rejected');
  assert(!readDirectory(out).some(f => f.endsWith('.zip')), 'mismatched archive must not be published');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nPackaging acceptance suite: ${pass} passed, ${fail} failed of ${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
