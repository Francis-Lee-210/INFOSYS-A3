import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const TEST_PORT = Number(process.env.PORT || 6285);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const HTTP_HANDLER_URL = pathToFileURL(path.join(APP_ROOT, 'lib', 'httpHandler.js')).href;

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.default || mod;
  } catch (first) {
    const fallback = process.env.PLAYWRIGHT_MODULE_PATH;
    if (fallback) {
      const resolved = path.resolve(fallback);
      const candidate = resolved.endsWith('.js') || resolved.endsWith('.mjs') ? resolved : path.join(resolved, 'index.js');
      const mod = await import(pathToFileURL(candidate).href);
      return mod.default || mod;
    }
    throw new Error(`Playwright could not be imported. ${first?.message || first}`);
  }
}

async function waitForHealth(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function startSpawnedServer(port) {
  return spawn('node', ['server.js'], {
    cwd: APP_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function startInjectedServer(port, transport) {
  const { createServerInstance } = await import(HTTP_HANDLER_URL);
  const instance = createServerInstance({ port, transport });
  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    instance.server.once('error', onError);
    instance.server.listen(port, '127.0.0.1', () => {
      instance.server.off('error', onError);
      resolve();
    });
  });
  return instance.server;
}

function stopServer(serverOrChild) {
  if (!serverOrChild) return;
  if (typeof serverOrChild.kill === 'function') serverOrChild.kill('SIGTERM');
  else serverOrChild.close();
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectText(locatorOrPage, selector, expected) {
  const text = selector
    ? await locatorOrPage.locator(selector).innerText()
    : await locatorOrPage.innerText();
  assert.match(text, new RegExp(escapeRegExp(expected)), `Expected "${expected}" in "${text}".`);
}

function rawOData(results, nextLink) {
  return { d: { results, __next: nextLink || undefined } };
}

function validRawRecord(key) {
  return {
    BillingDocumentRequest: key,
    BillingDocumentDate: '/Date(1728950400000)/',
    TotalNetAmount: '250.000',
    TotalTaxAmount: '37.500',
    TotalGrossAmount: '287.500',
    TransactionCurrency: 'USD',
    PayerParty: 'P1',
    ContractAccount: null
  };
}

function unusableRawRecord(key) {
  return {
    BillingDocumentRequest: key,
    BillingDocumentDate: '/Date(1728950400000)/',
    TotalNetAmount: null,
    TotalTaxAmount: null,
    TotalGrossAmount: null,
    TransactionCurrency: 'USD'
  };
}

function makeTransport(resultsFactory, extras = {}) {
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url: String(url), options });
    if (extras.redirect) {
      return {
        status: 302,
        ok: false,
        text: async () => '',
        headers: { get: (name) => (name.toLowerCase() === 'location' ? 'https://example.com/redirect' : null) }
      };
    }
    if (typeof extras.status === 'number') {
      return {
        status: extras.status,
        ok: false,
        text: async () => JSON.stringify(extras.body || {}),
        headers: { get: () => null }
      };
    }
    const results = typeof resultsFactory === 'function' ? resultsFactory() : resultsFactory;
    await new Promise((resolve) => setTimeout(resolve, extras.delay || 0));
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify(rawOData(results, extras.nextLink)),
      headers: { get: () => null }
    };
  };
  transport.calls = calls;
  return transport;
}

let browser;
let page;
let spawnedServer;
const injectedServers = [];

