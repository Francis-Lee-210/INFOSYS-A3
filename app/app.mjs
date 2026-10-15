const status = document.getElementById('status');
const error = document.getElementById('error');
const provenance = document.getElementById('provenance');
const recordsBody = document.getElementById('records-body');
const listMeta = document.getElementById('list-meta');
const detail = document.getElementById('detail');
const detailActions = document.getElementById('detail-actions');
const evidence = document.getElementById('evidence');
const screenList = document.getElementById('screen-list');
const screenCost = document.getElementById('screen-cost');
const reviewCostButton = document.getElementById('review-cost-evidence');
const backToListButton = document.getElementById('back-to-list');
const costError = document.getElementById('cost-error');
const costSummary = document.getElementById('cost-summary');
const costAmounts = document.getElementById('cost-amounts');
const costFields = document.getElementById('cost-fields');
const costConsistency = document.getElementById('cost-consistency');
const costReasons = document.getElementById('cost-reasons');
const costItems = document.getElementById('cost-items');
const costLimits = document.getElementById('cost-limits');
const apiKeyInput = document.getElementById('api-key');
const screenDecision = document.getElementById('screen-decision');
const receiptStatus = document.getElementById('receipt-status');
const intentOptions = document.getElementById('intent-options');
const confirmIntentButton = document.getElementById('confirm-intent');
const retryReceiptButton = document.getElementById('retry-receipt');
const reopenReceiptButton = document.getElementById('reopen-receipt');
const RECEIPT_KEY = 'planReviewSnapshot.receipt';
const RECEIPT_VERSION = 'issue-7-receipt-v2';
const INTENTS = { keep: 'Keep', 'review-options': 'Review options', help: 'Help', later: 'Later' };
const PROVENANCE_LABELS = { 'live-sap-sandbox': 'Live SAP sandbox', 'fixture-demonstration': 'Fixture demonstration', 'synthetic-fixture': 'Synthetic fixture' };
let receipt = null;
let receiptRecovery = false;
let resetUncertain = false;
let chosenIntent = '';
let pendingReceipt = null;
Object.defineProperty(window, '__issue7Receipt', { get: () => receipt ? structuredClone(receipt) : undefined });

const state = {
  mode: 'none',
  requestedMode: 'none',
  connectionToken: 0,
  listRequestId: 0,
  detailRequestId: 0,
  itemRequestId: 0,
  records: [],
  selectedKey: '',
  loadedMeta: null,
  itemsCoverage: null,
  apiKey: '',
  observedList: null,
  observedDetail: null,
  verifiedDetail: null,
  verifiedDetailKey: '',
  verifiedDetailMode: 'none',
  costSnapshot: null,
  costToken: 0
};

function setStatus(text) { status.textContent = text; }
function showError(text) {
  error.hidden = false;
  error.textContent = text;
}
function clearError() {
  error.hidden = true;
  error.textContent = '';
}
function setProvenance(label, kind) {
  provenance.textContent = label;
  provenance.className = `badge ${kind || ''}`.trim();
}
function setMode(mode) {
  state.mode = mode;
  // Connection state may change behind a historical receipt. The badge describes
  // the active view, not whichever asynchronous request happened to finish last.
  if (receipt && !screenDecision.hidden) {
    setProvenance(PROVENANCE_LABELS[receipt.document.provenance], receipt.document.provenance === 'live-sap-sandbox' ? 'live' : 'fixture');
    return;
  }
  if (mode === 'live') setProvenance('Live SAP sandbox', 'live');
  else if (mode === 'fixture') setProvenance('Fixture demonstration', 'fixture');
  else if (mode === 'synthetic') setProvenance('Synthetic fixture', 'fixture');
  else setProvenance('Not connected', '');
}

function resetSession() {
  state.connectionToken += 1;
  state.records = [];
  state.selectedKey = '';
  state.loadedMeta = null;
  state.itemsCoverage = null;
  state.observedList = null;
  state.observedDetail = null;
  state.verifiedDetail = null;
  state.verifiedDetailKey = '';
  state.verifiedDetailMode = 'none';
  clearCostView();
  state.costToken += 1;
  try { window.__issue6CostSnapshot = undefined; } catch {}
  state.itemRequestId += 1;
  state.listRequestId += 1;
  state.detailRequestId += 1;
  state.apiKey = '';
  apiKeyInput.value = '';
  recordsBody.innerHTML = '<tr><td colspan="6" class="empty">No records loaded.</td></tr>';
  listMeta.textContent = 'No list request has returned.';
  detail.className = 'detail empty-detail';
  detail.innerHTML = '<p>Select a document to load its detail.</p>';
  detailActions.hidden = true;
  reviewCostButton.disabled = true;
  evidence.hidden = true;
  evidence.textContent = '';
  if (screenCost) screenCost.hidden = true;
  if (screenList) screenList.hidden = false;
  setMode('none');
  clearError();
  setStatus('Disconnected. Session key and loaded records were cleared.');
}

