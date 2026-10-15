# Issue #6: cost-evidence acceptance

Prepared 15 October 2026. **Status: implementation and independent acceptance PASS (34/34); PR review/merge pending.**
Controlling work item: [Issue #6](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/6),
with [parent #4](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/4).
PR #18 merged at 04:53:50 UTC; #5 closed at 04:53:52 UTC. Base: `e7a06fef11a38a68f77fd46958751312c592a876`.

## Requirement crosswalk

| #6 criterion | Implementation boundary and required browser evidence | Status |
|---|---|---|
| 1: selection → explanation → Back | A separately fetched matching detail enables Screen 2; Back preserves the selected source/list and returns focus. Another selection or source invalidates the old snapshot. | PASS |
| 2: source and meaning (AC03/04/07) | Visible kind/key, configured provenance/source/profile, mapped date and meaning, amount basis/currency, and retrieval timestamp. Both fixture kinds retain their labels. | PASS |
| 3: exact amounts (AC05) | Original signed decimal strings for net/tax/gross; no rounding, FX, default NZD, annual totals or header-plus-item addition. | PASS |
| 4: missing/invalid data (AC06/14) | Optional party/account/tax/items/service period Unknown/Not available; required contract errors are recoverable and cannot leave an old usable cost view. | PASS |
| 5: currency/date isolation (AC07/08) | Switching documents changes currency/context; foreign-currency or foreign-parent linked rows cannot become a combined total. No payment/service-month inference. | PASS |
| 6: readable explanation | Explain the reported amount and limitations without raw JSON or an invented charge split. Partial/unavailable/inconsistent detail is explicit; reported figures remain unchanged. | PASS |
| 7: downstream consistency contract | Expose a versioned consistency result including `materialInconsistency`, reasons and assessment status for #7. No choices, confirmation or receipt are implemented here. | PASS |
| 8: reproducible tests | Public browser tests for both kinds, signed/decimal/currency/missing/date cases, linked-detail conflicts, malformed payloads and key mismatch. Record separate AC03–08/14 outcomes. Preserve #5 regressions. | PASS |

## Decisions and evidence limits

- The sole approved live source remains [#5's frozen mapping](issue-5-field-contract.md): `API_BILLING_DOCUMENT_REQUEST_SRV` v1.1.0. No alternate live source is introduced.
- AC04's second document-kind fixture is an explicitly synthetic normalized contract example with its own configured profile. Its `sourceApiId` is absent/null; it does not fabricate a monetary mapping for the rejected `CABILLINGDOCUMENT_0001` API or pass B0.
- Preserve SAP decimal-string precision/scale (header net16/3, tax14/3, gross17/3; optional item net/gross16/3, tax14/3) and original display text. Exact arithmetic, when applicable, uses integer coefficients and scale; no currency exponent is used to round supplied values.
- Live item reads remain bounded/partial. A missing continuation does not verify a complete breakdown. Item net/tax/gross and currency may be shown only when actually supplied, typed and parent-linked.
- The current source material establishes amount meanings but no verified universal item-to-header equation or rounding tolerance. Live reconciliation must remain unassessed/partial unless independently established. A synthetic fixture may declare an exact relation and zero tolerance as fixture semantics, never a SAP or Spark accounting rule.
- Structural contradictions (wrong parent/source/currency) can set a material evidence-conflict flag with the reason retained. Missing optional detail alone is not material inconsistency. The downstream contract must distinguish unassessed/partial from verified consistency.
- Prior [real B0 observations](issue-5-live-evidence.json) remain historical. Fixture/browser tests do not constitute a new live SAP acceptance or AC25.

## Source locators

- Preserved [official OpenAPI](../../resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json): header/item schema types, precision/scale and declared GET navigation.
- [SAP Header](https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/cf3f6ebc648e4088b20cb10f80523cf0.html): net excludes sales taxes and includes discounts/surcharges; date concerns subsequent billing/accounting, not payment.
- [SAP Billing Document Request Item](https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/e6be30bd5484475ea3db431b866ad0b3.html): documented item identity, net/tax/gross and transaction currency. This does not establish completeness or a universal reconciliation equation.

Independent read-only requirements audit completed before implementation. Executed results and the final closure audit are recorded below.

## Executed acceptance, 15 October 2026

The coordinator independently ran the final public browser suite at 05:33 UTC,
using Node 26.0.0 and Chromium through Playwright 1.62.1. Exit code **0**,
**34/34 groups PASS**, including the unchanged 15-group #5 prefix.
[Captured command output](issue-6-browser-test-results.txt).

Reproduction from app/:

    PORT=6965 npm test

Install Playwright/Chromium as described in [app README](../../app/README.md),
or supply the local PLAYWRIGHT_MODULE_PATH and PLAYWRIGHT_BROWSERS_PATH.

| Primary parent AC | Actual evidence in app/tests/browser.mjs | Outcome / scope |
|---|---|---|
| AC03 provenance | Fixture source labels; synthetic profile metadata; original machine provenance/B0/clearing; live transport is injected, never actual SAP | PASS for #6 states. Historical receipts belong to #7. |
| AC04 kind and one source | Both fixture profiles keep distinct kinds/API identities; wrong kind/profile/provenance rejected; source-switch/stale-response gates | PASS. Second kind is an explicitly synthetic contract, not another live API mapping. |
| AC05 amount basis | Signed/zero/negative values, 0.100+0.200, coefficients above 2^53 and one-mill mismatch; exact DOM values and bases; matching/foreign linked rows | PASS. No rounding, FX, annual or header-plus-item aggregation. |
| AC06 missing fields | Optional tax on both profiles; payer/account/service-period Unknown; missing/invalid item fields; unusable required headers and recovery | PASS. Missing optional detail alone is not material. |
| AC07 date meaning | Controlled request/synthetic meanings; impossible/non-string date, substituted payment meaning and invalid timestamp rejected | PASS. No payment/service-coverage inference. |
| AC08 mixed currency | Both fixture profiles select USD then NZD in one browser session; exact currency/figures replace the prior snapshot; foreign item currency is withheld | PASS. No combined cross-currency total. |
| AC14 invalid payload/key | Raw malformed/empty/unusable responses; normalized usable=true cannot bypass validation; mismatched detail keys; valid retry; stale responses | PASS. No unrelated/zero fallback explanation. |

Additional #6 criteria passed: Screen1 → cost explanation → Back; selected-row
focus restoration; typed consistency handoff; pending item response refresh while
cost is open; invalidation after Back/source/reset; strict mode/profile rejection.

## Machine contract and consistency scope

The version is issue-6-cost-snapshot-v1. The export
window.__issue6CostSnapshot contains materialInconsistency, assessmentStatus,
reasons, exact amounts, document identity/source provenance and a versioned rule.
See [the handoff schema and consumer meaning](../../app/README.md#versioned-handoff-to-7).

- Synthetic rule.scope: synthetic-header-net-tax-gross-only. Consistent means
  only the declared net+tax=gross header relation passed with exact coefficients,
  scale 3 and zero tolerance. Missing one amount makes this relation partial.
- Request rule.scope: source-and-linkage-validation-only. Monetary reconciliation
  is unassessed for live and request fixtures. No SAP equality/tolerance is invented.
- rule.linkedMonetaryReconciliation: not-assessed for every profile, including a
  synthetic fixture with explicitly complete bounded row coverage.
- A known currency or source/profile/version/provenance/parent conflict sets
  materialInconsistency=true with a reason. Missing optional fields alone do not.
- Matching late item responses refresh both the open view and exported result.
  The export clears on Back, selection, reload, source change and reset. #7 must
  consume current state; choice restrictions/receipt reasons remain its own work.

The synthetic input reuses TotalNetAmount/TotalTaxAmount/TotalGrossAmount as
local fixture properties only. Its independent configured profile declares the
processing date and header relation; API ID/version stay null throughout. These
property names do not establish a mapping to a SAP billing-document API.

## UI evidence

The final synthetic fixture was inspected at 1366px and 390px. Page widths were
1366 and 390 respectively, with no pageerror. The amount table scrolls within its
container on mobile. Entering cost evidence focuses Back; returning focuses the
selected row and clears the exported snapshot. The images show synthetic data:

- [Desktop screenshot](issue-6-desktop.png)
- [390px screenshot](issue-6-mobile.png)

## Independent audit and preserved evidence

Read-only acceptance and implementation audits found and closed three material
gaps: missing same-session currency-switch proof, unclear scope for the synthetic
consistent status, and an in-flight item response leaving an open cost flag stale.
The focused closure audit found no remaining blocking defect. The final 34-group
suite covers these cases; screenshots were visually inspected.

Nine JS/MJS syntax checks and git diff --check passed. The original A3 checkout's
14 dirty/untracked files retain their recorded SHA-256 values. Frozen #5 mapping,
live B0/evidence and official specifications are unchanged from base e7a06fe.
Specification SHA-256:

- API_BILLING_DOCUMENT_REQUEST_SRV: 9dfbb583663bb493584fd62e609c3d37a6fe264c4154256249a6be7c3cd62999
- CABILLINGDOCUMENT_0001: 7c16d4c208565ceb0945a60e66841ead6ce3b88bc4477e425d78e8c706b2b219

No new live SAP read, receipt acceptance, pagination, user study, course artifact
submission or merge is claimed by these results.