test('fixture provenance and exact source labels', async () => {
  const fixtureServer = await startInjectedServer(TEST_PORT);
  injectedServers.push(fixtureServer);
  await waitForHealth(`${BASE_URL}/api/health`);
  const context = await browser.newContext();
  page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expectText(page, 'body', 'Source API: API_BILLING_DOCUMENT_REQUEST_SRV (version 1.1.0)');
  assert.equal(await page.locator('#detail-actions').isVisible(), false);
  await page.getByRole('button', { name: 'Use fixture demonstration' }).click();
  await page.waitForFunction(() => document.querySelector('#list-meta')?.textContent.includes('Loaded records, not complete history'));
  await expectText(page, '#provenance', 'Fixture demonstration');
  await expectText(page, '#records-body', '9000000001');
  await page.locator('#records-body tr.selectable').first().click();
  await page.waitForFunction(() => document.querySelector('#detail')?.textContent.includes('billing request'));
  await expectText(page, '#detail', '250.000');
  await expectText(page, '#detail', '2024-10-15');
  await expectText(page, '#detail', 'USD');
  await expectText(page, '#detail', 'API_BILLING_DOCUMENT_REQUEST_SRV');
  await expectText(page, '#detail', '1.1.0');
  await expectText(page, '#detail', 'subsequent billing document');
  if (process.env.A3_SCREENSHOT_PATH) await page.screenshot({ path: process.env.A3_SCREENSHOT_PATH, fullPage: true });
});

test('raw records empty unusable and mixed are distinct', async () => {
  const emptyPort = TEST_PORT + 11;
  const emptyServer = await startInjectedServer(emptyPort, makeTransport([]));
  injectedServers.push(emptyServer);
  let response = await fetch(`http://127.0.0.1:${emptyPort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-EMPTY' }
  });
  let json = await response.json();
  assert.equal(response.ok, true);
  assert.equal(json.loadedCount, 0);
  assert.equal(json.usableCount, 0);

  const unusablePort = TEST_PORT + 12;
  const unusableServer = await startInjectedServer(unusablePort, makeTransport([unusableRawRecord('NOAMT001')]));
  injectedServers.push(unusableServer);
  response = await fetch(`http://127.0.0.1:${unusablePort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-UNUSABLE' }
  });
  json = await response.json();
  assert.equal(response.ok, false);
  assert.match(json.error.code, /NO_USABLE/);

  const mixedPort = TEST_PORT + 13;
  const mixedServer = await startInjectedServer(mixedPort, makeTransport([validRawRecord('GOOD001'), unusableRawRecord('BAD001')]));
  injectedServers.push(mixedServer);
  response = await fetch(`http://127.0.0.1:${mixedPort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-MIXED' }
  });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.usableCount, 1);
  assert.equal(json.loadedCount, 2);
  assert.equal(json.records[1].usable, false);

  const malformedPort = TEST_PORT + 14;
  const malformedTransport = async (url, options) => ({
    status: 200,
    ok: true,
    text: async () => '{not-json-or-shape',
    headers: { get: () => null }
  });
  const malformedServer = await startInjectedServer(malformedPort, malformedTransport);
  injectedServers.push(malformedServer);
  response = await fetch(`http://127.0.0.1:${malformedPort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-MALFORMED' }
  });
  json = await response.json();
  assert.equal(response.ok, false);
  assert.match(json.error.code, /NOT_JSON|CONTRACT/);
});

test('malicious keys do not reach upstream transport', async () => {
  const port = TEST_PORT + 15;
  const transport = makeTransport([validRawRecord('UPSTREAM001')]);
  const server = await startInjectedServer(port, transport);
  injectedServers.push(server);
  const response = await fetch(`http://127.0.0.1:${port}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'bad?key&x' }
  });
  const json = await response.json();
  assert.equal(response.ok, false);
  assert.equal(transport.calls.length, 0);
  assert.ok(json.error.code);
});

test('redirects are rejected without leaking location or raw body', async () => {
  const port = TEST_PORT + 16;
  const transport = makeTransport([validRawRecord('UPSTREAM002')], { redirect: true });
  const server = await startInjectedServer(port, transport);
  injectedServers.push(server);
  const response = await fetch(`http://127.0.0.1:${port}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-REDIRECT' }
  });
  const json = await response.json();
  assert.equal(response.ok, false);
  assert.equal(json.error.code, 'REDIRECT');
  assert.ok(!JSON.stringify(json).includes('https://example.com/redirect'));
});