function appendQuery(path, pairs) {
  const params = new URLSearchParams();
  for (const [key, value] of pairs) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function loadList(mode) {
  clearError();
  const suppliedKey = mode === 'live' ? apiKeyInput.value.trim() : '';
  if (mode === 'live' && suppliedKey === '') {
    showError('Enter an API key before connecting. A missing key is an authentication or connection failure, not an empty result set.');
    setStatus('Connection not changed. Provide a key or choose the labelled fixture.');
    return;
  }

  const listToken = ++state.listRequestId;
  const detailToken = ++state.detailRequestId;
  state.selectedKey = '';
  state.itemsCoverage = null;
  state.observedList = null;
  state.observedDetail = null;
  state.verifiedDetail = null;
  state.verifiedDetailKey = '';
  state.verifiedDetailMode = state.requestedMode;
  clearCostView();
  state.costToken += 1;
  try { window.__issue6CostSnapshot = undefined; } catch {}
  state.itemRequestId += 1;
  state.records = [];
  recordsBody.innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';
  listMeta.textContent = 'Waiting for list response.';
  detail.className = 'detail empty-detail';
  detail.innerHTML = '<p>Select a document to load its detail.</p>';
  detailActions.hidden = true;
  reviewCostButton.disabled = true;
  evidence.hidden = true;
  evidence.textContent = '';
  if (screenCost) screenCost.hidden = true;
  if (screenList) screenList.hidden = false;
  try { window.__issue6CostSnapshot = undefined; } catch {}

  state.requestedMode = mode === 'live' ? 'live' : (mode === 'synthetic' ? 'synthetic' : 'fixture');
  setMode(state.requestedMode);

  if (mode === 'live') {
    state.apiKey = suppliedKey;
    apiKeyInput.value = '';
  } else {
    state.apiKey = '';
    apiKeyInput.value = '';
  }

  const path = appendQuery('/api/billing-requests', [
    ['mode', mode === 'synthetic' ? 'synthetic' : (mode === 'fixture' ? 'fixture' : 'live')],
    ['t', String(Date.now())]
  ]);

  setStatus(mode === 'live' ? 'Connecting to the allowlisted live SAP sandbox...' : 'Loading labelled fixture records...');
  try {
    const headers = {};
    if (mode === 'live') headers['X-SAP-APIKey'] = state.apiKey;
    const response = await fetch(path, { method: 'GET', headers });
    const json = await response.json().catch(() => ({}));
    if (listToken !== state.listRequestId) return;
    if (!response.ok) {
      const message = json?.error?.message || `List request failed with HTTP ${response.status}.`;
      throw Object.assign(new Error(message), { code: json?.error?.code || 'HTTP' });
    }

    if (state.requestedMode !== 'synthetic' && (json.sourceApiId !== 'API_BILLING_DOCUMENT_REQUEST_SRV' || json.sourceApiVersion !== '1.1.0' || json.sourceProfileId !== 'billing-document-request-v1')) {
      throw new Error('The response came from the wrong allowlisted source or version.');
    }
    if (state.requestedMode === 'synthetic' && (json.sourceApiId !== null || json.sourceApiVersion !== null || json.sourceProfileId !== 'synthetic-billing-document-v1' || json.provenance !== 'synthetic-fixture')) {
      throw new Error('The synthetic response claimed live SAP source or an invalid profile.');
    }
    if (state.requestedMode === 'fixture' && (json.mode !== 'fixture' || json.provenance !== 'fixture-demonstration')) {
      throw Object.assign(new Error('The fixture request returned live or unlabelled provenance.'), { code: 'PROVENANCE_MISMATCH' });
    }
    if (state.requestedMode === 'synthetic' && (json.mode !== 'synthetic' || json.provenance !== 'synthetic-fixture')) { throw new Error('The synthetic request returned live, fixture or unlabelled provenance.'); }
    if (state.requestedMode === 'live' && (json.mode !== 'live' || json.provenance !== 'live-sap-sandbox')) {
      throw Object.assign(new Error('The live request returned fixture or unlabelled provenance.'), { code: 'PROVENANCE_MISMATCH' });
    }
    state.mode = state.requestedMode;
    setMode(state.mode);
    if (!Array.isArray(json.records)) throw new Error('The list response has an invalid record contract.');
    const records = json.records;
    state.records = records;
    state.loadedMeta = json;
    const usableKeys = records.filter((item) => item.usable).map((item) => item.key);
    const listDigest = usableKeys[0] ? await digestHex(`issue-5:${usableKeys[0]}`) : null;
    if (listToken !== state.listRequestId) return;
    state.observedList = {
      observedAt: new Date().toISOString(),
      httpStatus: response.status,
      upstreamHttpStatus: json.upstreamStatus ?? null,
      mode: state.mode,
      sourceApi: state.mode === 'synthetic' ? null : 'API_BILLING_DOCUMENT_REQUEST_SRV',
      sourceApiVersion: state.mode === 'synthetic' ? null : '1.1.0',
      sourceProfileId: json.sourceProfileId || (state.mode === 'synthetic' ? 'synthetic-billing-document-v1' : 'billing-document-request-v1'),
      provenance: state.mode === 'synthetic' ? 'synthetic-fixture' : (state.mode === 'fixture' ? 'fixture-demonstration' : 'live-sap-sandbox'),
      transport: state.mode === 'synthetic' ? 'none (synthetic fixture)' : (state.mode === 'fixture' ? 'none (fixture)' : 'https GET-only'),
      localTransport: 'http GET-only',
      loadedCount: json.loadedCount || records.length,
      usableCount: json.usableCount || records.filter((item) => item.usable).length,
      usabilityBooleans: records.map((item) => item.usable === true),
      continuationAvailable: Boolean(json.continuationAvailable),
      keyDigestSha256: listDigest
    };

    if (records.length === 0) {
      recordsBody.innerHTML = '<tr><td colspan="6" class="empty">No records loaded.</td></tr>';
      listMeta.textContent = `${json.loadedCount || 0} loaded, ${json.usableCount || 0} usable. No usable record can become cost evidence.`;
      setStatus('No usable billing request was found. This is not a zero-spend result.');
      return;
    }

    recordsBody.innerHTML = '';
    for (const record of records) {
      const row = document.createElement('tr');
      row.dataset.key = record.key;
      if (record.usable) {
        row.tabIndex = 0;
        row.classList.add('selectable');
      } else {
        row.tabIndex = -1;
        row.setAttribute('aria-disabled', 'true');
        row.classList.add('unusable');
      }
      row.innerHTML = `
        <td>${escapeHtml(record.documentKind)}</td>
        <td>${escapeHtml(record.key)}</td>
        <td>${escapeHtml(record.dateNormalized || 'Unknown')}</td>
        <td>${escapeHtml(formatAmount(record))}</td>
        <td>${escapeHtml(formatBasis(record))}</td>
        <td>${escapeHtml(record.currency || 'Unknown')}</td>
      `;
      row.addEventListener('click', () => { if (record.usable) selectRecord(record.key); });
      row.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && record.usable) {
          event.preventDefault();
          selectRecord(record.key);
        }
      });
      recordsBody.appendChild(row);
    }
    listMeta.textContent = `${json.loadedCount || records.length} loaded, ${json.usableCount || records.filter((item) => item.usable).length} usable; ${json.loadedCount || records.length} of possibly more. ${json.continuationAvailable ? 'A continuation is present but is not followed in this scope.' : 'No continuation reported.'} Loaded records, not complete history.`;
    setStatus(`Loaded ${records.length} record(s). Select one to load its separate detail.`);
  } catch (caught) {
    if (listToken !== state.listRequestId) return;
    recordsBody.innerHTML = '<tr><td colspan="6" class="empty">No records loaded.</td></tr>';
    const message = caught?.message || 'The request failed.';
    showError(message);
    setStatus('Connection failed. Correct the cause and try again.');
    setMode('none');
  }
}

function formatAmount(record) {
  const amount = record.amounts?.net ?? record.amounts?.gross ?? record.amounts?.tax;
  return amount ? amount : 'No amount';
}
function formatBasis(record) {
  if (record.amounts?.net) return 'Net basis';
  if (record.amounts?.gross) return 'Gross basis';
  if (record.amounts?.tax) return 'Tax basis';
  return 'Unknown';
}

async function selectRecord(key) {
  clearError();
  if (!state.records.some(record => record.key === key && record.usable === true)) { showError('Select a usable record from the current list.'); return; }
  state.observedDetail = null;
  state.verifiedDetail = null;
  state.verifiedDetailKey = '';
  clearCostView();
  state.costToken += 1;
  try { window.__issue6CostSnapshot = undefined; } catch {}
  state.itemsCoverage = null;
  if (state.observedList) delete state.observedList.selectedKeyDigestSha256;
  state.itemRequestId += 1;
  const requestToken = ++state.detailRequestId;
  state.selectedKey = key;
  highlightSelected(key);
  detail.className = 'detail';
  detail.innerHTML = '<p>Loading separate by-key detail...</p>';
  detailActions.hidden = true;
  reviewCostButton.disabled = true;
  evidence.hidden = true;
  setStatus(`Loading detail for document ${key}...`);

  const path = appendQuery(`/api/billing-requests/${encodeURIComponent(key)}`, [
    ['mode', state.mode === 'synthetic' ? 'synthetic' : (state.mode === 'fixture' ? 'fixture' : 'live')],
    ['selected', key]
  ]);
  const headers = {};
  if (state.mode === 'live' && state.apiKey) headers['X-SAP-APIKey'] = state.apiKey;

  try {
    const response = await fetch(path, { method: 'GET', headers });
    const json = await response.json().catch(() => ({}));
    if (requestToken !== state.detailRequestId || key !== state.selectedKey) return;
    if (!response.ok) {
      const message = json?.error?.message || `Detail request failed with HTTP ${response.status}.`;
      throw Object.assign(new Error(message), { code: json?.error?.code || 'HTTP' });
    }
    const record = json.record;
    const expectedProvenance = state.mode === 'fixture' ? 'fixture-demonstration' : (state.mode === 'synthetic' ? 'synthetic-fixture' : 'live-sap-sandbox');
    if (state.mode === 'synthetic') {
      if (record?.sourceApiId !== null || record?.sourceApiVersion !== null || record?.sourceProfileId !== 'synthetic-billing-document-v1' || record?.documentKind !== 'synthetic billing document') {
        throw Object.assign(new Error('Detail returned the wrong synthetic profile or document kind.'), { code: 'SOURCE_MISMATCH' });
      }
    } else {
      if (record?.sourceApiId !== 'API_BILLING_DOCUMENT_REQUEST_SRV' || record?.sourceApiVersion !== '1.1.0' || record?.sourceProfileId !== 'billing-document-request-v1' || record?.documentKind !== 'billing request') {
        throw Object.assign(new Error('Detail returned the wrong allowlisted source or version.'), { code: 'SOURCE_MISMATCH' });
      }
    }
    if (json.provenance !== expectedProvenance || record?.provenance !== expectedProvenance || json.sourceProfileId !== record?.sourceProfileId || record?.usable !== true) {
      throw new Error('The detail provenance or usable-record contract does not match this connection.');
    }
    if (!record || record.key !== key || json.keyConsistent !== true) {
      throw Object.assign(new Error('The detail key does not match the selected billing request.'), { code: 'KEY_MISMATCH' });
    }
    validateRequiredDetail(record, state.mode);
    const pendingDigest = await digestHex(`issue-5:${record.key}`);
    if (requestToken !== state.detailRequestId || key !== state.selectedKey) return;
    state.observedDetail = {
      observedAt: new Date().toISOString(),
      httpStatus: response.status,
      upstreamHttpStatus: json.upstreamStatus ?? null,
      sourceApi: (record.sourceProfileId === 'synthetic-billing-document-v1') ? null : (record.sourceApiId || 'API_BILLING_DOCUMENT_REQUEST_SRV'),
      sourceApiVersion: (record.sourceProfileId === 'synthetic-billing-document-v1') ? null : (record.sourceApiVersion || '1.1.0'),
      sourceProfileId: record.sourceProfileId || (record.usable && record.sourceApiId === null ? 'synthetic-billing-document-v1' : 'billing-document-request-v1'),
      provenance: (record.sourceProfileId === 'synthetic-billing-document-v1') ? 'synthetic-fixture' : (json.provenance === 'fixture-demonstration' ? 'fixture-demonstration' : 'live-sap-sandbox'),
      keyConsistent: Boolean(json.keyConsistent),
      detailUsable: Boolean(record.usable),
      dateAvailable: Boolean(record.dateValid),
      payerContextAvailable: record.context?.payerPartyAvailable === true,
      accountContextAvailable: record.context?.contractAccountAvailable === true,
      currencyKnown: Boolean(record.currencyKnown),
      amountFields: {
        net: Boolean(record.amounts?.net),
        tax: Boolean(record.amounts?.tax),
        gross: Boolean(record.amounts?.gross)
      },
      keyDigestSha256: pendingDigest
    };
    state.verifiedDetail = record;
    state.verifiedDetailKey = key;
    state.verifiedDetailMode = state.mode === 'synthetic' ? 'synthetic' : (state.mode === 'fixture' ? 'fixture' : 'live');
    if (state.observedList) state.observedList.selectedKeyDigestSha256 = pendingDigest;
    renderDetail(record);
    detailActions.hidden = false;
    reviewCostButton.disabled = false;
    setStatus(`Detail loaded for document ${key}. Selection and detail keys match.`);
  } catch (caught) {
    if (requestToken !== state.detailRequestId || key !== state.selectedKey) return;
    detail.className = 'detail';
    detail.innerHTML = `<p>Detail load failed: ${escapeHtml(caught?.message || 'Unknown error.')}</p>`;
    detailActions.hidden = false;
    showError(caught?.message || 'Detail load failed.');
    setStatus('Detail request failed.');
  }
}

