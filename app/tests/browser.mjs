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


test('synthetic fixture has its own profile and source metadata', async () => {
  const port = TEST_PORT + 40;
  const server = await startInjectedServer(port);
  injectedServers.push(server);
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(`http://127.0.0.1:${port}`);
  await p.getByRole('button', { name: 'Use synthetic billing-document fixture' }).click();
  await p.waitForFunction(() => document.querySelector('#list-meta')?.textContent.includes('Loaded records'));
  await expectText(p, '#provenance', 'Synthetic fixture');
  await expectText(p, '#records-body', 'SYN-0001');
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => document.querySelector('#detail')?.textContent.includes('synthetic billing document'));
  await expectText(p, '#detail', 'synthetic-billing-document-v1');
  await p.getByRole('button', { name: 'B0 evidence' }).click();
  await p.waitForFunction(() => document.querySelector('#evidence')?.textContent.includes('generatedAt'));
  const evidenceText = await p.locator('#evidence').innerText();
  assert.ok(evidenceText.includes('"sourceApi": null'));
  assert.ok(evidenceText.includes('"sourceApiVersion": null'));
  assert.ok(evidenceText.includes('"provenance": "synthetic-fixture"'));
  assert.ok(!evidenceText.includes('API_BILLING_DOCUMENT_REQUEST_SRV'));
  assert.ok(!evidenceText.includes('live-sap-sandbox'));
  await context.close();
});

test('review cost evidence preserves selection and returns to list', async () => {
  const port = TEST_PORT + 41;
  const server = await startInjectedServer(port);
  injectedServers.push(server);
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(`http://127.0.0.1:${port}`);
  await p.getByRole('button', { name: 'Use synthetic billing-document fixture' }).click();
  await p.waitForFunction(() => document.querySelector('#list-meta')?.textContent.includes('Loaded records'));
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => document.querySelector('#detail')?.textContent.includes('Detail loaded') || document.querySelector('#status')?.textContent.includes('Detail loaded'));
  await p.getByRole('button', { name: 'Review cost evidence' }).click();
  await p.waitForFunction(() => !document.querySelector('#screen-cost').hidden);
  await expectText(p, '#cost-summary', '10.000');
  await p.getByRole('button', { name: 'Back to list' }).click();
  await p.waitForFunction(() => document.querySelector('#screen-cost').hidden);
  const selected = await p.locator('#records-body tr.selected').count();
  assert.equal(selected, 1);
  await context.close();
});

test('synthetic exact decimals are preserved for zero, negative and 0.100 plus 0.200', async () => {
  const port = TEST_PORT + 42;
  const server = await startInjectedServer(port);
  injectedServers.push(server);
  const keys = ['SYN-0002', 'SYN-0003'];
  for (const key of keys) {
    const context = await browser.newContext();
    const p = await context.newPage();
    await p.goto(`http://127.0.0.1:${port}`);
    await p.getByRole('button', { name: 'Use synthetic billing-document fixture' }).click();
    await p.waitForFunction(() => document.querySelector('#list-meta')?.textContent.includes('Loaded records'));
    await p.locator(`#records-body tr[data-key="${key}"]`).click();
    await p.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Detail loaded'));
    await p.getByRole('button', { name: 'Review cost evidence' }).click();
    await p.waitForFunction(() => !document.querySelector('#screen-cost').hidden);
    if (key === 'SYN-0002') {
      await expectText(p, '#cost-amounts', '0.100');
      await expectText(p, '#cost-amounts', '0.200');
      await expectText(p, '#cost-amounts', '0.300');
    } else {
      await expectText(p, '#cost-amounts', '-18.750');
    }
    await expectText(p, '#cost-consistency', 'Synthetic check passed');
    await context.close();
  }
});

test('missing optional fields stay Unknown and are not material by themselves', async () => {
  const port = TEST_PORT + 43;
  const server = await startInjectedServer(port);
  injectedServers.push(server);
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(`http://127.0.0.1:${port}`);
  await p.getByRole('button', { name: 'Use synthetic billing-document fixture' }).click();
  await p.waitForFunction(() => document.querySelector('#list-meta')?.textContent.includes('Loaded records'));
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Detail loaded'));
  await p.getByRole('button', { name: 'Review cost evidence' }).click();
  await p.waitForFunction(() => !document.querySelector('#screen-cost').hidden);
  await expectText(p, '#cost-fields', 'Unknown / Not available');
  await expectText(p, '#cost-limits', 'No paid-bill claim');
  assert.ok(!(await p.locator('#cost-consistency').innerText()).toLowerCase().includes('materialinconsistency'));
  assert.ok((await p.locator('#cost-consistency').innerText()).toLowerCase().includes('synthetic check passed'));
  await context.close();
});

