import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { registerIssue8Tests } from './issue-8.mjs';
import { registerIssue9Tests } from './issue-9.mjs';
import { registerIssue27Tests } from './issue-27.mjs';

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

// Raw context without the legacy-expanded harness; used by #36 tests that check the collapsed UI.
let rawNewContext;
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
  await page.getByRole('button', { name: 'Try with demo data' }).click();
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
  await page.getByRole('button', { name: 'Try with demo data' }).click();
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
  await expectText(p, '#cost-fields', 'Not available');
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
  await p.getByRole('button', { name: 'Try with demo data' }).click();
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
      await issue6RegressionAmount(p, 'Total tax amount', 'Not available');
      await issue6RegressionAmount(p, 'Total net amount', seed.record.amounts.net);
      await expectText(p, '#cost-fields', 'Not available');
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
        const reopened = await issue6RegressionReview(p);
        assert.equal(reopened.linkedDetail.status, 'not-checked');
        assert.equal(reopened.materialInconsistency, false);
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
        const afterDiscard = await issue6RegressionReview(p);
        assert.equal(afterDiscard.linkedDetail.status, 'not-checked');
        assert.equal(afterDiscard.materialInconsistency, false);
        await p.locator('#back-to-list').click();
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

test('item completion refreshes cost evidence without stealing the current keyboard focus', async () => {
  const profile = issue6RegressionProfiles[0];
  const seed = await issue6RegressionSeed(profile);
  const pathname = `/api/billing-requests/${profile.key}/items`;
  for (const responseStatus of [200, 503]) {
    const context = await browser.newContext();
    const p = await context.newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      await issue6RegressionOpen(p, profile);
      const requested = p.waitForRequest(request => new URL(request.url()).pathname === pathname);
      await p.route(url => url.pathname === pathname, async route => {
        await gate;
        const payload = responseStatus === 200
          ? issue6RegressionCoverage(seed, 'ISSUE6-ACTIVE-CONFLICT')
          : { error: { code: 'SERVER', message: 'Optional item service is unavailable.' } };
        if (responseStatus === 200) payload.rows[0].currency = 'EUR';
        await route.fulfill({ status: responseStatus, contentType: 'application/json', body: JSON.stringify(payload) });
      });
      await p.locator('#check-items').click();
      await requested;
      let snapshot = await issue6RegressionReview(p);
      assert.equal(snapshot.linkedDetail.status, 'checking');
      assert.equal(snapshot.materialInconsistency, false);
      assert.equal(await p.locator('#back-to-list').evaluate(element => element === document.activeElement), true);

      const input = p.locator('#api-key');
      await input.fill('FOCUS-TEST');
      release();
      await p.waitForFunction(() => {
        const coverage = window.__issue6CostSnapshot?.linkedDetail;
        return coverage && coverage.status !== 'checking';
      });
      snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
      if (responseStatus === 200) {
        assert.equal(snapshot.materialInconsistency, true);
        assert.equal(snapshot.assessmentStatus, 'inconsistent');
        assert.equal(snapshot.linkedDetail.currencyConflict, true);
        await expectText(p, '#cost-consistency', 'Needs review');
        assert.match(await p.locator('#cost-reasons').innerText(), /different currency/i);
      } else {
        assert.equal(snapshot.materialInconsistency, false);
        assert.equal(snapshot.linkedDetail.status, 'unavailable');
        await expectText(p, '#cost-fields', 'Optional item service is unavailable.');
      }
      assert.equal(snapshot.linkedDetail.rows.length, 0);
      assert.doesNotMatch(await p.locator('#cost-items').innerText(), /11\.125/);
      await issue6RegressionAmount(p, 'Total net amount', seed.record.amounts.net);
      assert.equal(await input.evaluate(element => element === document.activeElement), true, `HTTP ${responseStatus} completion moved input focus`);
      await p.keyboard.type('-continued');
      assert.equal(await input.inputValue(), 'FOCUS-TEST-continued');
      await p.keyboard.press('Enter');
      assert.equal(await p.locator('#screen-cost').isVisible(), true, 'Enter in the input must not activate Back');
      assert.equal(await p.locator('#screen-list').isVisible(), false);
    } finally { release(); await context.close(); }
  }
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

const issue7ReceiptKey = 'planReviewSnapshot.receipt';
const issue7Intents = [['keep', 'Keep'], ['review-options', 'Review options'], ['help', 'Help'], ['later', 'Later']];

async function issue7Decision(p, profile = issue6RegressionProfiles[0]) {
  await issue6RegressionOpen(p, profile);
  const snapshot = await issue6RegressionReview(p);
  await p.getByRole('button', { name: 'Continue to decision' }).click();
  await p.locator('#screen-decision').waitFor({ state: 'visible' });
  return snapshot;
}

async function issue7Confirm(p, label) {
  await p.getByRole('radio', { name: label, exact: true }).check();
  await p.getByRole('button', { name: 'Confirm intent', exact: true }).click();
}

async function issue7Saved(p) {
  await expectText(p, '#receipt-status', 'Saved');
  const rendered = await p.evaluate(() => window.__issue7Receipt);
  assert.ok(rendered);
  assert.deepEqual(await p.evaluate(key => JSON.parse(localStorage.getItem(key)), issue7ReceiptKey), rendered);
  assert.deepEqual(await p.evaluate(() => [localStorage.length, sessionStorage.length]), [1, 0]);
  return rendered;
}

for (const [intent, label] of issue7Intents) {
  test(`issue 7: ${label} confirms the reviewed evidence with a minimal read-back-verified receipt`, async () => {
    const context = await browser.newContext(); const p = await context.newPage();
    try {
      const snapshot = await issue7Decision(p);
      assert.equal(await p.locator('#confirm-intent').isDisabled(), true);
      assert.equal(await p.evaluate(() => localStorage.length), 0);
      await expectText(p, '#screen-decision', 'not a plan suitability verdict');
      await expectText(p, '#screen-decision', 'not an account switch');
      await expectText(p, '#screen-decision', 'not a submitted support ticket');
      await expectText(p, '#screen-decision', 'not a scheduled reminder');
      await p.locator('#api-key').fill('SENTINEL-ISSUE7-NEVER-STORED');
      // Choice correction is allowed before confirmation and does not persist anything.
      await p.getByRole('radio', { name: label === 'Help' ? 'Later' : 'Help', exact: true }).check();
      await p.getByRole('button', { name: 'Back to cost evidence', exact: true }).click();
      assert.deepEqual(await p.evaluate(() => window.__issue6CostSnapshot), snapshot);
      await p.locator('#continue-decision').click();
      await issue7Confirm(p, label);
      const saved = await issue7Saved(p);
      assert.equal(saved.intent, intent);
      assert.equal(saved.version, 'issue-7-receipt-v2');
      for (const field of ['kind', 'key', 'provenance', 'sourceProfileId', 'sourceApiId', 'sourceApiVersion', 'retrievedAt']) assert.equal(saved.document[field], snapshot.document[field]);
      assert.deepEqual(saved.date, snapshot.date);
      assert.deepEqual(saved.amounts, snapshot.amounts);
      assert.deepEqual(saved.context, snapshot.context);
      assert.equal(saved.assessmentStatus, snapshot.assessmentStatus);
      assert.deepEqual(saved.assessmentScope, { scope: snapshot.rule.scope, linkedMonetaryReconciliation: 'not-assessed' });
      assert.deepEqual(saved.coverage, { status: 'not-checked', complete: false, hasContinuation: false });
      assert.equal(saved.materialInconsistency, false);
      assert.deepEqual(saved.reasons, []);
      assert.equal(new Date(saved.confirmedAt).toISOString(), saved.confirmedAt);
      assert.equal(saved.reviewId, [snapshot.document.provenance, snapshot.document.sourceProfileId, snapshot.document.key, snapshot.document.retrievedAt].join('|'));
      assert.equal(saved.receiptId, `receipt:${saved.reviewId}`);
      await expectText(p, '#decision-summary', saved.receiptId);
      assert.doesNotMatch(await p.locator('#decision-summary').innerText(), /receipt:\[/);
      await expectText(p, '#decision-summary', 'None — no material inconsistency recorded.');
      assert.deepEqual(Object.keys(saved).sort(), ['version', 'reviewId', 'receiptId', 'document', 'date', 'amounts', 'context', 'assessmentStatus', 'assessmentScope', 'coverage', 'materialInconsistency', 'reasons', 'missing', 'intent', 'confirmedAt'].sort());
      assert.doesNotMatch(JSON.stringify(saved), /SENTINEL|apiKey|rawResponse|PayerParty|ContractAccount|contact|name/);
      await expectText(p, '#decision-summary', snapshot.document.key);
      await expectText(p, '#decision-summary', snapshot.document.retrievedAt);
      await expectText(p, '#decision-summary', snapshot.date.meaning);
      await expectText(p, '#decision-choice', label);
      // The exposed rendered receipt is a read-only copy.
      await p.evaluate(() => { window.__issue7Receipt.document.provenance = 'live-sap-sandbox'; });
      assert.equal((await p.evaluate(() => window.__issue7Receipt)).document.provenance, snapshot.document.provenance);
    } finally { await context.close(); }
  });
}

for (const conflict of ['synthetic relation', 'linked currency']) {
  test(`issue 7: ${conflict} permits only Help or Later and retains material reasons`, async () => {
    const profile = issue6RegressionProfiles[1];
    const seed = await issue6RegressionSeed(profile);
    for (const label of ['Help', 'Later']) {
      const context = await browser.newContext(); const p = await context.newPage();
      try {
        const payload = structuredClone(seed);
        if (conflict === 'synthetic relation') {
          payload.record.amounts.gross = '999.999';
          await p.route(issue6RegressionDetailMatch(profile.key), route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
        }
        await issue6RegressionOpen(p, profile);
        if (conflict === 'linked currency') {
          const coverage = issue6RegressionCoverage(seed, 'ISSUE7-CURRENCY-CONFLICT');
          coverage.rows[0].currency = 'EUR';
          await issue6RegressionItems(p, profile, coverage);
        }
        const snapshot = await issue6RegressionReview(p);
        assert.equal(snapshot.materialInconsistency, true);
        await p.locator('#continue-decision').click();
        assert.equal(await p.getByRole('radio', { name: 'Keep', exact: true }).isDisabled(), true);
        assert.equal(await p.getByRole('radio', { name: 'Review options', exact: true }).isDisabled(), true);
        await expectText(p, '#decision-restriction', 'only Help or Later');
        await expectText(p, '#decision-restriction', 'Reason: ');
        await expectText(p, '#decision-restriction', conflict === 'linked currency' ? 'different currency' : 'net + tax = gross');
        // Even a forged enabled radio cannot bypass the confirmation guard.
        await p.locator('input[value="keep"]').evaluate(input => {
          input.disabled = false; input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await p.locator('#confirm-intent').evaluate(button => button.click());
        assert.equal(await p.evaluate(() => localStorage.length), 0);
        await issue7Confirm(p, label);
        const saved = await issue7Saved(p);
        assert.equal(saved.materialInconsistency, true);
        assert.equal(saved.assessmentStatus, 'inconsistent');
        assert.deepEqual(saved.reasons, snapshot.reasons);
        assert.equal(saved.intent, label.toLowerCase());
        await p.reload();
        assert.deepEqual(await issue7Saved(p), saved);
        for (const reason of saved.reasons) await expectText(p, '#decision-summary', reason);
      } finally { await context.close(); }
    }
  });
}

for (const failure of ['write', 'read-back']) {
  test(`issue 7: ${failure} failure stays unsaved and Retry preserves the original outcome`, async () => {
    const context = await browser.newContext(); const p = await context.newPage();
    try {
      await p.addInitScript(({ key, failure }) => {
        const originalSet = Storage.prototype.setItem;
        const originalGet = Storage.prototype.getItem;
        const gate = window.__storageGate = { fail: true, written: null, writes: [] };
        Storage.prototype.setItem = function(k, value) {
          if (this === localStorage && k === key) {
            gate.writes.push(value);
            if (gate.fail && failure === 'write') throw new DOMException('Injected quota error', 'QuotaExceededError');
            gate.written = value;
          }
          return originalSet.call(this, k, value);
        };
        Storage.prototype.getItem = function(k) {
          if (this === localStorage && k === key && gate.fail && gate.written && failure === 'read-back') return '{invalid read-back';
          return originalGet.call(this, k);
        };
      }, { key: issue7ReceiptKey, failure });
      await issue7Decision(p);
      await issue7Confirm(p, 'Review options');
      await expectText(p, '#receipt-status', 'Unsaved');
      assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Saved/);
      assert.equal(await p.getByRole('radio', { name: 'Review options', exact: true }).isChecked(), true);
      assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
      const attempted = await p.evaluate(() => JSON.parse(window.__storageGate.writes[0]));
      await p.evaluate(() => { window.__storageGate.fail = false; });
      await p.getByRole('button', { name: 'Retry', exact: true }).click();
      assert.deepEqual(await issue7Saved(p), attempted);
      const writes = await p.evaluate(() => window.__storageGate.writes);
      assert.equal(writes.length, 2);
      assert.equal(writes[0], writes[1]);
      assert.equal(await p.locator('#retry-receipt').isVisible(), false);
    } finally { await context.close(); }
  });
}

test('issue 7: duplicate confirmation records one receipt identity and one storage outcome', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await p.addInitScript(key => {
      window.__receiptWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, value) {
        if (this === localStorage && k === key) window.__receiptWrites.push(value);
        return original.call(this, k, value);
      };
    }, issue7ReceiptKey);
    await issue7Decision(p);
    await issue7Confirm(p, 'Keep');
    const saved = await issue7Saved(p);
    await p.locator('#confirm-intent').evaluate(button => { button.click(); button.click(); });
    await p.locator('#retry-receipt').evaluate(button => button.click());
    assert.deepEqual(await issue7Saved(p), saved);
    assert.equal(await p.evaluate(() => window.__receiptWrites.length), 1);
  } finally { await context.close(); }
});

test('issue 7: refresh reopens original live, fixture and synthetic historical receipts with zero API requests', async () => {
  const livePort = TEST_PORT + 150;
  const transport = async url => ({
    status: 200, ok: true, headers: { get: () => null },
    text: async () => JSON.stringify(String(url).includes("A_BillingDocumentRequest('") ? { d: validRawRecord('LIVE7') } : rawOData([validRawRecord('LIVE7')]))
  });
  injectedServers.push(await startInjectedServer(livePort, transport));
  for (const mode of ['live', 'fixture', 'synthetic']) {
    const context = await browser.newContext(); const p = await context.newPage();
    try {
      if (mode === 'live') {
        await p.goto(`http://127.0.0.1:${livePort}`);
        await p.locator('#api-key').fill('SENTINEL-ISSUE7-LIVE');
        await p.locator('#connect-live').click();
        await p.locator('#records-body tr.selectable').waitFor();
        await issue6RegressionSelect(p, 'LIVE7');
        await issue6RegressionReview(p);
        await p.locator('#continue-decision').click();
      } else await issue7Decision(p, issue6RegressionProfiles[mode === 'synthetic' ? 1 : 0]);
      await issue7Confirm(p, 'Later');
      const saved = await issue7Saved(p);
      const apiRequests = [];
      p.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
      await p.reload({ waitUntil: 'networkidle' });
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.deepEqual(await issue7Saved(p), saved);
      assert.deepEqual(apiRequests, []);
      await expectText(p, '#decision-history', 'Historical snapshot');
      await expectText(p, '#decision-history', 'not a newly refreshed bill');
      await expectText(p, '#provenance', mode === 'live' ? 'Live SAP sandbox' : (mode === 'fixture' ? 'Fixture demonstration' : 'Synthetic fixture'));
      assert.equal(await p.locator('#api-key').inputValue(), '');
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
    } finally { await context.close(); }
  }
});

for (const defect of ['corrupt JSON', 'unsupported version', 'missing provenance', 'unknown provenance']) {
  test(`issue 7: ${defect} shows recovery without invented history and supports reset`, async () => {
    const context = await browser.newContext(); const p = await context.newPage();
    try {
      await issue7Decision(p);
      await issue7Confirm(p, 'Help');
      const value = await issue7Saved(p);
      if (defect === 'unsupported version') value.version = 'future-version';
      if (defect === 'missing provenance') delete value.document.provenance;
      if (defect === 'unknown provenance') value.document.provenance = 'unknown-source';
      const corrupted = defect === 'corrupt JSON' ? '{not JSON' : JSON.stringify(value);
      await p.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: issue7ReceiptKey, value: corrupted });
      const requests = [];
      p.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
      await p.reload({ waitUntil: 'networkidle' });
      await expectText(p, '#receipt-status', 'Stored receipt could not be recovered');
      assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
      assert.equal(await p.locator('#decision-summary').innerText(), '');
      assert.doesNotMatch(await p.locator('#provenance').innerText(), /Live/);
      assert.equal(await p.locator('#confirm-intent').isVisible(), false);
      assert.deepEqual(requests, []);
      await p.locator('#reset-demo').click();
      await p.locator('#cancel-reset').click();
      assert.equal(await p.evaluate(key => localStorage.getItem(key), issue7ReceiptKey), corrupted);
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.evaluate(() => localStorage.length), 0);
      assert.equal(await p.locator('#screen-list').isVisible(), true);
    } finally { await context.close(); }
  });
}

