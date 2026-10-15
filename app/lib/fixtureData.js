// Synthetic OData headers, normalized through the same field contract as live data.
export const fixtureRecords = [
  { BillingDocumentRequest: '9000000001', BillingDocumentDate: '/Date(1728950400000)/', TotalNetAmount: '250.000', TotalTaxAmount: '37.500', TotalGrossAmount: '287.500', TransactionCurrency: 'USD', PayerParty: null, ContractAccount: null },
  { BillingDocumentRequest: '9000000002', BillingDocumentDate: '/Date(1730419200000)/', TotalNetAmount: '-18.750', TotalTaxAmount: '0.000', TotalGrossAmount: '-18.750', TransactionCurrency: 'NZD', PayerParty: null, ContractAccount: null }
];

// A separate, explicitly bounded second page for the offline pagination journey.
export const fixtureNextRecords = [
  { BillingDocumentRequest: '9000000003', BillingDocumentDate: '/Date(1730419200000)/', TotalNetAmount: '-0.100', TotalTaxAmount: '0.000', TotalGrossAmount: '-0.100', TransactionCurrency: 'EUR', PayerParty: null, ContractAccount: null },
  { BillingDocumentRequest: '9000000004', BillingDocumentDate: '/Date(1730419200000)/', TotalNetAmount: '9007199254740.993', TotalTaxAmount: '0.001', TotalGrossAmount: '9007199254740.994', TransactionCurrency: 'USD', PayerParty: null, ContractAccount: null }
];
