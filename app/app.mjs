const status = document.getElementById('status');
const error = document.getElementById('error');
const provenance = document.getElementById('provenance');
const recordsBody = document.getElementById('records-body');
const listMeta = document.getElementById('list-meta');
const detail = document.getElementById('detail');
const detailActions = document.getElementById('detail-actions');
const evidence = document.getElementById('evidence');
const apiKeyInput = document.getElementById('api-key');

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
  observedDetail: null
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
  if (mode === 'live') setProvenance('Live SAP sandbox', 'live');
  else if (mode === 'fixture') setProvenance('Fixture demonstration', 'fixture');
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
  state.itemRequestId += 1;
  state.listRequestId += 1;
  state.detailRequestId += 1;
  state.apiKey = '';
  apiKeyInput.value = '';
  recordsBody.innerHTML = '<tr><td colspan="6" class="empty">No records loaded.</td></tr>';
  listMeta.textContent = 'No list request has returned.';
  detail.className = 'detail empty-detail';
  detail.innerHTML = '<p>Select a billing request to load its detail.</p>';
  detailActions.hidden = true;
  evidence.hidden = true;
  evidence.textContent = '';
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
  const listToken = ++state.listRequestId;
  const detailToken = ++state.detailRequestId;
  state.selectedKey = '';
  state.itemsCoverage = null;
  state.observedList = null;
  state.observedDetail = null;
  state.itemRequestId += 1;
  state.records = [];
  recordsBody.innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';
  listMeta.textContent = 'Waiting for list response.';
  detail.className = 'detail empty-detail';
  detail.innerHTML = '<p>Select a billing request to load its detail.</p>';
  detailActions.hidden = true;
  evidence.hidden = true;
  evidence.textContent = '';

  state.requestedMode = mode === 'live' ? 'live' : 'fixture';
  setMode(state.requestedMode);

  if (mode === 'live') {
    const suppliedKey = apiKeyInput.value.trim();
    if (suppliedKey === '') {
      showError('Enter an API key before connecting. A missing key is an authentication or connection failure, not an empty result set.');
      setStatus('Connection not changed. Provide a key or choose the labelled fixture.');
      return;
    }
    state.apiKey = suppliedKey;
    apiKeyInput.value = '';
  } else {
    state.apiKey = '';
    apiKeyInput.value = '';
  }

  const path = appendQuery('/api/billing-requests', [
    ['mode', mode === 'fixture' ? 'fixture' : 'live'],
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

    if (json.sourceApiId !== 'API_BILLING_DOCUMENT_REQUEST_SRV' || json.sourceApiVersion !== '1.1.0') {
      throw Object.assign(new Error('The response came from the wrong allowlisted source or version.'), { code: 'SOURCE_MISMATCH' });
    }
    if (state.requestedMode === 'fixture' && (json.mode !== 'fixture' || json.provenance !== 'fixture-demonstration')) {
      throw Object.assign(new Error('The fixture request returned live or unlabelled provenance.'), { code: 'PROVENANCE_MISMATCH' });
    }
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
    state.observedList = {
      observedAt: new Date().toISOString(),
      httpStatus: response.status,
      upstreamHttpStatus: json.upstreamStatus ?? null,
      sourceApi: 'API_BILLING_DOCUMENT_REQUEST_SRV',
      sourceApiVersion: '1.1.0',
      provenance: state.mode === 'fixture' ? 'fixture-demonstration' : 'live-sap-sandbox',
      transport: state.mode === 'fixture' ? 'none (fixture)' : 'https GET-only',
      localTransport: 'http GET-only',
      loadedCount: json.loadedCount || records.length,
      usableCount: json.usableCount || records.filter((item) => item.usable).length,
      usabilityBooleans: records.map((item) => item.usable === true),
      continuationAvailable: Boolean(json.continuationAvailable),
      keyDigestSha256: usableKeys[0] ? await digestHex(`issue-5:${usableKeys[0]}`) : null
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
    setStatus(`Loaded ${records.length} billing request(s). Select one to load its separate detail.`);
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
  state.itemRequestId += 1;
  const requestToken = ++state.detailRequestId;
  state.selectedKey = key;
  highlightSelected(key);
  detail.className = 'detail';
  detail.innerHTML = '<p>Loading separate by-key detail...</p>';
  detailActions.hidden = true;
  evidence.hidden = true;
  setStatus(`Loading detail for billing request ${key}...`);

  const path = appendQuery(`/api/billing-requests/${encodeURIComponent(key)}`, [
    ['mode', state.mode === 'fixture' ? 'fixture' : 'live'],
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
    if (record?.sourceApiId !== 'API_BILLING_DOCUMENT_REQUEST_SRV') {
      throw Object.assign(new Error('Detail returned the wrong allowlisted source.'), { code: 'SOURCE_MISMATCH' });
    }
    if (record?.sourceApiVersion !== '1.1.0') {
      throw Object.assign(new Error('Detail returned the wrong source version.'), { code: 'SOURCE_MISMATCH' });
    }
    const expectedProvenance = state.mode === 'fixture' ? 'fixture-demonstration' : 'live-sap-sandbox';
    if (json.provenance !== expectedProvenance || record?.provenance !== expectedProvenance || record?.usable !== true) {
      throw new Error('The detail provenance or usable-record contract does not match this connection.');
    }
    if (!record || record.key !== key || json.keyConsistent !== true) {
      throw Object.assign(new Error('The detail key does not match the selected billing request.'), { code: 'KEY_MISMATCH' });
    }
    state.observedDetail = {
      observedAt: new Date().toISOString(),
      httpStatus: response.status,
      upstreamHttpStatus: json.upstreamStatus ?? null,
      sourceApi: record.sourceApiId || 'API_BILLING_DOCUMENT_REQUEST_SRV',
      sourceApiVersion: record.sourceApiVersion || '1.1.0',
      provenance: json.provenance === 'fixture-demonstration' ? 'fixture-demonstration' : 'live-sap-sandbox',
      keyConsistent: Boolean(json.keyConsistent),
      detailUsable: Boolean(record.usable),
      dateAvailable: Boolean(record.dateValid),
      payerContextAvailable: Boolean(record.context?.payerPartyAvailable),
      accountContextAvailable: Boolean(record.context?.contractAccountAvailable),
      currencyKnown: Boolean(record.currencyKnown),
      amountFields: {
        net: Boolean(record.amounts?.net),
        tax: Boolean(record.amounts?.tax),
        gross: Boolean(record.amounts?.gross)
      },
      keyDigestSha256: await digestHex(`issue-5:${record.key}`)
    };
    if (requestToken !== state.detailRequestId || key !== state.selectedKey) return;
    if (state.observedList) state.observedList.selectedKeyDigestSha256 = state.observedDetail.keyDigestSha256;
    renderDetail(record, state.mode === 'fixture');
    detailActions.hidden = false;
    setStatus(`Detail loaded for billing request ${key}. Selection and detail keys match.`);
  } catch (caught) {
    if (requestToken !== state.detailRequestId || key !== state.selectedKey) return;
    detail.className = 'detail';
    detail.innerHTML = `<p>Detail load failed: ${escapeHtml(caught?.message || 'Unknown error.')}</p>`;
    detailActions.hidden = false;
    showError(caught?.message || 'Detail load failed.');
    setStatus('Detail request failed.');
  }
}

function renderDetail(record, fixture) {
  const amounts = record.amounts || {};
  const basis = record.amountBasis || {};
  const issues = Array.isArray(record.validationIssues) ? record.validationIssues : [];
  const provenanceLabel = fixture ? 'Fixture demonstration' : 'Live SAP sandbox';
  const context = (available) => available ? 'Available, opaque context only (minimized in this scope).' : 'Unknown / Not available';
  const missing = (value) => value === null || value === undefined || value === '' ? 'Unknown / Not available' : escapeHtml(String(value));
  const li = (label, value) => `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`;
  detail.innerHTML = `
    <dl>
      ${li('Document kind', escapeHtml(record.documentKind || 'billing request'))}
      ${li('Source API', 'API_BILLING_DOCUMENT_REQUEST_SRV (version 1.1.0)')}
      ${li('Stable request ID', escapeHtml(record.key || 'Unknown'))}
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
  setStatus(`Checking optional item coverage for ${expectedSelection}...`);
  const path = appendQuery(`/api/billing-requests/${encodeURIComponent(expectedSelection)}/items`, [
    ['mode', expectedMode === 'fixture' ? 'fixture' : 'live']
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
    const note = document.createElement('p');
    note.className = 'warning';
    note.textContent = `Optional items: ${json?.status || 'unknown'}${json?.count ? ` (${json.count} rows)` : ''}. ${json?.note || ''}`;
    detail.appendChild(note);
    setStatus(`Optional item coverage: ${json?.status || 'unknown'}.`);
  } catch (caught) {
    if (token !== state.itemRequestId || expectedSelection !== state.selectedKey || expectedMode !== state.mode) return;
    const note = document.createElement('p');
    note.className = 'warning';
    note.textContent = `Optional items: unavailable. ${caught?.message || 'Item coverage could not be loaded; no amounts were invented.'}`;
    detail.appendChild(note);
    setStatus('Optional item coverage unavailable.');
  }
}


async function loadEvidence() {
  const report = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'browser',
    sourceApi: 'API_BILLING_DOCUMENT_REQUEST_SRV',
    sourceApiVersion: '1.1.0',
    mode: state.mode,
    configuration: {
      transport: state.mode === 'fixture' ? 'none (fixture)' : 'https GET-only',
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

document.getElementById('connect-live').addEventListener('click', () => loadList('live'));
document.getElementById('use-fixture').addEventListener('click', () => loadList('fixture'));
document.getElementById('disconnect').addEventListener('click', resetSession);
document.getElementById('reload-detail').addEventListener('click', () => {
  if (state.selectedKey) selectRecord(state.selectedKey);
});
document.getElementById('check-items').addEventListener('click', loadOptionalItems);
document.getElementById('check-evidence').addEventListener('click', loadEvidence);
