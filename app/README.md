# Plan Review Snapshot: billing reader (Issue #5)

This implements connection → bounded list → matching by-key detail for
[SAP billing requests](https://api.sap.com/api/API_BILLING_DOCUMENT_REQUEST_SRV/overview).
[B0 passed on 15 October 2026](../docs/validation/issue-5-b0.md): the actual browser
loaded 10 usable SAP sandbox records, retrieved matching detail and checked the
optional item navigation. This is Issue #5 only; Screens 2/3 and receipts follow
in later tickets.

## Run

Use Node.js 22 or newer. Runtime dependencies and a build step are unnecessary.

```sh
cd app
npm start
```

Open <http://127.0.0.1:6285/>. To use another loopback port, run
`PORT=6286 npm start`. Choose **Connect to live SAP sandbox** and enter your own
Hub sandbox key locally, or choose **Use fixture demonstration**. The fixture is
synthetic and is never substituted automatically for a failed live read.

## Tests

For a fresh test installation:

```sh
npm install
npx playwright install chromium
npm test
```

There are 15 deterministic test groups, including the same public browser entry
driven through
raw OData normalization, matching/mismatched keys, empty/unusable/malformed data,
decimal types and precision, date/currency/identifier failures, provenance,
sentinel key clearing, stale-evidence clearing, redirects and unsafe destinations.
The fixture server runs in-process; a port collision fails rather than reusing a
pre-existing service. `PORT` can select the test port too.

An existing bundled Playwright can be used with `PLAYWRIGHT_MODULE_PATH` pointing
to its `index.mjs` and `PLAYWRIGHT_BROWSERS_PATH` pointing to its browser cache.
Those paths are local execution settings, not source-code dependencies.

## Source and boundaries

- Source API `API_BILLING_DOCUMENT_REQUEST_SRV`, API version `1.1.0`, OData V2.
  Its specification format is OpenAPI `3.0.0`.
- Exact base: `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV`.
- The preferred `CABILLINGDOCUMENT_0001` failed the documented header-amount
  contract. Exactly one source is selected for this reader.
- A billing request does not prove payment or identify a Spark customer. Dates
  retain their documented accounting meaning; amounts retain their sign and
  decimal text. There are no annual totals, conversions or recommendations.
- Lists and item navigation show bounded loaded coverage. Missing continuation
  links do not prove complete history. Full pagination belongs to Issue #8.
- Keys stay in the browser connection's memory and request headers. Disconnect
  or closing/reloading the page clears the connection. No key, raw response or
  receipt is persisted by this ticket.
- The server binds to `127.0.0.1`, validates Host/Origin and exact upstream
  destinations, permits GET only for SAP/local API reads, refuses redirects,
  uses default TLS certificate verification and rejects a TLS-bypass environment.
  Static serving is limited to the three public assets.
- Error bodies are sanitized; the B0 button exposes observations without raw
  document identifiers, amounts, parties or credentials. It is supporting
  metadata; the [live read record](../docs/validation/issue-5-live-evidence.json)
  and [field contract](../docs/validation/issue-5-field-contract.md) record acceptance.

[OpenCode execution and verification record](../docs/development/issue-5-opencode.md)