test('issue 7: cancel reset keeps the receipt; confirmed reset clears receipt, review and API key', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p);
    await issue7Confirm(p, 'Keep');
    const saved = await issue7Saved(p);
    await p.locator('#api-key').fill('SENTINEL-RESET7');
    await p.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await p.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual(await issue7Saved(p), saved);
    assert.equal(await p.locator('#api-key').inputValue(), 'SENTINEL-RESET7');
    await p.locator('#reset-demo').click();
    await p.locator('#confirm-reset').click();
    assert.equal(await p.evaluate(() => localStorage.length), 0);
    assert.equal(await p.locator('#api-key').inputValue(), '');
    assert.equal(await p.locator('#screen-list').isVisible(), true);
    assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
    assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
    await expectText(p, '#records-body', 'No records loaded');
    await p.reload();
    assert.equal(await p.locator('#screen-list').isVisible(), true);
    assert.equal(await p.locator('#screen-decision').isVisible(), false);
  } finally { await context.close(); }
});

test('issue 7: source, detail refresh and selection changes invalidate unconfirmed intent', async () => {
  for (const action of ['source', 'detail', 'selection']) {
    const context = await browser.newContext(); const p = await context.newPage();
    try {
      await issue7Decision(p);
      await p.getByRole('radio', { name: 'Keep', exact: true }).check();
      if (action === 'source') {
        await p.locator('#use-synthetic').click();
        await issue6RegressionSelect(p, 'SYN-0001');
      } else {
        await p.getByRole('button', { name: 'Back to cost evidence', exact: true }).click();
        await p.locator('#back-to-list').click();
        if (action === 'detail') {
          await p.locator('#reload-detail').click();
          await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
        } else await issue6RegressionSelect(p, '9000000002');
      }
      await issue6RegressionReview(p);
      await p.locator('#continue-decision').click();
      assert.equal(await p.locator('input[name="intent"]:checked').count(), 0, action);
      assert.equal(await p.locator('#confirm-intent').isDisabled(), true, action);
      assert.equal(await p.evaluate(() => localStorage.length), 0);
    } finally { await context.close(); }
  }
});

