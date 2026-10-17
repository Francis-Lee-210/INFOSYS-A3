# Billing Review Lite: source package

This package contains a runnable three-screen A3 prototype, its synthetic
fixtures, browser tests and pinned test dependencies. No SAP key or raw live
response is bundled. SAP sandbox records demonstrate the review mechanism;
they are not Spark customer bills or evidence of payment.

## Prerequisites and identity

Run with **Node.js 22 or newer** and a browser. There are no application runtime
dependencies and no build step. Real reads additionally need a valid course
SAP sandbox key, HTTPS access to `sandbox.api.sap.com` and working certificate
verification. Fixture mode works without a key or SAP network access.

The ZIP is `plan-review-snapshot-billing-lite-<commit>.zip`; its adjacent
sidecar is `plan-review-snapshot-billing-lite-<commit>.manifest.json`. The
manifest records the exact full source commit, UTC packaging time, ZIP byte
length/SHA-256 and all **17** payload paths, byte lengths and SHA-256 hashes.
Compare it with the supplied handoff identity before connecting. The source
commit combines merged main `203b200fd81cde6c49cb52d5be0afc5f1e4b89b5`
(PR #30 source package) with the reviewed receipt recovery repair
`81099ce4ff37564dec7099687726a3ed5dd10e41` carried by this follow-up
source freeze. It is newer than the historical dependency/base
`f829c6c9f1107652e0affa9c894eca962e75662c` (merged PR #26); the pinned
historical links below refer to that old base and this source is not claimed
byte-identical to it.

The fixed ZIP prefix is `plan-review-snapshot-billing-lite/`. It contains this
README and `app/`: server/UI, six adapter/contract/fixture modules, four browser
test modules, `package.json` and `package-lock.json`. The maintainer creates it
from a resolved Git commit using an explicit allowlist. Course documents,
probe outputs, local configuration, development history, dependencies and Git
metadata are excluded. The sidecar is outside the ZIP; keep the pair together.

## Extract and run in a clean directory

Choose **one** ZIP and its matching sidecar. Replace the example archive path
below with its actual absolute path. The new extraction directory must not
already exist; choose a different new name if necessary.

macOS / Linux:

```sh
archive='/absolute/path/plan-review-snapshot-billing-lite-COMMIT.zip'
manifest="${archive%.zip}.manifest.json"
shasum -a 256 "$archive"          # macOS; Linux may use sha256sum instead
cat "$manifest"                 # compare archive.sha256 and archive.bytes
mkdir ./a3-issue10-source
unzip "$archive" -d ./a3-issue10-source
cd ./a3-issue10-source/plan-review-snapshot-billing-lite/app
PORT=6289 npm start              # choose a free loopback port if necessary
```

PowerShell:

```powershell
$archive = (Resolve-Path 'C:\path\plan-review-snapshot-billing-lite-COMMIT.zip').Path
$manifest = [IO.Path]::ChangeExtension($archive, 'manifest.json')
Get-FileHash -Algorithm SHA256 -LiteralPath $archive
Get-Content -LiteralPath $manifest | ConvertFrom-Json
New-Item -ItemType Directory -Path ./a3-issue10-source -ErrorAction Stop
Expand-Archive -LiteralPath $archive -DestinationPath ./a3-issue10-source
Set-Location ./a3-issue10-source/plan-review-snapshot-billing-lite/app
$env:PORT = '6289'; npm start
```

Before starting, compare each extracted file's bytes/hash with `payload` in
the manifest. Open **http://127.0.0.1:6289/**, matching your chosen port. If
`PORT` is omitted, the default is 6285. The included local HTTP adapter binds
only to loopback. Stop your foreground server with Ctrl+C in its terminal.
No npm installation is required to run it.

## Complete the real workflow

1. Locally supply your existing valid course key from SAP Business Accelerator
   Hub. Enter it in **SAP sandbox API key (session only)**, then click
   **Connect to SAP sandbox (needs key)**. Do not put it in commands, files or shared
   messages. Check the **Live SAP sandbox** label and the loaded/usable counts.
2. Select one usable row. A separate by-key GET loads matching detail. The
   selected identifier, source, document kind, date and currency must agree.
   Optional **Check optional items** reads are bounded and may remain partial.
3. Click **Review cost evidence**. Read the reported net/tax/gross strings,
   their basis/currency, the date meaning and missing/partial evidence.
4. Click **Continue to decision**, select Keep / Review options / Help / Later,
   review the summary, then **Confirm intent**. A Saved/read-back-verified
   result requires both a successful local write and validated identical
   read-back. All four choices record intentions; none changes an account,
   switches a plan, sends a support ticket or schedules a reminder.
5. Refresh on the **same origin, port and browser profile**. Reopen the receipt
   (automatically shown, or **Reopen receipt** after returning to the list).
   It remains a historical snapshot with the original live provenance,
   document evidence, intent and timestamps. No new connection is required.
   The API key clears from memory/input on reload; the receipt persists.
6. Click **Reset demo**. **Cancel** preserves the receipt; **Confirm reset**
   removes it, clears the in-memory review/key and returns to Screen 1. Confirm
   reset before another demonstration: only one receipt is retained.

The receipt stores only whitelisted selected-document review metadata,
amount/date context, limitations, intent and timestamps. It contains no API
key, raw response, names or contact details. A receipt is local to its browser
origin; changing `localhost` to `127.0.0.1`, the port, or the profile changes
which local storage is visible. A failed save stays unsaved and offers Retry.

## Source meaning and transport

The sole live source is **API_BILLING_DOCUMENT_REQUEST_SRV v1.1.0**, OData V2:
`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV`,
collection `A_BillingDocumentRequest`. The included adapter sends only GET to
that allowlisted source, refuses redirects and validates continuations before
attaching a key. TLS verification remains enabled; do not disable it. Keys
travel in headers and remain session-only. No SAP write operation is supported.

The selected records are **billing requests**, not issued or paid bills.
`BillingDocumentDate` is a documented billing date, possibly an intended future
invoice date; it proves neither payment nor service-period coverage. Net, tax
and gross are independent exact signed strings with their supplied currency.
There is no header-plus-items sum, FX conversion, annual total or invented
customer linkage. Missing optional fields stay Unknown/Not available; unusable
required fields produce a contract error. Material conflicts allow only Help
or Later. Loaded pages/partial items do not prove complete account history.
These qualifications remain relevant on all three screens and in the receipt.

Blocked or rejected storage still permits reviewing returned records;
temporarily unreadable old data is not overwritten, and Retry retains the
pending intent. The app reports Saved only after write plus an identical validated read-back. Existing verified receipt data is preserved unchanged until a deliberate reset. Failed or unverifiable resets remain visible and retryable; deletion is claimed only after verification; they are not treated as absent or deleted merely because storage is temporarily blocked or a connection is dropped.

**Try with demo data** and **Use synthetic billing-document fixture**
are separate labelled offline modes. They require no key and do not contact
SAP. Neither fixture nor a B0-evidence button establishes a new live workflow.

## Re-run the full fixture browser suite

From the extracted `app/` directory above (do not enter a second `app/`):
install the pinned **Playwright 1.62.1** and Chromium. npm/browser downloads
need network access; these are test dependencies only. The suite itself uses
local fixtures/injected failures and no real SAP key.

macOS / Linux:

```sh
unset TEST_FILTER CAPTURE_ISSUE8_SCREENSHOTS CAPTURE_ISSUE9_SCREENSHOTS
npm ci
npx playwright install chromium
PORT=7269 npm test
```

PowerShell:

```powershell
Remove-Item Env:TEST_FILTER -ErrorAction SilentlyContinue
Remove-Item Env:CAPTURE_ISSUE8_SCREENSHOTS -ErrorAction SilentlyContinue
Remove-Item Env:CAPTURE_ISSUE9_SCREENSHOTS -ErrorAction SilentlyContinue
npm ci
npx playwright install chromium
$env:PORT = '7269'; npm test
```

Choose a free base test port if necessary. The harness owns and closes its
servers and fails on collisions. Acceptance is unfiltered, with screenshot
capture flags unset. To use an installed Chrome instead, set
`CHROME_EXECUTABLE_PATH` to its actual executable; quote paths containing spaces:

```sh
CHROME_EXECUTABLE_PATH='/path/to/Chrome executable' PORT=7269 npm test
```

```powershell
$env:CHROME_EXECUTABLE_PATH = 'C:\Path To\chrome.exe'; npm test
```

## Evidence and remaining A3 gates

Keep actual clean-directory/live results separate from fixture results and
the earlier B0 report. Inspect shared evidence for credentials/raw records;
retain counts, source identity, matching/provenance booleans and package hashes.
Successful source execution does not certify the whole assessment. Team/API
option decisions, course MCP deployment, presentation/recording/groupwork,
pitch and authoritative Canvas receipts remain separate gates. This package
contains no PowerPoint/video and performs no Signavio or Canvas operation.

- [Dependency/base commit](https://github.com/Francis-Lee-210/INFOSYS-A3/commit/f829c6c9f1107652e0affa9c894eca962e75662c)
- [Historical B0 report](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/f829c6c9f1107652e0affa9c894eca962e75662c/docs/validation/issue-5-b0.md)
- [Frozen field/meaning contract](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/f829c6c9f1107652e0affa9c894eca962e75662c/docs/validation/issue-5-field-contract.md)
- [Upstream browser acceptance](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/f829c6c9f1107652e0affa9c894eca962e75662c/docs/validation/issue-9-acceptance.md)
- [SAP source overview](https://api.sap.com/api/API_BILLING_DOCUMENT_REQUEST_SRV/overview)