test('linked item currency and parent conflicts are flagged material', async () => {
  const port = TEST_PORT + 44;
  const server = await startInjectedServer(port);
  injectedServers.push(server);
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(`http://127.0.0.1:${port}`);
  await p.getByRole('button', { name: 'Use fixture demonstration' }).click();
  await p.waitForFunction(() => document.querySelector('#list-meta')?.textContent.includes('Loaded records'));
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Detail loaded'));
  await p.route('**/api/billing-requests/9000000001/items*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'complete',
      count: 1,
      hasContinuation: false,
      note: 'foreign currency and parent',
      rows: [{ parentKey: 'OTHER999', itemKey: '000001', netAmount: '250.000', taxAmount: '0.000', grossAmount: '250.000', currency: 'EUR' }],
      sourceApiId: 'API_BILLING_DOCUMENT_REQUEST_SRV',
      sourceApiVersion: '1.1.0',
      sourceProfileId: 'billing-document-request-v1',
      provenance: 'live-sap-sandbox',
      parentKey: 'OTHER999',
      parentVerified: false
    })
  }));
  await p.getByRole('button', { name: 'Check optional items' }).click();
  await p.waitForFunction(() => document.querySelector('#detail')?.textContent.includes('foreign currency and parent'));
  await p.getByRole('button', { name: 'Review cost evidence' }).click();
  await p.waitForFunction(() => !document.querySelector('#screen-cost').hidden);
  await expectText(p, '#cost-consistency', 'Needs review');
  await expectText(p, '#cost-items', 'conflict');
  const snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
  assert.equal(snapshot.materialInconsistency, true);
  assert.ok(snapshot.reasons.some((reason) => /different currency/i.test(reason)));
  assert.ok(snapshot.reasons.some((reason) => /source|parent/i.test(reason)));
  await context.close();
});

test('bad required header data cannot create a cost snapshot', async () => {
  const port = TEST_PORT + 45;
  const transport = async (url, options) => {
    const isDetail = String(url).includes("A_BillingDocumentRequest('");
    if (!isDetail) {
      return { status: 200, ok: true, headers: { get: () => null }, text: async () => JSON.stringify(rawOData([validRawRecord('GOOD001')])) };
    }
    return { status: 200, ok: true, headers: { get: () => null }, text: async () => JSON.stringify({ d: { ...validRawRecord('GOOD001'), BillingDocumentDate: '2024-02-30', TransactionCurrency: 42, TotalNetAmount: null, TotalTaxAmount: null, TotalGrossAmount: null } }) };
  };
  const server = await startInjectedServer(port, transport);
  injectedServers.push(server);
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(`http://127.0.0.1:${port}`);
  await p.locator('#api-key').fill('SENTINEL-DETAIL');
  await p.locator('#connect-live').click();
  await p.locator('#records-body tr.selectable').first().waitFor();
  await p.locator('#records-body tr.selectable').first().click();
  await p.waitForFunction(() => !document.querySelector('#error').hidden);
  assert.match(await p.locator('#error').innerText(), /contract|date|currency|amount/i);
  assert.equal(await p.locator('#review-cost-evidence').isDisabled(), true);
  assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
  await context.close();
});

test('unknown mode or synthetic profile in live mode returns sanitized 400 with zero calls', async () => {
  const port = TEST_PORT + 46;
  const transport = makeTransport([validRawRecord('UPSTREAM003')]);
  const server = await startInjectedServer(port, transport);
  injectedServers.push(server);
  let response = await fetch(`http://127.0.0.1:${port}/api/billing-requests?mode=wat`, { headers: { 'X-SAP-APIKey': 'SENTINEL-UNKNOWN' } });
  let json = await response.json();
  assert.equal(response.status, 400);
  assert.equal(transport.calls.length, 0);
  response = await fetch(`http://127.0.0.1:${port}/api/billing-requests?mode=live&profile=synthetic-billing-document-v1`, { headers: { 'X-SAP-APIKey': 'SENTINEL-PROFILE' } });
  json = await response.json();
  assert.equal(response.status, 400);
  assert.equal(transport.calls.length, 0);
  response = await fetch(`http://127.0.0.1:${port}/api/billing-requests?mode=synthetic&profile=billing-document-request-v1`);
  json = await response.json();
  assert.equal(response.status, 400);
});

const issue6RegressionProfiles = [
  { mode: 'fixture', button: '#use-fixture', key: '9000000001', profile: 'billing-document-request-v1', provenance: 'fixture-demonstration' },
  { mode: 'synthetic', button: '#use-synthetic', key: 'SYN-0001', profile: 'synthetic-billing-document-v1', provenance: 'synthetic-fixture' }
];