test('issue 7: disconnect and new API results preserve the confirmed historical receipt', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p);
    await issue7Confirm(p, 'Help');
    const saved = await issue7Saved(p);
    await p.locator('#disconnect').click();
    assert.deepEqual(await p.evaluate(() => window.__issue7Receipt), saved);
    await p.locator('#reopen-receipt').click();
    assert.deepEqual(await issue7Saved(p), saved);
    await p.locator('#use-synthetic').click();
    await issue6RegressionSelect(p, 'SYN-0001');
    const newSnapshot = await issue6RegressionReview(p);
    assert.notEqual(newSnapshot.document.key, saved.document.key);
    await p.locator('#continue-decision').click();
    assert.deepEqual(await issue7Saved(p), saved);
    await expectText(p, '#decision-history', 'Historical snapshot');
    await expectText(p, '#provenance', 'Fixture demonstration');
    await p.locator('#confirm-intent').evaluate(button => button.click());
    assert.deepEqual(await issue7Saved(p), saved);
  } finally { await context.close(); }
});

test('issue 7: a different reviewed document explains the existing receipt without changing its stored bytes', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    const snapshot = await issue7Decision(p);
    assert.equal(await p.getByRole('button', { name: 'Return to list', exact: true }).isVisible(), false);
    await issue7Confirm(p, 'Keep');
    const stored = await p.evaluate(key => localStorage.getItem(key), issue7ReceiptKey);
    await p.getByRole('button', { name: 'Return to list', exact: true }).click();
    assert.equal(await p.locator('#screen-decision').isVisible(), false);
    assert.equal(await p.locator('#screen-list').isVisible(), true);
    assert.equal(await p.locator('#records-body tr.selected').getAttribute('data-key'), snapshot.document.key);
    assert.equal(await p.locator('#records-body tr.selected').evaluate(element => element === document.activeElement), true);
    await issue6RegressionSelect(p, '9000000002');
    await issue6RegressionReview(p);
    await p.locator('#continue-decision').click();
    await expectText(p, '#decision-history', `A saved receipt for document ${snapshot.document.key} already exists`);
    await expectText(p, '#decision-history', 'The current document 9000000002 has NOT been recorded');
    await expectText(p, '#decision-history', 'Reset demo is required to record a new intention (one receipt at a time)');
    assert.equal(await p.locator('#intent-options').isVisible(), false);
    assert.equal(await p.locator('#confirm-intent').isVisible(), false);
    assert.equal(await p.evaluate(key => localStorage.getItem(key), issue7ReceiptKey), stored);
    await p.getByRole('button', { name: 'Return to list', exact: true }).click();
    assert.equal(await p.locator('#records-body tr.selected').getAttribute('data-key'), '9000000002');
    assert.equal(await p.locator('#records-body tr.selected').evaluate(element => element === document.activeElement), true);
    assert.equal(await p.evaluate(key => localStorage.getItem(key), issue7ReceiptKey), stored);
  } finally { await context.close(); }
});