test('invalid path keys and mismatched unusable details are rejected', async () => {
  const port = TEST_PORT + 17;
  const mismatchedTransport = async (url, options) => {
    if (String(url).includes("A_BillingDocumentRequest('")) {
      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ d: validRawRecord('DIFFERENT01') }),
        headers: { get: () => null }
      };
    }
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify(rawOData([validRawRecord('ORIG000001')])),
      headers: { get: () => null }
    };
  };
  const server = await startInjectedServer(port, mismatchedTransport);
  injectedServers.push(server);
  const badPathResponse = await fetch(`http://127.0.0.1:${port}/api/billing-requests/${encodeURIComponent('bad?key')}`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-DETAIL' }
  });
  assert.equal(badPathResponse.ok, false);

  const detailResponse = await fetch(`http://127.0.0.1:${port}/api/billing-requests/ORIG000001?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-DETAIL' }
  });
  const detailJson = await detailResponse.json();
  assert.equal(detailResponse.ok, false);
  assert.match(detailJson.error.code, /KEY_MISMATCH/);

  const unusablePort = TEST_PORT + 18;
  const unusableTransport = async (url, options) => ({
    status: 200,
    ok: true,
    text: async () => JSON.stringify({ d: unusableRawRecord('NOAMTDET1') }),
    headers: { get: () => null }
  });
  const unusableServer = await startInjectedServer(unusablePort, unusableTransport);
  injectedServers.push(unusableServer);
  const unusableDetailResponse = await fetch(`http://127.0.0.1:${unusablePort}/api/billing-requests/NOAMTDET1?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-DETAIL-UNUSABLE' }
  });
  const unusableDetailJson = await unusableDetailResponse.json();
  assert.equal(unusableDetailResponse.ok, false);
  assert.match(unusableDetailJson.error.code, /NO_USABLE/);
});

