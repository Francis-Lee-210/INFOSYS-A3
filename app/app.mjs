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
const costUpdateStatus = document.getElementById('cost-update-status');
const apiKeyInput = document.getElementById('api-key');
const screenDecision = document.getElementById('screen-decision');
const pageHeading = document.querySelector('.title-row h1');
const receiptStatus = document.getElementById('receipt-status');
const intentOptions = document.getElementById('intent-options');
const confirmIntentButton = document.getElementById('confirm-intent');
const retryReceiptButton = document.getElementById('retry-receipt');
const reopenReceiptButton = document.getElementById('reopen-receipt');
const nextPageButton = document.getElementById('next-page');
const restartListButton = document.getElementById('restart-list');
const retryReadButton = document.getElementById('retry-read');
const readRecovery = document.getElementById('read-recovery');
const readRecoveryMessage = document.getElementById('read-recovery-message');
const correctKeyButton = document.getElementById('correct-key');
const connectionPanel = document.querySelector('.connection-panel');
const connectionSummary = document.getElementById('connection-summary');
const connectionSummaryLabel = document.getElementById('connection-summary-label');
// True while the user has explicitly reopened the connection form with Change source.
let connectionExpanded = false;
function syncConnectionPanel() {
  const collapsed = state.mode !== 'none' && !reads.recovery && !connectionExpanded;
  connectionPanel.classList.toggle('is-collapsed', collapsed);
  connectionSummary.hidden = !collapsed;
  connectionSummaryLabel.textContent = provenance.textContent;
}
const RECEIPT_KEY = 'planReviewSnapshot.receipt';
const RECEIPT_VERSION = 'issue-7-receipt-v2';
const INTENTS = { keep: 'Keep', 'review-options': 'Review options', help: 'Help', later: 'Later' };
const PROVENANCE_LABELS = { 'live-sap-sandbox': 'Live SAP sandbox', 'fixture-demonstration': 'Fixture demonstration', 'synthetic-fixture': 'Synthetic fixture' };
let receipt = null;
let receiptRecovery = false;
let resetUncertain = false;
let storageUnavailable = false;
let chosenIntent = '';
let pendingReceipt = null;
// True once this session has called setItem for a receipt, until a verified reset.
// Stored bytes may then be this session's own unverified write, so they are never
// adopted as unknown startup history, and reset must not claim nothing was stored.
let receiptWriteAttempted = false;
let decisionSnapshot = null;
const screenNames = [
  { screen: screenList, heading: 'Choose a document to review', title: 'Choose a document – Plan Review Snapshot', step: 'list', lead: 'Pick a billing record to see what it charges. Use demo data, or connect to the SAP sandbox with a key.' },
  { screen: screenCost, heading: 'Review cost evidence', title: 'Cost evidence – Plan Review Snapshot', step: 'cost', lead: 'Check the amounts and what this record cannot tell you.' },
  { screen: screenDecision, heading: 'Decide and save a receipt', title: 'Decision and receipt – Plan Review Snapshot', step: 'decision', lead: 'Record what you want to do next. Nothing changes in any account.' }
];
function syncScreenName() {
  const active = screenNames.find(({ screen }) => !screen.hidden);
  if (!active) return;
  pageHeading.textContent = active.heading;
  document.title = active.title;
  const lead = document.querySelector('.title-row .lead');
  if (lead) lead.textContent = active.lead;
  for (const item of document.querySelectorAll('#steps li')) {
    if (item.dataset.step === active.step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
}
new MutationObserver(syncScreenName).observe(screenList.parentElement, { attributes: true, attributeFilter: ['hidden'], subtree: true });
syncScreenName();
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

// One visible page, at most 20 successful pages per traversal, no record cache or
// financial aggregation. Retry coordinates never contain a credential.
const reads = {
  page: 0, cursor: null, next: null, continuation: 'none', seen: new Set(),
  recovery: null, until: 0, blocked: false, timer: null,
  busy: { list: false, detail: false, items: false }
};

function resetReads() {
  clearInterval(reads.timer);
  reads.timer = null;
  reads.until = 0;
  reads.blocked = false;
  reads.recovery = null;
  reads.page = 0;
  reads.cursor = null;
  reads.next = null;
  reads.continuation = 'none';
  reads.seen.clear();
  reads.busy = { list: false, detail: false, items: false };
  updateReadControls();
}

function coolingDown() { return reads.blocked || performance.now() < reads.until; }

function updateReadControls() {
  const waiting = coolingDown();
  const busy = Object.values(reads.busy).some(Boolean);
  const correctedKey = apiKeyInput.value.trim() && apiKeyInput.value.trim() !== state.apiKey;
  document.getElementById('connect-live').disabled = state.requestedMode === 'live' && !correctedKey && (waiting || reads.busy.list);
  document.getElementById('use-fixture').disabled = state.requestedMode === 'fixture' && reads.busy.list;
  document.getElementById('use-synthetic').disabled = state.requestedMode === 'synthetic' && reads.busy.list;
  nextPageButton.hidden = !reads.page;
  nextPageButton.disabled = !reads.next || reads.busy.list || waiting;
  restartListButton.hidden = !reads.page;
  restartListButton.disabled = reads.busy.list || waiting || (state.requestedMode === 'live' && !state.apiKey);
  document.getElementById('reload-detail').disabled = reads.busy.detail || waiting;
  document.getElementById('check-items').disabled = reads.busy.items || waiting;
  for (const row of recordsBody.querySelectorAll('tr.selectable')) {
    if (waiting) row.setAttribute('aria-disabled', 'true'); else row.removeAttribute('aria-disabled');
  }
  const recovery = reads.recovery;
  readRecovery.hidden = !recovery;
  syncConnectionPanel();
  if (!recovery) return;
  correctKeyButton.hidden = recovery.code !== 'AUTH';
  retryReadButton.hidden = recovery.code === 'AUTH';
  retryReadButton.disabled = waiting || busy || recovery.generation !== state.connectionToken;
  const delay = reads.blocked
    ? 'The server delay exceeds the supported clock range. Retry remains unavailable; abandon this connection or supply a different key/source.'
    : (waiting ? `Wait ${Math.ceil((reads.until - performance.now()) / 1000)} seconds before retrying. No request will be sent automatically.` : 'Retry read is available. No request is sent automatically.');
  readRecoveryMessage.textContent = `${recovery.message} ${recovery.code === 'AUTH' ? 'Correct the session key and explicitly reconnect; the old selection will not be restored.' : delay}`;
  if (!waiting && reads.timer) { clearInterval(reads.timer); reads.timer = null; }
}

function allowRead() {
  if (coolingDown()) { updateReadControls(); return false; }
  if (state.requestedMode === 'live' && !state.apiKey) return false;
  return true;
}

function clearReadRecovery() {
  reads.recovery = null;
  updateReadControls();
}

function readFailure(caught, operation) {
  const code = caught?.code || 'CONTRACT';
  const labels = { AUTH: 'Authentication / key problem', TIMEOUT: 'Read timed out', NETWORK: 'Network failure', RATE_LIMIT: 'Rate limited', SERVER: 'Service failure', REDIRECT: 'Redirect refused', DESTINATION: 'Continuation rejected', EMPTY: 'Empty page', NAVIGATION: 'Navigation stopped' };
  const label = labels[code] || 'Contract / data failure';
  const message = `${label}. ${caught?.message || 'This read could not be validated.'}`;
  reads.recovery = { ...operation, code, message, generation: state.connectionToken };
  if (code === 'AUTH') {
    state.apiKey = '';
    apiKeyInput.value = '';
    // Other operations in the rejected credential generation must not restore
    // validity. The already reviewed header is not fabricated into an item set.
    state.connectionToken += 1;
    state.listRequestId += 1; state.detailRequestId += 1; state.itemRequestId += 1;
    reads.busy = { list: false, detail: false, items: false };
    reads.recovery.generation = state.connectionToken;
  }
  const retry = caught?.retryAfter;
  if (retry?.status === 'unrepresentable') reads.blocked = true;
  const delay = Number.isSafeInteger(retry?.delayMs) && retry.delayMs >= 0 ? retry.delayMs : 0;
  // A missing/invalid 429 header gets an explicit one-second local debounce,
  // never a guessed replacement for a valid (possibly much longer) server delay.
  const waitMs = delay || (code === 'RATE_LIMIT' && !['past', 'delay-seconds', 'http-date'].includes(retry?.status) ? 1000 : 0);
  if (waitMs > 0) reads.until = Math.max(reads.until, Math.ceil(performance.now()) + waitMs);
  if (code === 'RATE_LIMIT' && ['missing', 'invalid'].includes(retry?.status)) reads.recovery.message += ' No valid Retry-After was supplied; a one-second local wait applies.';
  if (retry?.status === 'past') reads.recovery.message += ' The Retry-After date has already passed.';
  if (coolingDown() && !reads.timer) reads.timer = setInterval(updateReadControls, 1000);
  updateReadControls();
  return message;
}

async function readJSON(path, mode) {
  const headers = {};
  if (mode === 'live') headers['X-SAP-APIKey'] = state.apiKey;
  let response;
  try { response = await fetch(path, { method: 'GET', headers }); }
  catch { throw Object.assign(new Error('The local read connection failed. Check the connection and retry.'), { code: 'NETWORK' }); }
  let json;
  try { json = await response.json(); }
  catch { throw Object.assign(new Error('The read returned malformed JSON.'), { code: 'NOT_JSON' }); }
  if (!response.ok) throw Object.assign(new Error(json?.error?.message || 'The read failed.'), { code: json?.error?.code || 'HTTP', retryAfter: json?.error?.retryAfter });
  return { response, json };
}

function focusReadOutcome(anchor, target) {
  if (screenDecision.hidden && target.checkVisibility() && (document.activeElement === anchor || document.activeElement === document.body)) target.focus();
}

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
    syncConnectionPanel();
    return;
  }
  if (mode === 'live') setProvenance('Live SAP sandbox', 'live');
  else if (mode === 'fixture') setProvenance('Fixture demonstration', 'fixture');
  else if (mode === 'synthetic') setProvenance('Synthetic fixture', 'fixture');
  else setProvenance('Not connected', '');
  syncConnectionPanel();
}

