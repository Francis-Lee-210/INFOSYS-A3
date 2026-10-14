// SAP API Pool v3 sandbox probe (A3 pre-lab check)
// Usage:  SAP_APIKEY=xxxx node sap_api_probe.mjs
// Get the key: log in to https://api.sap.com (SAP Universal ID) -> profile -> Settings -> Show API Key.
// Never commit the key or put it in the A3 ZIP.
// Output: prints a table and writes sap_api_probe_result.json next to this script.
// Paths marked verify:true are best guesses - copy the real Try Out URL from api.sap.com if they 404.

import { writeFileSync } from "node:fs";

const KEY = process.env.SAP_APIKEY;
if (!KEY) {
  console.error("Set SAP_APIKEY first, e.g.  SAP_APIKEY=xxxx node sap_api_probe.mjs");
  process.exit(1);
}

const S4 = "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap";
const S4V4 = "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap";
const SF = "https://sandbox.api.sap.com/successfactors/odata/v2";

// [plan relevance, API, URL]
const endpoints = [
  ["Rae/PlanFit: customer", "API_BUSINESS_PARTNER A_Customer", `${S4}/API_BUSINESS_PARTNER/A_Customer`],
  ["Rae/PlanFit: customer name/address", "API_BUSINESS_PARTNER A_BusinessPartner", `${S4}/API_BUSINESS_PARTNER/A_BusinessPartner`],
  ["Ryan Li: partner (supplier)", "API_BUSINESS_PARTNER A_Supplier", `${S4}/API_BUSINESS_PARTNER/A_Supplier`],
  ["Rae/PlanFit: plan catalogue", "API_PRODUCT_SRV A_Product", `${S4}/API_PRODUCT_SRV/A_Product`],
  ["Rae/PlanFit: plan names", "API_PRODUCT_SRV A_ProductDescription", `${S4}/API_PRODUCT_SRV/A_ProductDescription`],
  ["Rae/PlanFit: order history proxy", "API_SALES_ORDER_SRV A_SalesOrder", `${S4}/API_SALES_ORDER_SRV/A_SalesOrder`],
  ["Rae/PlanFit: plan-change offer", "API_SALES_QUOTATION_SRV A_SalesQuotation", `${S4}/API_SALES_QUOTATION_SRV/A_SalesQuotation`],
  ["Rae: spend proxy (SD)", "API_BILLING_DOCUMENT_REQUEST_SRV", `${S4}/API_BILLING_DOCUMENT_REQUEST_SRV/A_BillingDocumentRequest`],
  ["Rae: spend history (telco billing)", "CABILLINGDOCUMENT_0001 (verify)", `${S4V4}/api_cabillingdocument/srvd_a2x/sap/cabillingdocument/0001/CABillgDocument`, true],
  ["Rae: arrears gate", "CADUNNING_0001 (verify)", `${S4V4}/api_cadunning/srvd_a2x/sap/cadunning/0001/`, true],
  ["Rae: payment", "API_PAYMENT_ADVICE_SRV", `${S4}/API_PAYMENT_ADVICE_SRV/A_PaymentAdvice`],
  ["Ryan Li / Rae Care: service case", "OP_API_SERVICE_REQUEST_SRV_0001 (verify)", `${S4}/API_SERVICE_REQUEST_SRV/A_ServiceRequest`, true],
  ["Knowledge handover: employees", "ECEmploymentInformation EmpEmployment", `${SF}/EmpEmployment`],
  ["Knowledge handover: org unit", "API_COSTCENTER_SRV", `${S4}/API_COSTCENTER_SRV/A_CostCenter`],
  ["Knowledge handover: project", "API_ENTERPRISE_PROJECT_SRV;v=0002", `${S4}/API_ENTERPRISE_PROJECT_SRV;v=0002/A_EnterpriseProject`],
];

const results = [];
for (const [use, api, url, verify] of endpoints) {
  const isV4 = url.includes("/odata4/");
  const full = url.endsWith("/") ? url : `${url}?$top=3${isV4 ? "" : "&$format=json"}`;
  let row = { use, api, url: full, verify: !!verify };
  try {
    const res = await fetch(full, { headers: { APIKey: KEY, Accept: "application/json" } });
    row.status = res.status;
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      const recs = body?.d?.results ?? body?.value ?? [];
      row.records = recs.length;
      row.fields = recs[0] ? Object.keys(recs[0]).filter((k) => !k.startsWith("__") && !k.startsWith("to_")).slice(0, 15) : [];
      row.sample = recs[0] ?? null;
    } catch {
      row.note = text.slice(0, 120).replace(/\s+/g, " ");
    }
  } catch (e) {
    row.status = "ERR";
    row.note = String(e.message);
  }
  results.push(row);
  console.log(`${String(row.status).padEnd(4)} recs=${String(row.records ?? "-").padEnd(2)} ${api}${row.verify ? "  [path to verify]" : ""}`);
}

const out = new URL("./sap_api_probe_result.json", import.meta.url);
writeFileSync(out, JSON.stringify({ probedAt: new Date().toISOString(), results }, null, 2));
console.log(`\nSaved: ${out.pathname}`);
console.log("200 + recs>0 = usable data; 200 + recs=0 = API up but empty; 401 = key/sandbox issue; 404 = wrong path or no sandbox.");
