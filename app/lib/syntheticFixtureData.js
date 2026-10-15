// Explicitly synthetic normalized contract fixture data for Issue #6.
// It is intentionally separate from the request fixture and does not claim
// any SAP source, API version, or CABILLINGDOCUMENT_0001 mapping.
export const syntheticFixtureRecords = [
  {
    BillingDocumentRequest: 'SYN-0001',
    BillingDocumentDate: '/Date(1728950400000)/',
    TotalNetAmount: '10.000',
    TotalTaxAmount: '2.000',
    TotalGrossAmount: '12.000',
    TransactionCurrency: 'USD',
    PayerParty: null,
    ContractAccount: null
  },
  {
    BillingDocumentRequest: 'SYN-0002',
    BillingDocumentDate: '/Date(1730419200000)/',
    TotalNetAmount: '0.100',
    TotalTaxAmount: '0.200',
    TotalGrossAmount: '0.300',
    TransactionCurrency: 'USD',
    PayerParty: null,
    ContractAccount: null
  },
  {
    BillingDocumentRequest: 'SYN-0003',
    BillingDocumentDate: '/Date(1730419200000)/',
    TotalNetAmount: '-18.750',
    TotalTaxAmount: '0.000',
    TotalGrossAmount: '-18.750',
    TransactionCurrency: 'NZD',
    PayerParty: null,
    ContractAccount: null
  }
];

export const syntheticItemRows = {
  'SYN-0001': [
    { BillingDocumentRequest: 'SYN-0001', BillingDocumentRequestItem: '000010', NetAmount: '10.000', TaxAmount: '2.000', GrossAmount: '12.000', TransactionCurrency: 'USD' }
  ]
};
