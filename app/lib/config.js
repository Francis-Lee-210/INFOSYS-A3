// Shared, allowlisted source configuration. Do not accept an arbitrary URL here.
export const SOURCE_API_ID = 'API_BILLING_DOCUMENT_REQUEST_SRV';
export const SOURCE_API_VERSION = '1.1.0';
export const ALLOWED_HOST = 'sandbox.api.sap.com';
export const SANDBOX_BASE_URL = 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV';
export const LIST_PATH = '/A_BillingDocumentRequest';
export const INDEXED_COLLECTION_PATH = `${SANDBOX_BASE_URL}${LIST_PATH}`;
export const CONNECTION_KEY_HEADER = 'APIKey';
export const DEFAULT_TOP = 10;
export const ITEMS_TOP = 20;
export const REQUEST_TIMEOUT_MS = 20000;
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export const OPENAPI = Object.freeze({
  overviewUrl: 'https://api.sap.com/api/API_BILLING_DOCUMENT_REQUEST_SRV/overview',
  helpHeaderUrl: 'https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/cf3f6ebc648e4088b20cb10f80523cf0.html',
  sha256: '9dfbb583663bb493584fd62e609c3d37a6fe264c4154256249a6be7c3cd62999'
});

export const FIELD_MEANINGS = Object.freeze({
  documentKind: 'billing request (fixed from the configured candidate source; never an issued or paid bill)',
  key: 'BillingDocumentRequest, stable billing request identifier',
  date: 'BillingDocumentDate, documented Billing Date; may be an intended future invoice date, never a payment or service-coverage date',
  transactionCurrency: 'TransactionCurrency, document currency',
  totalNetAmount: 'TotalNetAmount, net value excluding sales tax, including surcharges and discounts',
  totalTaxAmount: 'TotalTaxAmount, document-currency sales tax',
  totalGrossAmount: 'TotalGrossAmount, reported gross document amount'
});

export const REQUEST_SOURCE_PROFILE_ID = 'billing-document-request-v1';
export const SYNTHETIC_SOURCE_PROFILE_ID = 'synthetic-billing-document-v1';
export const COST_SNAPSHOT_VERSION = 'issue-6-cost-snapshot-v1';
export const COST_CONSISTENCY_RULE_ID = 'issue-6-monetary-consistency-v1';