async function issue6RegressionSeed(profile) {
  const response = await fetch(`${BASE_URL}/api/billing-requests/${profile.key}?mode=${profile.mode}&selected=${profile.key}`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.record.key, profile.key);
  assert.equal(payload.record.usable, true);
  return payload;
}

async function issue6RegressionLoad(p, profile, base = BASE_URL) {
  await p.goto(base, { waitUntil: 'domcontentloaded' });
  await p.locator(profile.button).click();
  await p.locator(`#records-body tr[data-key="${profile.key}"]`).waitFor({ state: 'visible' });
}

async function issue6RegressionSelect(p, key) {
  await p.locator(`#records-body tr[data-key="${key}"]`).click();
  await p.waitForFunction((expectedKey) => {
    const statusText = document.querySelector('#status')?.textContent || '';
    return statusText.includes('Detail loaded') && statusText.includes(expectedKey);
  }, key);
}

async function issue6RegressionOpen(p, profile, base = BASE_URL) {
  await issue6RegressionLoad(p, profile, base);
  await issue6RegressionSelect(p, profile.key);
}

async function issue6RegressionReview(p) {
  await p.locator('#review-cost-evidence').click();
  await p.locator('#screen-cost').waitFor({ state: 'visible' });
  const snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
  assert.equal(snapshot?.version, 'issue-6-cost-snapshot-v1');
  return snapshot;
}

async function issue6RegressionAmount(p, label, expected) {
  const row = p.locator('#cost-amounts tr').filter({ hasText: label });
  assert.equal(await row.locator('td').first().innerText(), expected);
}

function issue6RegressionDetailMatch(key) {
  return (url) => url.pathname === `/api/billing-requests/${key}`;
}

function issue6RegressionCoverage(seed, note = 'ISSUE6-LINKED-ROW') {
  const record = seed.record;
  return {
    status: 'partial', count: 1, hasContinuation: false, complete: false, note,
    sourceApiId: record.sourceApiId,
    sourceApiVersion: record.sourceApiVersion,
    sourceProfileId: record.sourceProfileId,
    provenance: record.provenance,
    parentKey: record.key, parentVerified: true,
    rows: [{ parentKey: record.key, itemKey: '000010', netAmount: '11.125', taxAmount: '0.005', grossAmount: '11.130', currency: record.currency }]
  };
}