test('issue 7: desktop and mobile decision screens contain overflow and focus the heading on entry', async () => {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const p = await context.newPage();
    try {
      await issue7Decision(p);
      const assertLayout = async () => {
        assert.equal(await p.locator('#decision-title').evaluate(element => element === document.activeElement), true, `${width}px heading focus`);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px page overflow`);
      };
      assert.equal(await p.locator('#decision-title').innerText(), 'Confirm your intention');
      const labels = await p.locator('#decision-summary dt').allTextContents();
      for (const label of ['Net amount', 'Tax amount', 'Gross amount']) assert.ok(labels.includes(label));
      assert.doesNotMatch(await p.locator('#decision-summary').innerText(), /None — no material inconsistency recorded\./);
      await assertLayout();
      await expectText(p, '#decision-summary', 'Linked detail: not present; incomplete rows: no; currency conflict: no; source conflict: no');
      assert.doesNotMatch(await p.locator('#decision-summary').innerText(), /"linkedDetailPresent"/);
      await issue7Confirm(p, 'Help');
      await p.reload();
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#decision-title').innerText(), 'Saved receipt (historical)');
      await assertLayout();
      // Recovery also provides a way back to Screen 1 without deleting stored data.
      await p.evaluate(key => localStorage.setItem(key, '{invalid'), issue7ReceiptKey);
      await p.reload();
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#decision-title').innerText(), 'Receipt could not be recovered');
      await assertLayout();
      await p.getByRole('button', { name: 'Return to list', exact: true }).click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.equal(await p.locator('#use-fixture').evaluate(element => element === document.activeElement), true);
      assert.equal(await p.evaluate(key => localStorage.getItem(key), issue7ReceiptKey), '{invalid');
    } finally { await context.close(); }
  }
});

// PR #21 review regressions: browser-boundary injections only; no external SAP calls.
async function issue7Bytes(p) {
  return p.evaluate(key => localStorage.getItem(key), issue7ReceiptKey);
}

async function issue7Screenshot(p, name) {
  if (process.env.CAPTURE_RECEIPT_EVIDENCE === '1') {
    await p.screenshot({ path: path.join(APP_ROOT, '..', 'docs', 'validation', `issue-7-review-${name}.png`), fullPage: true });
  }
}

for (const outcome of ['success', 'failure']) {
  test(`issue 7 review: delayed live list ${outcome} cannot relabel a historical fixture receipt`, async () => {
    const context = await browser.newContext(); const p = await context.newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      await issue7Decision(p);
      await issue7Confirm(p, 'Keep');
      const saved = await issue7Saved(p);
      const bytes = await issue7Bytes(p);
      // Seed a normalized response from the local fixture, never the SAP transport.
      const payload = await fetch(`${BASE_URL}/api/billing-requests?mode=fixture`).then(r => r.json());
      payload.mode = 'live'; payload.provenance = 'live-sap-sandbox';
      const requested = p.waitForRequest(r => new URL(r.url()).searchParams.get('mode') === 'live');
      await p.route(url => url.pathname === '/api/billing-requests' && url.searchParams.get('mode') === 'live', async route => {
        assert.equal(route.request().headers()['x-sap-apikey'], 'SENTINEL-RECEIPT-ASYNC');
        await gate;
        await route.fulfill({ status: outcome === 'success' ? 200 : 503, contentType: 'application/json', body: JSON.stringify(outcome === 'success' ? payload : { error: { message: 'Injected list unavailable' } }) });
      });
      await p.locator('#api-key').fill('SENTINEL-RECEIPT-ASYNC');
      await p.locator('#connect-live').click();
      await requested;
      await p.locator('#reopen-receipt').click();
      await expectText(p, '#provenance', 'Fixture demonstration');
      await expectText(p, '#decision-summary', saved.receiptId);
      await p.locator('#api-key').focus();
      release();
      await p.waitForFunction(expected => document.querySelector('#status').textContent.includes(expected), outcome === 'success' ? 'Loaded 2' : 'Connection failed');
      assert.equal(await p.locator('#screen-decision').isVisible(), true);
      assert.equal(await p.locator('#screen-list').isVisible(), false);
      assert.equal(await p.locator('#provenance').innerText(), 'Fixture demonstration');
      await expectText(p, '#decision-summary', 'Fixture demonstration');
      await expectText(p, '#decision-summary', saved.receiptId);
      assert.deepEqual(await p.evaluate(() => window.__issue7Receipt), saved);
      assert.equal(await issue7Bytes(p), bytes);
      assert.equal(await p.locator('#api-key').evaluate(e => e === document.activeElement), true);
      await p.locator('#decision-return-to-list').click();
      assert.equal(await p.locator('#provenance').innerText(), outcome === 'success' ? 'Live SAP sandbox' : 'Not connected');
      assert.equal(await issue7Bytes(p), bytes);
    } finally { release(); await context.close(); }
  });
}

for (const coverageKind of ['partial', 'unavailable', 'not-checked', 'absent', 'complete', 'unknown']) {
  test(`issue 7 review: ${coverageKind} coverage and assessment scope survive confirmation and refresh`, async () => {
    for (const profile of issue6RegressionProfiles) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 844 } }); const p = await context.newPage();
      try {
        const seed = await issue6RegressionSeed(profile);
        await issue6RegressionOpen(p, profile);
        if (coverageKind !== 'not-checked') {
          const coverage = issue6RegressionCoverage(seed, `RECEIPT-${coverageKind}`);
          coverage.status = coverageKind;
          coverage.hasContinuation = coverageKind === 'partial';
          coverage.complete = coverageKind === 'complete';
          if (['unavailable', 'absent', 'unknown'].includes(coverageKind)) { coverage.rows = []; coverage.count = 0; }
          if (coverageKind === 'unknown') { delete coverage.status; delete coverage.complete; delete coverage.hasContinuation; }
          await issue6RegressionItems(p, profile, coverage);
        }
        const snapshot = await issue6RegressionReview(p);
        const expectedStatus = coverageKind === 'complete' && profile.mode !== 'synthetic' ? 'partial' : coverageKind;
        await p.locator('#continue-decision').click();
        await expectText(p, '#decision-summary', `Coverage: ${expectedStatus}`);
        await expectText(p, '#decision-summary', `continuation: ${coverageKind === 'partial' ? 'present' : (coverageKind === 'unknown' ? 'unknown' : 'not reported')}`);
        await expectText(p, '#decision-summary', 'Linked monetary reconciliation: not assessed');
        if (coverageKind === 'partial' && profile.mode === 'fixture') await issue7Screenshot(p, 'confirmation');
        await issue7Confirm(p, 'Later');
        const saved = await issue7Saved(p);
        assert.deepEqual(saved.coverage, { status: expectedStatus, complete: expectedStatus === 'complete', hasContinuation: coverageKind === 'unknown' ? null : coverageKind === 'partial' });
        assert.deepEqual(saved.assessmentScope, { scope: snapshot.rule.scope, linkedMonetaryReconciliation: 'not-assessed' });
        assert.equal(saved.missing.incompleteRows, false, 'Row validity must remain distinct from coverage');
        assert.deepEqual(Object.keys(saved.coverage).sort(), ['complete', 'hasContinuation', 'status']);
        assert.deepEqual(saved.reasons, snapshot.materialInconsistency ? snapshot.reasons : []);
        assert.doesNotMatch(JSON.stringify(saved), /RECEIPT-partial|000010|11\.125|rows|rawResponse|SENTINEL/);
        const bytes = await issue7Bytes(p);
        await p.reload();
        await p.locator('#screen-decision').waitFor({ state: 'visible' });
        assert.deepEqual(await issue7Saved(p), saved);
        assert.equal(await issue7Bytes(p), bytes);
        await expectText(p, '#decision-summary', `Coverage: ${expectedStatus}`);
        await expectText(p, '#decision-summary', 'Linked monetary reconciliation: not assessed');
        await expectText(p, '#decision-summary', profile.mode === 'synthetic' ? 'Synthetic header net + tax = gross only' : 'No verified universal item-to-header equation or rounding tolerance');
        if (coverageKind === 'partial') {
          await expectText(p, '#decision-summary', 'continuation: present');
          if (profile.mode === 'fixture') await issue7Screenshot(p, 'historical');
        }
      } finally { await context.close(); }
    }
  });
}

test('issue 7 review: old v1 receipts remain untouched in unsupported-version recovery', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p); await issue7Confirm(p, 'Help');
    const old = await issue7Saved(p);
    old.version = 'issue-7-receipt-v1'; delete old.coverage; delete old.assessmentScope;
    const bytes = JSON.stringify(old);
    await p.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: issue7ReceiptKey, bytes });
    await p.reload();
    await expectText(p, '#receipt-status', 'Stored receipt could not be recovered');
    assert.equal(await p.locator('#decision-summary').innerText(), '');
    assert.equal(await issue7Bytes(p), bytes);
    await p.locator('#reset-demo').click(); await p.locator('#cancel-reset').click();
    assert.equal(await issue7Bytes(p), bytes);
  } finally { await context.close(); }
});

test('issue 7 review: missing or contradictory coverage and assessment metadata cannot invent complete history', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p); await issue7Confirm(p, 'Keep');
    const saved = await issue7Saved(p);
    for (const mutate of [v => { delete v.coverage; }, v => { delete v.coverage.hasContinuation; }, v => { v.coverage = { status: 'complete', complete: true, hasContinuation: true }; }, v => { v.assessmentScope.scope = 'items-reconciled'; }]) {
      const value = structuredClone(saved); mutate(value);
      const bytes = JSON.stringify(value);
      await p.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: issue7ReceiptKey, bytes });
      await p.reload();
      await expectText(p, '#receipt-status', 'Stored receipt could not be recovered');
      assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
      assert.equal(await issue7Bytes(p), bytes);
    }
  } finally { await context.close(); }
});

async function issue7ResetFailure(p, failure) {
  await p.evaluate(({ key, failure }) => {
    const remove = Storage.prototype.removeItem;
    const get = Storage.prototype.getItem;
    window.__resetGate = { fail: true, removed: false, originalGet: () => get.call(localStorage, key) };
    Storage.prototype.removeItem = function(k) {
      if (this === localStorage && k === key && window.__resetGate.fail && failure === 'remove') throw new Error('Injected remove failure');
      const result = remove.call(this, k);
      if (this === localStorage && k === key) window.__resetGate.removed = true;
      return result;
    };
    Storage.prototype.getItem = function(k) {
      if (this === localStorage && k === key && window.__resetGate.fail && window.__resetGate.removed && failure === 'verify') throw new Error('Injected verification failure');
      return get.call(this, k);
    };
  }, { key: issue7ReceiptKey, failure });
  await p.locator('#reset-demo').click(); await p.locator('#confirm-reset').click();
}

test('issue 7 review: removeItem throwing before deletion preserves verified receipt and session', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p); await issue7Confirm(p, 'Keep');
    const saved = await issue7Saved(p); const bytes = await issue7Bytes(p);
    await p.locator('#api-key').fill('SENTINEL-REMOVE-FAILURE');
    await issue7ResetFailure(p, 'remove');
    await expectText(p, '#receipt-status', 'could not delete');
    await expectText(p, '#receipt-status', 'receipt is still stored');
    assert.deepEqual(await issue7Saved(p), saved);
    assert.equal(await issue7Bytes(p), bytes);
    assert.equal(await p.locator('#api-key').inputValue(), 'SENTINEL-REMOVE-FAILURE');
    await issue7Screenshot(p, 'reset-remove-failure');
    await p.locator('#cancel-reset').click();
    assert.equal(await p.locator('#reset-demo').evaluate(e => e === document.activeElement), true);
    await p.reload(); assert.deepEqual(await issue7Saved(p), saved);
  } finally { await context.close(); }
});

test('issue 7 review: deletion followed by failed verification never claims retained or Saved history', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p); await issue7Confirm(p, 'Keep');
    await issue7ResetFailure(p, 'verify');
    await expectText(p, '#receipt-status', 'Deletion could not be verified');
    await expectText(p, '#receipt-status', 'may already be deleted');
    assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Saved|were kept/);
    assert.equal(await p.evaluate(() => window.__resetGate.originalGet()), null);
    assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
    assert.equal(await p.locator('#decision-summary').innerText(), '');
    assert.equal(await p.locator('#confirm-intent').isVisible(), false);
    await issue7Screenshot(p, 'reset-verification-failure');
    await p.locator('#cancel-reset').click();
    await p.locator('#decision-return-to-list').click();
    await p.locator('#reopen-receipt').click();
    await expectText(p, '#receipt-status', 'Deletion could not be verified');
    await p.reload();
    assert.equal(await p.locator('#screen-list').isVisible(), true);
    assert.equal(await issue7Bytes(p), null);
  } finally { await context.close(); }
});

test('issue 7 review: cancelling reset is non-destructive and returns focus to Reset demo', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await issue7Decision(p); await issue7Confirm(p, 'Help');
    const saved = await issue7Saved(p); const bytes = await issue7Bytes(p);
    await p.evaluate(() => {
      window.__removeAttempts = 0;
      const remove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function(key) { window.__removeAttempts++; return remove.call(this, key); };
    });
    await p.locator('#api-key').fill('SENTINEL-CANCEL-RESET');
    await p.locator('#reset-demo').click(); await p.locator('#cancel-reset').click();
    assert.equal(await p.evaluate(() => window.__removeAttempts), 0);
    assert.equal(await issue7Bytes(p), bytes);
    assert.deepEqual(await issue7Saved(p), saved);
    assert.equal(await p.locator('#api-key').inputValue(), 'SENTINEL-CANCEL-RESET');
    assert.equal(await p.locator('#reset-demo').evaluate(e => e === document.activeElement), true);
  } finally { await context.close(); }
});

test('issue 7 review: normal reset clears a connected session and receipt across reload', async () => {
  const port = TEST_PORT + 160;
  const calls = [];
  const transport = async (url, options) => {
    calls.push(options);
    return { status: 200, ok: true, headers: { get: () => null }, text: async () => JSON.stringify(String(url).includes("A_BillingDocumentRequest('") ? { d: validRawRecord('RESET7') } : rawOData([validRawRecord('RESET7')])) };
  };
  injectedServers.push(await startInjectedServer(port, transport));
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    await p.goto(`http://127.0.0.1:${port}`);
    await p.locator('#api-key').fill('SENTINEL-RESET-CONNECTED');
    await p.locator('#connect-live').click();
    await p.locator('#records-body tr.selectable').waitFor();
    await issue6RegressionSelect(p, 'RESET7');
    await issue6RegressionReview(p); await p.locator('#continue-decision').click();
    await issue7Confirm(p, 'Keep'); await issue7Saved(p);
    assert.equal(calls.length, 2);
    await p.locator('#reset-demo').click(); await p.locator('#confirm-reset').click();
    assert.equal(await p.evaluate(() => localStorage.length), 0);
    assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
    assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
    assert.equal(await p.locator('#api-key').inputValue(), '');
    assert.equal(await p.locator('#screen-list').isVisible(), true);
    assert.equal(await p.locator('#use-fixture').evaluate(e => e === document.activeElement), true);
    await expectText(p, '#provenance', 'Not connected');
    await expectText(p, '#records-body', 'No records loaded');
    await p.locator('#connect-live').click();
    await expectText(p, '#error', 'Enter an API key');
    assert.equal(calls.length, 2, 'Reset cannot reuse the session key');
    await p.reload({ waitUntil: 'networkidle' });
    assert.equal(await issue7Bytes(p), null);
    assert.equal(await p.locator('#screen-decision').isVisible(), false);
    assert.equal(await p.locator('#screen-list').isVisible(), true);
    assert.equal(calls.length, 2, 'Reload must not reconnect');
  } finally { await context.close(); }
});

for (const failure of ['remove', 'verify']) {
  test(`issue 7 review: ${failure} reset failure has a verified retry recovery`, async () => {
    const context = await browser.newContext(); const p = await context.newPage();
    try {
      await issue7Decision(p); await issue7Confirm(p, 'Later');
      await p.locator('#api-key').fill('SENTINEL-RESET-RETRY');
      await issue7ResetFailure(p, failure);
      await p.evaluate(() => { window.__resetGate.fail = false; });
      await p.locator('#confirm-reset').click();
      assert.equal(await issue7Bytes(p), null);
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#api-key').inputValue(), '');
      assert.equal(await p.evaluate(() => window.__issue7Receipt), undefined);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      assert.equal(await p.locator('#use-fixture').evaluate(e => e === document.activeElement), true);
      await p.reload();
      assert.equal(await issue7Bytes(p), null);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
    } finally { await context.close(); }
  });
}

test('issue 7 review: keyboard Enter confirmation focuses the visible saved heading then Return to list and Reset', async () => {
  const context = await browser.newContext(); const p = await context.newPage();
  try {
    // Entire journey uses Tab, arrow keys and Enter, not scripted focus/click/check.
    await p.goto(BASE_URL);
    const tabTo = async id => {
      for (let i = 0; i < 30; i++) {
        if (await p.evaluate(id => document.activeElement?.id === id, id)) return;
        await p.keyboard.press('Tab');
      }
      assert.fail(`Could not tab to ${id}`);
    };
    await tabTo('use-fixture'); await p.keyboard.press('Enter');
    await p.locator('#records-body tr.selectable').first().waitFor();
    for (let i = 0; i < 20; i++) {
      await p.keyboard.press('Tab');
      if (await p.evaluate(() => document.activeElement.matches('#records-body tr.selectable'))) break;
    }
    assert.equal(await p.evaluate(() => document.activeElement.matches('#records-body tr.selectable')), true);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
    await tabTo('review-cost-evidence'); await p.keyboard.press('Enter');
    await tabTo('continue-decision'); await p.keyboard.press('Enter');
    await p.keyboard.press('Tab'); await p.keyboard.press('Space');
    assert.equal(await p.getByRole('radio', { name: 'Keep', exact: true }).isChecked(), true);
    await tabTo('confirm-intent'); await p.keyboard.press('Enter');
    await issue7Saved(p);
    assert.equal(await p.locator('#decision-title').evaluate(e => e === document.activeElement && e.checkVisibility()), true);
    await p.keyboard.press('Tab');
    assert.equal(await p.locator('#decision-return-to-list').evaluate(e => e === document.activeElement), true);
    await p.keyboard.press('Tab');
    assert.equal(await p.locator('#reset-demo').evaluate(e => e === document.activeElement), true);
  } finally { await context.close(); }
});

test('issue 7 review: connection input and hint remain usable with Reopen visible at 1280, 1366 and 390px', async () => {
  for (const width of [1280, 1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } }); const p = await context.newPage();
    try {
      await issue7Decision(p); await issue7Confirm(p, 'Help');
      assert.equal(await p.locator('#reopen-receipt').isVisible(), true);
      const input = await p.locator('#api-key').boundingBox();
      const hint = await p.locator('.connection-panel .hint').boundingBox();
      console.log(`Connection layout ${width}px: input ${input.width}px; hint ${hint.width}px × ${hint.height}px`);
      assert.ok(input.width >= (width === 390 ? 280 : 340), `${width}px key field squeezed to ${input.width}`);
      assert.ok(hint.width >= (width === 390 ? 280 : 340), `${width}px hint squeezed`);
      assert.ok(hint.height <= 100, `${width}px hint became a tall column`);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const buttons = await p.locator('.connection-grid .actions button:visible').all();
      for (const button of buttons) {
        const box = await button.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width);
      }
      await issue7Screenshot(p, `layout-${width}`);
    } finally { await context.close(); }
  }
});

