// Issue #9 integration regressions: the #7 receipt lifecycle and the #8
// connection/navigation recovery are driven together at the public browser
// boundary. Every scenario starts a loopback server with an injected local
// transport; no SAP credential or external network call is used. Stale
// responses are gated inside the transport (or a page route for fixture data),
// keyboard journeys use only Tab/Shift+Tab/arrow/Enter/Space, and assertions
// read DOM/UI state rather than internal helpers.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const RECEIPT = 'planReviewSnapshot.receipt';
const RECEIPT_FIELDS = ['amounts', 'assessmentScope', 'assessmentStatus', 'confirmedAt', 'context', 'coverage', 'date', 'document', 'intent', 'materialInconsistency', 'missing', 'reasons', 'receiptId', 'reviewId', 'version'];
const KEY = 'SENTINEL-ISSUE9';
const rawRecord = (key, currency = 'USD', amount = '250.000') => ({
  BillingDocumentRequest: key, BillingDocumentDate: '/Date(1728950400000)/',
  TotalNetAmount: amount, TotalTaxAmount: '0.001', TotalGrossAmount: amount,
  TransactionCurrency: currency, PayerParty: null, ContractAccount: null
});
const envelope = (rows, next) => ({ d: { results: rows, ...(next === undefined ? {} : { __next: next }) } });
const response = (body, status = 200, retryAfter = null) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: name => name.toLowerCase() === 'retry-after' ? retryAfter : null },
  text: async () => typeof body === 'string' ? body : JSON.stringify(body)
});
const gate = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };

