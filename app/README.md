# Plan Review Snapshot: billing reader and cost evidence

Issues [#5](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/5) and
[#6](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/6) implement connection →
bounded list → matching by-key detail → cost explanation → Back.

[B0 passed for #5 on 15 October 2026](../docs/validation/issue-5-b0.md). Issue #6
adds deterministic browser acceptance; it does not claim another live SAP read.
Choices and receipts belong to #7; full pagination belongs to #8.

## Run

Use Node.js 22 or newer. No runtime dependencies or build step are needed.

    cd app
    npm start

Open <http://127.0.0.1:6285/>. Use PORT=6287 npm start for another loopback port.
Choose a source, select a record, then **Review cost evidence**. **Back to list**
preserves the selection and returns keyboard focus to it.

- **Connect to live SAP sandbox** uses your own Hub sandbox key, supplied locally.
- **Use fixture demonstration** uses synthetic OData billing-request headers
  through the approved request mapping, labelled fixture-demonstration.
- **Use synthetic billing-document fixture** uses a separate contract profile,
  labelled synthetic-fixture. It has no SAP API ID/version. Its header relation
  and processing date are declared fixture semantics.

A failed live read never substitutes a fixture. Disconnect/reset or page reload
clears the session key; keys are not written to storage or logs.

## Tests and evidence

For a fresh installation:

    npm install
    npx playwright install chromium
    npm test

The 34 groups retain all 15 #5 regressions. Public HTTP/browser flows cover both
kinds, exact signed decimals including coefficients above 2^53, missing/invalid
fields, currency switching, source/parent conflicts, recovery, pending/stale
responses and desktop/mobile focus/layout.

The harness owns and closes its servers. A port collision fails rather than
reusing an existing service. PORT selects its base port. A bundled Playwright
can be supplied through PLAYWRIGHT_MODULE_PATH and PLAYWRIGHT_BROWSERS_PATH.

See the [acceptance matrix and screenshots](../docs/validation/issue-6-acceptance.md)
and [captured 34/34 output](../docs/validation/issue-6-browser-test-results.txt).

## Source and monetary rules

The sole live source remains API_BILLING_DOCUMENT_REQUEST_SRV v1.1.0, OData V2,
at https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV.
The [frozen #5 contract](../docs/validation/issue-5-field-contract.md) explains why
CABILLINGDOCUMENT_0001 was rejected. The second fixture adds no live mapping.

Amounts remain exact signed strings: header net p16/s3, tax p14/s3, gross p17/s3;
optional item net/gross p16/s3 and tax p14/s3. No currency rounding, default NZD,
FX, annual total or header-plus-item sum is made. A billing request/date does not
establish payment, a Spark customer identity or continuous service. Missing
optional fields stay Unknown/Not available. Required contract failures cannot
create a usable zero snapshot.

Linked items must match profile, API/version, provenance and parent. A known
foreign currency or structural source/parent contradiction sets a material flag
and withholds linked rows. Missing optional data alone does not. Matching item
responses arriving on the cost view update both the view and exported assessment.
Back/source/reset invalidate pending output. SAP coverage stays bounded/partial.

## Versioned handoff to #7

window.__issue6CostSnapshot is the current in-memory handoff:

- version: issue-6-cost-snapshot-v1; materialInconsistency; reasons;
  assessmentStatus: unassessed, partial, consistent or inconsistent.
- document retains kind/key, original machine provenance, source profile,
  API ID/version, currency and retrieval time. Display labels are separate.
- amounts retains exact strings/null, field bases and currency; date retains
  the mapped value and controlled meaning.
- rule.scope is synthetic-header-net-tax-gross-only for the synthetic profile,
  or source-and-linkage-validation-only for the request profile.
  rule.linkedMonetaryReconciliation is always not-assessed.

Consistent means only that the declared synthetic header net+tax=gross relation
passes using exact BigInt coefficients at scale 3 with zero tolerance. It does
not verify linked monetary reconciliation, complete history or production
accounting. Live/request reconciliation stays unassessed because no universal
equation or rounding tolerance was established. Structural conflicts can still
set materialInconsistency=true. #7 owns choice restrictions and receipt reasons.

The export is cleared on Back, selection, reload, source change and reset.
It is not persisted. The loopback server retains Host/Origin validation, exact
GET destinations, TLS verification, sanitized errors and a fixed asset allowlist.
Browser B0 metadata excludes raw IDs, amounts, parties and credentials;
historical live evidence stays separate.

[OpenCode development record](../docs/development/issue-6-opencode.md)