function renderDetail(record) {
  const amounts = record.amounts || {};
  const basis = record.amountBasis || {};
  const issues = Array.isArray(record.validationIssues) ? record.validationIssues : [];
  const provenanceLabel = record.configuredSourceLabel;
  const sourceLabel = record.sourceApiId === null ? 'Not applicable (synthetic fixture)' : `${record.sourceApiId} (version ${record.sourceApiVersion})`;
  const context = (available) => available === true ? 'Available, opaque context only (minimized in this scope).' : 'Unknown / Not available';
  const missing = (value) => value === null || value === undefined || value === '' ? 'Unknown / Not available' : escapeHtml(String(value));
  const li = (label, value) => `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`;
  detail.innerHTML = `
    <dl>
      ${li('Document kind', escapeHtml(record.documentKind || 'billing request'))}
      ${li('Source API', escapeHtml(sourceLabel))}
      ${li('Configured profile', escapeHtml(record.sourceProfileId))}
      ${li('Stable document key', escapeHtml(record.key || 'Unknown'))}
      ${li('Provenance', escapeHtml(provenanceLabel))}
      ${li('Billing date (BillingDocumentDate)', `${escapeHtml(record.dateNormalized || 'Unknown')} - ${escapeHtml(record.dateMeaning || 'documented billing date')}`)}
      ${li('TotalNetAmount', `${missing(amounts.net)}${basis.net ? ` (${escapeHtml(basis.net)})` : ''}`)}
      ${li('TotalTaxAmount', `${missing(amounts.tax)}${basis.tax ? ` (${escapeHtml(basis.tax)})` : ''}`)}
      ${li('TotalGrossAmount', `${missing(amounts.gross)}${basis.gross ? ` (${escapeHtml(basis.gross)})` : ''}`)}
      ${li('Currency', escapeHtml(record.currency || 'Unknown'))}
      ${li('Payer party context', context(record.context?.payerPartyAvailable))}
      ${li('Contract account context', context(record.context?.contractAccountAvailable))}
      ${li('Optional items', escapeHtml(record.itemCoverage ? `${record.itemCoverage.status} (${record.itemCoverage.count || 0} rows)` : 'Not checked'))}
      ${li('Retrieved at', escapeHtml(record.retrievedAt || 'Unknown'))}
    </dl>
    ${issues.length ? `<p class="warning">Contract warnings: ${escapeHtml(issues.join('; '))}</p>` : ''}
    <p class="coverage">Reported net, tax and gross are independent values. They retain sign and precision and are not summed, converted or annualized.</p>
  `;
}

function highlightSelected(key) {
  for (const row of recordsBody.querySelectorAll('tr')) {
    row.classList.toggle('selected', row.dataset.key === key);
  }
}

async function loadOptionalItems() {
  if (!state.selectedKey || state.mode === 'none') return;
  const expectedSelection = state.selectedKey;
  const expectedMode = state.mode;
  const token = ++state.itemRequestId;
  clearError();
  const sourceRecord = state.verifiedDetail;
  state.itemsCoverage = { status: 'checking', count: 0, rows: [], hasContinuation: false, complete: false, sourceApiId: sourceRecord?.sourceApiId, sourceApiVersion: sourceRecord?.sourceApiVersion, sourceProfileId: sourceRecord?.sourceProfileId, provenance: sourceRecord?.provenance, parentKey: expectedSelection, parentVerified: null, note: 'Optional item request is pending; no breakdown has been verified.' };
  setStatus(`Checking optional item coverage for ${expectedSelection}...`);
  const path = appendQuery(`/api/billing-requests/${encodeURIComponent(expectedSelection)}/items`, [
    ['mode', expectedMode === 'synthetic' ? 'synthetic' : (expectedMode === 'fixture' ? 'fixture' : 'live')]
  ]);
  const controller = new AbortController();
  const headers = {};
  if (expectedMode === 'live' && state.apiKey) headers['X-SAP-APIKey'] = state.apiKey;
  try {
    const response = await fetch(path, { method: 'GET', headers, signal: controller.signal });
    const json = await response.json().catch(() => ({}));
    if (token !== state.itemRequestId || expectedSelection !== state.selectedKey || expectedMode !== state.mode) return;
    if (!response.ok) throw Object.assign(new Error(json?.error?.message || `Item request failed with HTTP ${response.status}.`), { code: json?.error?.code || 'HTTP' });
    state.itemsCoverage = json;
    if (!screenCost.hidden) await reviewCost();
    const note = document.createElement('p');
    note.className = 'warning';
    note.textContent = `Optional items: ${json?.status || 'unknown'}${json?.count ? ` (${json.count} rows)` : ''}. ${json?.note || ''}`;
    detail.appendChild(note);
    setStatus(`Optional item coverage: ${json?.status || 'unknown'}.`);
  } catch (caught) {
    if (token !== state.itemRequestId || expectedSelection !== state.selectedKey || expectedMode !== state.mode) return;
    const note = document.createElement('p');
    note.className = 'warning';
    const unavailableNote = caught?.message || 'Item coverage could not be loaded; no amounts were invented.';
    const record = state.verifiedDetail;
    state.itemsCoverage = { status: 'unavailable', count: 0, rows: [], hasContinuation: false, complete: false, note: unavailableNote, sourceApiId: record?.sourceApiId, sourceApiVersion: record?.sourceApiVersion, sourceProfileId: record?.sourceProfileId, provenance: record?.provenance, parentKey: expectedSelection, parentVerified: null };
    if (!screenCost.hidden) await reviewCost();
    note.textContent = `Optional items: unavailable. ${unavailableNote}`;
    detail.appendChild(note);
    setStatus('Optional item coverage unavailable.');
  }
}