function resetSession() {
  connectionExpanded = false;
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
  state.requestedMode = 'none';
  resetReads();
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
  connectionExpanded = false;
  clearError();
  const suppliedKey = mode === 'live' ? apiKeyInput.value.trim() : '';
  if (mode === 'live' && suppliedKey === '') {
    showError('Enter an API key before connecting. A missing key is an authentication or connection failure, not an empty result set.');
    setStatus('Connection not changed. Provide a key or choose the labelled fixture.');
    apiKeyInput.focus();
    return;
  }

  if (mode === 'live' && suppliedKey === state.apiKey && coolingDown()) return;
  if (mode === 'live' && suppliedKey === state.apiKey && reads.busy.list) return;
  if (mode !== 'live' && mode === state.requestedMode && reads.busy.list) return;
  state.connectionToken += 1;
  state.requestedMode = mode;
  state.apiKey = mode === 'live' ? suppliedKey : '';
  apiKeyInput.value = '';
  resetReads();
  // A source button disables itself while loading, which drops focus to <body>
  // exactly like Next page does; reuse the same outcome-focus pattern.
  return loadPage({ kind: 'list', mode, cursor: null, page: 1 }, true);
}

async function loadPage(operation, moveFocus = false) {
  if (!allowRead() || reads.busy.list) return;
  const { mode, cursor, page } = operation;
  const generation = state.connectionToken;
  const anchor = document.activeElement;
  clearReadRecovery();
  clearError();
  reads.page = page;
  reads.cursor = cursor;
  reads.next = null;
  reads.continuation = 'none';
  reads.busy.list = true;
  reads.busy.detail = false; reads.busy.items = false;
  updateReadControls();

  const listToken = ++state.listRequestId;
  state.detailRequestId += 1;
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
  state.loadedMeta = null;
  recordsBody.innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';
  listMeta.textContent = `Loading page ${page}. Previous page rows and selection are cleared.`;
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

  const path = appendQuery('/api/billing-requests', [
    ['mode', mode === 'synthetic' ? 'synthetic' : (mode === 'fixture' ? 'fixture' : 'live')],
    ['t', String(Date.now())], ['continuation', cursor]
  ]);

  setStatus(mode === 'live' ? 'Connecting to the allowlisted live SAP sandbox...' : 'Loading labelled fixture records...');
  try {
    const { response, json } = await readJSON(path, mode);
    if (generation !== state.connectionToken || listToken !== state.listRequestId) return;

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
    const pageIdentity = json.pageCursor || cursor || `${mode}:initial`;
    reads.seen.add(pageIdentity);
    reads.next = json.continuationAvailable && typeof json.continuation === 'string' ? json.continuation : null;
    reads.continuation = json.continuationValidation || (reads.next ? 'available' : 'none');
    if (reads.next && (reads.seen.has(reads.next) || reads.seen.size >= 20)) {
      reads.next = null;
      reads.continuation = 'rejected-cycle-or-limit';
    }
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
      renderPageMeta(json);
      readFailure(Object.assign(new Error('No records on this page. This is not zero spending. Retry this page, use Next page if available, or restart the list.'), { code: 'EMPTY' }), operation);
      setStatus('No usable billing request was found. This is not a zero-spend result.');
      if (moveFocus) focusReadOutcome(anchor, document.getElementById('records-title'));
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
    renderPageMeta(json);
    setStatus(`Loaded ${records.length} record(s). Select one to load its separate detail.`);
    if (reads.continuation.startsWith('rejected')) readFailure(Object.assign(new Error('The continuation was rejected or repeated, or the 20-page traversal limit was reached. This is not proof of completeness. Retry this page or restart the list.'), { code: 'NAVIGATION' }), operation);
    if (moveFocus) focusReadOutcome(anchor, document.getElementById('records-title'));
  } catch (caught) {
    if (generation !== state.connectionToken || listToken !== state.listRequestId) return;
    state.records = [];
    state.loadedMeta = null;
    recordsBody.innerHTML = '<tr><td colspan="6" class="empty">Page unavailable — read failed.</td></tr>';
    listMeta.textContent = `Page ${page} read failed. No previous page is shown as this page. ${caught?.code === 'AUTH' ? 'Correct the key and reconnect before selecting a record.' : 'Retry the failed page or restart the list.'}`;
    const message = readFailure(caught, operation);
    showError(message);
    setStatus(`Connection failed. ${message}`);
    setMode('none');
    if (moveFocus) focusReadOutcome(anchor, document.getElementById('read-recovery-title'));
  } finally {
    if (generation === state.connectionToken && listToken === state.listRequestId) reads.busy.list = false;
    updateReadControls();
  }
}