test('issue 36 review: date wording follows the source, intent help says record, and a second document explains the one-receipt limit', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  const select = async (key) => {
    await p.locator(`#records-body tr[data-key="${key}"]`).click();
    await p.waitForFunction((expected) => {
      const statusText = document.querySelector('#status')?.textContent || '';
      return statusText.includes('Detail loaded') && statusText.includes(expected);
    }, key);
  };
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#more-sources > summary').click();
    await p.locator('#use-synthetic').click();
    await select('SYN-0001');
    assert.match(await p.locator('#detail .detail-main').innerText(), /synthetic processing date, not a payment date/);
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    const syntheticMeta = await p.locator('.amount-hero').innerText();
    assert.match(syntheticMeta, /a synthetic processing date supplied by the demo fixture/);
    assert.doesNotMatch(syntheticMeta, /booked/);
    await p.locator('#back-to-list').click();
    await p.locator('#change-source').click();
    await p.locator('#use-fixture').click();
    await select('9000000001');
    assert.match(await p.locator('#detail .detail-main').innerText(), /date the follow-on billing document is to be processed, not a payment date/);
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    await p.locator('#continue-decision').click();
    await p.locator('#screen-decision').waitFor({ state: 'visible' });
    const intentText = await p.locator('#intent-options').innerText();
    assert.doesNotMatch(intentText, /this bill/);
    assert.match(intentText, /explain this record/);
    await p.locator('input[value="keep"]').check();
    await p.locator('#confirm-intent').click();
    await p.locator('#receipt-success').waitFor({ state: 'visible' });
    assert.equal(await p.locator('#one-receipt-note').isVisible(), true);
    await p.locator('#decision-return-to-list').click();
    await select('9000000002');
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    await p.locator('#continue-decision').click();
    await p.locator('#screen-decision').waitFor({ state: 'visible' });
    assert.equal(await p.locator('#receipt-success').isVisible(), false);
    assert.equal(await p.locator('#one-receipt-note').isVisible(), false);
    assert.match(await p.locator('#decision-restriction').innerText(), /Only one receipt is kept\. Document 9000000001 is already recorded, so document 9000000002 cannot be recorded until you use Reset demo/);
    assert.match(await p.locator('#status').innerText(), /A receipt for document 9000000001 is already saved\. Use Reset demo to record a decision for document 9000000002\./);
    await p.locator('#reset-demo').click();
    await p.locator('#confirm-reset').click();
  } finally { await context.close(); }
});