export function registerIssue9Tests({ test, browser, startInjectedServer, injectedServers, TEST_PORT }) {
  // +500 avoids both the offsets used by the inherited suite and Chromium's
  // blocked-port list (6697 etc.), which ERR_UNSAFE_PORT rejects for navigations.
  let port = TEST_PORT + 500;
  async function scenario(handler, run, viewport = { width: 1366, height: 844 }) {
    const calls = [];
    const transport = async (url, options) => {
      const call = { url: new URL(url), options };
      calls.push(call);
      return handler(call, calls.length);
    };
    const currentPort = port++;
    injectedServers.push(await startInjectedServer(currentPort, transport));
    const base = `http://127.0.0.1:${currentPort}`;
    const context = await browser().newContext({ viewport });
    const p = await context.newPage();
    try { await p.goto(base); await run({ p, context, calls, base }); }
    finally { await context.close(); }
  }
  const text = async (p, selector, pattern) => assert.match(await p.locator(selector).innerText(), pattern);
  const outline = (p, selector) => p.locator(selector).evaluate(element => {
    const style = getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  async function connect(p, key = KEY) { await p.locator('#api-key').fill(key); await p.locator('#connect-live').click(); }
  async function row(p, key) { await p.locator(`#records-body tr[data-key="${key}"]`).waitFor({ state: 'visible' }); }
  async function select(p, key) {
    await p.locator(`#records-body tr[data-key="${key}"]`).click();
    await p.waitForFunction(key => document.querySelector('#status').textContent.includes(`Detail loaded for document ${key}`), key);
  }
  async function review(p) { await p.locator('#review-cost-evidence').click(); await p.locator('#screen-cost').waitFor({ state: 'visible' }); }
  async function recovered(p, pattern) {
    await p.locator('#read-recovery').waitFor({ state: 'visible' });
    await text(p, '#read-recovery-message', pattern);
  }
  async function storageState(p) {
    return p.evaluate(() => ({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage).sort() }));
  }
  async function expectNoStorage(p) { assert.deepEqual(await storageState(p), { local: [], session: [] }); }
  async function expectOnlyReceipt(p) { assert.deepEqual(await storageState(p), { local: [RECEIPT], session: [] }); }
  async function receiptBytes(p) { return p.evaluate(key => localStorage.getItem(key), RECEIPT); }
  async function visibleScreens(p) {
    return p.evaluate(() => [...document.querySelectorAll('section.screen')].filter(node => !node.hidden).map(node => node.id));
  }
  async function saveFixture(p) {
    await p.locator('#use-fixture').click(); await row(p, '9000000001');
    await select(p, '9000000001'); await review(p);
    await p.locator('#continue-decision').click();
    await p.getByRole('radio', { name: 'Later', exact: true }).check();
    await p.locator('#confirm-intent').click();
    await text(p, '#receipt-status', /Saved/);
    return receiptBytes(p);
  }
  // One state can be captured at several widths from a single scenario: the
  // viewport is resized in place, the reflow is allowed to settle, and the
  // default 1366x844 viewport is restored before the journey continues.
  async function screenshot(p, state, widths = [1366]) {
    if (process.env.CAPTURE_ISSUE9_SCREENSHOTS !== '1') return;
    for (const width of widths) {
      await p.setViewportSize({ width, height: 844 });
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await p.screenshot({ path: fileURLToPath(new URL(`../../docs/validation/issue-9-${state}-${width}.png`, import.meta.url)), fullPage: true });
    }
    await p.setViewportSize({ width: 1366, height: 844 });
  }
  async function tabTo(p, id, limit = 60) {
    for (let i = 0; i < limit; i++) {
      if (await p.evaluate(id => document.activeElement?.id === id, id)) return;
      await p.keyboard.press('Tab');
    }
    assert.fail(`Keyboard could not reach ${id}`);
  }
  async function tabToRow(p, key, limit = 40) {
    for (let i = 0; i < limit; i++) {
      if (await p.evaluate(key => document.activeElement?.matches(`#records-body tr[data-key="${key}"].selectable`), key)) return;
      await p.keyboard.press('Tab');
    }
    assert.fail(`Keyboard could not reach row ${key}`);
  }
  async function pressRow(p, key) {
    await tabToRow(p, key); await p.keyboard.press('Enter');
    await p.waitForFunction(key => document.querySelector('#status').textContent.includes(`Detail loaded for document ${key}`), key);
  }
  async function keyboardConnect(p, key = KEY) {
    await tabTo(p, 'api-key');
    await p.keyboard.type(key);
    await tabTo(p, 'connect-live');
    await p.keyboard.press('Enter');
  }
  function safeCalls(calls) {
    for (const { url, options } of calls) {
      assert.equal(url.origin, 'https://sandbox.api.sap.com');
      assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual');
      assert.equal(url.href.includes('SENTINEL'), false);
    }
  }

  test('issue 9 K01: keyboard-only connect, review, decision, receipt and reset across all three screens', async () => {
    await scenario(() => { assert.fail('A fixture journey sent an upstream request'); }, async ({ p, calls }) => {
      // Screen 1: Tab reaches the labelled source button and Enter loads fixtures.
      await tabTo(p, 'use-fixture');
      await screenshot(p, 'keyboard-connect', [1280, 1366, 390]);
      await p.keyboard.press('Enter');
      await row(p, '9000000001');
      // The activated button disables itself while loading; focus settles on the
      // list heading instead of being lost to <body>.
      assert.equal(await p.locator('#records-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      await screenshot(p, 'keyboard-list', [1280, 1366, 390]);
      // Screen 2: arrow/Tab navigation selects the row, loads detail and reviews cost.
      await pressRow(p, '9000000001');
      assert.equal(await p.locator('#records-body tr.selected').evaluate(element => element === document.activeElement), true);
      await tabTo(p, 'review-cost-evidence'); await p.keyboard.press('Enter');
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#back-to-list').evaluate(element => element === document.activeElement), true);
      await text(p, '#cost-amounts', /250\.000/);
      assert.deepEqual(await visibleScreens(p), ['screen-cost']);
      await screenshot(p, 'keyboard-cost', [1280, 1366, 390]);
      // Screen 3: the heading is focused; the radio group is entered with one Tab.
      await tabTo(p, 'continue-decision'); await p.keyboard.press('Enter');
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#decision-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      await p.keyboard.press('Tab');
      assert.equal(await p.evaluate(() => document.activeElement?.matches('input[name="intent"]')), true);
      await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
      assert.equal(await p.getByRole('radio', { name: 'Help', exact: true }).isChecked(), true);
      await text(p, '#decision-choice', /Chosen intent: Help/);
      await screenshot(p, 'keyboard-decision', [1280, 1366, 390]);
      await tabTo(p, 'confirm-intent'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.querySelector('#receipt-status').textContent.includes('Saved'));
      assert.equal(await p.locator('#decision-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      await text(p, '#receipt-status', /read-back verified/);
      await expectOnlyReceipt(p);
      await screenshot(p, 'keyboard-receipt', [1280, 1366, 390]);
      // Reset stays deliberate from the keyboard: cancel keeps history, confirm clears it.
      await tabTo(p, 'reset-demo'); await p.keyboard.press('Enter');
      assert.equal(await p.locator('#confirm-reset').evaluate(element => element === document.activeElement), true);
      await tabTo(p, 'cancel-reset'); await p.keyboard.press('Enter');
      assert.equal(await p.locator('#reset-demo').evaluate(element => element === document.activeElement), true);
      assert.ok(await receiptBytes(p));
      await p.keyboard.press('Enter');
      await tabTo(p, 'confirm-reset'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => !localStorage.getItem('planReviewSnapshot.receipt'));
      assert.equal(await p.locator('#use-fixture').evaluate(element => element === document.activeElement), true);
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      assert.equal(await p.locator('#api-key').inputValue(), '');
      await expectNoStorage(p);
      assert.equal(calls.length, 0);
    });
  });

  test('issue 9 K02: keyboard live read failure announces loading/error, focuses recovery and retries into the flow', async () => {
    let fail = true;
    const pending = gate();
    await scenario(async () => {
      if (fail) { await pending.promise; return response({}, 503); }
      return response(envelope([rawRecord('KBGOOD')]));
    }, async ({ p, calls }) => {
      try {
        // Rework: the missing-key error path is keyboard-only and must focus the
        // labelled input, show the alert, and make no request or storage write.
        await tabTo(p, 'connect-live'); await p.keyboard.press('Enter');
        assert.equal(await p.locator('#api-key').evaluate(element => element === document.activeElement), true);
        await p.locator('#error').waitFor({ state: 'visible' });
        await text(p, '#error', /Enter an API key/);
        assert.equal(calls.length, 0);
        await expectNoStorage(p);
        await keyboardConnect(p);
        // Loading state is announced before the gated response resolves.
        await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Connecting to the allowlisted live SAP sandbox'));
        await text(p, '#list-meta', /Loading page 1/);
        pending.release();
        await recovered(p, /Service failure/);
        assert.equal(await p.locator('#read-recovery-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
        await text(p, '#status', /Connection failed/);
        assert.equal(await p.locator('#error').getAttribute('role'), 'alert');
        await screenshot(p, 'keyboard-live-recovery');
        fail = false;
        await tabTo(p, 'retry-read'); await p.keyboard.press('Enter');
        await row(p, 'KBGOOD');
        assert.equal(await p.locator('#records-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
        await text(p, '#status', /Loaded 1 record/);
        assert.equal(calls.length, 2);
        safeCalls(calls);
        await expectNoStorage(p);
      } finally { pending.release(); }
    });
  });

  test('issue 9 K03: keyboard detail failure keeps the row, recovery Retry read restores focus to cost entry', async () => {
    let fail = true;
    await scenario(({ url }) => {
      if (url.pathname.includes("A_BillingDocumentRequest('")) {
        if (fail) { fail = false; return response({}, 503); }
        return response({ d: rawRecord('DBLGOOD', 'EUR', '-18.750') });
      }
      return response(envelope([rawRecord('DBLGOOD', 'EUR', '-18.750')]));
    }, async ({ p, calls }) => {
      await connect(p); await row(p, 'DBLGOOD');
      await tabToRow(p, 'DBLGOOD'); await p.keyboard.press('Enter');
      await recovered(p, /Service failure/);
      // The failed row keeps focus (Enter retries it) and the alert carries the error.
      assert.equal(await p.locator('#records-body tr[data-key="DBLGOOD"]').evaluate(element => element === document.activeElement), true);
      await p.locator('#error').waitFor({ state: 'visible' });
      await text(p, '#error', /Service failure/);
      await text(p, '#status', /Detail request failed/);
      await tabTo(p, 'retry-read'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded for document DBLGOOD'));
      assert.equal(await p.locator('#review-cost-evidence').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      await p.keyboard.press('Enter');
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#back-to-list').evaluate(element => element === document.activeElement), true);
      await text(p, '#cost-summary', /DBLGOOD/);
      await text(p, '#cost-amounts', /-18\.750/);
      await screenshot(p, 'keyboard-detail-retry');
      await p.keyboard.press('Enter');
      assert.equal(await p.locator('#records-body tr.selected').evaluate(element => element === document.activeElement), true);
      assert.equal(calls.length, 3);
      safeCalls(calls);
      await expectNoStorage(p);
    });
  });

  test('issue 9 K04: receipt write failure stays unsaved and keyboard Retry saves the preserved choice', async () => {
    await scenario(() => { assert.fail('A fixture journey sent an upstream request'); }, async ({ p }) => {
      await p.locator('#use-fixture').click(); await row(p, '9000000001');
      await select(p, '9000000001'); await review(p);
      await p.locator('#continue-decision').click();
      await p.evaluate(() => {
        const set = Storage.prototype.setItem;
        window.__issue9Writes = [];
        Storage.prototype.setItem = function (key, value) {
          if (key === 'planReviewSnapshot.receipt') { window.__issue9Writes.push(value); if (window.__issue9Writes.length === 1) throw new Error('Injected write failure'); }
          return set.call(this, key, value);
        };
      });
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await tabTo(p, 'confirm-intent'); await p.keyboard.press('Enter');
      await text(p, '#receipt-status', /Unsaved/);
      assert.equal(await p.locator('#retry-receipt').isVisible(), true);
      await screenshot(p, 'keyboard-save-retry');
      // Retry is the next Tab stop and reuses the preserved choice without a new review.
      await p.keyboard.press('Tab');
      assert.equal(await p.locator('#retry-receipt').evaluate(element => element === document.activeElement), true);
      await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.querySelector('#receipt-status').textContent.includes('Saved'));
      assert.equal(await p.locator('#decision-title').evaluate(element => element === document.activeElement), true);
      const writes = await p.evaluate(() => window.__issue9Writes.map(value => JSON.parse(value)));
      assert.equal(writes.length, 2);
      assert.equal(writes[0].intent, 'later'); assert.equal(writes[1].intent, 'later');
      assert.deepEqual(writes[0], writes[1]);
      await expectOnlyReceipt(p);
    });
  });

  test('issue 9 K05: controls stay labelled, live regions announce, focus stays visible and tabbing cannot trap', async () => {
    await scenario(() => { assert.fail('A fixture enquiry sent an upstream request'); }, async ({ p, calls }) => {
      await p.locator('#use-fixture').click(); await row(p, '9000000001');
      // Every visible button exposes an accessible name.
      const unnamed = [];
      for (const control of await p.locator('button:visible').all()) {
        const name = await control.evaluate(element => (element.getAttribute('aria-label') || element.textContent || '').trim());
        if (!name) unnamed.push(await control.getAttribute('id'));
      }
      assert.deepEqual(unnamed, []);
      assert.equal(await p.evaluate(() => document.querySelector('label[for="api-key"]')?.textContent.trim().length > 0), true);
      assert.equal(await p.locator('#intent-options legend').innerText(), 'Choose an intent');
      const intentLabels = await p.locator('#intent-options label').allInnerTexts();
      for (const name of ['Keep', 'Review options', 'Help', 'Later']) assert.ok(intentLabels.some(label => label.trim() === name));
      // Live regions for status, errors, recovery, cost updates and provenance.
      assert.equal(await p.locator('#status').getAttribute('role'), 'status');
      assert.equal(await p.locator('#status').getAttribute('aria-live'), 'polite');
      assert.equal(await p.locator('#error').getAttribute('role'), 'alert');
      assert.equal(await p.locator('#receipt-status').getAttribute('aria-live'), 'polite');
      assert.equal(await p.locator('#cost-update-status').getAttribute('role'), 'status');
      assert.equal(await p.locator('#cost-update-status').getAttribute('tabindex'), '-1');
      assert.equal(await p.locator('#provenance').getAttribute('aria-live'), 'polite');
      // Both scrollable table regions are named and keyboard reachable.
      assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.table-wrap')].map(wrap => ({ role: wrap.getAttribute('role'), label: wrap.getAttribute('aria-label'), tabindex: wrap.getAttribute('tabindex') }))), [
        { role: 'region', label: 'Loaded billing records table', tabindex: '0' },
        { role: 'region', label: 'Reported document amounts table', tabindex: '0' }
      ]);
      // Keyboard focus is visible on buttons, scroll regions and rows.
      await tabTo(p, 'use-fixture');
      assert.equal(await outline(p, '#use-fixture'), 'solid 3px');
      await p.keyboard.press('Tab'); // use-synthetic
      await p.keyboard.press('Tab'); // disconnect
      await p.keyboard.press('Tab'); // records table region
      assert.equal(await p.evaluate(() => document.activeElement?.classList.contains('table-wrap')), true);
      assert.equal(await outline(p, '#screen-list .table-wrap'), 'solid 3px');
      await tabToRow(p, '9000000001');
      assert.equal(await outline(p, '#records-body tr[data-key="9000000001"]'), 'solid 3px');
      await screenshot(p, 'keyboard-focus-region');
      // Tabbing on each of the three screens: every visible focus stop on the
      // page is reached, no stop repeats in the sequence (no trap) and Shift+Tab
      // reverses a forward step. The expected set is computed from the rendered
      // page in the current screen state: enabled controls with tabindex >= 0,
      // one stop per radio group, hidden screens and hidden controls excluded.
      const focusStops = () => p.evaluate(() => {
        const key = element => element.dataset?.key ? `row:${element.dataset.key}`
          : element.type === 'radio' && element.name ? `radio:${element.name}`
          : element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}:${element.getAttribute('aria-label') || element.textContent.trim()}`;
        const radios = new Set();
        const stops = [];
        for (const element of document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) {
          if (element.disabled || element.tabIndex < 0 || !element.checkVisibility({ visibilityProperty: true })) continue;
          if (element.type === 'radio' && element.name) {
            if (radios.has(element.name)) continue;
            radios.add(element.name);
          }
          const id = key(element);
          if (!stops.includes(id)) stops.push(id);
        }
        return stops;
      });
      const activeStop = () => p.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return 'body';
        return element.dataset?.key ? `row:${element.dataset.key}`
          : element.type === 'radio' && element.name ? `radio:${element.name}`
          : element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}:${element.getAttribute('aria-label') || element.textContent.trim()}`;
      });
      // Chromium moves focus to <body> when Tab passes the last stop instead of
      // wrapping inside the page, so the no-repeat check is scoped to consecutive
      // steps inside the expected set, and the Shift+Tab reversal is checked only
      // between two stops that are both inside the expected set.
      const checkTabbing = async label => {
        const expected = await focusStops();
        assert.ok(expected.length >= 2, `${label}: expected several focus stops, found ${expected.length}`);
        console.log(`K05 ${label}: ${expected.length} focus stops`);
        const visited = new Set();
        const sequence = [];
        for (let i = 0; i < expected.length + 3; i++) {
          await p.keyboard.press('Tab');
          const stop = await activeStop();
          sequence.push(stop);
          if (expected.includes(stop)) visited.add(stop);
        }
        assert.deepEqual([...visited].sort(), [...expected].sort(), `${label}: not every focus stop was reached`);
        const inSet = sequence.filter(stop => expected.includes(stop));
        for (let i = 1; i < inSet.length; i++) {
          assert.notEqual(inSet[i], inSet[i - 1], `${label}: focus repeated on ${inSet[i]}`);
        }
        let previous = await activeStop();
        for (let i = 0; i < expected.length + 3; i++) {
          await p.keyboard.press('Tab');
          const current = await activeStop();
          if (expected.includes(previous) && expected.includes(current) && previous !== current) {
            await p.keyboard.press('Shift+Tab');
            assert.equal(await activeStop(), previous, `${label}: Shift+Tab from ${current} did not return to ${previous}`);
            await p.keyboard.press('Tab');
            assert.equal(await activeStop(), current, `${label}: Tab after Shift+Tab did not return to ${current}`);
          }
          previous = await activeStop();
        }
      };
      await checkTabbing('list screen');
      await pressRow(p, '9000000001');
      await tabTo(p, 'review-cost-evidence'); await p.keyboard.press('Enter');
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      await checkTabbing('cost screen');
      await tabTo(p, 'continue-decision'); await p.keyboard.press('Enter');
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      await checkTabbing('decision screen');
      assert.equal(calls.length, 0);
    });
  });

  test('issue 9 K06: direct reload and optional-item keyboard actions restore outcome focus without stealing moved focus', async () => {
    for (const action of ['reload-detail', 'check-items']) {
      for (const outcome of ['success', 'failure', 'moved']) {
        await scenario(() => { assert.fail('A fixture action sent an upstream request'); }, async ({ p }) => {
          await p.locator('#use-fixture').click(); await row(p, '9000000001');
          await select(p, '9000000001');
          const pathname = '/api/billing-requests/9000000001' + (action === 'check-items' ? '/items' : '');
          const held = gate(), release = gate();
          await p.route(url => url.pathname === pathname, async route => {
            held.release(); await release.promise;
            if (outcome === 'failure') await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: { code: 'CONTRACT', message: 'Injected direct keyboard read failure.' } }) });
            else await route.continue();
          });
          try {
            await tabTo(p, action);
            assert.equal(await p.evaluate(id => document.activeElement.id === id, action), true);
            const arrived = p.waitForResponse(r => new URL(r.url()).pathname === pathname);
            await p.keyboard.press('Enter'); await held.promise;
            if (outcome === 'moved') await tabTo(p, 'api-key');
            release.release(); await (await arrived).finished();
            if (outcome === 'failure') await p.locator('#read-recovery').waitFor({ state: 'visible' });
            else await p.waitForFunction(kind => document.querySelector('#status').textContent.includes(kind === 'reload-detail' ? 'Detail loaded' : 'Optional item coverage:'), action);
            const expected = outcome === 'moved' ? 'api-key' : (outcome === 'failure' ? 'read-recovery-title' : 'review-cost-evidence');
            assert.equal(await p.evaluate(() => document.activeElement.id), expected, `${action}/${outcome}`);
            assert.equal(await p.locator('#' + expected).isVisible(), true);
            await expectNoStorage(p);
          } finally { release.release(); }
        });
      }
    }
  });

  test('issue 9 S01: a stale live list response cannot replace a newer source selection', async () => {
    const pending = gate();
    await scenario(async ({ options }) => {
      if (options.headers.APIKey === KEY) { await pending.promise; return response(envelope([rawRecord('STALELIST', 'EUR', '-1.000')])); }
      return response(envelope([rawRecord('OTHER9')]));
    }, async ({ p, calls }) => {
      try {
        await connect(p);
        const arrived = p.waitForResponse(r => new URL(r.url()).searchParams.get('mode') === 'live' && r.request().headers()['x-sap-apikey'] === KEY);
        await p.locator('#use-synthetic').click(); await row(p, 'SYN-0001');
        pending.release(); await (await arrived).finished();
        assert.equal(await p.locator('#records-body tr[data-key="STALELIST"]').count(), 0);
        assert.equal(await p.locator('#records-body tr[data-key="SYN-0001"]').count(), 1);
        await text(p, '#provenance', /Synthetic fixture/);
        await text(p, '#list-meta', /Page 1/);
        assert.deepEqual(await visibleScreens(p), ['screen-list']);
        assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
        await expectNoStorage(p);
        assert.equal(calls.length, 1);
        safeCalls(calls);
        await screenshot(p, 'stale-source-cleared', [1366, 390]);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S02: a stale response from a superseded key cannot restore old rows or credential state', async () => {
    const pending = gate();
    await scenario(async ({ options }) => {
      if (options.headers.APIKey === 'SENTINEL-OLD9') { await pending.promise; return response(envelope([rawRecord('OLDROWS', 'EUR', '-5.000')])); }
      return response(envelope([rawRecord('NEWROWS')]));
    }, async ({ p, calls }) => {
      try {
        await connect(p, 'SENTINEL-OLD9');
        const arrived = p.waitForResponse(r => r.request().headers()['x-sap-apikey'] === 'SENTINEL-OLD9');
        await connect(p, 'SENTINEL-NEW9'); await row(p, 'NEWROWS');
        pending.release(); await (await arrived).finished();
        assert.equal(await p.locator('#records-body tr[data-key="OLDROWS"]').count(), 0);
        assert.equal(await p.locator('#records-body tr[data-key="NEWROWS"]').count(), 1);
        await text(p, '#provenance', /Live SAP sandbox/);
        await text(p, '#status', /Loaded 1 record/);
        assert.equal(await p.locator('#read-recovery').isVisible(), false);
        assert.equal(await p.locator('#api-key').inputValue(), '');
        assert.deepEqual(await visibleScreens(p), ['screen-list']);
        assert.equal(calls.length, 2);
        assert.equal(calls[0].options.headers.APIKey, 'SENTINEL-OLD9');
        assert.equal(calls[1].options.headers.APIKey, 'SENTINEL-NEW9');
        safeCalls(calls);
        await expectNoStorage(p);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S03: a stale response arriving after Disconnect cannot restore rows, provenance or storage', async () => {
    const pending = gate();
    await scenario(async () => { await pending.promise; return response(envelope([rawRecord('AFTERRESET')])); }, async ({ p, calls }) => {
      try {
        await connect(p);
        const arrived = p.waitForResponse(r => new URL(r.url()).pathname === '/api/billing-requests');
        await p.locator('#disconnect').click();
        pending.release(); await (await arrived).finished();
        assert.equal(await p.locator('#records-body tr[data-key="AFTERRESET"]').count(), 0);
        await text(p, '#records-body', /No records loaded/);
        await text(p, '#list-meta', /No list request has returned/);
        await text(p, '#provenance', /Not connected/);
        await text(p, '#status', /Disconnected/);
        assert.deepEqual(await visibleScreens(p), ['screen-list']);
        assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
        assert.equal(await p.locator('#api-key').inputValue(), '');
        await expectNoStorage(p);
        assert.equal(calls.length, 1);
        safeCalls(calls);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S04: a stale detail response cannot replace the newer selection or restore a decision', async () => {
    const pending = gate();
    await scenario(async ({ url }) => {
      if (url.pathname.includes("A_BillingDocumentRequest('")) {
        if (url.pathname.includes('PAGE1')) { await pending.promise; return response({ d: rawRecord('PAGE1') }); }
        return response({ d: rawRecord('PAGE2', 'EUR', '-18.750') });
      }
      return response(url.searchParams.has('$skip') ? envelope([rawRecord('PAGE2', 'EUR', '-18.750')]) : envelope([rawRecord('PAGE1')], '?$skip=10'));
    }, async ({ p, calls }) => {
      try {
        await connect(p); await row(p, 'PAGE1');
        const requested = p.waitForRequest(r => new URL(r.url()).pathname === '/api/billing-requests/PAGE1');
        await p.locator('#records-body tr[data-key="PAGE1"]').click();
        await requested;
        const arrived = p.waitForResponse(r => new URL(r.url()).pathname === '/api/billing-requests/PAGE1');
        await p.locator('#next-page').click(); await row(p, 'PAGE2');
        await select(p, 'PAGE2'); await review(p);
        pending.release(); await (await arrived).finished();
        await text(p, '#cost-summary', /PAGE2/);
        assert.doesNotMatch(await p.locator('#cost-summary').innerText(), /PAGE1/);
        await text(p, '#cost-amounts', /-18\.750/);
        assert.doesNotMatch(await p.locator('#cost-amounts').innerText(), /250\.000/);
        const snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
        assert.equal(snapshot.document.key, 'PAGE2');
        assert.doesNotMatch(await p.locator('#detail').innerText(), /PAGE1/);
        // The newer selection still requires a fresh choice, never the superseded flow.
        await p.locator('#continue-decision').click();
        assert.equal(await p.locator('input[name="intent"]:checked').count(), 0);
        assert.equal(await p.locator('#confirm-intent').isDisabled(), true);
        await screenshot(p, 'stale-selection-cleared');
        await expectNoStorage(p);
        assert.equal(calls.length, 4);
        safeCalls(calls);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S05: a stale item response cannot restore old item evidence into a newer selection', async () => {
    const pending = gate();
    await scenario(async ({ url }) => {
      if (url.pathname.endsWith('/items')) {
        await pending.promise;
        return response(envelope([{ BillingDocumentRequest: 'PAGE1', BillingDocumentRequestItem: '000010', NetAmount: '999.999', TaxAmount: '0.000', GrossAmount: '999.999', TransactionCurrency: 'USD' }]));
      }
      if (url.pathname.includes("A_BillingDocumentRequest('")) return response({ d: rawRecord(url.pathname.includes('PAGE2') ? 'PAGE2' : 'PAGE1') });
      return response(url.searchParams.has('$skip') ? envelope([rawRecord('PAGE2', 'EUR', '-18.750')]) : envelope([rawRecord('PAGE1')], '?$skip=10'));
    }, async ({ p, calls }) => {
      try {
        await connect(p); await row(p, 'PAGE1'); await select(p, 'PAGE1');
        const requested = p.waitForRequest(r => new URL(r.url()).pathname === '/api/billing-requests/PAGE1/items');
        await p.locator('#check-items').click(); await requested;
        const arrived = p.waitForResponse(r => new URL(r.url()).pathname === '/api/billing-requests/PAGE1/items');
        await p.locator('#next-page').click(); await row(p, 'PAGE2'); await select(p, 'PAGE2'); await review(p);
        pending.release(); await (await arrived).finished();
        assert.doesNotMatch(await p.locator('#cost-items').innerText(), /999\.999/);
        await text(p, '#cost-fields', /not-checked \(0 rows\)/);
        const snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
        assert.equal(snapshot.document.key, 'PAGE2');
        assert.equal(snapshot.linkedDetail.status, 'not-checked');
        assert.equal(snapshot.linkedDetail.rows.length, 0);
        assert.equal(await p.locator('#continue-decision').isEnabled(), true);
        await expectNoStorage(p);
        safeCalls(calls);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S06: a stale fixture detail cannot bleed into a newer synthetic selection', async () => {
    await scenario(() => { assert.fail('A fixture/synthetic journey sent an upstream request'); }, async ({ p, base, calls }) => {
      const payload = await fetch(`${base}/api/billing-requests/9000000001?mode=fixture&selected=9000000001`).then(r => r.json());
      const pending = gate();
      await p.route(url => url.pathname === '/api/billing-requests/9000000001', async route => {
        await pending.promise;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      });
      try {
        await p.locator('#use-fixture').click(); await row(p, '9000000001');
        const requested = p.waitForRequest(url => new URL(url.url()).pathname === '/api/billing-requests/9000000001');
        await p.locator('#records-body tr[data-key="9000000001"]').click();
        await requested;
        await p.locator('#use-synthetic').click(); await row(p, 'SYN-0001');
        await select(p, 'SYN-0001'); await review(p);
        pending.release();
        // Resource timing is a page-observable marker that the gated response finished.
        await p.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/api/billing-requests/9000000001') && entry.responseEnd > 0));
        await text(p, '#cost-summary', /SYN-0001/);
        await text(p, '#cost-amounts', /10\.000/);
        assert.doesNotMatch(await p.locator('#cost-amounts').innerText(), /250\.000/);
        assert.doesNotMatch(await p.locator('#detail').innerText(), /9000000001/);
        const snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
        assert.equal(snapshot.document.key, 'SYN-0001');
        await expectNoStorage(p);
        assert.equal(calls.length, 0);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S07: a stale live list cannot relabel or rewrite an open historical receipt', async () => {
    const pending = gate();
    await scenario(async ({ options }) => {
      if (options.headers.APIKey === KEY) { await pending.promise; return response(envelope([rawRecord('LIVEROW9')])); }
      return response(envelope([]));
    }, async ({ p, calls }) => {
      try {
        const bytes = await saveFixture(p);
        await connect(p);
        const arrived = p.waitForResponse(r => new URL(r.url()).pathname === '/api/billing-requests' && r.request().headers()['x-sap-apikey'] === KEY);
        await p.locator('#reopen-receipt').click();
        await p.locator('#decision-title').waitFor({ state: 'visible' });
        const summary = await p.locator('#decision-summary').innerHTML();
        await text(p, '#provenance', /Fixture demonstration/);
        pending.release(); await (await arrived).finished();
        assert.equal(await p.locator('#decision-title').innerText(), 'Saved receipt (historical)');
        assert.equal(await p.locator('#decision-summary').innerHTML(), summary);
        await text(p, '#provenance', /Fixture demonstration/);
        assert.equal(await receiptBytes(p), bytes);
        assert.equal(await p.locator('#confirm-intent').isVisible(), false);
        await screenshot(p, 'historical-receipt-kept', [1366, 390]);
        // Returning to the list shows the current live connection without relabelling the receipt.
        await p.locator('#decision-return-to-list').click();
        await text(p, '#provenance', /Live SAP sandbox/);
        assert.equal(await receiptBytes(p), bytes);
        assert.equal(await p.locator('#records-body tr[data-key="LIVEROW9"]').count(), 1);
        await expectOnlyReceipt(p);
        safeCalls(calls);
      } finally { pending.release(); }
    });
  });

  test('issue 9 S08: a stale live list arriving after a confirmed Reset cannot restore rows, provenance, key or storage', async () => {
    const pending = gate();
    await scenario(async ({ options }) => {
      if (options.headers.APIKey === KEY) { await pending.promise; return response(envelope([rawRecord('AFTERRESET9')])); }
      return response(envelope([]));
    }, async ({ p, calls }) => {
      try {
        await saveFixture(p);
        await connect(p);
        const arrived = p.waitForResponse(r => new URL(r.url()).pathname === '/api/billing-requests' && r.request().headers()['x-sap-apikey'] === KEY);
        await p.locator('#reopen-receipt').click();
        await p.locator('#decision-title').waitFor({ state: 'visible' });
        await p.locator('#reset-demo').click();
        await p.locator('#confirm-reset').click();
        await p.waitForFunction(() => !localStorage.getItem('planReviewSnapshot.receipt'));
        pending.release(); await (await arrived).finished();
        assert.equal(await p.locator('#records-body tr[data-key="AFTERRESET9"]').count(), 0);
        await text(p, '#provenance', /Not connected/);
        await text(p, '#records-body', /No records loaded/);
        assert.equal(await p.locator('#api-key').inputValue(), '');
        await expectNoStorage(p);
        assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
        assert.equal(await p.locator('#use-fixture').evaluate(element => element === document.activeElement), true);
        assert.deepEqual(await visibleScreens(p), ['screen-list']);
        assert.equal(calls.length, 1);
        safeCalls(calls);
      } finally { pending.release(); }
    });
  });

  test('issue 9 N01: Back preserves same-evidence context; new page, refresh, selection and source clear it', async () => {
    await scenario(() => { assert.fail('A fixture journey sent an upstream request'); }, async ({ p }) => {
      await p.locator('#use-fixture').click(); await row(p, '9000000001');
      await select(p, '9000000001'); await review(p);
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Keep', exact: true }).check();
      await text(p, '#decision-choice', /Chosen intent: Keep/);
      // Back to cost evidence keeps the same reviewed values and the unconfirmed choice.
      await p.locator('#back-to-evidence').click();
      assert.equal(await p.locator('#continue-decision').evaluate(element => element === document.activeElement), true);
      await text(p, '#cost-amounts', /250\.000/);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot.document.key), '9000000001');
      await p.locator('#continue-decision').click();
      assert.equal(await p.getByRole('radio', { name: 'Keep', exact: true }).isChecked(), true);
      assert.equal(await p.locator('#confirm-intent').isEnabled(), true);
      // A new page and selection clears the pending snapshot and the unconfirmed choice.
      await p.locator('#back-to-evidence').click();
      await p.locator('#back-to-list').click();
      await p.locator('#next-page').click(); await row(p, '9000000003');
      await select(p, '9000000003'); await review(p);
      await p.locator('#continue-decision').click();
      assert.equal(await p.locator('input[name="intent"]:checked').count(), 0);
      assert.equal(await p.locator('#confirm-intent').isDisabled(), true);
      await text(p, '#decision-choice', /Chosen intent: None yet/);
      // Choosing again and then refreshing the detail (Reload detail) clears it too.
      await p.getByRole('radio', { name: 'Help', exact: true }).check();
      await p.locator('#back-to-evidence').click();
      await p.locator('#back-to-list').click();
      await p.locator('#reload-detail').click();
      await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded for document 9000000003'));
      await review(p);
      await p.locator('#continue-decision').click();
      assert.equal(await p.locator('input[name="intent"]:checked').count(), 0);
      assert.equal(await p.locator('#confirm-intent').isDisabled(), true);
      // A source change also clears the pending snapshot and the unconfirmed choice.
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#back-to-evidence').click();
      await p.locator('#use-synthetic').click(); await row(p, 'SYN-0001');
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      await select(p, 'SYN-0001'); await review(p);
      await p.locator('#continue-decision').click();
      assert.equal(await p.locator('input[name="intent"]:checked').count(), 0);
      await text(p, '#decision-choice', /Chosen intent: None yet/);
      await expectNoStorage(p);
    });
  });

  test('issue 9 N02: reload recovers only the stored receipt and Return to list clears the unsaved session', async () => {
    await scenario(() => { assert.fail('A fixture journey sent an upstream request'); }, async ({ p, calls }) => {
      const bytes = await saveFixture(p);
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#decision-title').innerText(), 'Saved receipt (historical)');
      await text(p, '#provenance', /Fixture demonstration/);
      assert.equal(await p.locator('#decision-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      assert.equal(await receiptBytes(p), bytes);
      await expectOnlyReceipt(p);
      // Return to list keeps the receipt but clears the in-memory session.
      await p.locator('#decision-return-to-list').click();
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      await text(p, '#records-body', /No records loaded/);
      await text(p, '#provenance', /Not connected/);
      assert.equal(await p.locator('#use-fixture').evaluate(element => element === document.activeElement), true);
      assert.equal(await receiptBytes(p), bytes);
      // Reloading again still recovers only the receipt, with zero requests.
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await receiptBytes(p), bytes);
      await expectOnlyReceipt(p);
      assert.equal(calls.length, 0);
    });
  });

  test('issue 9 F01: failed Next page navigation recovers by keyboard and completes to a saved receipt', async () => {
    let pageFailed = false;
    await scenario(({ url }) => {
      if (url.pathname.includes("A_BillingDocumentRequest('")) return response({ d: rawRecord(url.pathname.includes('PAGE2') ? 'PAGE2' : 'PAGE1') });
      if (!url.searchParams.has('$skip')) return response(envelope([rawRecord('PAGE1')], '?$skip=10'));
      if (!pageFailed) { pageFailed = true; return response({}, 503); }
      return response(envelope([rawRecord('PAGE2')]));
    }, async ({ p, calls }) => {
      await connect(p); await row(p, 'PAGE1'); await select(p, 'PAGE1'); await review(p);
      await p.locator('#back-to-list').click();
      await tabTo(p, 'next-page'); await p.keyboard.press('Enter');
      await recovered(p, /Service failure/);
      assert.equal(await p.locator('#read-recovery-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      await text(p, '#list-meta', /Page 2 read failed/);
      assert.equal(await p.locator('#records-body tr.selectable').count(), 0);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      await screenshot(p, 'navigation-failure', [1366, 390]);
      await tabTo(p, 'retry-read'); await p.keyboard.press('Enter');
      await row(p, 'PAGE2');
      assert.equal(await p.locator('#records-title').evaluate(element => element === document.activeElement && element.checkVisibility()), true);
      await text(p, '#list-meta', /Page 2/);
      // The recovered page completes the keyboard journey to a receipt.
      await pressRow(p, 'PAGE2');
      await tabTo(p, 'review-cost-evidence'); await p.keyboard.press('Enter');
      await tabTo(p, 'continue-decision'); await p.keyboard.press('Enter');
      await p.keyboard.press('Tab'); await p.keyboard.press('Space');
      assert.equal(await p.getByRole('radio', { name: 'Keep', exact: true }).isChecked(), true);
      await tabTo(p, 'confirm-intent'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.querySelector('#receipt-status').textContent.includes('Saved'));
      await expectOnlyReceipt(p);
      assert.equal(calls.length, 5);
      assert.equal(calls[2].url.searchParams.get('$skip'), '10');
      assert.equal(calls[3].url.searchParams.get('$skip'), '10');
      safeCalls(calls);
    });
  });

  test('issue 9 F02: a failure during navigation with an open historical receipt keeps it and keyboard recovery restores the list', async () => {
    let pageFailed = false;
    await scenario(({ url }) => {
      if (url.pathname.includes("A_BillingDocumentRequest('")) return response({ d: rawRecord('PAGE1') });
      if (!url.searchParams.has('$skip')) return response(envelope([rawRecord('PAGE1')], '?$skip=10'));
      if (!pageFailed) { pageFailed = true; return response({}, 503); }
      return response(envelope([rawRecord('PAGE2')]));
    }, async ({ p, calls }) => {
      const bytes = await saveFixture(p);
      await connect(p); await row(p, 'PAGE1');
      await tabTo(p, 'next-page'); await p.keyboard.press('Enter');
      await recovered(p, /Service failure/);
      assert.equal(await receiptBytes(p), bytes);
      // The stored receipt reopens over the failed navigation without a reconnect.
      await tabTo(p, 'reopen-receipt'); await p.keyboard.press('Enter');
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#decision-title').innerText(), 'Saved receipt (historical)');
      await text(p, '#provenance', /Fixture demonstration/);
      assert.equal(await receiptBytes(p), bytes);
      await screenshot(p, 'history-with-navigation-failure');
      await p.locator('#decision-return-to-list').click();
      assert.equal(await p.locator('#use-fixture').evaluate(element => element === document.activeElement), true);
      // Keyboard Retry read completes the navigation after the receipt detour.
      await tabTo(p, 'retry-read'); await p.keyboard.press('Enter');
      await row(p, 'PAGE2');
      assert.equal(await receiptBytes(p), bytes);
      await expectOnlyReceipt(p);
      assert.equal(calls.length, 3);
      safeCalls(calls);
    });
  });

  test('issue 9 T01: exactly three screens provide one uninterrupted list→cost→decision flow', async () => {
    await scenario(() => { assert.fail('A fixture journey sent an upstream request'); }, async ({ p }) => {
      assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('section.screen')].map(node => node.id)), ['screen-list', 'screen-cost', 'screen-decision']);
      assert.equal(await p.evaluate(() => document.querySelectorAll('[id^="screen-"]').length), 3);
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      await p.locator('#use-fixture').click(); await row(p, '9000000001');
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      await select(p, '9000000001');
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      await p.locator('#review-cost-evidence').click();
      assert.deepEqual(await visibleScreens(p), ['screen-cost']);
      await text(p, '#cost-summary', /9000000001/);
      await p.locator('#continue-decision').click();
      assert.deepEqual(await visibleScreens(p), ['screen-decision']);
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.waitForFunction(() => document.querySelector('#receipt-status').textContent.includes('Saved'));
      assert.deepEqual(await visibleScreens(p), ['screen-decision']);
      assert.equal(await p.locator('#decision-title').innerText(), 'Saved receipt (historical)');
      await screenshot(p, 'three-screen-flow', [1366, 390]);
      await p.locator('#decision-return-to-list').click();
      assert.deepEqual(await visibleScreens(p), ['screen-list']);
      assert.equal(await p.locator('#records-body tr.selected').evaluate(element => element === document.activeElement), true);
      assert.equal(await p.evaluate(() => document.querySelectorAll('section.screen').length), 3);
    });
  });

  test('issue 9 T02: after journeys only the minimal receipt with provenance is persisted', async () => {
    await scenario(() => { assert.fail('A fixture journey sent an upstream request'); }, async ({ p }) => {
      await saveFixture(p);
      await expectOnlyReceipt(p);
      const receipt = await p.evaluate(key => JSON.parse(localStorage.getItem(key)), RECEIPT);
      assert.equal(receipt.version, 'issue-7-receipt-v2');
      assert.equal(receipt.document.provenance, 'fixture-demonstration');
      assert.deepEqual(Object.keys(receipt).sort(), RECEIPT_FIELDS);
      assert.doesNotMatch(await receiptBytes(p), /SENTINEL/);
      await p.locator('#reset-demo').click(); await p.locator('#confirm-reset').click();
      await p.waitForFunction(() => !localStorage.getItem('planReviewSnapshot.receipt'));
      await expectNoStorage(p);
    });
    await scenario(async () => response(envelope([rawRecord('LIVEKEY9')])), async ({ p, calls }) => {
      await connect(p, KEY); await row(p, 'LIVEKEY9');
      await select(p, 'LIVEKEY9'); await review(p);
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await text(p, '#receipt-status', /Saved/);
      await expectOnlyReceipt(p);
      const receipt = await p.evaluate(key => JSON.parse(localStorage.getItem(key)), RECEIPT);
      assert.equal(receipt.document.provenance, 'live-sap-sandbox');
      assert.deepEqual(Object.keys(receipt).sort(), RECEIPT_FIELDS);
      assert.doesNotMatch(await receiptBytes(p), /SENTINEL/);
      assert.equal(receipt.document.key, 'LIVEKEY9');
      await p.locator('#reset-demo').click(); await p.locator('#confirm-reset').click();
      await p.waitForFunction(() => !localStorage.getItem('planReviewSnapshot.receipt'));
      await expectNoStorage(p);
      assert.equal(calls.length, 2);
      safeCalls(calls);
    });
  });

  test('issue 9 T03: the synthetic journey with complete item coverage reaches a consistent receipt', async () => {
    await scenario(() => { assert.fail('A synthetic journey sent an upstream request'); }, async ({ p }) => {
      await p.locator('#use-synthetic').click(); await row(p, 'SYN-0001');
      await select(p, 'SYN-0001');
      await p.locator('#check-items').click();
      await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Optional item coverage: complete'));
      await review(p);
      await text(p, '#cost-fields', /complete \(1 rows\)/);
      await text(p, '#cost-consistency', /Synthetic check passed/);
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Keep', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await text(p, '#receipt-status', /Saved/);
      await expectOnlyReceipt(p);
      const receipt = await p.evaluate(key => JSON.parse(localStorage.getItem(key)), RECEIPT);
      assert.deepEqual(Object.keys(receipt).sort(), RECEIPT_FIELDS);
      assert.equal(receipt.document.provenance, 'synthetic-fixture');
      assert.equal(receipt.intent, 'keep');
      assert.equal(receipt.assessmentStatus, 'consistent');
      assert.equal(receipt.coverage.status, 'complete');
      assert.equal(receipt.coverage.complete, true);
      assert.equal(receipt.missing.linkedDetailPresent, true);
    });
  });
}