async function loadEvidence() {
  const syntheticMode = state.mode === 'synthetic';
  const report = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'browser',
    sourceApi: syntheticMode ? null : 'API_BILLING_DOCUMENT_REQUEST_SRV',
    sourceApiVersion: syntheticMode ? null : '1.1.0',
    sourceProfileId: syntheticMode ? 'synthetic-billing-document-v1' : (state.mode === 'fixture' ? 'billing-document-request-v1' : 'billing-document-request-v1'),
    provenance: syntheticMode ? 'synthetic-fixture' : (state.mode === 'fixture' ? 'fixture-demonstration' : (state.mode === 'live' ? 'live-sap-sandbox' : 'not-connected')),
    mode: state.mode,
    configuration: {
      transport: syntheticMode ? 'none (synthetic fixture)' : (state.mode === 'fixture' ? 'none (fixture)' : 'https GET-only'),
      localTransport: 'http GET-only',
      getOnly: true,
      rawBodiesStored: false,
      credentialIncluded: false
    },
    observedList: state.observedList || { status: 'not-observed' },
    observedDetail: state.observedDetail || { status: 'not-observed' },
    evidence: 'Observed browser/runtime metadata only. This report does not prove a live SAP read or TLS; parent performs and records live acceptance separately.'
  };
  evidence.hidden = false;
  evidence.innerHTML = `<pre>${escapeHtml(JSON.stringify(report, null, 2))}</pre>`;
}

async function digestHex(value) {
  if (!window.crypto?.subtle) return null;
  const data = new TextEncoder().encode(value);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


// Mirror the normalized public contract before allowing Screen 2. Amounts stay text.
const REQUEST_DATE_MEANING = 'Date on which the subsequent billing document is processed and booked for accounting purposes. Not a payment or service-coverage date.';
const SYNTHETIC_DATE_MEANING = 'Synthetic processing date supplied by the fixture; not a payment or service-coverage date.';

function knownCurrency(value) {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) return false;
  try { return Intl.supportedValuesOf('currency').includes(value); }
  catch { return ['USD', 'EUR', 'GBP', 'NZD', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'ZAR'].includes(value); }
}

function decimalText(value, precision, scale = 3) {
  if (typeof value !== 'string' || !/^[+-]?\d+(?:\.\d+)?$/.test(value)) return false;
  const [integer, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  return integer.replace(/^0+/, '').length <= precision - scale && fraction.length <= scale;
}

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateRequiredDetail(record, mode) {
  if (!['fixture', 'synthetic', 'live'].includes(mode) || !record || record.usable !== true || typeof record.key !== 'string' || !/^[A-Za-z0-9._-]{1,10}$/.test(record.key)) throw new Error('The detail has an unusable document identity.');
  const expectedLabel = mode === 'synthetic' ? 'Synthetic fixture' : (mode === 'fixture' ? 'Fixture demonstration' : 'Live SAP sandbox');
  if (record.configuredSourceLabel !== expectedLabel) throw new Error('The detail has the wrong configured source label.');
  if (record.currencyKnown !== true || !knownCurrency(record.currency)) throw new Error('The detail has an unusable currency.');
  if (record.dateValid !== true || !calendarDate(record.dateNormalized)) throw new Error('The detail has an unusable billing date.');
  if (record.dateMeaning !== (mode === 'synthetic' ? SYNTHETIC_DATE_MEANING : REQUEST_DATE_MEANING)) throw new Error('The detail has no verified date meaning for this profile.');
  if (typeof record.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.retrievedAt) || Number.isNaN(Date.parse(record.retrievedAt)) || new Date(record.retrievedAt).toISOString() !== record.retrievedAt) throw new Error('The detail has an unusable retrieval time.');
  let available = 0;
  for (const [field, precision] of [['net', 16], ['tax', 14], ['gross', 17]]) {
    const value = record.amounts?.[field];
    if (value === null || value === undefined || value === '') continue;
    if (!decimalText(value, precision) || typeof record.amountBasis?.[field] !== 'string' || !record.amountBasis[field].trim()) throw new Error(`The detail has an unusable ${field} amount or basis.`);
    available += 1;
  }
  if (available === 0) throw new Error('The detail has no finite document amount.');
}

function clearCostView() {
  clearPendingDecision();
  state.costSnapshot = null;
  window.__issue6CostSnapshot = undefined;
  for (const element of [costSummary, costAmounts, costFields, costConsistency, costReasons, costItems, costLimits]) element?.replaceChildren();
}

async function reviewCost() {
  const token = ++state.costToken;
  if (costError) { costError.hidden = true; costError.textContent = ''; }
  if (!state.selectedKey || !state.verifiedDetail || state.verifiedDetailKey !== state.selectedKey) {
    showError('Select a valid record and load its separate detail before reviewing cost evidence.');
    setStatus('Cost evidence is unavailable until a matching detail has been loaded.');
    return;
  }
  const record = state.verifiedDetail;
  let snapshot;
  try {
    snapshot = buildCostSnapshot(record, state.mode);
  } catch (caught) {
    showError(caught?.message || 'Cost evidence could not be built from the verified detail.');
    setStatus('Cost evidence is unavailable.');
    state.costSnapshot = null;
    try { window.__issue6CostSnapshot = undefined; } catch {}
    return;
  }
  if (token !== state.costToken || state.selectedKey !== record.key) return;
  const enteringCostScreen = screenCost?.hidden === true;
  state.costSnapshot = snapshot;
  renderCost(snapshot);
  if (screenList) screenList.hidden = true;
  if (screenCost) screenCost.hidden = false;
  if (enteringCostScreen && backToListButton) backToListButton.focus();
  setStatus(`Cost evidence opened for document ${record.key}.`);
}