async function issue6RegressionItems(p, profile, payload) {
  const match = (url) => url.pathname === `/api/billing-requests/${profile.key}/items`;
  const handler = (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  await p.route(match, handler);
  await p.locator('#check-items').click();
  await p.waitForFunction((note) => document.querySelector('#detail')?.textContent.includes(note), payload.note);
  await p.unroute(match, handler);
}

test('supplement: synthetic arithmetic preserves coefficients above Number.MAX_SAFE_INTEGER and detects one-mill mismatch', async () => {
  const profile = issue6RegressionProfiles[1];
  const seed = await issue6RegressionSeed(profile);
  // 9007199254740993 is > 2^53 but its 13 integer + 3 fraction digits fit net p16/s3.
  const cases = [
    { name: 'all zero', net: '0.000', tax: '0.000', gross: '0.000', material: false },
    { name: 'large exact', net: '9007199254740.993', tax: '0.001', gross: '9007199254740.994', material: false },
    { name: 'large signed exact', net: '-9007199254740.993', tax: '-0.001', gross: '-9007199254740.994', material: false },
    { name: 'one mill mismatch', net: '9007199254740.993', tax: '0.001', gross: '9007199254740.995', material: true }
  ];
  for (const example of cases) {
    const context = await browser.newContext();
    const p = await context.newPage();
    try {
      const payload = structuredClone(seed);
      payload.record.amounts = { net: example.net, tax: example.tax, gross: example.gross };
      await p.route(issue6RegressionDetailMatch(profile.key), (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
      await issue6RegressionOpen(p, profile);
      const snapshot = await issue6RegressionReview(p);
      await issue6RegressionAmount(p, 'Total net amount', example.net);
      await issue6RegressionAmount(p, 'Total tax amount', example.tax);
      await issue6RegressionAmount(p, 'Total gross amount', example.gross);
      assert.deepEqual({ net: snapshot.amounts.net, tax: snapshot.amounts.tax, gross: snapshot.amounts.gross }, payload.record.amounts, example.name);
      assert.equal(snapshot.materialInconsistency, example.material, example.name);
      assert.equal(snapshot.assessmentStatus, example.material ? 'inconsistent' : 'consistent', example.name);
      assert.match(await p.locator('#cost-consistency').innerText(), example.material ? /Needs review/ : /Synthetic check passed/);
    } finally { await context.close(); }
  }
});

test('supplement: missing optional tax on both profiles is explicit and cannot become zero or material inconsistency', async () => {
  for (const profile of issue6RegressionProfiles) {
    const seed = await issue6RegressionSeed(profile);
    const payload = structuredClone(seed);
    payload.record.amounts.tax = null;
    payload.record.amountBasis.tax = null;
    payload.record.context = { payerPartyAvailable: false, contractAccountAvailable: false };
    const context = await browser.newContext();
    const p = await context.newPage();
    try {
      await p.route(issue6RegressionDetailMatch(profile.key), (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
      await issue6RegressionOpen(p, profile);
      const snapshot = await issue6RegressionReview(p);
      await issue6RegressionAmount(p, 'Total tax amount', 'Not reported');
      await issue6RegressionAmount(p, 'Total net amount', seed.record.amounts.net);
      await expectText(p, '#cost-fields', 'Unknown / Not available');
      assert.equal(snapshot.amounts.tax, null);
      assert.equal(snapshot.materialInconsistency, false);
      assert.equal(snapshot.linkedDetail.present, false);
      assert.equal(snapshot.context.payerPartyAvailable, false);
      assert.equal(snapshot.context.contractAccountAvailable, false);
      assert.notEqual(snapshot.assessmentStatus, 'inconsistent');
      assert.equal(snapshot.assessmentStatus, profile.mode === 'synthetic' ? 'partial' : 'unassessed');
      assert.doesNotMatch(await p.locator('#cost-consistency').innerText(), /Needs review/);
    } finally { await context.close(); }
  }
});

test('supplement: normalized usable=true cannot bypass required date, meaning, currency, retrieval or amount validation', async () => {
  const mutations = [
    ['wrong configured label', (p) => { p.record.configuredSourceLabel = 'Unverified live source'; }],
    ['wrong kind', (p) => { p.record.documentKind = 'paid bill'; }],
    ['wrong record provenance', (p) => { p.record.provenance = 'live-sap-sandbox'; }],
    ['impossible normalized date', (p) => { p.record.dateNormalized = '2024-02-30'; p.record.dateValid = true; }],
    ['non-string normalized date', (p) => { p.record.dateNormalized = ['2024-10-15']; p.record.dateValid = true; }],
    ['missing date meaning', (p) => { p.record.dateMeaning = ' '; }],
    ['payment meaning substituted', (p) => { p.record.dateMeaning = 'Payment received date.'; }],
    ['unknown claimed-known currency', (p) => { p.record.currency = 'ZZZ'; p.record.currencyKnown = true; }],
    ['non-string claimed-known currency', (p) => { p.record.currency = ['USD']; p.record.currencyKnown = true; }],
    ['invalid retrieval timestamp', (p) => { p.record.retrievedAt = 'not-an-ISO-timestamp'; }],
    ['number-only amount', (p) => { p.record.amounts = { net: 250, tax: null, gross: null }; }],
    ['exponent-only amount', (p) => { p.record.amounts = { net: '2.5e2', tax: null, gross: null }; }],
    ['over-scale only amount', (p) => { p.record.amounts = { net: '0.0001', tax: null, gross: null }; }]
  ];
  for (const profile of issue6RegressionProfiles) {
    const seed = await issue6RegressionSeed(profile);
    for (const [name, mutate] of mutations) {
      const payload = structuredClone(seed);
      mutate(payload);
      payload.record.usable = true; // Deliberately forged success booleans.
      const context = await browser.newContext();
      const p = await context.newPage();
      const match = issue6RegressionDetailMatch(profile.key);
      const handler = (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      try {
        await p.route(match, handler);
        await issue6RegressionLoad(p, profile);
        await p.locator(`#records-body tr[data-key="${profile.key}"]`).click();
        await p.waitForFunction(() => !document.querySelector('#error').hidden || document.querySelector('#status')?.textContent.includes('Detail loaded'));
        if (!(await p.locator('#error').isVisible())) {
          await p.locator('#review-cost-evidence').click();
          await p.waitForFunction(() => !document.querySelector('#error').hidden || !document.querySelector('#screen-cost').hidden);
        }
        assert.equal(await p.locator('#error').isVisible(), true, `${profile.mode}: ${name}`);
        assert.equal(await p.locator('#screen-cost').isVisible(), false, `${profile.mode}: ${name}`);
        assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined, `${profile.mode}: ${name}`);
        // A subsequent valid public detail request must recover without reconnecting.
        await p.unroute(match, handler);
        await issue6RegressionSelect(p, profile.key);
        assert.equal((await issue6RegressionReview(p)).document.key, profile.key);
      } finally { await context.close(); }
    }
  }
});

test('supplement: matching item evidence is visible while each independent source, version, provenance or parent conflict is hidden with a material reason', async () => {
  const profile = issue6RegressionProfiles[0];
  const seed = await issue6RegressionSeed(profile);
  const cases = [
    ['matching', () => {}, null],
    ['foreign API', (c) => { c.sourceApiId = 'OTHER_API'; }, /source|parent/i],
    ['foreign version', (c) => { c.sourceApiVersion = '9.9.9'; }, /source|version|parent/i],
    ['foreign profile', (c) => { c.sourceProfileId = 'synthetic-billing-document-v1'; }, /source|profile|parent/i],
    ['foreign provenance', (c) => { c.provenance = 'live-sap-sandbox'; }, /source|provenance|parent/i],
    ['foreign envelope parent', (c) => { c.parentKey = 'OTHER001'; }, /source|parent/i],
    ['foreign row parent', (c) => { c.rows[0].parentKey = 'OTHER001'; }, /source|parent/i],
    ['foreign currency', (c) => { c.rows[0].currency = 'EUR'; }, /currency/i]
  ];
  for (const [name, mutate, expectedReason] of cases) {
    const coverage = issue6RegressionCoverage(seed, `ISSUE6-${name}`);
    mutate(coverage);
    const context = await browser.newContext();
    const p = await context.newPage();
    try {
      await issue6RegressionOpen(p, profile);
      await issue6RegressionItems(p, profile, coverage);
      const snapshot = await issue6RegressionReview(p);
      await issue6RegressionAmount(p, 'Total net amount', seed.record.amounts.net);
      const visibleItems = await p.locator('#cost-items').innerText();
      if (!expectedReason) {
        assert.match(visibleItems, /11\.125/);
        assert.match(visibleItems, /USD/);
        assert.equal(snapshot.materialInconsistency, false);
        assert.equal(snapshot.linkedDetail.complete, false);
        assert.equal(snapshot.linkedDetail.rows[0].netAmount, '11.125');
      } else {
        assert.doesNotMatch(visibleItems, /11\.125/);
        assert.match(visibleItems, /conflict|not shown|not available|unavailable/i);
        assert.equal(snapshot.materialInconsistency, true, name);
        assert.equal(snapshot.assessmentStatus, 'inconsistent', name);
        assert.equal(snapshot.linkedDetail.rows.length, 0, name);
        assert.ok(snapshot.reasons.some((reason) => expectedReason.test(reason)), name);
        assert.match(await p.locator('#cost-reasons').innerText(), expectedReason);
      }
    } finally { await context.close(); }
  }
});

test('supplement: optional row currency and parent must be explicit; missing or malformed values never inherit the header currency', async () => {
  const profile = issue6RegressionProfiles[0];
  const seed = await issue6RegressionSeed(profile);
  const cases = [
    ['missing currency', (c) => { c.rows[0].currency = null; }],
    ['array currency', (c) => { c.rows[0].currency = ['USD']; }],
    ['unknown currency', (c) => { c.rows[0].currency = 'ZZZ'; }],
    ['missing row parent', (c) => { delete c.rows[0].parentKey; }]
  ];
  for (const [name, mutate] of cases) {
    const coverage = issue6RegressionCoverage(seed, `ISSUE6-invalid-${name}`);
    mutate(coverage);
    const context = await browser.newContext();
    const p = await context.newPage();
    try {
      await issue6RegressionOpen(p, profile);
      await issue6RegressionItems(p, profile, coverage);
      const snapshot = await issue6RegressionReview(p);
      assert.doesNotMatch(await p.locator('#cost-items').innerText(), /11\.125/, name);
      assert.equal(snapshot.linkedDetail.rows.length, 0, name);
      await issue6RegressionAmount(p, 'Total net amount', seed.record.amounts.net);
      assert.ok(snapshot.reasons.length > 0, name);
      if (name === 'missing currency') {
        assert.equal(snapshot.materialInconsistency, false, 'Missing optional currency alone is not a known currency contradiction.');
        assert.notEqual(snapshot.linkedDetail.currency, seed.record.currency);
      }
    } finally { await context.close(); }
  }
});

test('supplement: live item transport requests documented monetary fields, remains partial, and unavailable refresh does not retain old rows or create material conflict', async () => {
  const port = TEST_PORT + 140;
  const key = 'LINKLIVE1';
  const calls = [];
  let unavailable = false;
  const transport = async (url, options) => {
    const target = new URL(url);
    calls.push({ url: target, method: options.method });
    if (target.pathname.endsWith('/to_Item')) {
      if (unavailable) return { status: 503, ok: false, headers: { get: () => null }, text: async () => '{}' };
      return { status: 200, ok: true, headers: { get: () => null }, text: async () => JSON.stringify({ d: { results: [{ BillingDocumentRequest: key, BillingDocumentRequestItem: '000010', NetAmount: '11.125', TaxAmount: '0.005', GrossAmount: '11.130', TransactionCurrency: 'USD' }] } }) };
    }
    const raw = validRawRecord(key);
    const body = target.pathname.includes("A_BillingDocumentRequest('") ? { d: raw } : { d: { results: [raw] } };
    return { status: 200, ok: true, headers: { get: () => null }, text: async () => JSON.stringify(body) };
  };
  injectedServers.push(await startInjectedServer(port, transport));
  const context = await browser.newContext();
  const p = await context.newPage();
  try {
    await p.goto(`http://127.0.0.1:${port}`);
    await p.locator('#api-key').fill('SENTINEL-ISSUE6-ITEM-FIELDS');
    await p.locator('#connect-live').click();
    await p.locator(`#records-body tr[data-key="${key}"]`).waitFor({ state: 'visible' });
    await issue6RegressionSelect(p, key);
    await p.locator('#check-items').click();
    await p.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Optional item coverage: partial'));
    let snapshot = await issue6RegressionReview(p);
    await expectText(p, '#cost-items', '11.125');
    assert.equal(snapshot.materialInconsistency, false);
    assert.equal(snapshot.linkedDetail.complete, false);
    assert.notEqual(snapshot.assessmentStatus, 'consistent');
    const itemCall = calls.find((call) => call.url.pathname.endsWith('/to_Item'));
    assert.ok(itemCall);
    const selectedFields = new Set(itemCall.url.searchParams.get('$select').split(','));
    for (const field of ['BillingDocumentRequest', 'BillingDocumentRequestItem', 'NetAmount', 'TaxAmount', 'GrossAmount', 'TransactionCurrency']) assert.ok(selectedFields.has(field), `Missing item $select: ${field}`);
    assert.ok(calls.every((call) => call.method === 'GET'));
    await p.locator('#back-to-list').click();
    unavailable = true;
    await p.locator('#check-items').click();
    await p.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Optional item coverage: unavailable'));
    snapshot = await issue6RegressionReview(p);
    assert.doesNotMatch(await p.locator('#cost-items').innerText(), /11\.125/);
    assert.equal(snapshot.linkedDetail.rows.length, 0);
    assert.equal(snapshot.materialInconsistency, false);
    assert.notEqual(snapshot.assessmentStatus, 'inconsistent');
    await issue6RegressionAmount(p, 'Total net amount', '250.000');
    await expectText(p, '#cost-fields', 'unavailable');
  } finally { await context.close(); }
});

test('supplement: public snapshot preserves original source provenance, clears on exit/source/reset, and synthetic B0 metadata contains no live observation', async () => {
  for (const profile of issue6RegressionProfiles) {
    const seed = await issue6RegressionSeed(profile);
    const context = await browser.newContext();
    const p = await context.newPage();
    try {
      await p.route(issue6RegressionDetailMatch(profile.key), (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seed) }));
      await issue6RegressionOpen(p, profile);
      if (profile.mode === 'synthetic') {
        await p.locator('#check-evidence').click();
        await p.locator('#evidence pre').waitFor({ state: 'visible' });
        const report = JSON.parse(await p.locator('#evidence pre').innerText());
        assert.equal(report.sourceApi, null);
        assert.equal(report.sourceApiVersion, null);
        assert.equal(report.sourceProfileId, profile.profile);
        assert.equal(report.provenance, profile.provenance);
        assert.equal(report.mode, 'synthetic');
        assert.equal(report.configuration.transport, 'none (synthetic fixture)');
        for (const observed of [report.observedList, report.observedDetail]) {
          assert.equal(observed.sourceApi, null);
          assert.equal(observed.sourceApiVersion, null);
          assert.equal(observed.provenance, 'synthetic-fixture');
          assert.equal(observed.upstreamHttpStatus, null);
          assert.notEqual(observed.mode, 'live');
        }
        assert.doesNotMatch(JSON.stringify(report), /"provenance":"live-sap-sandbox"|"sourceApi":"API_BILLING_DOCUMENT_REQUEST_SRV"/);
      }
      const snapshot = await issue6RegressionReview(p);
      await expectText(p, '#cost-fields', profile.mode === 'synthetic' ? 'Synthetic fixture' : 'Fixture demonstration');
      assert.equal(snapshot.document.provenance, seed.record.provenance);
      assert.equal(snapshot.source.provenance, seed.record.provenance);
      assert.equal(snapshot.document.sourceProfileId, seed.record.sourceProfileId);
      assert.equal(snapshot.document.sourceApiId, seed.record.sourceApiId);
      assert.equal(snapshot.document.sourceApiVersion, seed.record.sourceApiVersion);
      assert.equal(snapshot.document.retrievedAt, seed.record.retrievedAt);
      assert.equal(snapshot.originalReportedFiguresPreserved, true);
      await p.locator('#back-to-list').click();
      assert.equal(await p.locator('#screen-cost').isVisible(), false);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      assert.equal(await p.locator('#records-body tr.selected').getAttribute('data-key'), profile.key);
      await issue6RegressionReview(p);
      await p.locator(profile.mode === 'fixture' ? '#use-synthetic' : '#use-fixture').click();
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      assert.equal(await p.locator('#screen-cost').isVisible(), false);
      await p.locator('#disconnect').click();
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      assert.equal(await p.locator('#provenance').innerText(), 'Not connected');
    } finally { await context.close(); }
  }
});

test('supplement: deferred real HTTP item/detail responses cannot restore stale cost or export after source/reset/Back', async () => {
  const profile = issue6RegressionProfiles[0];
  const seed = await issue6RegressionSeed(profile);
  const cases = [
    { kind: 'detail', action: 'source' },
    { kind: 'items', action: 'source' },
    { kind: 'items', action: 'reset' },
    { kind: 'items', action: 'back' }
  ];
  for (const example of cases) {
    const context = await browser.newContext();
    const p = await context.newPage();
    let release;
    const releaseGate = new Promise((resolve) => { release = resolve; });
    const targetPath = `/api/billing-requests/${profile.key}${example.kind === 'items' ? '/items' : ''}`;
    try {
      // Observe consumption of the actual HTTP JSON body, not a private business helper.
      await p.addInitScript(() => {
        window.__issue6ConsumedHttp = [];
        const nativeFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const response = await nativeFetch(...args);
          const nativeJson = response.json.bind(response);
          response.json = async () => {
            const payload = await nativeJson();
            const pathname = new URL(typeof args[0] === 'string' ? args[0] : args[0].url, location.href).pathname;
            queueMicrotask(() => window.__issue6ConsumedHttp.push(pathname));
            return payload;
          };
          return response;
        };
      });
      await issue6RegressionLoad(p, profile);
      if (example.kind === 'items') await issue6RegressionSelect(p, profile.key);
      const held = p.waitForRequest((request) => new URL(request.url()).pathname === targetPath);
      await p.route((url) => url.pathname === targetPath, async (route) => {
        await releaseGate;
        const payload = example.kind === 'detail' ? seed : issue6RegressionCoverage(seed, 'ISSUE6-DEFERRED-ROW');
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      });
      const responseArrived = p.waitForResponse((response) => new URL(response.url()).pathname === targetPath);
      if (example.kind === 'detail') await p.locator(`#records-body tr[data-key="${profile.key}"]`).click();
      else await p.locator('#check-items').click();
      await held;
      if (example.action === 'source') {
        await p.locator('#use-synthetic').click();
        await p.locator('#records-body tr[data-key="SYN-0001"]').waitFor({ state: 'visible' });
      } else if (example.action === 'reset') {
        await p.locator('#disconnect').click();
      } else {
        await issue6RegressionReview(p); // Item HTTP request is still held.
        await p.locator('#back-to-list').click();
      }
      release();
      await (await responseArrived).finished();
      await p.waitForFunction((pathname) => window.__issue6ConsumedHttp.includes(pathname), targetPath);
      assert.equal(await p.locator('#screen-cost').isVisible(), false, `${example.kind}/${example.action}`);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined, `${example.kind}/${example.action}`);
      assert.doesNotMatch(await p.locator('#cost-items').innerText(), /11\.125/, `${example.kind}/${example.action}`);
      if (example.action === 'source') {
        assert.equal(await p.locator('#provenance').innerText(), 'Synthetic fixture');
        assert.doesNotMatch(await p.locator('#records-body').innerText(), /9000000001/);
        assert.equal(await p.locator('#detail-actions').isVisible(), false);
      } else if (example.action === 'reset') {
        assert.equal(await p.locator('#provenance').innerText(), 'Not connected');
        assert.equal(await p.locator('#records-body').innerText(), 'No records loaded.');
        assert.equal(await p.locator('#detail-actions').isVisible(), false);
      } else {
        assert.equal(await p.locator('#records-body tr.selected').getAttribute('data-key'), profile.key);
      }
    } finally {
      release();
      await context.close();
    }
  }
});

test('unknown or conflicting source profiles are rejected on list/detail/items without upstream calls', async () => {
  const port = TEST_PORT + 141;
  const transport = makeTransport([validRawRecord('PROFILE1')]);
  injectedServers.push(await startInjectedServer(port, transport));
  for (const path of ['/api/billing-requests', '/api/billing-requests/PROFILE1', '/api/billing-requests/PROFILE1/items']) {
    for (const query of ['mode=live&profile=unknown', 'mode=synthetic&profile=synthetic-unknown', 'mode=fixture&profile=billing-document-request-v1&sourceProfileId=synthetic-billing-document-v1', 'mode=live&mode=synthetic', 'mode=live&profile=billing-document-request-v1&profile=synthetic-billing-document-v1']) {
      const response = await fetch(`http://127.0.0.1:${port}${path}?${query}`, { headers: { 'X-SAP-APIKey': 'SENTINEL-PROFILE-STRICT' } });
      assert.equal(response.status, 400, `${path}?${query}`);
      assert.match((await response.json()).error.code, /INVALID_MODE|INVALID_PROFILE/);
    }
  }
  assert.equal(transport.calls.length, 0);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status, 200);
});