test('optional item metadata is partial, not complete history', async () => {
  const port = TEST_PORT + 19;
  const continuation = `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV/A_BillingDocumentRequest('ITEMOWN01')/to_Item?$skiptoken=x`;
  const transport = async (url, options) => {
    if (String(url).includes('/to_Item')) {
      const rows = Array.from({ length: 20 }, (_, i) => ({ BillingDocumentRequest: 'ITEMOWN01', BillingDocumentRequestItem: String(i) }));
      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify(rawOData(rows, continuation)),
        headers: { get: () => null }
      };
    }
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify(rawOData([validRawRecord('ITEMOWN01')])),
      headers: { get: () => null }
    };
  };
  const server = await startInjectedServer(port, transport);
  injectedServers.push(server);
  const itemsResponse = await fetch(`http://127.0.0.1:${port}/api/billing-requests/ITEMOWN01/items?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-ITEMS' }
  });
  const itemsJson = await itemsResponse.json();
  assert.equal(itemsResponse.ok, true);
  assert.equal(itemsJson.status, 'partial');
  assert.equal(itemsJson.count, 20);
  assert.equal(itemsJson.hasContinuation, true);
});

test('browser flow keeps no storage and generates observed metadata report', async () => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#api-key').fill('SENTINEL-LIVE-KEY-STORAGE');
  await page.getByRole('button', { name: 'Use fixture demonstration' }).click();
  await page.waitForFunction(() => document.querySelector('#records-body')?.textContent.includes('9000000001'));
  const storage = await page.evaluate(() => ({ local: window.localStorage.length, session: window.sessionStorage.length }));
  assert.equal(storage.local, 0);
  assert.equal(storage.session, 0);
  await page.locator('#records-body tr.selectable').first().click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
  await page.getByRole('button', { name: 'B0 evidence' }).click();
  await page.waitForFunction(() => document.querySelector('#evidence')?.textContent.includes('generatedBy'));
  const report = await page.evaluate(() => JSON.parse(document.querySelector('#evidence pre').textContent));
  assert.equal(report.generatedBy, 'browser');
  assert.equal(report.configuration.getOnly, true);
  assert.ok(report.observedList || report.observedDetail);
});


test('public browser normalizes a raw SAP header, matches detail, and clears a sentinel key', async () => {
  const port = TEST_PORT + 25;
  let scenario = 'valid';
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, method: options.method, key: options.headers.APIKey, redirect: options.redirect });
    const isDetail = String(url).includes("A_BillingDocumentRequest('");
    let payload;
    if (scenario === 'empty') payload = { d: { results: [] } };
    else if (scenario === 'unusable') payload = { d: { results: [unusableRawRecord('GOOD001')] } };
    else if (scenario === 'malformed') payload = { unknown: [] };
    else if (scenario === 'number') payload = { d: { results: [{ ...unusableRawRecord('GOOD001'), TotalNetAmount: 250 }] } };
    else if (scenario === 'precision') payload = { d: { results: [{ ...unusableRawRecord('GOOD001'), TotalNetAmount: '12345678901234' }] } };
    else if (scenario === 'scale') payload = { d: { results: [{ ...unusableRawRecord('GOOD001'), TotalNetAmount: '0.0001' }] } };
    else if (scenario === 'currency') payload = { d: { results: [{ ...validRawRecord('GOOD001'), TransactionCurrency: 'ZZZ' }] } };
    else if (scenario === 'date') payload = { d: { results: [{ ...validRawRecord('GOOD001'), BillingDocumentDate: '2024-02-30' }] } };
    else if (scenario === 'date-type') payload = { d: { results: [{ ...validRawRecord('GOOD001'), BillingDocumentDate: ['/Date(1728950400000)/'] }] } };
    else if (scenario === 'currency-type') payload = { d: { results: [{ ...validRawRecord('GOOD001'), TransactionCurrency: ['USD'] }] } };
    else if (scenario === 'identifier') payload = { d: { results: [{ ...validRawRecord('GOOD001'), BillingDocumentRequest: 123 }] } };
    else payload = isDetail ? { d: validRawRecord(scenario === 'mismatch' ? 'OTHER001' : 'GOOD001') } : { d: { results: [validRawRecord('GOOD001')] } };
    return { status: 200, ok: true, headers: { get: () => null }, text: async () => JSON.stringify(payload) };
  };
  const server = await startInjectedServer(port, transport); injectedServers.push(server);
  const context = await browser.newContext(); const p = await context.newPage();
  const base = `http://127.0.0.1:${port}`;
  async function connect() {
    await p.goto(base); await p.locator('#api-key').fill('SENTINEL-BROWSER-KEY');
    await p.locator('#connect-live').click();
  }
  await connect(); await p.locator('#records-body tr.selectable').first().waitFor();
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
  await expectText(p, '#detail', 'GOOD001'); await expectText(p, '#detail', '250.000');
  await expectText(p, '#detail', 'NetAmount'); await expectText(p, '#detail', 'USD');
  assert.ok(calls.some(c => c.url.includes("A_BillingDocumentRequest('GOOD001')")));
  assert.ok(calls.every(c => c.method === 'GET' && c.redirect === 'manual' && c.key === 'SENTINEL-BROWSER-KEY' && !c.url.includes('SENTINEL')));
  assert.equal(await p.locator('#api-key').inputValue(), '');
  assert.deepEqual(await p.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  assert.ok(!(await p.locator('body').innerText()).includes('SENTINEL-BROWSER-KEY'));
  await p.locator('#disconnect').click();
  await expectText(p, '#provenance', 'Not connected');
  const before = calls.length; await p.locator('#reload-detail').evaluate(el => el.click());
  assert.equal(calls.length, before);
  for (const mode of ['empty', 'unusable', 'malformed', 'number', 'precision', 'scale', 'currency', 'currency-type', 'date', 'date-type', 'identifier']) {
    scenario = mode; await connect();
    await p.waitForFunction(() => document.querySelector('#status').textContent.includes('failed') || document.querySelector('#status').textContent.includes('No usable'));
    assert.equal(await p.locator('#records-body tr.selectable').count(), 0, mode);
    assert.ok(!(await p.locator('#detail').innerText()).includes('TotalNetAmount'), mode);
  }
  scenario = 'valid'; await connect(); await p.locator('#records-body tr.selectable').first().waitFor();
  scenario = 'mismatch'; await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => !document.querySelector('#error').hidden);
  await expectText(p, '#error', 'key does not match');
  await context.close();
});