test('issue 36 review: default UI keeps synthetic under More data sources, labels list columns plainly and shows Disconnect only after a source is chosen', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    assert.deepEqual((await p.locator('#screen-list thead th').allTextContents()).map(text => text.trim()), ['Type', 'Document', 'Date', 'Amount', 'Currency']);
    assert.equal(await p.locator('#more-sources').evaluate(element => element.open), false);
    assert.equal(await p.locator('#use-synthetic').isVisible(), false);
    assert.equal(await p.locator('#disconnect').isVisible(), false);
    await p.locator('#more-sources > summary').focus();
    await p.keyboard.press('Enter');
    assert.equal(await p.locator('#use-synthetic').isVisible(), true);
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement?.id), 'use-synthetic');
    await p.keyboard.press('Enter');
    await p.locator('#records-body tr[data-key="SYN-0001"]').waitFor();
    await p.locator('#change-source').click();
    assert.equal(await p.locator('#disconnect').isVisible(), true);
    await p.locator('#disconnect').focus();
    await p.keyboard.press('Enter');
    await expectText(p, '#status', 'Disconnected');
    assert.equal(await p.locator('#disconnect').isVisible(), false);
    assert.equal(await p.evaluate(() => document.activeElement?.id), 'connect-live');
  } finally { await context.close(); }
});

test('issue 36 review: Check optional items shows pending, failure and recovery next to the button on the default UI', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  let release; const gate = new Promise(resolve => { release = resolve; });
  let failNext = false;
  try {
    await p.route('**/api/billing-requests/9000000001/items**', async (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVER', message: 'The service failed. Try again.' } }) });
      }
      await gate;
      return route.continue();
    });
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr[data-key="9000000001"]').click();
    await p.waitForFunction(() => (document.querySelector('#status')?.textContent || '').includes('Detail loaded'));
    assert.equal(await p.locator('#items-status').isVisible(), false);
    await p.locator('#check-items').click();
    await expectText(p, '#items-status', 'Checking optional items for document 9000000001');
    assert.equal(await p.locator('#items-status').isVisible(), true);
    release();
    await p.waitForFunction(() => (document.querySelector('#items-status')?.textContent || '').includes('Optional items check finished'));
    failNext = true;
    await p.locator('#check-items').click();
    await p.waitForFunction(() => (document.querySelector('#items-status')?.textContent || '').includes('Optional items could not be checked'));
    await p.locator('#read-recovery').waitFor({ state: 'visible' });
    assert.equal(await p.locator('#retry-read').isVisible(), true);
    await p.locator('#retry-read').click();
    await p.waitForFunction(() => (document.querySelector('#items-status')?.textContent || '').includes('Optional items check finished'));
    assert.equal(await p.locator('#read-recovery').isVisible(), false);
  } finally { await context.close(); }
});

// #36 review R40-03: read recovery on the real default UI (no legacy-expanded harness).
function issue36RecoveryTransport(detailStatus) {
  const transport = async (url, options) => {
    const href = String(url);
    transport.calls.push({ url: href, options });
    if (href.includes("A_BillingDocumentRequest('")) {
      const status = detailStatus(options);
      if (status) return { status, ok: false, text: async () => '{}', headers: { get: () => null } };
      return { status: 200, ok: true, text: async () => JSON.stringify({ d: validRawRecord('RECOV001') }), headers: { get: () => null } };
    }
    return { status: 200, ok: true, text: async () => JSON.stringify(rawOData([validRawRecord('RECOV001')])), headers: { get: () => null } };
  };
  transport.calls = [];
  return transport;
}

async function issue36TabTo(p, id, limit = 60) {
  for (let i = 0; i < limit; i++) {
    if (await p.evaluate((target) => document.activeElement?.id === target, id)) return;
    await p.keyboard.press('Tab');
  }
  assert.fail(`Keyboard could not reach ${id}`);
}

const issue36PanelCollapsed = (p) => p.locator('.connection-panel').evaluate((element) => element.classList.contains('is-collapsed'));