function buildCostSnapshot(record, mode) {
  if (!record || record.usable !== true) throw new Error('The verified detail is not usable as cost evidence.');
  const expectedProfile = mode === 'synthetic' ? 'synthetic-billing-document-v1' : 'billing-document-request-v1';
  if (record.sourceProfileId !== expectedProfile) throw new Error('The verified detail uses the wrong configured source profile.');
  if (record.documentKind !== (mode === 'synthetic' ? 'synthetic billing document' : 'billing request')) throw new Error('The verified detail has the wrong document kind.');
  if (mode === 'synthetic') {
    if (record.sourceApiId !== null || record.sourceApiVersion !== null) throw new Error('The synthetic detail claims a SAP source API or version.');
    if (record.provenance !== 'synthetic-fixture' || record.configuredSourceLabel !== 'Synthetic fixture') throw new Error('The synthetic detail has the wrong provenance or configured label.');
  } else {
    if (record.sourceApiId !== 'API_BILLING_DOCUMENT_REQUEST_SRV' || record.sourceApiVersion !== '1.1.0') throw new Error('The verified detail uses the wrong source API or version.');
    if (record.provenance !== (mode === 'fixture' ? 'fixture-demonstration' : 'live-sap-sandbox')) throw new Error('The verified detail has the wrong provenance.');
  }
  validateRequiredDetail(record, mode);
  const linked = summarizeLinkedDetail(record, state.itemsCoverage);

  const synthetic = mode === 'synthetic';
  const provenanceLabel = synthetic ? 'Synthetic fixture' : (mode === 'fixture' ? 'Fixture demonstration' : 'Live SAP sandbox');
  const sourceApiLabel = synthetic ? 'Not applicable (synthetic fixture)' : 'API_BILLING_DOCUMENT_REQUEST_SRV';
  const sourceVersionLabel = synthetic ? 'Not applicable' : '1.1.0';
  const sourceProfileId = record.sourceProfileId;
  const reasons = [];
  let materialInconsistency = false;
  let assessmentStatus = synthetic ? 'consistent' : 'unassessed';

  if (!synthetic) {
    reasons.push('SAP source evidence establishes amount meanings and decimal scales, but no verified universal item-to-header equation or rounding tolerance for this reader, so live monetary reconciliation is unassessed rather than reconciled.');
  } else {
    const netValue = bigintFromDecimal(record.amounts.net, 3);
    const taxValue = bigintFromDecimal(record.amounts.tax, 3);
    const grossValue = bigintFromDecimal(record.amounts.gross, 3);
    const hasCompleteRelation = Boolean(record.amounts.net && record.amounts.tax && record.amounts.gross) && netValue !== null && taxValue !== null && grossValue !== null;
    if (!hasCompleteRelation) {
      assessmentStatus = 'partial';
      reasons.push('The synthetic declaration does not include a complete valid net, tax and gross set, so the fixture relation is not assessed. Missing amounts alone are not a material inconsistency.');
    } else if (netValue + taxValue !== grossValue) {
      assessmentStatus = 'inconsistent';
      materialInconsistency = true;
      reasons.push('Synthetic fixture amounts do not satisfy the declared net + tax = gross relation at the documented 0.001 scale.');
    } else {
      reasons.push('Synthetic fixture amounts satisfy the explicitly declared net + tax = gross relation at the documented 0.001 scale. This is fixture-only semantics, not production accounting validation.');
    }
  }

  if (linked.currencyConflict) {
    assessmentStatus = 'inconsistent';
    materialInconsistency = true;
    reasons.push('Linked detail uses a different currency and is never combined with the header amount.');
  }
  if (linked.sourceConflict) {
    assessmentStatus = 'inconsistent';
    materialInconsistency = true;
    reasons.push('Linked detail has a different source or parent key and is not used as valid evidence.');
  }
  if (linked.incompleteRows) {
    if (assessmentStatus === 'consistent') assessmentStatus = 'partial';
    reasons.push('Some optional item fields are missing or invalid; those rows are withheld. Missing optional data is not a material monetary contradiction.');
  }
  if (linked.status === 'checking') {
    if (assessmentStatus === 'consistent') assessmentStatus = 'partial';
    reasons.push('Optional item detail is still being checked. The visible assessment will update when the matching response arrives.');
  }
  if (!linked.present) {
    reasons.push('Optional item or payer/account detail is missing; missing optional detail alone is not a material inconsistency.');
  }

  const explanation = synthetic
    ? `This synthetic billing document reports net ${record.amounts.net || 'Not reported'}, tax ${record.amounts.tax || 'Not reported'} and gross ${record.amounts.gross || 'Not reported'} in ${record.currency}. The amounts are reported separately; no item sum, customer charge, or payment claim is created.`
    : `This billing request reports ${record.amounts.net ? `a net amount of ${record.amounts.net}` : 'no net amount'}, ${record.amounts.tax ? `tax of ${record.amounts.tax}` : 'no tax amount'} and ${record.amounts.gross ? `a gross amount of ${record.amounts.gross}` : 'no gross amount'} in ${record.currency}. These are independent reported SAP amounts with the signs and decimal text preserved; they are not summed, converted or annualised here.`;

  return {
    version: 'issue-6-cost-snapshot-v1',
    assessmentStatus,
    materialInconsistency,
    reasons,
    rule: {
      id: 'issue-6-monetary-consistency-v1',
      scope: synthetic ? 'synthetic-header-net-tax-gross-only' : 'source-and-linkage-validation-only',
      linkedMonetaryReconciliation: 'not-assessed',
      arithmetic: 'Exact integer coefficients and decimal scales using BigInt; no Number, parseFloat, toFixed or Intl rounding.',
      tolerance: synthetic ? 'Zero tolerance for the declared synthetic fixture relation only.' : 'No tolerance or universal reconciliation rule for live SAP source evidence.'
    },
    document: {
      kind: record.documentKind,
      key: record.key,
      currency: record.currency,
      provenance: record.provenance,
      provenanceLabel,
      sourceProfileId,
      sourceApiId: mode === 'synthetic' ? null : 'API_BILLING_DOCUMENT_REQUEST_SRV',
      sourceApiVersion: mode === 'synthetic' ? null : '1.1.0',
      retrievedAt: record.retrievedAt
    },
    source: {
      sourceApi: sourceApiLabel,
      sourceApiVersion: sourceVersionLabel,
      provenance: record.provenance,
      provenanceLabel,
      configuredSourceLabel: record.configuredSourceLabel
    },
    date: {
      value: record.dateNormalized,
      meaning: record.dateMeaning
    },
    amounts: {
      net: record.amounts.net || null,
      tax: record.amounts.tax || null,
      gross: record.amounts.gross || null,
      basis: record.amountBasis || {},
      currency: record.currency
    },
    context: {
      payerPartyAvailable: record.context?.payerPartyAvailable === true,
      contractAccountAvailable: record.context?.contractAccountAvailable === true
    },
    linkedDetail: linked,
    servicePeriod: 'Unknown / Not available',
    paymentStatus: 'Unknown / Not available',
    explanation,
    originalReportedFiguresPreserved: true
  };
}

function summarizeLinkedDetail(record, coverage) {
  if (!coverage) return { present: false, status: 'not-checked', count: 0, hasContinuation: false, currency: null, rows: [], currencyConflict: false, sourceConflict: false, incompleteRows: false, complete: false, note: '' };
  const rows = Array.isArray(coverage.rows) ? coverage.rows : [];
  const sourceConflict = coverage.sourceProfileId !== record.sourceProfileId || coverage.sourceApiId !== record.sourceApiId || coverage.sourceApiVersion !== record.sourceApiVersion || coverage.provenance !== record.provenance || coverage.parentKey !== record.key || coverage.parentVerified === false || (rows.length > 0 && (coverage.parentVerified !== true || rows.some(row => !row || row.parentKey !== record.key)));
  const currencyConflict = rows.some(row => knownCurrency(row?.currency) && row.currency !== record.currency);
  const typedRows = rows.filter(row => row && typeof row.itemKey === 'string' && /^[A-Za-z0-9._-]{1,6}$/.test(row.itemKey) && row.parentKey === record.key && knownCurrency(row.currency) && [['netAmount', 16], ['taxAmount', 14], ['grossAmount', 16]].every(([field, precision]) => row[field] === null || row[field] === undefined || decimalText(row[field], precision)));
  const incompleteRows = typedRows.length !== rows.length;
  const displayedRows = sourceConflict || currencyConflict ? [] : typedRows.map(row => ({
    itemKey: row.itemKey,
    netAmount: row.netAmount ?? 'Not reported',
    taxAmount: row.taxAmount ?? 'Not reported',
    grossAmount: row.grossAmount ?? 'Not reported',
    currency: row.currency
  }));
  const currencies = [...new Set(rows.map(row => row?.currency).filter(knownCurrency))];
  return {
    present: rows.length > 0,
    status: incompleteRows && !sourceConflict && !currencyConflict ? 'partial' : (coverage.status || 'unknown'),
    count: rows.length,
    hasContinuation: typeof coverage.hasContinuation === 'boolean' ? coverage.hasContinuation : null,
    complete: record.sourceProfileId === 'synthetic-billing-document-v1' && coverage.complete === true && coverage.status === 'complete' && coverage.hasContinuation === false && !incompleteRows && !sourceConflict && !currencyConflict,
    currency: currencies.length > 1 ? 'mixed' : (currencies[0] || null),
    rows: displayedRows,
    currencyConflict,
    sourceConflict,
    incompleteRows,
    note: `${typeof coverage.note === 'string' ? coverage.note : ''}${incompleteRows ? ' Incomplete or invalid optional rows are not shown as valid monetary evidence.' : ''}`.trim(),
    parentVerified: coverage.parentVerified === true
  };
}

function bigintFromDecimal(value, scale) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith('-');
  const unsigned = trimmed.replace(/^[+-]/, '');
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  if (fractionPart.length > scale) return null;
  const wholeDigits = wholePart.replace(/^0+(?=\d)/, '') || '0';
  const fractionDigits = fractionPart.padEnd(scale, '0');
  const coefficient = wholeDigits + fractionDigits;
  const result = BigInt(coefficient === '' ? '0' : coefficient);
  return negative ? -result : result;
}