test('browser rejects detail with missing source, wrong provenance, or unusable data and clears stale evidence', async () => {
  const p = await browser.newPage();
  const detailPayload = await (await fetch(`${BASE_URL}/api/billing-requests/9000000001?mode=fixture&selected=9000000001`)).json();
  for (const defect of ['missing-source', 'wrong-provenance', 'unusable']) {
    await p.goto(BASE_URL); await p.locator('#use-fixture').click();
    await p.locator('#records-body tr.selectable').first().waitFor();
    const payload = structuredClone(detailPayload);
    if (defect === 'missing-source') delete payload.record.sourceApiId;
    if (defect === 'wrong-provenance') payload.provenance = payload.record.provenance = 'live-sap-sandbox';
    if (defect === 'unusable') payload.record.usable = false;
    await p.route('**/api/billing-requests/9000000001*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
    await p.locator('#records-body tr.selectable').first().click();
    await p.waitForFunction(() => !document.querySelector('#error').hidden);
    assert.ok(!(await p.locator('#detail').innerText()).includes('250.000'), defect);
    await p.locator('#check-evidence').click();
    let report = JSON.parse(await p.locator('#evidence pre').innerText());
    assert.equal(report.observedDetail.status, 'not-observed');
    await p.unroute('**/api/billing-requests/9000000001*');
  }
  await p.goto(BASE_URL); await p.locator('#use-fixture').click();
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
  await p.locator('#check-evidence').click();
  assert.equal(JSON.parse(await p.locator('#evidence pre').innerText()).observedDetail.keyConsistent, true);
  await p.locator('#use-fixture').click();
  await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Loaded 2'));
  assert.equal(await p.locator('#detail-actions').isVisible(), false);
  assert.equal(await p.locator('#evidence').innerText(), '');
  await p.locator('#disconnect').click();
  assert.equal(await p.locator('#evidence').innerText(), '');
  await p.close();
});

test('malformed required date and currency types are rejected while valid optional context defects stay Unknown', async () => {
  const badDatePort = TEST_PORT + 60;
  const badDateTransport = makeTransport([{ ...validRawRecord('BADDATETYPE'), BillingDocumentDate: ['/Date(1728950400000)/'] }]);
  const badDateServer = await startInjectedServer(badDatePort, badDateTransport);
  injectedServers.push(badDateServer);
  let response = await fetch(`http://127.0.0.1:${badDatePort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-BAD-DATE-TYPE' }
  });
  let json = await response.json();
  assert.equal(response.ok, false);
  assert.match(json.error.code, /NO_USABLE/);

  const badCurrencyPort = TEST_PORT + 61;
  const badCurrencyTransport = makeTransport([{ ...validRawRecord('BADCURTYPE'), TransactionCurrency: ['USD'] }]);
  const badCurrencyServer = await startInjectedServer(badCurrencyPort, badCurrencyTransport);
  injectedServers.push(badCurrencyServer);
  response = await fetch(`http://127.0.0.1:${badCurrencyPort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-BAD-CURRENCY-TYPE' }
  });
  json = await response.json();
  assert.equal(response.ok, false);
  assert.match(json.error.code, /NO_USABLE/);

  const optionalPort = TEST_PORT + 62;
  const optionalTransport = makeTransport([
    { ...validRawRecord('GOOD001') },
    { ...validRawRecord('BADCONTEXT'), PayerParty: {}, ContractAccount: false, TransactionCurrency: 'USD', TotalNetAmount: '1.000' },
    { ...validRawRecord('TOOLONG01'), PayerParty: 'TOOLONG0011', ContractAccount: 'TOOLONGACCT01', TransactionCurrency: 'USD', TotalNetAmount: '1.000' }
  ]);
  const optionalServer = await startInjectedServer(optionalPort, optionalTransport);
  injectedServers.push(optionalServer);
  response = await fetch(`http://127.0.0.1:${optionalPort}/api/billing-requests?mode=live`, {
    headers: { 'X-SAP-APIKey': 'SENTINEL-OPTIONAL-CONTEXT' }
  });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.loadedCount, 3);
  assert.equal(json.usableCount, 3);
  assert.equal(json.records[0].usable, true);
  assert.equal(json.records[1].usable, true);
  assert.equal(json.records[1].context.payerPartyAvailable, false);
  assert.equal(json.records[1].context.contractAccountAvailable, false);
  assert.equal(json.records[2].usable, true);
  assert.equal(json.records[2].context.payerPartyAvailable, false);
  assert.equal(json.records[2].context.contractAccountAvailable, false);
});

