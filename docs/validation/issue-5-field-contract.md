# Issue #5: frozen SAP billing-request field contract

**Selected source:** `API_BILLING_DOCUMENT_REQUEST_SRV` v1.1.0, OData V2.
**B0 passed:** 15 October 2026, 15:14 NZDT, through the actual local browser app.
The preferred source was rejected first; see [B0 report](issue-5-b0.md).
[Sanitized actual observations](issue-5-live-evidence.json) are separate from fixtures.

## Authoritative source

- [Official Hub overview and API Specification download](https://api.sap.com/api/API_BILLING_DOCUMENT_REQUEST_SRV/overview).
- [SAP header meanings](https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/cf3f6ebc648e4088b20cb10f80523cf0.html).
- Preserved [OpenAPI JSON](../../resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json),
  SHA-256 `9dfbb583663bb493584fd62e609c3d37a6fe264c4154256249a6be7c3cd62999`.
- Schema: `components/schemas/API_BILLING_DOCUMENT_REQUEST_SRV.A_BillingDocumentRequestType`.
  There are 40 properties and no schema `required` array. OpenAPI `nullable:false`
  by default concerns allowed values, not a guarantee that every response contains
  the property. Adapter requirements below are deliberately stricter.
- Sandbox: `servers[1].url`,
  `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV`.
- GET paths: `/A_BillingDocumentRequest`,
  `/A_BillingDocumentRequest('{BillingDocumentRequest}')`, and optional
  `/A_BillingDocumentRequest('{BillingDocumentRequest}')/to_Item`.

## Source-specific mapping

Observed availability describes the selected live header, not every SAP record.
The list had 10/10 usable headers. Only the fields needed below are selected;
unfetched schema properties remain unobserved.

| Normalized field | Source property | Documented type / nullability | Meaning and validation | Actual selected-header observation |
|---|---|---|---|---|
| source / provenance | configured adapter, not payload inference | API v1.1.0 / explicit live or fixture mode | Exactly one allowlisted source; list/detail source and provenance must match | Live SAP sandbox |
| document kind | configured source entity | fixed `billing request` | Never an issued/paid bill | Request labels preserved |
| stable identifier | `BillingDocumentRequest` | string, max10; nullable false by default | Nonempty string, supported safe identifier; encoded keyed read must match selected list key | Available; matching SHA-256 pseudonyms in evidence |
| API date | `BillingDocumentDate` | nullable string; OData `/Date(milliseconds)/` | Date on which the subsequent billing document is processed and booked for accounting purposes; normalize UTC day, preserve raw date in memory; never payment/service coverage | Available and valid |
| net amount / basis | `TotalNetAmount` | nullable decimal string; precision16, scale3 | Whole-request net value excluding sales tax, including surcharges/discounts | Available and finite |
| tax amount / basis | `TotalTaxAmount` | nullable decimal string; precision14, scale3 | Document-currency sales taxes | Available and finite |
| gross amount / basis | `TotalGrossAmount` | nullable decimal string; precision17, scale3 | Reported gross request amount | Available and finite |
| currency | `TransactionCurrency` | nullable string, max5 | Recognized standard currency code; no default NZD or conversion | Available and recognized |
| payer context | `PayerParty` | nullable string, max10 | Opaque payer reference on this header; expose availability only, infer no Spark identity | Present; actual identifier omitted |
| account context | `ContractAccount` | nullable string, max12 | Unknown when absent; no invented account linkage | Absent / Unknown |
| detail completeness | `to_Item` navigation | optional related collection | Bounded GET; identify returned continuation and parent linkage; never sum into header amounts | One item loaded, no next link; partial coverage |
| retrieval time | successful adapter read | runtime UTC timestamp | Fresh per read; clear observations on source/selection/reset | Recorded separately for list and detail |

A usable record needs a valid key/date/currency and at least one finite documented
header amount. Decimal values must be strings and satisfy source precision/scale;
invalid numeric coercions, missing values and unknown currencies cannot silently
become usable zero amounts. Optional unknown values remain unknown. The reader
performs no reconciliation or account aggregation in this ticket.

## Coverage and fixtures

List `$top=10` and item `$top=20` are bounded reads. Neither returned a continuation
in this actual observation; this does not establish complete history. Source and
external continuation destinations are checked before any credential-bearing read;
no continuation is followed by Issue #5.

Synthetic headers `9000000001` and `9000000002` exercise positive and negative
amount text, missing payer/account context and explicit fixture provenance. They
are normalized by the same contract as live headers and contain no real parties.
A valid fixture is not live integration evidence.