test('matching item response arriving on cost screen atomically refreshes visible and exported assessment', async () => {
  const profile = issue6RegressionProfiles[0];
  const seed = await issue6RegressionSeed(profile);
  const context = await browser.newContext();
  const p = await context.newPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pathname = `/api/billing-requests/${profile.key}/items`;
  try {
    await issue6RegressionOpen(p, profile);
    const requested = p.waitForRequest(request => new URL(request.url()).pathname === pathname);
    await p.route(url => url.pathname === pathname, async route => {
      await gate;
      const payload = issue6RegressionCoverage(seed, 'ISSUE6-ACTIVE-CONFLICT');
      payload.rows[0].currency = 'EUR';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    });
    await p.locator('#check-items').click();
    await requested;
    let snapshot = await issue6RegressionReview(p);
    assert.equal(snapshot.linkedDetail.status, 'checking');
    assert.equal(snapshot.materialInconsistency, false);
    release();
    await p.waitForFunction(() => window.__issue6CostSnapshot?.materialInconsistency === true);
    snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
    assert.equal(snapshot.assessmentStatus, 'inconsistent');
    assert.equal(snapshot.linkedDetail.currencyConflict, true);
    assert.equal(snapshot.linkedDetail.rows.length, 0);
    await expectText(p, '#cost-consistency', 'Needs review');
    assert.match(await p.locator('#cost-reasons').innerText(), /different currency/i);
    assert.doesNotMatch(await p.locator('#cost-items').innerText(), /11\.125/);
    await issue6RegressionAmount(p, 'Total net amount', seed.record.amounts.net);
  } finally { release(); await context.close(); }
});