test('item linkage requires validated parents and exact continuation before any success count', async () => {
  const validPort = TEST_PORT + 63;
  const validContinuation = `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV/A_BillingDocumentRequest('ITEMOWN01')/to_Item?$skiptoken=x`;
  const validTransport = async (url) => String(url).includes('/to_Item')
    ? { status: 200, ok: true, text: async () => JSON.stringify(rawOData(Array.from({ length: 20 }, (_, i) => ({ BillingDocumentRequest: 'ITEMOWN01', BillingDocumentRequestItem: String(i) })), validContinuation)), headers: { get: () => null } }
    : { status: 200, ok: true, text: async () => JSON.stringify(rawOData([validRawRecord('ITEMOWN01')])), headers: { get: () => null } };
  const validServer = await startInjectedServer(validPort, validTransport);
  injectedServers.push(validServer);
  let response = await fetch(`http://127.0.0.1:${validPort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-VALID-ITEMS' } });
  let json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'partial');
  assert.equal(json.count, 20);
  assert.equal(json.hasContinuation, true);

  const wrongParentPort = TEST_PORT + 64;
  const wrongContinuation = `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV/A_BillingDocumentRequest('ITEMOWN01')/to_Item?$skiptoken=x`;
  const wrongTransport = async (url) => String(url).includes('/to_Item')
    ? { status: 200, ok: true, text: async () => JSON.stringify(rawOData(Array.from({ length: 20 }, (_, i) => ({ BillingDocumentRequest: 'WRONG001', BillingDocumentRequestItem: String(i) })), wrongContinuation)), headers: { get: () => null } }
    : { status: 200, ok: true, text: async () => JSON.stringify(rawOData([validRawRecord('ITEMOWN01')])), headers: { get: () => null } };
  const wrongParentServer = await startInjectedServer(wrongParentPort, wrongTransport);
  injectedServers.push(wrongParentServer);
  response = await fetch(`http://127.0.0.1:${wrongParentPort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-WRONG-ITEM-PARENT' } });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'unavailable');
  assert.equal(json.count, 0);

  const unsafePort = TEST_PORT + 65;
  const unsafeContinuation = 'https://evil.invalid/bad?$skiptoken=x';
  const unsafeTransport = async (url) => String(url).includes('/to_Item')
    ? { status: 200, ok: true, text: async () => JSON.stringify(rawOData(Array.from({ length: 20 }, (_, i) => ({ BillingDocumentRequest: 'ITEMOWN01', BillingDocumentRequestItem: String(i) })), unsafeContinuation)), headers: { get: () => null } }
    : { status: 200, ok: true, text: async () => JSON.stringify(rawOData([validRawRecord('ITEMOWN01')])), headers: { get: () => null } };
  const unsafeServer = await startInjectedServer(unsafePort, unsafeTransport);
  injectedServers.push(unsafeServer);
  response = await fetch(`http://127.0.0.1:${unsafePort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-UNSAFE-ITEM-CONTINUATION' } });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'unavailable');
  assert.equal(json.count, 0);

  const emptyPort = TEST_PORT + 66;
  const emptyTransport = async (url) => ({ status: 200, ok: true, text: async () => JSON.stringify(rawOData([], `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV/A_BillingDocumentRequest('ITEMOWN01')/to_Item?$skiptoken=x`)), headers: { get: () => null } });
  const emptyServer = await startInjectedServer(emptyPort, emptyTransport);
  injectedServers.push(emptyServer);
  response = await fetch(`http://127.0.0.1:${emptyPort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-EMPTY-ITEM-CONTINUATION' } });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'partial');
  assert.equal(json.count, 0);
  assert.equal(json.hasContinuation, true);
});

test('malformed and wrong-key item continuations are rejected before any count', async () => {
  const baseRows = (key) => Array.from({ length: 3 }, (_, i) => ({ BillingDocumentRequest: key, BillingDocumentRequestItem: String(i) }));
  const wrongfulPort = TEST_PORT + 70;
  const malformedObjectTransport = async (url) => ({ status: 200, ok: true, text: async () => JSON.stringify({ d: { results: baseRows('ITEMOWN01'), __next: { bad: true } } }), headers: { get: () => null } });
  const malformedServer = await startInjectedServer(wrongfulPort, malformedObjectTransport);
  injectedServers.push(malformedServer);
  let response = await fetch(`http://127.0.0.1:${wrongfulPort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-MALFORMED-CONTINUATION-OBJECT' } });
  let json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'unavailable');
  assert.equal(json.hasContinuation, false);
  assert.equal(json.count, 0);
  assert.match(json.note, /rejected/i);

  const wrongfulArrayPort = TEST_PORT + 71;
  const malformedArrayTransport = async (url) => ({ status: 200, ok: true, text: async () => JSON.stringify({ d: { results: baseRows('ITEMOWN01'), __next: ['https://evil.invalid/next'] } }), headers: { get: () => null } });
  const malformedArrayServer = await startInjectedServer(wrongfulArrayPort, malformedArrayTransport);
  injectedServers.push(malformedArrayServer);
  response = await fetch(`http://127.0.0.1:${wrongfulArrayPort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-MALFORMED-CONTINUATION-ARRAY' } });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'unavailable');
  assert.equal(json.hasContinuation, false);
  assert.equal(json.count, 0);

  const wrongKeyPort = TEST_PORT + 72;
  const wrongKeyContinuation = `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV/A_BillingDocumentRequest('OTHER001')/to_Item?$skiptoken=x`;
  const wrongKeyTransport = async (url) => ({ status: 200, ok: true, text: async () => JSON.stringify(rawOData(baseRows('ITEMOWN01'), wrongKeyContinuation)), headers: { get: () => null } });
  const wrongKeyServer = await startInjectedServer(wrongKeyPort, wrongKeyTransport);
  injectedServers.push(wrongKeyServer);
  response = await fetch(`http://127.0.0.1:${wrongKeyPort}/api/billing-requests/ITEMOWN01/items?mode=live`, { headers: { 'X-SAP-APIKey': 'SENTINEL-WRONG-KEY-ITEM-CONTINUATION' } });
  json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  assert.equal(json.status, 'unavailable');
  assert.equal(json.hasContinuation, false);

  let nextValue = false;
  const falsyPort = TEST_PORT + 73;
  const falsyTransport = async () => ({
    status: 200, ok: true, headers: { get: () => null },
    text: async () => JSON.stringify({ d: { results: [], __next: nextValue } })
  });
  const falsyServer = await startInjectedServer(falsyPort, falsyTransport);
  injectedServers.push(falsyServer);
  for (const value of [false, 0, '']) {
    nextValue = value;
    const options = { headers: { 'X-SAP-APIKey': 'SENTINEL-FALSY-CONTINUATION' } };
    response = await fetch(`http://127.0.0.1:${falsyPort}/api/billing-requests/ITEMOWN01/items?mode=live`, options);
    json = await response.json();
    assert.equal(response.ok, true, JSON.stringify(json));
    assert.equal(json.status, 'unavailable', `Explicit invalid continuation ${JSON.stringify(value)} is not an absent collection.`);
    assert.equal(json.count, 0);
    assert.equal(json.hasContinuation, false);
    assert.match(json.note, /rejected/i);
    response = await fetch(`http://127.0.0.1:${falsyPort}/api/billing-requests?mode=live`, options);
    json = await response.json();
    assert.equal(response.ok, true, JSON.stringify(json));
    assert.equal(json.continuationAvailable, false);
    assert.equal(json.continuationValidation, 'rejected');
  }
});

test('missing live key leaves the current source unchanged and reports the connection error', async () => {
  const p = await browser.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.waitForFunction(() => document.querySelector('#records-body')?.textContent.includes('9000000001'));
    await p.locator('#api-key').fill('');
    await p.locator('#connect-live').click();
    await p.waitForFunction(() => !!document.querySelector('#error')?.textContent.includes('Enter an API key'));
    await expectText(p, '#provenance', 'Fixture demonstration');
    assert.ok((await p.locator('#records-body').innerText()).includes('9000000001'));
    const reportText = await p.evaluate(() => document.querySelector('#error')?.textContent || '');
    assert.ok(reportText.toLowerCase().includes('key'));
  } finally {
    await p.close();
  }
});

test('a failed reused-key detail clears the prior selected digest and leaves evidence not-observed', async () => {
  const p = await browser.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.waitForFunction(() => document.querySelector('#records-body')?.textContent.includes('9000000001'));
    await p.locator('#records-body tr.selectable').first().click();
    await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
    await p.locator('#check-evidence').click();
    await p.waitForFunction(() => document.querySelector('#evidence pre')?.textContent.includes('keyDigestSha256'));
    const before = JSON.parse(await p.locator('#evidence pre').innerText());
    assert.ok(before.observedList.selectedKeyDigestSha256);
    // Route a real mismatching detail for the same selected key.
    const bad = await fetch(`${BASE_URL}/api/billing-requests/9000000001?mode=fixture&selected=9000000001`).then(r => r.json());
    const payload = structuredClone(bad);
    if (payload.record) payload.record.sourceApiId = 'WRONG_API';
    await p.unroute('**/api/billing-requests/9000000001*');
    await p.route('**/api/billing-requests/9000000001*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
    await p.locator('#records-body tr.selectable').first().click();
    await p.waitForFunction(() => !document.querySelector('#error').hidden);
    await p.locator('#check-evidence').click();
    const report = JSON.parse(await p.locator('#evidence pre').innerText());
    assert.equal(report.observedDetail.status, 'not-observed');
    assert.equal(Object.hasOwn(report.observedList || {}, 'selectedKeyDigestSha256'), false);
    await p.unroute('**/api/billing-requests/9000000001*');
  } finally {
    await p.close();
  }
});

test('a delayed first list digest cannot restore stale list rows after disconnect', async () => {
  const p = await browser.newPage();
  try {
    await p.addInitScript(() => {
      const subtle = window.crypto.subtle;
      const original = subtle.digest.bind(subtle);
      const gate = (window.__listDigestGate = { started: false, finished: false, release: null });
      subtle.digest = (algorithm, data) => {
        const text = new TextDecoder().decode(data);
        if (!gate.started && text.includes('9000000001')) {
          gate.started = true;
          return new Promise((resolve) => {
            gate.release = () => original(algorithm, data).then((result) => { gate.finished = true; resolve(result); });
          });
        }
        return original(algorithm, data);
      };
    });
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.waitForFunction(() => window.__listDigestGate.started === true);
    await p.locator('#disconnect').click();
    await p.evaluate(() => window.__listDigestGate.release());
    await p.waitForFunction(() => window.__listDigestGate.finished === true);
    assert.equal(await p.locator('#records-body').innerText(), 'No records loaded.');
    assert.equal(await p.locator('#provenance').innerText(), 'Not connected');
    assert.ok((await p.locator('#status').innerText()).toLowerCase().includes('disconnected'));
    assert.equal(await p.locator('#detail-actions').isVisible(), false);
    assert.equal(await p.locator('#evidence').innerText(), '');
  } finally {
    await p.close();
  }
});



async function main() {
  let failures = [];
  try {
    const playwright = await loadPlaywright();
    browser = await playwright.chromium.launch({ headless: true });
    for (const { name, fn } of tests) {
      try {
        await fn();
        console.log(`PASS ${name}`);
      } catch (error) {
        failures.push({ name, error });
        console.error(`FAIL ${name}\n${error?.stack || error}`);
      }
    }
  } finally {
    try { await browser?.close(); } catch {}
    try { stopServer(spawnedServer); } catch {}
    for (const server of injectedServers) {
      try { await new Promise((resolve) => server.close(resolve)); } catch {}
    }
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} of ${tests.length} tests failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} tests passed.`);
  process.exit(0);
}

main();