function renderCost(snapshot) {
  document.getElementById('continue-decision').disabled = snapshot.linkedDetail.status === 'checking';
  clearError();
  if (costError) { costError.hidden = true; costError.textContent = ''; }
  if (costSummary) {
    costSummary.innerHTML = `<p>${escapeHtml(snapshot.explanation)}</p><p><strong>Document kind:</strong> ${escapeHtml(snapshot.document.kind)}; <strong>key:</strong> ${escapeHtml(snapshot.document.key)}; <strong>currency:</strong> ${escapeHtml(snapshot.document.currency)}.</p>`;
  }
  if (costAmounts) {
    const rows = [
      ['Total net amount', snapshot.amounts.net, snapshot.amounts.basis.net],
      ['Total tax amount', snapshot.amounts.tax, snapshot.amounts.basis.tax],
      ['Total gross amount', snapshot.amounts.gross, snapshot.amounts.basis.gross]
    ];
    costAmounts.innerHTML = rows.map(([label, value, basis]) => `
      <tr>
        <th scope="row">${escapeHtml(label)}</th>
        <td class="numeric">${escapeHtml(value || 'Not reported')}</td>
        <td>${escapeHtml(snapshot.amounts.currency || 'Unknown')}</td>
        <td>${escapeHtml(basis || 'Reported document field')}</td>
      </tr>
    `).join('');
  }
  if (costFields) {
    const fields = [
      ['Document kind', snapshot.document.kind],
      ['Document key', snapshot.document.key],
      ['Currency', snapshot.document.currency],
      ['Provenance', snapshot.source.provenanceLabel],
      ['Source API', snapshot.source.sourceApi],
      ['Source API version', snapshot.source.sourceApiVersion],
      ['Configured profile', snapshot.document.sourceProfileId],
      ['Billing date', `${snapshot.date.value || 'Unknown'} (${snapshot.date.meaning})`],
      ['Payer party context', snapshot.context.payerPartyAvailable ? 'Available, opaque context only' : 'Unknown / Not available'],
      ['Contract account context', snapshot.context.contractAccountAvailable ? 'Available, opaque context only' : 'Unknown / Not available'],
      ['Service period/payment evidence', `${snapshot.servicePeriod}; ${snapshot.paymentStatus}`],
      ['Linked item evidence', `${snapshot.linkedDetail.status} (${snapshot.linkedDetail.count} rows)${snapshot.linkedDetail.note ? ` - ${snapshot.linkedDetail.note}` : ''}`],
      ['Retrieval time', snapshot.document.retrievedAt || 'Unknown']
    ];
    costFields.innerHTML = fields.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd>`).join('');
  }
  const friendlyStatus = { unassessed: 'Not assessed', partial: 'Partial detail', consistent: 'Synthetic check passed (header relation only)', inconsistent: 'Needs review' }[snapshot.assessmentStatus] || 'Not assessed';
  if (costConsistency) {
    costConsistency.textContent = `Assessment: ${friendlyStatus}.`;
  }
  if (costReasons) {
    costReasons.innerHTML = (snapshot.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');
  }
  if (costItems) {
    if (snapshot.linkedDetail.rows && snapshot.linkedDetail.rows.length) {
      costItems.innerHTML = snapshot.linkedDetail.rows.map((row) => `<li>${escapeHtml(row.itemKey)}: net ${escapeHtml(row.netAmount)}, tax ${escapeHtml(row.taxAmount)}, gross ${escapeHtml(row.grossAmount)} (${escapeHtml(row.currency)}) - reported row, not a total.</li>`).join('');
    } else {
      const conflict = snapshot.linkedDetail.currencyConflict || snapshot.linkedDetail.sourceConflict;
      costItems.innerHTML = `<li>${escapeHtml(conflict ? 'Linked item rows are not shown as valid evidence because of a currency or source/parent conflict.' : (snapshot.linkedDetail.note || 'No linked item detail was checked or available.'))}</li>`;
    }
  }
  if (costLimits) {
    const linkedText = snapshot.linkedDetail.present ? `Linked detail currency: ${snapshot.linkedDetail.currency || snapshot.linkedDetail.sourceCurrency || 'Unknown'}${snapshot.linkedDetail.currencyConflict ? ' (conflict - not combined)' : ''}.` : 'No linked item detail was checked.';
    const coverageLimit = snapshot.document.sourceProfileId === 'synthetic-billing-document-v1' ? 'Only the synthetic fixture may explicitly declare bounded complete coverage; this does not establish SAP history.' : 'SAP item coverage is bounded and partial even without a continuation.';
    costLimits.textContent = `No paid-bill claim, default NZD, FX, annual spend, or header-plus-item aggregate is made. ${linkedText} ${coverageLimit}`;
  }
  window.__issue6CostSnapshot = snapshot;
}

function backToList() {
  state.costToken += 1;
  state.itemRequestId += 1;
  if (state.itemsCoverage?.status === 'checking') state.itemsCoverage = null;
  clearCostView();
  if (screenCost) screenCost.hidden = true;
  if (screenList) screenList.hidden = false;
  const selectedRow = recordsBody?.querySelector('tr.selected');
  if (selectedRow) selectedRow.focus();
  else if (recordsBody) recordsBody.focus();
  setStatus(`Returned to the list. Selection for ${state.selectedKey || 'the chosen record'} is preserved.`);
}

reviewCostButton?.addEventListener('click', reviewCost);
backToListButton?.addEventListener('click', backToList);
document.getElementById('connect-live').addEventListener('click', () => loadList('live'));
document.getElementById('use-synthetic')?.addEventListener('click', () => loadList('synthetic'));
document.getElementById('use-fixture').addEventListener('click', () => loadList('fixture'));
document.getElementById('disconnect').addEventListener('click', resetSession);
document.getElementById('reload-detail').addEventListener('click', () => {
  if (state.selectedKey) selectRecord(state.selectedKey);
});
document.getElementById('check-items').addEventListener('click', loadOptionalItems);
document.getElementById('check-evidence').addEventListener('click', loadEvidence);

// Identity uses the immutable review coordinates, never the selected intent or a retry time.
function reviewIdentity(document) {
  return [document.provenance, document.sourceProfileId, document.key, document.retrievedAt].join('|');
}

function receiptFromSnapshot(snapshot, intent) {
  const d = snapshot.document;
  return {
    version: RECEIPT_VERSION,
    reviewId: reviewIdentity(d),
    receiptId: `receipt:${reviewIdentity(d)}`,
    document: {
      kind: d.kind, key: d.key, provenance: d.provenance, sourceProfileId: d.sourceProfileId,
      sourceApiId: d.sourceApiId, sourceApiVersion: d.sourceApiVersion, retrievedAt: d.retrievedAt
    },
    date: { value: snapshot.date.value, meaning: snapshot.date.meaning },
    amounts: {
      net: snapshot.amounts.net, tax: snapshot.amounts.tax, gross: snapshot.amounts.gross,
      basis: Object.fromEntries(['net', 'tax', 'gross'].map(field => [field, snapshot.amounts.basis[field] || null])),
      currency: snapshot.amounts.currency
    },
    context: { ...snapshot.context },
    assessmentStatus: snapshot.assessmentStatus,
    assessmentScope: { scope: snapshot.rule.scope, linkedMonetaryReconciliation: snapshot.rule.linkedMonetaryReconciliation },
    coverage: receiptCoverage(snapshot.linkedDetail),
    materialInconsistency: snapshot.materialInconsistency,
    reasons: snapshot.materialInconsistency ? [...snapshot.reasons] : [],
    missing: {
      linkedDetailPresent: snapshot.linkedDetail.present,
      incompleteRows: snapshot.linkedDetail.incompleteRows,
      currencyConflict: snapshot.linkedDetail.currencyConflict,
      sourceConflict: snapshot.linkedDetail.sourceConflict
    },
    intent,
    confirmedAt: new Date().toISOString()
  };
}

function receiptCoverage(linked) {
  let status = ['not-checked', 'unavailable', 'absent', 'partial', 'complete'].includes(linked.status) ? linked.status : 'unknown';
  // A status label alone is not proof of complete coverage. Only the existing
  // bounded synthetic contract can explicitly establish that result.
  if (status === 'complete' && !linked.complete) status = 'partial';
  if (status === 'absent' && (linked.present || linked.hasContinuation === true)) status = 'partial';
  return { status, complete: status === 'complete' && linked.complete === true, hasContinuation: linked.hasContinuation };
}

function validateReceipt(value) {
  if (!value || value.version !== RECEIPT_VERSION) throw new Error('Unsupported or missing receipt version.');
  const exactKeys = (object, keys) => {
    if (!object || Array.isArray(object) || Object.keys(object).length !== keys.length || keys.some(key => !Object.hasOwn(object, key))) throw new Error('Invalid receipt fields.');
  };
  exactKeys(value, ['version', 'reviewId', 'receiptId', 'document', 'date', 'amounts', 'context', 'assessmentStatus', 'assessmentScope', 'coverage', 'materialInconsistency', 'reasons', 'missing', 'intent', 'confirmedAt']);
  const d = value.document;
  if (!d || !Object.hasOwn(PROVENANCE_LABELS, d.provenance)) throw new Error('Missing or unknown receipt provenance.');
  exactKeys(d, ['kind', 'key', 'provenance', 'sourceProfileId', 'sourceApiId', 'sourceApiVersion', 'retrievedAt']);
  exactKeys(value.date, ['value', 'meaning']);
  exactKeys(value.amounts, ['net', 'tax', 'gross', 'basis', 'currency']);
  exactKeys(value.amounts.basis, ['net', 'tax', 'gross']);
  for (const field of ['net', 'tax', 'gross']) {
    if (value.amounts[field] !== null && typeof value.amounts[field] !== 'string') throw new Error('Invalid receipt amount.');
    if (value.amounts.basis[field] !== null && typeof value.amounts.basis[field] !== 'string') throw new Error('Invalid receipt amount basis.');
  }
  const synthetic = d.provenance === 'synthetic-fixture';
  const mode = synthetic ? 'synthetic' : (d.provenance === 'fixture-demonstration' ? 'fixture' : 'live');
  if (d.sourceProfileId !== (synthetic ? 'synthetic-billing-document-v1' : 'billing-document-request-v1') ||
      d.sourceApiId !== (synthetic ? null : 'API_BILLING_DOCUMENT_REQUEST_SRV') ||
      d.sourceApiVersion !== (synthetic ? null : '1.1.0') ||
      d.kind !== (synthetic ? 'synthetic billing document' : 'billing request')) throw new Error('Invalid receipt source identity.');
  validateRequiredDetail({
    usable: true, key: d.key, configuredSourceLabel: PROVENANCE_LABELS[d.provenance],
    currencyKnown: true, currency: value.amounts?.currency, dateValid: true,
    dateNormalized: value.date?.value, dateMeaning: value.date?.meaning,
    retrievedAt: d.retrievedAt, amounts: value.amounts, amountBasis: value.amounts?.basis
  }, mode);
  if (value.reviewId !== reviewIdentity(d) || value.receiptId !== `receipt:${value.reviewId}` ||
      !Object.hasOwn(INTENTS, value.intent) || typeof value.materialInconsistency !== 'boolean' ||
      !['unassessed', 'partial', 'consistent', 'inconsistent'].includes(value.assessmentStatus) ||
      (value.materialInconsistency !== (value.assessmentStatus === 'inconsistent')) ||
      (value.materialInconsistency && !['help', 'later'].includes(value.intent)) ||
      !Array.isArray(value.reasons) || value.reasons.some(reason => typeof reason !== 'string' || !reason.trim()) ||
      (value.materialInconsistency && value.reasons.length === 0)) throw new Error('Invalid receipt decision or consistency flags.');
  for (const [object, keys] of [[value.context, ['payerPartyAvailable', 'contractAccountAvailable']],
    [value.missing, ['linkedDetailPresent', 'incompleteRows', 'currencyConflict', 'sourceConflict']]]) {
    exactKeys(object, keys);
    if (!object || keys.some(key => typeof object[key] !== 'boolean')) throw new Error('Missing receipt evidence flags.');
  }
  exactKeys(value.assessmentScope, ['scope', 'linkedMonetaryReconciliation']);
  if (value.assessmentScope.scope !== (synthetic ? 'synthetic-header-net-tax-gross-only' : 'source-and-linkage-validation-only') ||
      value.assessmentScope.linkedMonetaryReconciliation !== 'not-assessed' ||
      (!synthetic && !['unassessed', 'inconsistent'].includes(value.assessmentStatus))) throw new Error('Invalid receipt assessment scope.');
  exactKeys(value.coverage, ['status', 'complete', 'hasContinuation']);
  const coverage = value.coverage;
  if (!['not-checked', 'unavailable', 'absent', 'partial', 'complete', 'unknown'].includes(coverage.status) ||
      typeof coverage.complete !== 'boolean' || (coverage.hasContinuation !== null && typeof coverage.hasContinuation !== 'boolean') ||
      coverage.complete !== (coverage.status === 'complete') ||
      (coverage.complete && (!synthetic || coverage.hasContinuation !== false || value.missing.incompleteRows || value.missing.currencyConflict || value.missing.sourceConflict)) ||
      (['not-checked', 'unavailable', 'absent'].includes(coverage.status) && value.missing.linkedDetailPresent) ||
      (coverage.status === 'absent' && coverage.hasContinuation === true)) throw new Error('Invalid receipt coverage limitations.');
  if (typeof value.confirmedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.confirmedAt) ||
      Number.isNaN(Date.parse(value.confirmedAt)) || new Date(value.confirmedAt).toISOString() !== value.confirmedAt) throw new Error('Invalid confirmation timestamp.');
  return value;
}

function clearPendingDecision() {
  chosenIntent = '';
  pendingReceipt = null;
  screenDecision.hidden = true;
  document.getElementById('reset-confirmation').hidden = true;
  for (const input of intentOptions.querySelectorAll('input')) input.checked = false;
}

function showDecision() {
  screenList.hidden = true;
  screenCost.hidden = true;
  screenDecision.hidden = false;
  document.getElementById('reset-confirmation').hidden = true;
  document.getElementById('decision-title').focus();
}

function renderDecision() {
  const saved = Boolean(receipt);
  document.getElementById('decision-title').textContent = receiptRecovery
    ? (resetUncertain ? 'Receipt storage is uncertain' : 'Receipt could not be recovered')
    : (saved ? 'Saved receipt (historical)' : 'Confirm your intention');
  const snapshot = state.costSnapshot;
  const value = receipt || (!receiptRecovery && snapshot ? receiptFromSnapshot(snapshot, chosenIntent) : null);
  document.getElementById('decision-history').textContent = receiptRecovery
    ? 'No verified saved receipt is displayed. Reset demo offers deliberate deletion and verification; cancelling does not change storage.'
    : (saved ? 'Historical snapshot — not a newly refreshed bill. Original evidence and provenance are retained.'
      : 'Review this evidence and choose an intention before confirming.');
  if (saved && snapshot && reviewIdentity(snapshot.document) !== receipt.reviewId) {
    document.getElementById('decision-history').textContent += ` A saved receipt for document ${receipt.document.key} already exists. The current document ${snapshot.document.key} has NOT been recorded. Reset demo is required to record a new intention (one receipt at a time).`;
  }
  const fields = value ? [
    ['Document kind / key', `${value.document.kind} / ${value.document.key}`],
    ['Provenance', PROVENANCE_LABELS[value.document.provenance]],
    ['Source API / version', `${value.document.sourceApiId ?? 'Not applicable (synthetic fixture)'} / ${value.document.sourceApiVersion ?? 'Not applicable'}`],
    ['Configured profile', value.document.sourceProfileId],
    ['Date', `${value.date.value} — ${value.date.meaning}`],
    ...[['net', 'Net amount'], ['tax', 'Tax amount'], ['gross', 'Gross amount']].map(([field, label]) => [label, `${value.amounts[field] ?? 'Not reported'} ${value.amounts.currency} — ${value.amounts.basis[field] ?? 'Not reported'}`]),
    ['Retrieved at', value.document.retrievedAt],
    ['Payer / account context', `${value.context.payerPartyAvailable ? 'Available (opaque)' : 'Unknown'} / ${value.context.contractAccountAvailable ? 'Available (opaque)' : 'Unknown'}`],
    ['Assessment', value.assessmentStatus],
    ['Assessment scope', `${value.assessmentScope.scope === 'synthetic-header-net-tax-gross-only' ? 'Synthetic header net + tax = gross only; not production accounting validation.' : 'Source and linkage validation only. No verified universal item-to-header equation or rounding tolerance; SAP monetary reconciliation remains unassessed.'} Linked monetary reconciliation: not assessed.`],
    ['Item coverage', `Coverage: ${value.coverage.status}${value.coverage.complete ? ' (explicitly bounded synthetic fixture only, not complete SAP history)' : ''}; continuation: ${value.coverage.hasContinuation === null ? 'unknown' : (value.coverage.hasContinuation ? 'present' : 'not reported')}. Row-field completeness is separate from dataset coverage.`],
    ['Evidence flags', `Linked detail: ${value.missing.linkedDetailPresent ? 'present' : 'not present'}; incomplete rows: ${value.missing.incompleteRows ? 'yes' : 'no'}; currency conflict: ${value.missing.currencyConflict ? 'yes' : 'no'}; source conflict: ${value.missing.sourceConflict ? 'yes' : 'no'}`],
    ['Reasons', saved ? (value.reasons.join(' ') || 'None — no material inconsistency recorded.') : snapshot.reasons.join(' ')],
    ...(saved ? [['Confirmed at', value.confirmedAt], ['Receipt identity', value.receiptId]] : [])
  ] : [];
  document.getElementById('decision-summary').innerHTML = `<dl class="cost-fields">${fields.map(([label, text]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text)}</dd>`).join('')}</dl>`;
  const restricted = value?.materialInconsistency === true;
  document.getElementById('decision-restriction').textContent = restricted ? 'Material inconsistency: only Help or Later can be confirmed. The reason is retained with the receipt.' : '';
  intentOptions.hidden = saved || receiptRecovery;
  for (const input of intentOptions.querySelectorAll('input')) {
    input.disabled = restricted && ['keep', 'review-options'].includes(input.value);
    input.checked = input.value === chosenIntent;
  }
  document.getElementById('decision-choice').textContent = `Chosen intent: ${INTENTS[receipt?.intent || chosenIntent] || 'None yet'}`;
  confirmIntentButton.hidden = saved || receiptRecovery;
  confirmIntentButton.disabled = !chosenIntent || (restricted && !['help', 'later'].includes(chosenIntent));
  document.getElementById('back-to-evidence').hidden = saved || receiptRecovery;
  document.getElementById('decision-return-to-list').hidden = !saved && !receiptRecovery;
  retryReceiptButton.hidden = true;
  receiptStatus.textContent = saved ? 'Saved — receipt write and read-back verified.' : 'Unsaved — no intention has been recorded.';
  if (receiptRecovery) receiptStatus.textContent = resetUncertain
    ? 'Deletion could not be verified. The receipt may already be deleted; no saved history is verified. Use Reset demo and Confirm reset to retry deletion and verification. The session key is cleared when reset is verified.'
    : 'Stored receipt could not be recovered. No saved history is shown. Use Reset demo to clear it and start again.';
  reopenReceiptButton.hidden = !saved && !receiptRecovery;
}

function openDecision() {
  if (!receipt && !receiptRecovery && (!state.costSnapshot || state.costSnapshot.linkedDetail.status === 'checking')) return;
  renderDecision();
  if (receipt) setProvenance(PROVENANCE_LABELS[receipt.document.provenance], receipt.document.provenance === 'live-sap-sandbox' ? 'live' : 'fixture');
  showDecision();
}

function saveReceipt() {
  if (receipt || receiptRecovery || !state.costSnapshot || !Object.hasOwn(INTENTS, chosenIntent)) return;
  if (state.costSnapshot.materialInconsistency && !['help', 'later'].includes(chosenIntent)) return;
  pendingReceipt ||= receiptFromSnapshot(state.costSnapshot, chosenIntent);
  try {
    validateReceipt(pendingReceipt);
    const serialized = JSON.stringify(pendingReceipt);
    localStorage.setItem(RECEIPT_KEY, serialized);
    const readBack = validateReceipt(JSON.parse(localStorage.getItem(RECEIPT_KEY)));
    if (JSON.stringify(readBack) !== serialized) throw new Error('Receipt read-back differs from the confirmed intent.');
    receipt = readBack;
    renderDecision();
    // Only an explicit successful confirmation/retry moves focus, not rendering
    // caused by unrelated connection or optional-evidence activity.
    document.getElementById('decision-title').focus();
  } catch {
    receiptStatus.textContent = 'Unsaved — storage write or read-back verification failed. Your chosen intent is preserved. Retry to save it.';
    retryReceiptButton.hidden = false;
  }
}

function reopenStoredReceipt() {
  try {
    const stored = localStorage.getItem(RECEIPT_KEY);
    if (stored === null) return;
    receipt = validateReceipt(JSON.parse(stored));
    setProvenance(PROVENANCE_LABELS[receipt.document.provenance], receipt.document.provenance === 'live-sap-sandbox' ? 'live' : 'fixture');
    openDecision();
  } catch {
    receipt = null;
    receiptRecovery = true;
    openDecision();
  }
}

document.getElementById('continue-decision').addEventListener('click', openDecision);
reopenReceiptButton.addEventListener('click', openDecision);
intentOptions.addEventListener('change', event => {
  if (!Object.hasOwn(INTENTS, event.target.value)) return;
  chosenIntent = event.target.value;
  pendingReceipt = null;
  renderDecision();
});
confirmIntentButton.addEventListener('click', saveReceipt);
retryReceiptButton.addEventListener('click', saveReceipt);
document.getElementById('back-to-evidence').addEventListener('click', () => {
  screenDecision.hidden = true;
  screenCost.hidden = false;
  document.getElementById('continue-decision').focus();
});
document.getElementById('decision-return-to-list').addEventListener('click', () => {
  backToList();
  setMode(state.mode);
  if (!state.selectedKey) document.getElementById('use-fixture').focus();
});
document.getElementById('reset-demo').addEventListener('click', () => {
  document.getElementById('reset-confirmation').hidden = false;
  document.getElementById('confirm-reset').focus();
});
document.getElementById('cancel-reset').addEventListener('click', () => {
  document.getElementById('reset-confirmation').hidden = true;
  document.getElementById('reset-demo').focus();
});
document.getElementById('confirm-reset').addEventListener('click', () => {
  try {
    localStorage.removeItem(RECEIPT_KEY);
  } catch {
    // A thrown removal is not itself proof that the old receipt survived.
    try {
      const stored = localStorage.getItem(RECEIPT_KEY);
      if (stored !== null && (!receipt || JSON.stringify(validateReceipt(JSON.parse(stored))) === JSON.stringify(receipt))) {
        receiptStatus.textContent = receipt
          ? 'Reset could not delete the receipt. Saved — receipt is still stored; session kept. Try Confirm reset again.'
          : 'Reset could not delete the stored data. Read-back confirms stored data is still present. Try Confirm reset again.';
        return;
      }
    } catch {}
    showUncertainReset();
    return;
  }
  try {
    if (localStorage.getItem(RECEIPT_KEY) !== null) throw new Error('Reset read-back still contains data.');
  } catch {
    showUncertainReset();
    return;
  }
  receipt = null;
  receiptRecovery = false;
  resetUncertain = false;
  reopenReceiptButton.hidden = true;
  resetSession();
  document.getElementById('decision-summary').replaceChildren();
  receiptStatus.textContent = '';
  document.getElementById('use-fixture').focus();
});

function showUncertainReset() {
  // Do not roll back, rewrite storage, or display the cached receipt as Saved.
  receipt = null;
  receiptRecovery = true;
  resetUncertain = true;
  clearCostView();
  renderDecision();
  showDecision();
  setMode(state.mode);
  document.getElementById('reset-confirmation').hidden = false;
  document.getElementById('confirm-reset').focus();
}
reopenStoredReceipt();
