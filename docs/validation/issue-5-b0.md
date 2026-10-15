# Issue #5: SAP billing-source validation (B0)

Status: **B0 PASS — exactly one source selected**, verified 15 October 2026, 15:14 NZDT. Fixture checks alone cannot pass B0.
Scope: Issue #5 / parent #4 AC01 and B0.1-B0.8 only. No receipt, complete Lite
workflow, course submission or Staff approval is asserted.

## Preferred source: rejected at the documented-contract gate

Official Hub: https://api.sap.com/api/CABILLINGDOCUMENT_0001/overview
Official SAP Help: https://help.sap.com/docs/SAP_S4HANA_CLOUD/284ff5baa45f4057a251ff4266d4fcd1/3ab63c3dbd3e484896df7001f96304f9.html

- API ID `CABILLINGDOCUMENT_0001`, Hub/API version `1.0.2`, OData V4,
  service version `0001`; Hub modified date `08 Oct 2026`.
- Downloaded from Hub's API Specification / OpenAPI JSON control on
  15 October 2026. Preserved original:
  `resources/api/specs/CABILLINGDOCUMENT_0001.openapi.json`.
- SHA-256: `7c16d4c208565ceb0945a60e66841ead6ce3b88bc4477e425d78e8c706b2b219`.
- Exact documented sandbox (`servers[1].url`):
  `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_cabillingdocument/srvd_a2x/sap/cabillingdocument/0001`.
- Header schema: `components/schemas/com.sap.gateway.srvd_a2x.api_cabillingdocument.v0001.CABillgDocument_Type`.
  All **53** declared header properties were checked. The only numeric fields
  are `CABillgDocumentNumberOfItems` and `CABllbleItmNumber` (item counts).
  There is no reported document-level monetary amount or amount basis.
- Key: `CABillgDocument`; dates include `CABillgDocCreationDate` (date created),
  and currency is `CABillgCurrency`. These do not repair the missing amount.
- Monetary properties on `CABillgDocItem` / `CABillgDocSource` are subordinate
  amounts. Summing them would not establish the reported header amount
  required by B0.4. Optional item entities cannot replace that requirement.
- **B0.4 fails for this source before a credentialed read is needed.** No live
  request to this rejected API is claimed. This establishes the prerequisite
  for evaluating the alternate source under Issue #5.

## Alternate source: selected after actual application validation

Official Hub: https://api.sap.com/api/API_BILLING_DOCUMENT_REQUEST_SRV/overview
Official header semantics: https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/cf3f6ebc648e4088b20cb10f80523cf0.html

- API ID `API_BILLING_DOCUMENT_REQUEST_SRV`, API version `1.1.0`, OData V2,
  Hub modified date `08 Oct 2026`. OpenAPI document format is `3.0.0`;
  that does not mean the service uses OData V3.
- Original downloaded from the same official Hub control on 15 October:
  `resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json`.
- SHA-256: `9dfbb583663bb493584fd62e609c3d37a6fe264c4154256249a6be7c3cd62999`.
- Exact sandbox (`servers[1].url`):
  `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV`.
- Entity/key: `A_BillingDocumentRequest` / `BillingDocumentRequest`.
- Documented GET paths: `/A_BillingDocumentRequest`,
  `/A_BillingDocumentRequest('{BillingDocumentRequest}')`, and optional
  `/A_BillingDocumentRequest('{BillingDocumentRequest}')/to_Item`.
- Required mapping: request ID, request kind, `BillingDocumentDate`, at least
  one reported document amount (`TotalNetAmount`, `TotalTaxAmount`,
  `TotalGrossAmount`) with basis, and known `TransactionCurrency`.
  Optional party/account fields remain opaque and do not identify Spark
  customers. Exact types/nullability are in the separate field contract.
- The app must label these records **billing requests**, never paid bills,
  and must not infer annual spend, service history, allowances or payment.

## Execution and evidence boundaries

Development is delegated to the user's installed **OpenCode CLI v2.0.28**.
The primary agent independently checks artifacts and runs browser acceptance.
Account menu on the signed-in SAP Hub identifies **Francis Lee**. Lab 02
Tutorial page 1 instructs use of a personal SAP Universal ID; it does not name
one mandatory Academy account for Hub sandbox access. Key retrieval was
explicitly authorized by Francis in chat. The key stays in session memory;
it is not included in OpenCode prompts, source, logs or evidence.

The preferred-source OpenCode discovery report required primary correction
of an erroneous property count and output destination. Both original JSON
specifications were restored/checked against their downloaded hashes.
Only independently verified source facts above are accepted.

## Gate status and acceptance

| Gate | Verified result |
|---|---|
| B0.1 official source, route, version, transport, timestamp/TLS | PASS: official JSON and documented sandbox URL, v1.1.0/OData V2; real browser→loopback adapter→HTTPS; default TLS verification retained and bypass refused |
| B0.2 preferred source | Rejected before live read: no documented header amount |
| B0.3 conditional alternate | PASS: exactly one selected source, always labelled billing request |
| B0.4 source-specific mapping | PASS: key/date/known currency and finite net/tax/gross; payer context present but opaque, account Unknown; [frozen field contract](issue-5-field-contract.md) |
| B0.5 real list and matching keyed detail | PASS: 10 loaded / 10 usable, upstream list/detail HTTP200, matching pseudonymous key digests |
| B0.6 items / continuation / coverage | PASS: optional GET returned one item, no continuation observed; bounded partial coverage, no complete-history claim |
| B0.7 GET-only / credential boundary | PASS: exact destination validation, redirect refusal, memory/header-only key; deterministic browser/HTTP tests and code review |
| B0.8 outcome and sanitized evidence | PASS: [actual read evidence](issue-5-live-evidence.json), separate from 9/9 deterministic tests |

Actual list time: **2026-10-15 02:12:17.978 UTC / 15:12:17.978 NZDT**.
Actual matching detail: **02:12:28.063 UTC / 15:12:28.063 NZDT**.
Evidence captured at **02:14:21.913 UTC / 15:14:21.913 NZDT**.
The selected identifier is represented only by a consistent SHA-256 pseudonym;
no real identifiers, amounts, parties, keys or raw response dumps are retained.

The actual app ran at `http://127.0.0.1:6286/` using its documented PORT setting.
[App instructions](../../app/README.md) default to port6285. Parent independently
observed the browser success and field flags, and reviewed the running HTTPS
implementation/TLS guard; the browser metadata button alone is not the proof.

Acceptance scope: **Issue #5 implemented and B0 approved for progression to #6**,
subject to repository review/merge. No later feature, complete Lite workflow,
independent final ZIP, live receipt, group vote, MCP exercise or course submission
is asserted. Source ZIP/PowerPoint/video/course deadlines remain separate.