test('document switching preserves each currency and exact figures on both fixture kinds', async () => {
  for (const profile of issue6RegressionProfiles) {
    const context = await browser.newContext();
    const p = await context.newPage();
    try {
      await issue6RegressionLoad(p, profile);
      const secondKey = profile.mode === 'synthetic' ? 'SYN-0003' : '9000000002';
      for (const [key, currency] of [[profile.key, 'USD'], [secondKey, 'NZD']]) {
        const seed = await issue6RegressionSeed({ ...profile, key });
        await issue6RegressionSelect(p, key);
        assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
        const snapshot = await issue6RegressionReview(p);
        assert.equal(snapshot.document.key, key);
        assert.equal(snapshot.document.currency, currency);
        assert.equal(snapshot.amounts.currency, currency);
        assert.equal(snapshot.rule.scope, profile.mode === 'synthetic' ? 'synthetic-header-net-tax-gross-only' : 'source-and-linkage-validation-only');
        assert.equal(snapshot.rule.linkedMonetaryReconciliation, 'not-assessed');
        for (const [label, field] of [['Total net amount', 'net'], ['Total tax amount', 'tax'], ['Total gross amount', 'gross']]) await issue6RegressionAmount(p, label, seed.record.amounts[field]);
        assert.deepEqual(await p.locator('#cost-amounts tr td:nth-child(3)').allTextContents(), [currency, currency, currency]);
        assert.doesNotMatch(await p.locator('#cost-summary').innerText(), currency === 'USD' ? /NZD/ : /USD/);
        await p.locator('#back-to-list').click();
        assert.equal(await p.locator('#records-body tr.selected').getAttribute('data-key'), key);
      }
    } finally { await context.close(); }
  }
});

test('desktop and mobile cost ledger contain overflow and preserve keyboard focus on Back', async () => {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const p = await context.newPage();
    try {
      const profile = issue6RegressionProfiles[1];
      await issue6RegressionOpen(p, profile);
      await issue6RegressionReview(p);
      assert.equal(await p.locator('#back-to-list').evaluate(element => element === document.activeElement), true);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px page overflow`);
      if (width === 390) {
        const wrapper = p.locator('.cost-amount-wrap');
        assert.equal(await wrapper.evaluate(element => element.scrollWidth > element.clientWidth), true);
        await wrapper.focus();
        await p.keyboard.press('End');
        await expectText(p, '.mobile-table-hint', 'Scroll');
      }
      await p.locator('#back-to-list').click();
      assert.equal(await p.locator('#records-body tr.selected').evaluate(element => element === document.activeElement), true);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
    } finally { await context.close(); }
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