function renderPageMeta(json) {
  const coverage = reads.continuation.startsWith('rejected')
    ? 'Continuation rejected / navigation stopped; coverage remains unknown, not complete.'
    : (reads.next ? 'Partial coverage; a supported continuation is available.' : (state.mode !== 'live' && json.boundedComplete === true ? 'Explicitly bounded fixture coverage exhausted; not SAP account history.' : 'Continuation exhausted (none reported); complete account history is not established.'));
  listMeta.textContent = `Page ${reads.page}: ${json.records.length} loaded, ${json.usableCount ?? json.records.filter(item => item.usable).length} usable on this page only. ${coverage} Loaded records, not complete history. No annual coverage or combined financial total.`;
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

async function selectRecord(key, moveFocus = false) {
  if (!allowRead() || (reads.busy.detail && state.selectedKey === key)) return;
  const generation = state.connectionToken;
  const anchor = document.activeElement;
  const mode = state.mode;
  const operation = { kind: 'detail', mode, key, page: reads.page, cursor: reads.cursor };
  clearReadRecovery();
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
  reads.busy.detail = true;
  reads.busy.items = false;
  updateReadControls();
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
  try {
    const { response, json } = await readJSON(path, mode);
    if (generation !== state.connectionToken || requestToken !== state.detailRequestId || key !== state.selectedKey) return;
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
    if (moveFocus) focusReadOutcome(anchor, reviewCostButton);
  } catch (caught) {
    if (generation !== state.connectionToken || requestToken !== state.detailRequestId || key !== state.selectedKey) return;
    detail.className = 'detail';
    detail.innerHTML = `<p>Detail load failed: ${escapeHtml(caught?.message || 'Unknown error.')}</p>`;
    detailActions.hidden = false;
    showError(readFailure(caught, operation));
    setStatus('Detail request failed.');
    if (moveFocus) focusReadOutcome(anchor, document.getElementById('read-recovery-title'));
  } finally {
    if (generation === state.connectionToken && requestToken === state.detailRequestId) reads.busy.detail = false;
    updateReadControls();
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
  const currencyText = escapeHtml(record.currency || 'Unknown');
  const money = (value) => value === null || value === undefined || value === '' ? 'Not available' : `${escapeHtml(String(value))} ${currencyText}`;
  detail.innerHTML = `
    <dl class="detail-main">
      ${li('Document', `${escapeHtml(record.documentKind || 'billing request')} ${escapeHtml(record.key || 'Unknown')}`)}
      ${li('Date', `${escapeHtml(record.dateNormalized || 'Unknown')} (accounting date, not a payment date)`)}
      ${li('Net', money(amounts.net))}
      ${li('Tax', money(amounts.tax))}
      ${li('Gross', money(amounts.gross))}
      ${li('Data source', escapeHtml(provenanceLabel))}
    </dl>
    ${issues.length ? `<p class="warning">Contract warnings: ${escapeHtml(issues.join('; '))}</p>` : ''}
    <details class="tech-evidence">
      <summary>Technical evidence (for reviewers)</summary>
      <p class="coverage">Selected row is never reused as detail; a separate by-key GET validates the same key.</p>
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
      <p class="coverage">Reported net, tax and gross are independent values. They retain sign and precision and are not summed, converted or annualized.</p>
    </details>
  `;
}

function highlightSelected(key) {
  for (const row of recordsBody.querySelectorAll('tr')) {
    row.classList.toggle('selected', row.dataset.key === key);
  }
}

async function loadOptionalItems(moveFocus = false) {
  if (!state.selectedKey || !state.verifiedDetail || state.mode === 'none' || !allowRead() || reads.busy.items) return;
  const generation = state.connectionToken;
  const anchor = document.activeElement;
  clearReadRecovery();
  reads.busy.items = true;
  updateReadControls();
  const expectedSelection = state.selectedKey;
  const expectedMode = state.mode;
  const operation = { kind: 'items', mode: expectedMode, key: expectedSelection, page: reads.page, cursor: reads.cursor };
  const token = ++state.itemRequestId;
  clearError();
  const sourceRecord = state.verifiedDetail;
  state.itemsCoverage = { status: 'checking', count: 0, rows: [], hasContinuation: false, complete: false, sourceApiId: sourceRecord?.sourceApiId, sourceApiVersion: sourceRecord?.sourceApiVersion, sourceProfileId: sourceRecord?.sourceProfileId, provenance: sourceRecord?.provenance, parentKey: expectedSelection, parentVerified: null, note: 'Optional item request is pending; no breakdown has been verified.' };
  const historicalView = !screenDecision.hidden && (receipt || receiptRecovery);
  const pendingDecisionView = !screenDecision.hidden && !historicalView;
  // Even a retry of the same header supersedes the evidence behind a choice or
  // an unsaved receipt. Do not hide or rewrite a confirmed historical receipt.
  clearPendingDecision(historicalView);
  state.costToken += 1;
  state.costSnapshot = null;
  window.__issue6CostSnapshot = undefined;
  document.getElementById('continue-decision').disabled = true;
  if (pendingDecisionView) { screenList.hidden = true; screenCost.hidden = false; }
  refreshItemAssessment();
  if (moveFocus && !screenCost.hidden) costUpdateStatus.focus();
  else if (moveFocus && historicalView) document.getElementById('decision-title').focus();
  setStatus(`Checking optional item coverage for ${expectedSelection}...`);
  const path = appendQuery(`/api/billing-requests/${encodeURIComponent(expectedSelection)}/items`, [
    ['mode', expectedMode === 'synthetic' ? 'synthetic' : (expectedMode === 'fixture' ? 'fixture' : 'live')]
  ]);
  try {
    const { json } = await readJSON(path, expectedMode);
    if (generation !== state.connectionToken || token !== state.itemRequestId || expectedSelection !== state.selectedKey || expectedMode !== state.mode) return;
    state.itemsCoverage = json;
    refreshItemAssessment();
    const note = document.createElement('p');
    note.className = 'warning';
    note.textContent = `Optional items: ${json?.status || 'unknown'}${json?.count ? ` (${json.count} rows)` : ''}. ${json?.note || ''}`;
    detail.appendChild(note);
    setStatus(`Optional item coverage: ${json?.status || 'unknown'}.`);
    if (json.recovery) showError(readFailure(Object.assign(new Error(json.recovery.message), json.recovery), operation));
    if (moveFocus) focusReadOutcome(anchor, json.recovery ? document.getElementById('read-recovery-title') : (screenCost.hidden ? reviewCostButton : backToListButton));
  } catch (caught) {
    if (generation !== state.connectionToken || token !== state.itemRequestId || expectedSelection !== state.selectedKey || expectedMode !== state.mode) return;
    const note = document.createElement('p');
    note.className = 'warning';
    const unavailableNote = caught?.message || 'Item coverage could not be loaded; no amounts were invented.';
    const record = state.verifiedDetail;
    state.itemsCoverage = { status: 'unavailable', count: 0, rows: [], hasContinuation: false, complete: false, note: unavailableNote, sourceApiId: record?.sourceApiId, sourceApiVersion: record?.sourceApiVersion, sourceProfileId: record?.sourceProfileId, provenance: record?.provenance, parentKey: expectedSelection, parentVerified: null };
    refreshItemAssessment();
    note.textContent = `Optional items: unavailable. ${unavailableNote}`;
    detail.appendChild(note);
    setStatus('Optional item coverage unavailable.');
    showError(readFailure(caught, operation));
    if (moveFocus) focusReadOutcome(anchor, document.getElementById('read-recovery-title'));
  } finally {
    if (generation === state.connectionToken && token === state.itemRequestId) reads.busy.items = false;
    updateReadControls();
  }
}

function refreshItemAssessment() {
  // Authoritative state follows the matching response, not screen visibility.
  // Rendering/exporting the cost view remains separate from historical display.
  state.costSnapshot = buildCostSnapshot(state.verifiedDetail, state.mode);
  if (!screenCost.hidden) renderCost(state.costSnapshot);
  costUpdateStatus.hidden = false;
  const status = state.costSnapshot.linkedDetail.status;
  costUpdateStatus.textContent = status === 'checking'
    ? 'Checking updated item evidence. The previous intention and save retry were cleared. Continue is unavailable until this read finishes.'
    : (status === 'unavailable'
      ? 'Updated item evidence is unavailable. Header figures remain valid. Review these limitations and any conflict before choosing a new intention.'
      : 'Updated item evidence is ready. Review the current coverage and conflict flags, then continue and choose a new intention.');
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
  costUpdateStatus.hidden = true;
  costUpdateStatus.textContent = '';
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
    const cur = escapeHtml(snapshot.amounts.currency || snapshot.document.currency || 'Unknown');
    const show = (value) => value === null || value === undefined || value === '' ? 'Not reported' : escapeHtml(String(value));
    const limits = [
      'This is SAP sandbox demo data, not a Spark customer bill.',
      'It does not show whether anything was paid, or which service period it covers.',
      'Amounts are shown exactly as reported. Nothing is added up or converted.'
    ];
    if (snapshot.materialInconsistency) limits.push('Something in this record did not match, so only Help or Later can be recorded.');
    costSummary.innerHTML = `
      <div class="amount-hero">
        <p class="amount-gross"><span class="amount-label">Gross</span> <span class="amount-value">${show(snapshot.amounts.gross)}</span> <span class="amount-cur">${cur}</span></p>
        <p class="amount-parts">Net ${show(snapshot.amounts.net)} ${cur} · Tax ${show(snapshot.amounts.tax)} ${cur}</p>
        <p class="amount-meta">Billing date ${escapeHtml(snapshot.date.value || 'Unknown')}: the date SAP booked this for accounting. It is not a payment date or a service period.</p>
        <p class="amount-meta">${escapeHtml(snapshot.document.kind)} ${escapeHtml(snapshot.document.key)} · Data source: ${escapeHtml(snapshot.source.provenanceLabel)}</p>
      </div>
      <div class="limits-box">
        <h3>What this does not tell you</h3>
        <ul>${limits.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      </div>
      <details class="tech-evidence">
        <summary>Full explanation (for reviewers)</summary>
        <p>${escapeHtml(snapshot.explanation)}</p>
        <p><strong>Document kind:</strong> ${escapeHtml(snapshot.document.kind)}; <strong>key:</strong> ${escapeHtml(snapshot.document.key)}; <strong>currency:</strong> ${escapeHtml(snapshot.document.currency)}.</p>
      </details>
    `;
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
  reads.busy.items = false;
  updateReadControls();
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
document.getElementById('change-source').addEventListener('click', () => {
  connectionExpanded = true;
  syncConnectionPanel();
  document.getElementById('use-fixture').focus();
});
document.getElementById('reload-detail').addEventListener('click', () => {
  if (state.selectedKey) selectRecord(state.selectedKey, true);
});
document.getElementById('check-items').addEventListener('click', () => loadOptionalItems(true));
document.getElementById('check-evidence').addEventListener('click', loadEvidence);
apiKeyInput.addEventListener('input', updateReadControls);
nextPageButton.addEventListener('click', () => {
  if (!reads.next || !allowRead() || reads.busy.list) return;
  loadPage({ kind: 'list', mode: state.requestedMode, cursor: reads.next, page: reads.page + 1 }, true);
});
restartListButton.addEventListener('click', () => {
  if (!allowRead() || reads.busy.list) return;
  reads.seen.clear();
  loadPage({ kind: 'list', mode: state.requestedMode, cursor: null, page: 1 }, true);
});
retryReadButton.addEventListener('click', () => {
  const op = reads.recovery;
  if (!op || op.code === 'AUTH' || op.generation !== state.connectionToken || !allowRead() || Object.values(reads.busy).some(Boolean)) return;
  if (op.kind === 'list') loadPage(op, true);
  else if (op.kind === 'detail' && state.selectedKey === op.key) selectRecord(op.key, true);
  else if (op.kind === 'items' && state.selectedKey === op.key) loadOptionalItems(true);
});
correctKeyButton.addEventListener('click', () => apiKeyInput.focus());
document.getElementById('abandon-read').addEventListener('click', () => { resetSession(); apiKeyInput.focus(); });

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

function clearPendingDecision(preserveHistoricalView = false) {
  chosenIntent = '';
  pendingReceipt = null;
  decisionSnapshot = null;
  if (!preserveHistoricalView) {
    screenDecision.hidden = true;
    document.getElementById('reset-confirmation').hidden = true;
  }
  if (!receipt && !receiptRecovery) {
    confirmIntentButton.disabled = true;
    retryReceiptButton.hidden = true;
  }
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
  const summaryElement = document.getElementById('decision-summary');
  const techWasOpen = summaryElement.querySelector('details')?.open === true;
  const mainFields = value ? [
    ['Document', `${value.document.kind} ${value.document.key}`],
    ['Gross', `${value.amounts.gross ?? 'Not reported'} ${value.amounts.currency}`],
    ['Billing date', value.date.value],
    ['Data source', PROVENANCE_LABELS[value.document.provenance]]
  ] : [];
  const dl = (rows) => `<dl class="cost-fields">${rows.map(([label, text]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(text))}</dd>`).join('')}</dl>`;
  document.getElementById('decision-card').innerHTML = value ? `<div class="decision-card">${dl(mainFields)}</div>` : '';
  summaryElement.innerHTML = value ? `
    <details class="tech-evidence"${techWasOpen ? ' open' : ''}>
      <summary>Technical evidence (for reviewers)</summary>
      <p>These are intentions only. Keep is not a plan suitability verdict. Review options is not an account switch or a completed switch. Help is not a submitted support ticket. Later is not a scheduled reminder.</p>
      ${dl(fields)}
    </details>
  ` : '';
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
  const success = document.getElementById('receipt-success');
  success.hidden = !(saved && !receiptRecovery);
  success.textContent = saved && !receiptRecovery
    ? `✓ Saved: ${INTENTS[receipt.intent]} for ${receipt.document.kind} ${receipt.document.key} (${receipt.amounts.gross ?? 'gross not reported'} ${receipt.amounts.currency}).`
    : '';
  if (receiptRecovery) receiptStatus.textContent = resetUncertain
    ? 'Deletion could not be verified. The receipt may already be deleted; no saved history is verified. Use Reset demo and Confirm reset to retry deletion and verification. The session key is cleared when reset is verified.'
    : 'Stored receipt could not be recovered. No saved history is shown. Use Reset demo to clear it and start again.';
  reopenReceiptButton.hidden = !saved && !receiptRecovery;
}

function openDecision() {
  if (!receipt && !receiptRecovery) {
    if (screenCost.hidden || !currentCostEvidenceReady()) return;
    decisionSnapshot = state.costSnapshot;
  }
  renderDecision();
  if (receipt) setProvenance(PROVENANCE_LABELS[receipt.document.provenance], receipt.document.provenance === 'live-sap-sandbox' ? 'live' : 'fixture');
  showDecision();
}

function currentCostEvidenceReady() {
  return state.costSnapshot && !reads.busy.items && state.itemsCoverage?.status !== 'checking' &&
    state.costSnapshot.linkedDetail.status !== 'checking' && state.verifiedDetailKey === state.selectedKey &&
    state.costSnapshot.document.key === state.selectedKey;
}

function currentDecisionEvidence() {
  return !screenDecision.hidden && decisionSnapshot === state.costSnapshot && currentCostEvidenceReady();
}

// Snapshot current localStorage readability and receipt bytes without latching a
// stale startup flag. Returns { available: boolean, stored: string | null }.
// available is false only when the storage object itself or getItem throws.
function currentStoredReceipt() {
  let storage;
  try { storage = window.localStorage; } catch { return { available: false, stored: null }; }
  let stored;
  try { stored = storage.getItem(RECEIPT_KEY); } catch { return { available: false, stored: null }; }
  return { available: true, stored };
}

function saveReceipt() {
  if (receipt || receiptRecovery || !currentDecisionEvidence() || !Object.hasOwn(INTENTS, chosenIntent)) return;
  if (state.costSnapshot.materialInconsistency && !['help', 'later'].includes(chosenIntent)) return;
  pendingReceipt ||= receiptFromSnapshot(state.costSnapshot, chosenIntent);
  try {
    validateReceipt(pendingReceipt);
    const snapshot = currentStoredReceipt();
    if (!snapshot.available) {
      // Still unreadable: never write. Keep the honest notice and stay retryable.
      storageUnavailable = true;
      document.getElementById('storage-unavailable').hidden = false;
      receiptStatus.textContent = 'Unsaved — browser storage is unavailable, so receipts cannot be saved in this browser. Your chosen intent is preserved. Retry to save it.';
      retryReceiptButton.hidden = false;
      return;
    }
    const wasUnavailable = storageUnavailable;
    // Storage is readable now: clear any stale startup flag/notice.
    storageUnavailable = false;
    document.getElementById('storage-unavailable').hidden = true;
    if (wasUnavailable && snapshot.stored !== null && !receiptWriteAttempted) {
      // UNKNOWN pre-existing bytes from startup-unavailable and this session has
      // never written a receipt: preserve them, never overwrite. Route to
      // valid-history or corrupt/version/provenance recovery.
      try {
        receipt = validateReceipt(JSON.parse(snapshot.stored));
        setProvenance(PROVENANCE_LABELS[receipt.document.provenance], receipt.document.provenance === 'live-sap-sandbox' ? 'live' : 'fixture');
        openDecision();
      } catch {
        receipt = null;
        receiptRecovery = true;
        openDecision();
      }
      return;
    }
    // Normal save: write the pending intent + read-back + verify exact equality
    // (established retry semantics; never adopt different stored bytes/intent).
    receiptWriteAttempted = true;
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
    receiptStatus.textContent = storageUnavailable
      ? 'Unsaved — browser storage is unavailable, so receipts cannot be saved in this browser. Your chosen intent is preserved. Retry to save it.'
      : 'Unsaved — storage write or read-back verification failed. Your chosen intent is preserved. Retry to save it.';
    retryReceiptButton.hidden = false;
  }
}

function reopenStoredReceipt() {
  const snapshot = currentStoredReceipt();
  if (!snapshot.available) {
    storageUnavailable = true;
    document.getElementById('storage-unavailable').hidden = false;
    return;
  }
  // Storage is readable now: never keep a stale unavailable flag or notice.
  storageUnavailable = false;
  document.getElementById('storage-unavailable').hidden = true;
  if (snapshot.stored === null) return;
  try {
    receipt = validateReceipt(JSON.parse(snapshot.stored));
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
  if (!currentDecisionEvidence()) { event.target.checked = false; return; }
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
// Reset could not read storage. A receipt that is known, invalid, or may have been
// persisted by this session's own write keeps the truthful uncertain-reset + retry
// path. Otherwise nothing is known to be stored: clear the session/key honestly
// instead of trapping the user in an uncertain reset for a receipt that never existed.
function resetWithUnreadableStorage() {
  if (receipt || receiptRecovery || receiptWriteAttempted) {
    showUncertainReset();
    return;
  }
  receipt = null;
  receiptRecovery = false;
  resetUncertain = false;
  reopenReceiptButton.hidden = true;
  resetSession();
  document.getElementById('decision-summary').replaceChildren();
  document.getElementById('decision-card').replaceChildren();
  receiptStatus.textContent = '';
  setStatus('Browser storage is unavailable, so no receipt could be read or deleted. The review session and key were cleared.');
  document.getElementById('use-fixture').focus();
}

document.getElementById('confirm-reset').addEventListener('click', () => {
  let storage;
  try { storage = window.localStorage; } catch {
    // Storage object wholly inaccessible.
    resetWithUnreadableStorage();
    return;
  }
  // Storage object is accessible: attempt removal even if getItem fails, then
  // validate the outcome with truthful uncertain/preserved states.
  try { storage.removeItem(RECEIPT_KEY); } catch {
    // A thrown removal is not itself proof that the old receipt survived.
    let stored;
    try { stored = storage.getItem(RECEIPT_KEY); } catch {
      resetWithUnreadableStorage();
      return;
    }
    // The read succeeded, so storage is readable: clear any stale unavailable notice.
    storageUnavailable = false;
    document.getElementById('storage-unavailable').hidden = true;
    if (stored !== null && !receipt) {
      // Readable bytes survived deletion: retain history/recovery so a later
      // confirmation or unreadable reset cannot treat them as absent. This
      // session's unverified writes must never become verified saved history.
      receiptRecovery = true;
      resetUncertain = receiptWriteAttempted;
      if (!receiptWriteAttempted) {
        try {
          receipt = validateReceipt(JSON.parse(stored));
          receiptRecovery = false;
        } catch {
          receipt = null;
        }
      }
      renderDecision();
      if (receipt) setProvenance(PROVENANCE_LABELS[receipt.document.provenance], receipt.document.provenance === 'live-sap-sandbox' ? 'live' : 'fixture');
    }
    try {
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
  let remaining;
  try { remaining = storage.getItem(RECEIPT_KEY); } catch {
    resetWithUnreadableStorage();
    return;
  }
  if (remaining !== null) {
    showUncertainReset();
    return;
  }
  // Successful verified reset clears the stale unavailable flag/notice as well.
  storageUnavailable = false;
  document.getElementById('storage-unavailable').hidden = true;
  receiptWriteAttempted = false;
  receipt = null;
  receiptRecovery = false;
  resetUncertain = false;
  reopenReceiptButton.hidden = true;
  resetSession();
  document.getElementById('decision-summary').replaceChildren();
  document.getElementById('decision-card').replaceChildren();
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