test('issue 36 review: a failed read expands the collapsed connection panel and keyboard Retry read recovers on the default UI', async () => {
  const port = TEST_PORT + 90;
  let failDetail = true;
  const transport = issue36RecoveryTransport(() => (failDetail ? 503 : 0));
  injectedServers.push(await startInjectedServer(port, transport));
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    await p.locator('#api-key').fill('SENTINEL-ISSUE36-RETRY');
    await p.locator('#connect-live').click();
    const row = p.locator('#records-body tr[data-key="RECOV001"]');
    await row.waitFor({ state: 'visible' });
    assert.equal(await issue36PanelCollapsed(p), true);
    assert.equal(await p.locator('#api-key').isVisible(), false);
    assert.equal(await p.locator('#read-recovery').isVisible(), false);
    await row.focus();
    await p.keyboard.press('Enter');
    await p.locator('#read-recovery').waitFor({ state: 'visible' });
    assert.equal(await issue36PanelCollapsed(p), false);
    // The failed row keeps keyboard focus while the expanded panel shows the recovery.
    assert.equal(await row.evaluate((element) => element === document.activeElement && element.checkVisibility()), true);
    assert.match(await p.locator('#read-recovery-message').innerText(), /Service failure/);
    assert.equal(await p.locator('#retry-read').isVisible(), true);
    assert.equal(await p.locator('#correct-key').isVisible(), false);
    failDetail = false;
    await issue36TabTo(p, 'retry-read');
    assert.equal(await p.locator('#retry-read').evaluate((element) => element === document.activeElement && element.checkVisibility()), true);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => (document.querySelector('#status')?.textContent || '').includes('Detail loaded for document RECOV001'));
    assert.equal(await p.locator('#review-cost-evidence').evaluate((element) => element === document.activeElement && element.checkVisibility()), true);
    assert.equal(await p.locator('#read-recovery').isVisible(), false);
    assert.equal(await issue36PanelCollapsed(p), true);
    assert.equal(transport.calls.length, 3);
  } finally { await context.close(); }
});

test('issue 36 review: a key failure expands the collapsed connection panel and keyboard Correct key reconnects on the default UI', async () => {
  const port = TEST_PORT + 91;
  const transport = issue36RecoveryTransport((options) => (options.headers.APIKey === 'SENTINEL-ISSUE36-OLD' ? 401 : 0));
  injectedServers.push(await startInjectedServer(port, transport));
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    await p.locator('#api-key').fill('SENTINEL-ISSUE36-OLD');
    await p.locator('#connect-live').click();
    const row = p.locator('#records-body tr[data-key="RECOV001"]');
    await row.waitFor({ state: 'visible' });
    assert.equal(await issue36PanelCollapsed(p), true);
    await row.focus();
    await p.keyboard.press('Enter');
    await p.locator('#read-recovery').waitFor({ state: 'visible' });
    assert.equal(await issue36PanelCollapsed(p), false);
    // The failed row keeps keyboard focus while the expanded panel shows the recovery.
    assert.equal(await row.evaluate((element) => element === document.activeElement && element.checkVisibility()), true);
    assert.match(await p.locator('#read-recovery-message').innerText(), /Authentication \/ key problem/);
    assert.equal(await p.locator('#correct-key').isVisible(), true);
    assert.equal(await p.locator('#retry-read').isVisible(), false);
    assert.equal(await p.locator('#api-key').isVisible(), true);
    assert.equal(await p.locator('#api-key').inputValue(), '');
    await issue36TabTo(p, 'correct-key');
    await p.keyboard.press('Enter');
    assert.equal(await p.locator('#api-key').evaluate((element) => element === document.activeElement && element.checkVisibility()), true);
    await p.keyboard.type('SENTINEL-ISSUE36-NEW');
    await issue36TabTo(p, 'connect-live');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => (document.querySelector('#status')?.textContent || '').includes('Loaded 1 record'));
    await row.waitFor({ state: 'visible' });
    assert.equal(await p.locator('#read-recovery').isVisible(), false);
    assert.equal(await issue36PanelCollapsed(p), true);
    assert.equal(transport.calls.at(-1).options.headers.APIKey, 'SENTINEL-ISSUE36-NEW');
    assert.doesNotMatch(await p.locator('body').innerText(), /SENTINEL/);
  } finally { await context.close(); }
});

// #36 review R40-05: the remaining display paths read Not available and Reset failure uses plain words.
test('issue 36 review: cost evidence shows Not available for missing service, payment and linked-row values while stored values are unchanged', async () => {
  const profile = issue6RegressionProfiles[0];
  const seed = await issue6RegressionSeed(profile);
  const coverage = issue6RegressionCoverage(seed, 'ISSUE36-MISSING-ROW');
  coverage.rows[0].netAmount = null;
  coverage.rows[0].taxAmount = null;
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await issue6RegressionOpen(p, profile);
    await issue6RegressionItems(p, profile, coverage);
    const snapshot = await issue6RegressionReview(p);
    assert.equal(snapshot.servicePeriod, 'Unknown / Not available');
    assert.equal(snapshot.paymentStatus, 'Unknown / Not available');
    assert.equal(snapshot.linkedDetail.rows[0].netAmount, 'Not reported');
    const costTech = p.locator('#screen-cost details.tech-evidence').filter({ has: p.locator('#cost-fields') });
    await costTech.locator('summary').click();
    assert.equal(await p.locator('#cost-fields').isVisible(), true);
    const fields = await p.locator('#cost-fields').innerText();
    assert.match(fields, /Service period: Not available\. Payment status: Not available\./);
    assert.doesNotMatch(fields, /Unknown/);
    const items = await p.locator('#cost-items').innerText();
    assert.match(items, /000010: net Not available, tax Not available, gross 11\.130/);
    assert.doesNotMatch(items, /Not reported/);
  } finally { await context.close(); }
});

test('issue 36 review: a failed Reset of an unreadable saved receipt explains it in plain words and keeps the data', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.evaluate((key) => localStorage.setItem(key, '{not JSON'), issue7ReceiptKey);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await expectText(p, '#receipt-status', 'Stored receipt could not be recovered');
    await issue7ResetFailure(p, 'remove');
    await expectText(p, '#receipt-status', 'Reset could not delete the unreadable saved receipt. It is still stored. Try Confirm reset again.');
    assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Read-back|stored data is still present/);
    assert.equal(await p.evaluate((key) => localStorage.getItem(key), issue7ReceiptKey), '{not JSON');
  } finally { await context.close(); }
});

test('issue 36: connection panel collapses after choosing a source and Change source reopens it by keyboard', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    assert.equal(await p.locator('#api-key').isVisible(), true);
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr.selectable').first().waitFor();
    assert.equal(await p.locator('#api-key').isVisible(), false);
    assert.equal(await p.locator('#connection-summary').isVisible(), true);
    assert.match(await p.locator('#connection-summary').innerText(), /Fixture demonstration/);
    assert.equal(await p.locator('#status').isVisible(), true);
    await p.locator('#change-source').focus();
    await p.keyboard.press('Enter');
    assert.equal(await p.locator('#use-fixture').evaluate((element) => element === document.activeElement), true);
    assert.equal(await p.locator('#api-key').isVisible(), true);
    await p.locator('#disconnect').click();
    assert.equal(await p.locator('#connection-summary').isVisible(), false);
    assert.equal(await p.locator('#api-key').isVisible(), true);
  } finally { await context.close(); }
});

test('issue 36: technical evidence is closed by default and opens by keyboard on each screen', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr[data-key="9000000001"]').click();
    await p.waitForFunction(() => {
      const statusText = document.querySelector('#status')?.textContent || '';
      return statusText.includes('Detail loaded') && statusText.includes('9000000001');
    });
    const detailTech = p.locator('#detail details.tech-evidence');
    assert.equal(await detailTech.evaluate((element) => element.open), false);
    assert.equal(await p.locator('#check-evidence').isVisible(), false);
    await detailTech.locator('summary').focus();
    await p.keyboard.press('Enter');
    assert.equal(await detailTech.evaluate((element) => element.open), true);
    assert.match(await detailTech.innerText(), /API_BILLING_DOCUMENT_REQUEST_SRV/);
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    assert.equal(await p.locator('#cost-limits').isVisible(), false);
    const costTech = p.locator('#screen-cost details.tech-evidence').filter({ has: p.locator('#cost-limits') });
    await costTech.locator('summary').focus();
    await p.keyboard.press(' ');
    assert.equal(await p.locator('#cost-limits').isVisible(), true);
    await p.locator('#continue-decision').click();
    await p.locator('#screen-decision').waitFor({ state: 'visible' });
    const decisionTech = p.locator('#decision-summary details');
    const decisionSummary = decisionTech.locator('summary');
    assert.equal(await decisionTech.evaluate((element) => element.open), false);
    assert.equal(await decisionTech.locator('dl').isVisible(), false);
    // #36 review R40-03: the decision-screen disclosure opens and closes by keyboard.
    await decisionSummary.focus();
    await p.keyboard.press('Enter');
    assert.equal(await decisionTech.evaluate((element) => element.open), true);
    assert.equal(await decisionTech.locator('dl').isVisible(), true);
    assert.match(await decisionTech.innerText(), /These are intentions only/);
    assert.equal(await decisionSummary.evaluate((element) => element === document.activeElement), true);
    await p.keyboard.press('Enter');
    assert.equal(await decisionTech.evaluate((element) => element.open), false);
    assert.equal(await decisionTech.locator('dl').isVisible(), false);
    assert.equal(await decisionSummary.evaluate((element) => element === document.activeElement), true);
  } finally { await context.close(); }
});

test('issue 36: cost amount card shows exact reported amounts without formatting', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr[data-key="9000000001"]').click();
    await p.waitForFunction(() => {
      const statusText = document.querySelector('#status')?.textContent || '';
      return statusText.includes('Detail loaded') && statusText.includes('9000000001');
    });
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    const gross = await p.locator('.amount-gross').innerText();
    assert.match(gross, /287\.500/);
    assert.match(gross, /USD/);
    const parts = await p.locator('.amount-parts').innerText();
    assert.match(parts, /250\.000/);
    assert.match(parts, /37\.500/);
    const summaryText = await p.locator('#cost-summary').innerText();
    assert.doesNotMatch(summaryText, /287\.5(?!00)|287,500|\$/);
    assert.equal(await p.locator('.limits-box').isVisible(), true);
    await p.locator('#back-to-list').click();
    await p.locator('#screen-cost').waitFor({ state: 'hidden' });
    await p.locator('#records-body tr[data-key="9000000002"]').click();
    await p.waitForFunction(() => {
      const statusText = document.querySelector('#status')?.textContent || '';
      return statusText.includes('Detail loaded') && statusText.includes('9000000002');
    });
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    assert.match(await p.locator('#cost-summary').innerText(), /-18\.750/);
  } finally { await context.close(); }
});

test('issue 36: saved confirmation names the intent, document and gross amount', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr[data-key="9000000001"]').click();
    await p.waitForFunction(() => {
      const statusText = document.querySelector('#status')?.textContent || '';
      return statusText.includes('Detail loaded') && statusText.includes('9000000001');
    });
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    await p.locator('#continue-decision').click();
    await p.locator('#screen-decision').waitFor({ state: 'visible' });
    await p.locator('input[value="keep"]').check();
    await p.locator('#confirm-intent').click();
    const success = p.locator('#receipt-success');
    await success.waitFor({ state: 'visible' });
    assert.match(await success.innerText(), /Saved: Keep for billing request 9000000001 \(287\.500 USD\)/);
    assert.equal(await p.locator('#decision-return-to-list').isVisible(), true);
    await p.locator('#reset-demo').click();
    await p.locator('#confirm-reset').click();
  } finally { await context.close(); }
});

test('issue 36: no horizontal page scroll on all three screens at 390px and 1280px', async () => {
  for (const width of [390, 1280]) {
    const context = await rawNewContext({ viewport: { width, height: 900 } }); const p = await context.newPage();
    try {
      await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.waitForFunction(() => {
        const statusText = document.querySelector('#status')?.textContent || '';
        return statusText.includes('Detail loaded') && statusText.includes('9000000001');
      });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `list ${width}`);
      await p.locator('#review-cost-evidence').click();
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `cost ${width}`);
      await p.locator('#continue-decision').click();
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `decision ${width}`);
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
    } finally { await context.close(); }
  }
});

test('issue 36: step indicator, lead text and status follow the current screen', async () => {
  const context = await rawNewContext({ viewport: { width: 1280, height: 900 } }); const p = await context.newPage();
  try {
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr[data-key="9000000001"]').click();
    await p.waitForFunction(() => {
      const statusText = document.querySelector('#status')?.textContent || '';
      return statusText.includes('Detail loaded') && statusText.includes('9000000001');
    });
    assert.match(await p.locator('#steps li[aria-current="step"]').innerText(), /Choose a document/);
    assert.equal(await p.locator('#steps li[aria-current="step"]').count(), 1);
    assert.match(await p.locator('#screen-list .panel-head .hint').innerText(), /Sample data only \(SAP sandbox or offline demo\)/);
    await p.locator('#review-cost-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    assert.match(await p.locator('#steps li[aria-current="step"]').innerText(), /Understand the cost/);
    assert.match(await p.locator('.title-row .lead').innerText(), /Check the amounts/);
    assert.match(await p.locator('.limits-box').innerText(), /This is sample data \(SAP sandbox or offline demo\), not a Spark customer bill\./);
    await p.locator('#continue-decision').click();
    await p.locator('#screen-decision').waitFor({ state: 'visible' });
    assert.match(await p.locator('#steps li[aria-current="step"]').innerText(), /Record your decision/);
    assert.match(await p.locator('#status').innerText(), /Decision step opened for document 9000000001\./);
    await p.locator('#back-to-evidence').click();
    await p.locator('#screen-cost').waitFor({ state: 'visible' });
    assert.match(await p.locator('#status').innerText(), /Cost evidence opened for document 9000000001\./);
    await p.locator('#continue-decision').click();
    await p.locator('#screen-decision').waitFor({ state: 'visible' });
    await p.locator('input[value="keep"]').check();
    await p.locator('#confirm-intent').click();
    await p.locator('#receipt-success').waitFor({ state: 'visible' });
    assert.match(await p.locator('#status').innerText(), /Receipt saved for document 9000000001\./);
    await p.locator('#reset-demo').click();
    await p.locator('#confirm-reset').click();
  } finally { await context.close(); }
});

registerIssue8Tests({ test, browser: () => browser, startInjectedServer, injectedServers, TEST_PORT });
registerIssue9Tests({ test, browser: () => browser, startInjectedServer, injectedServers, TEST_PORT });
registerIssue27Tests({ test, browser: () => browser, startInjectedServer, injectedServers, TEST_PORT });

async function main() {
  let failures = [];
  const selectedTests = tests.filter(({ name }, index) => !process.env.TEST_FILTER || index === 0 || name.includes(process.env.TEST_FILTER));
  try {
    const playwright = await loadPlaywright();
    browser = await playwright.chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}) });
    // #36 legacy-expanded harness: the pre-#36 tests were written for a fully expanded UI.
    // Every context they create opens all <details> and keeps the connection form visible,
    // so their behavioural assertions still run unchanged. #36 tests use rawNewContext.
    rawNewContext = browser.newContext.bind(browser);
    browser.newContext = async (options) => {
      const context = await rawNewContext(options);
      await context.addInitScript(() => {
        const expand = () => {
          for (const details of document.querySelectorAll('details')) details.open = true;
          if (document.head && !document.getElementById('legacy-expanded-harness')) {
            const style = document.createElement('style');
            style.id = 'legacy-expanded-harness';
            style.textContent = '.connection-panel.is-collapsed .connection-grid { display: grid !important; } #connection-summary { display: none !important; }';
            document.head.append(style);
          }
        };
        new MutationObserver(expand).observe(document, { childList: true, subtree: true });
      });
      return context;
    };
    console.log(`Runtime: ${process.version}; browser: Chromium/Chrome ${browser.version()}; Playwright ${process.env.PLAYWRIGHT_MODULE_PATH || 'local dependency'}`);
    for (const { name, fn } of selectedTests) {
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
    console.error(`\n${failures.length} of ${selectedTests.length} tests failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${selectedTests.length} tests passed.`);
  process.exit(0);
}

main();
