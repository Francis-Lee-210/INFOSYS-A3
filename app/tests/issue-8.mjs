import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';

const SAP = 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BILLING_DOCUMENT_REQUEST_SRV';
const COLLECTION = `${SAP}/A_BillingDocumentRequest`;
const RECEIPT = 'planReviewSnapshot.receipt';
const KEY = 'SENTINEL-ISSUE8';
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

export function registerIssue8Tests({ test, browser, startInjectedServer, injectedServers, TEST_PORT }) {
  let port = TEST_PORT + 200;
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
  async function noStorage(p) { assert.deepEqual(await p.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]); }
  function safeCalls(calls) {
    for (const { url, options } of calls) {
      assert.equal(url.origin, 'https://sandbox.api.sap.com');
      assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual');
      assert.equal(url.href.includes('SENTINEL'), false);
      assert.deepEqual(Object.keys(options.headers).sort(), ['APIKey', 'Accept']);
    }
  }
  async function saveFixture(p) {
    await p.locator('#use-fixture').click(); await row(p, '9000000001');
    await select(p, '9000000001'); await review(p);
    await p.locator('#continue-decision').click();
    await p.getByRole('radio', { name: 'Later', exact: true }).check();
    await p.locator('#confirm-intent').click();
    await text(p, '#receipt-status', /Saved/);
    return p.evaluate(key => localStorage.getItem(key), RECEIPT);
  }
  async function screenshot(p, name) {
    if (process.env.CAPTURE_ISSUE8_SCREENSHOTS === '1') await p.screenshot({ path: fileURLToPath(new URL(`../../docs/validation/issue-8-${name}.png`, import.meta.url)), fullPage: true });
  }
  async function tabTo(p, id) {
    for (let i = 0; i < 35; i++) {
      if (await p.evaluate(id => document.activeElement?.id === id, id)) return;
      await p.keyboard.press('Tab');
    }
    assert.fail(`Keyboard could not reach ${id}`);
  }

  test('issue 8 P01: offline fixture replaces the page, preserves exact currencies/decimals, and returns to that page', async () => {
    await scenario(() => { assert.fail('A fixture sent an upstream request'); }, async ({ p, calls }) => {
      await p.locator('#api-key').fill(KEY);
      await p.locator('#use-fixture').click(); await row(p, '9000000001');
      await select(p, '9000000001'); await review(p);
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Keep', exact: true }).check();
      // Page controls belong to Screen 1; Back corrects the unconfirmed review.
      await p.locator('#back-to-evidence').click(); await p.locator('#back-to-list').click();
      await p.locator('#next-page').click(); await row(p, '9000000003');
      await text(p, '#list-meta', /Page 2: 2 loaded.*bounded fixture coverage exhausted/);
      assert.equal(await p.locator('#records-body tr[data-key="9000000001"]').count(), 0);
      assert.equal(await p.locator('#detail-actions').isVisible(), false);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      assert.equal(await p.locator('#decision-title').evaluate(e => e === document.activeElement), false);
      await select(p, '9000000004'); await review(p);
      await text(p, '#cost-amounts', /9007199254740\.993/);
      await text(p, '#cost-fields', /billing request/);
      assert.doesNotMatch(await p.locator('#cost-summary').innerText(), /EUR/);
      await p.locator('#continue-decision').click();
      assert.equal(await p.locator('input[name="intent"]:checked').count(), 0);
      await p.locator('#back-to-evidence').click(); await p.locator('#back-to-list').click();
      await text(p, '#list-meta', /Page 2/);
      assert.equal(await p.locator('#records-body tr.selected').getAttribute('data-key'), '9000000004');
      assert.equal(await p.locator('#records-body tr.selected').evaluate(e => e === document.activeElement), true);
      await p.locator('#restart-list').click(); await row(p, '9000000001');
      await text(p, '#list-meta', /Page 1.*Partial coverage/);
      assert.equal(await p.locator('#api-key').inputValue(), '');
      await noStorage(p); assert.equal(calls.length, 0);
    });
  });

  for (const form of ['absolute', 'service-relative', 'query-relative']) {
    test(`issue 8 P02 ${form}: server continuation reaches a distinct page and matching by-key explanation`, async () => {
      const next = form === 'absolute' ? `${COLLECTION}?$skip=10` : form === 'service-relative' ? 'A_BillingDocumentRequest?$skip=10' : '?$skip=10';
      const second = rawRecord('PAGE2', 'EUR', '-0.100');
      await scenario(({ url }) => url.pathname.includes("A_BillingDocumentRequest('")
        ? response({ d: second })
        : response(url.searchParams.has('$skip') ? envelope([second]) : envelope([rawRecord('PAGE1')], next)), async ({ p, calls }) => {
        await connect(p); await row(p, 'PAGE1');
        await text(p, '#list-meta', /Page 1: 1 loaded.*Partial coverage/);
        await p.locator('#next-page').click(); await row(p, 'PAGE2');
        assert.equal(await p.locator('#records-body tr.selected').count(), 0);
        assert.equal(await p.locator('#records-body tr[data-key="PAGE1"]').count(), 0);
        await text(p, '#list-meta', /Page 2.*Continuation exhausted.*not established/);
        await select(p, 'PAGE2'); await review(p);
        await text(p, '#cost-amounts', /-0\.100/); await text(p, '#cost-summary', /EUR/);
        assert.doesNotMatch(await p.locator('#cost-summary').innerText(), /USD/);
        await text(p, '#cost-fields', /Not a payment or service-coverage date/);
        await p.locator('#back-to-list').click();
        await text(p, '#list-meta', /Page 2/);
        assert.equal(await p.locator('#records-body tr.selected').evaluate(e => e === document.activeElement), true);
        assert.equal(calls.length, 3);
        assert.equal(calls[1].url.searchParams.get('$skip'), '10');
        assert.equal(calls[1].url.searchParams.get('$top'), '10');
        assert.equal(calls[1].url.searchParams.get('$orderby'), 'BillingDocumentRequest');
        assert.equal(calls[1].url.searchParams.get('$select'), calls[0].url.searchParams.get('$select'));
        assert.ok(calls[2].url.pathname.endsWith("A_BillingDocumentRequest('PAGE2')"));
        assert.ok(calls.every(c => c.options.headers.APIKey === KEY));
        safeCalls(calls); await noStorage(p);
      });
    });
  }

  for (const kind of ['initial-exhausted', 'initial-with-next', 'subsequent-exhausted', 'subsequent-with-next']) {
    test(`issue 8 P03 ${kind}: empty pages are not zero spend, preserve receipts, and expose the right next/retry actions`, async () => {
      let retrySuccess = false;
      await scenario(({ url }) => {
        if (retrySuccess) return response(envelope([rawRecord('RECOVERED')]));
        if (kind.startsWith('subsequent') && !url.searchParams.has('$skip')) return response(envelope([rawRecord('PAGE1')], '?$skip=10'));
        return response(envelope([], kind.endsWith('with-next') ? `?$skip=${url.searchParams.has('$skip') ? 20 : 10}` : undefined));
      }, async ({ p, calls }) => {
        const bytes = await saveFixture(p);
        await connect(p);
        if (kind.startsWith('subsequent')) { await row(p, 'PAGE1'); await p.locator('#next-page').click(); }
        await recovered(p, /Empty page.*not zero spending/);
        await text(p, '#records-body', /No records/);
        await text(p, '#list-meta', kind.endsWith('with-next') ? /Partial coverage/ : /Continuation exhausted/);
        assert.equal(await p.locator('#next-page').isEnabled(), kind.endsWith('with-next'));
        assert.equal(await p.locator('#retry-read').isEnabled(), true);
        assert.equal(await p.locator('#restart-list').isEnabled(), true);
        assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
        assert.equal(await p.evaluate(key => localStorage.getItem(key), RECEIPT), bytes);
        if (kind === 'initial-exhausted') {
          await p.locator('#abandon-read').click();
          assert.equal(await p.locator('#api-key').evaluate(e => e === document.activeElement), true);
          assert.equal(await p.evaluate(key => localStorage.getItem(key), RECEIPT), bytes);
          await connect(p); await recovered(p, /Empty page/);
        }
        const before = calls.length;
        retrySuccess = true;
        await p.locator('#retry-read').click(); await row(p, 'RECOVERED');
        assert.equal(calls.length, before + 1);
        assert.equal(calls.at(-1).url.searchParams.get('$skip'), kind.startsWith('subsequent') ? '10' : null);
        assert.equal(await p.evaluate(key => localStorage.getItem(key), RECEIPT), bytes);
        await p.locator('#disconnect').click();
        assert.equal(await p.evaluate(key => localStorage.getItem(key), RECEIPT), bytes);
        safeCalls(calls);
      });
    });
  }

  test('issue 8 P04: empty page with continuation can navigate forward rather than declaring completeness', async () => {
    await scenario(({ url }) => response(url.searchParams.has('$skip') ? envelope([rawRecord('AFTEREMPTY')]) : envelope([], '?$skip=10')), async ({ p, calls }) => {
      await connect(p); await recovered(p, /Empty page/);
      await p.locator('#next-page').click(); await row(p, 'AFTEREMPTY');
      await text(p, '#list-meta', /Page 2/); assert.equal(calls.length, 2);
      await noStorage(p);
    });
  });

  test('issue 8 P05: rejected server continuation is a recoverable navigation failure, not completeness', async () => {
    let bad = true;
    await scenario(() => response(envelope([rawRecord('VALIDHDR')], bad ? 'https://foreign.invalid/steal' : '?$skip=10')), async ({ p, calls }) => {
      await connect(p); await row(p, 'VALIDHDR'); await recovered(p, /Navigation stopped.*not proof of completeness/);
      await text(p, '#list-meta', /Continuation rejected/);
      assert.equal(await p.locator('#next-page').isDisabled(), true);
      assert.equal(calls.length, 1);
      bad = false; await p.locator('#retry-read').click(); await p.waitForFunction(() => !document.querySelector('#next-page').disabled);
      assert.equal(calls.length, 2); assert.equal(calls[1].url.searchParams.has('$skip'), false);
      safeCalls(calls); await noStorage(p);
    });
  });

  test('issue 8 P06: repeated/cyclic canonical continuations and the traversal bound cannot create uncontrolled requests', async () => {
    for (const cycle of ['repeat', 'initial', 'limit']) {
      await scenario(({ url }) => {
        const offset = Number(url.searchParams.get('$skip') || 0);
        const next = cycle === 'repeat' && offset ? offset : cycle === 'initial' && offset ? 0 : offset + 10;
        return response(envelope([rawRecord(`P${offset}`)], `?$skip=${next}`));
      }, async ({ p, calls }) => {
        await connect(p); await row(p, 'P0');
        const pages = cycle === 'limit' ? 20 : 2;
        for (let n = 1; n < pages; n++) { await p.locator('#next-page').click(); await row(p, `P${n * 10}`); }
        await recovered(p, /rejected or repeated|20-page/);
        assert.equal(await p.locator('#next-page').isDisabled(), true);
        await p.locator('#next-page').evaluate(e => { e.click(); e.click(); });
        assert.equal(calls.length, pages);
        assert.equal(await p.locator('#records-body tr.selectable').count(), 1);
        await p.locator('#restart-list').click(); await row(p, 'P0');
        assert.equal(calls.length, pages + 1);
        assert.equal(await p.locator('#next-page').isEnabled(), true);
        await noStorage(p);
      });
    }
  });

  test('issue 8 S01: HTTP continuation allowlist refuses unsafe, malformed and ambiguous destinations with zero upstream calls', async () => {
    const unsafe = [
      'http://sandbox.api.sap.com', 'https://foreign.invalid', 'https://sandbox.api.sap.com:444',
      `${SAP}/A_OtherEntity?$skip=10`, `${COLLECTION}/to_Item?$skip=10`, `${COLLECTION}/?$skip=10`,
      `https://user:pass@sandbox.api.sap.com${new URL(COLLECTION).pathname}?$skip=10`,
      `https://@sandbox.api.sap.com${new URL(COLLECTION).pathname}?$skip=10`,
      `${COLLECTION}?$skip=10#fragment`, `${COLLECTION}?$skip=10#`, ` ${COLLECTION}?$skip=10`,
      `${SAP}/x/../A_BillingDocumentRequest?$skip=10`, `${SAP}/%2e/A_BillingDocumentRequest?$skip=10`,
      '//sandbox.api.sap.com/path?$skip=10', '?$skip=10&$skip=20', '?$skip=10&%24skip=20',
      '?$skip=-1', '?$skip=1.5', '?$skip=1e2', '?$skip=1000001', '?$skip=0010', '?$skip=%xx',
      '?$skip=10&$top=11', '?$skip=10&$top=0', '?$skip=10&$format=xml', '?$skip=10&$orderby=BillingDocumentRequest%20desc',
      '?$skip=10&$filter=TotalNetAmount%20gt%200', '?$skip=10&$expand=to_Item', '?$skip=10&$inlinecount=allpages',
      '?$skiptoken=opaque', '?skiptoken=opaque', '?$select=BillingDocumentRequest&$skip=10',
      '?$skip=10&APIKey=SENTINEL-UNSAFE-QUERY', '', 'not-a-url', '?$skip=10&$format=json&$format=json'
    ];
    await scenario(() => { assert.fail('Unsafe continuation reached upstream'); }, async ({ base, calls }) => {
      for (const link of unsafe) {
        const url = new URL('/api/billing-requests?mode=live', base); url.searchParams.set('continuation', link);
        const result = await fetch(url, { headers: { 'X-SAP-APIKey': KEY } });
        const json = await result.json();
        assert.equal(result.status, 400, link); assert.equal(json.error.code, 'DESTINATION', link);
        assert.doesNotMatch(JSON.stringify(json), /SENTINEL|foreign\.invalid|user:pass/);
        assert.equal(calls.length, 0, link);
      }
      for (const suffix of ['continuation=a&continuation=b', 'mode=live&mode=fixture']) {
        assert.equal((await fetch(`${base}/api/billing-requests?${suffix}`, { headers: { 'X-SAP-APIKey': KEY } })).status, 400);
      }
      assert.equal(calls.length, 0);
    });
  });

  test('issue 8 S02: supported continuation parameters share the transport contract and response/page bounds', async () => {
    let oversized = false;
    await scenario(() => response(envelope(Array.from({ length: oversized ? 11 : 1 }, (_, n) => rawRecord(`GOOD${n}`)))), async ({ base, calls }) => {
      for (const link of [`${COLLECTION}?$skip=10&$top=10&$format=json`, '?$skip=20&$top=1', `${new URL(COLLECTION).pathname}?$skip=30`]) {
        const url = new URL('/api/billing-requests?mode=live', base); url.searchParams.set('continuation', link);
        const result = await fetch(url, { headers: { 'X-SAP-APIKey': KEY } });
        assert.equal(result.ok, true); const json = await result.json();
        assert.equal(json.records[0].amounts.net, '250.000');
      }
      assert.equal(calls.length, 3);
      assert.equal(calls[1].url.searchParams.get('$top'), '1');
      oversized = true;
      const result = await fetch(`${base}/api/billing-requests?mode=live`, { headers: { 'X-SAP-APIKey': KEY } });
      assert.equal(result.status, 422); assert.equal((await result.json()).error.code, 'CONTRACT');
      safeCalls(calls);
    });
  });

  test('issue 8 S03: redirects never make a second credential-bearing request and can be explicitly retried', async () => {
    for (const status of [301, 302, 307, 308]) {
      let redirect = true;
      await scenario(() => redirect ? { ...response('', status), headers: { get: () => 'https://foreign.invalid/do-not-follow' } } : response(envelope([rawRecord('REDIRGOOD')])), async ({ p, calls }) => {
        await connect(p); await recovered(p, /Redirect refused/);
        assert.equal(calls.length, 1); assert.equal(calls[0].options.redirect, 'manual');
        assert.doesNotMatch(await p.locator('body').innerText(), /foreign\.invalid|SENTINEL/);
        redirect = false; await p.locator('#retry-read').click(); await row(p, 'REDIRGOOD');
        assert.equal(calls.length, 2); safeCalls(calls);
      });
    }
  });

  test('issue 8 S08: loopback Host/Origin, GET-only and fixed static-file boundaries remain enforced', async () => {
    await scenario(() => { assert.fail('Rejected local request reached upstream'); }, async ({ base, calls }) => {
      for (const headers of [{ Host: 'foreign.invalid' }, { Origin: 'https://foreign.invalid' }]) {
        // Fetch may normalise a forbidden Host header; raw HTTP keeps this test
        // at the actual boundary while its socket still targets loopback only.
        const result = await new Promise((resolve, reject) => {
          const req = httpRequest(`${base}/api/billing-requests?mode=live`, { headers: { ...headers, 'X-SAP-APIKey': KEY } }, res => {
            res.resume(); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
          });
          req.on('error', reject); req.end();
        });
        assert.equal(result.status, 403);
        assert.equal(result.headers['access-control-allow-origin'], undefined);
      }
      for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await fetch(`${base}/api/billing-requests?mode=live`, { method })).status, 405);
      for (const path of ['/tests/issue-8.mjs', '/lib/config.js', '/package.json', '/README.md', '/resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json']) assert.equal((await fetch(base + path)).status, 404);
      for (const path of ['/', '/index.html', '/app.mjs', '/styles.css']) assert.equal((await fetch(base + path)).status, 200);
      assert.equal(calls.length, 0);
    });
  });

  test('issue 8 S09: oversized streamed responses stop at the byte bound and expose only a sanitized data failure', async () => {
    let cancelled = false;
    await scenario(() => new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
      cancel() { cancelled = true; }
    })), async ({ p, calls }) => {
      await connect(p); await recovered(p, /Contract \/ data failure.*exceeded the read limit/);
      assert.equal(cancelled, true);
      assert.equal(calls.length, 1);
      assert.equal(await p.locator('#records-body tr.selectable').count(), 0);
      await noStorage(p);
    });
  });

  test('issue 8 S10: ambiguous item continuation metadata stays unavailable and is never followed', async () => {
    for (const query of ['$skiptoken=x&$skiptoken=y', '$skiptoken=x&skiptoken=y', '$top=20&$top=1']) {
      await scenario(() => response(envelope([{ BillingDocumentRequest: 'ITEMHDR', BillingDocumentRequestItem: '000010', NetAmount: '11.125', TransactionCurrency: 'USD' }], `${COLLECTION}('ITEMHDR')/to_Item?${query}`)), async ({ base, calls }) => {
        const result = await fetch(`${base}/api/billing-requests/ITEMHDR/items?mode=live`, { headers: { 'X-SAP-APIKey': KEY } });
        const json = await result.json();
        assert.equal(result.ok, true); assert.equal(json.status, 'unavailable');
        assert.equal(json.complete, false); assert.equal(json.count, 0); assert.deepEqual(json.rows, []);
        assert.match(json.note, /rejected/); assert.equal(calls.length, 1);
        assert.equal(calls[0].url.searchParams.get('$top'), '20');
        assert.equal(calls[0].url.searchParams.has('$skiptoken'), false);
        safeCalls(calls);
      });
    }
  });

  for (const status of [401, 403]) {
    test(`issue 8 R01 ${status}: authentication requires explicit key correction and fresh selection`, async () => {
      await scenario(({ url, options }) => options.headers.APIKey === 'SENTINEL-OLD'
        ? response({ secret: 'SENTINEL-UPSTREAM-BODY' }, status)
        : response(url.pathname.includes("A_BillingDocumentRequest('") ? { d: rawRecord('AUTHGOOD') } : envelope([rawRecord('AUTHGOOD')])), async ({ p, calls }) => {
        await connect(p, 'SENTINEL-OLD'); await recovered(p, /Authentication \/ key problem.*Correct the session key/);
        assert.equal(await p.locator('#retry-read').isVisible(), false);
        assert.doesNotMatch(await p.locator('#read-recovery-message').innerText(), /Empty page|Service failure/);
        assert.equal(await p.locator('#records-body tr.selectable').count(), 0);
        await p.locator('#correct-key').click();
        assert.equal(await p.locator('#api-key').evaluate(e => e === document.activeElement), true);
        await connect(p, 'SENTINEL-CORRECTED'); await row(p, 'AUTHGOOD');
        assert.equal(await p.locator('#records-body tr.selected').count(), 0);
        await select(p, 'AUTHGOOD'); await review(p);
        assert.equal(calls.length, 3);
        assert.equal(calls[0].options.headers.APIKey, 'SENTINEL-OLD');
        assert.ok(calls.slice(1).every(c => c.options.headers.APIKey === 'SENTINEL-CORRECTED'));
        assert.doesNotMatch(await p.locator('body').innerText(), /SENTINEL/);
        await noStorage(p); safeCalls(calls);
      });
    });
  }

  for (const kind of ['timeout', 'network', 'service']) {
    test(`issue 8 R02 ${kind}: distinct failure retries once, suppresses duplicate attempts and reaches cost evidence`, async () => {
      let fail = true;
      const pending = gate();
      let holdRetry = true;
      await scenario(async ({ url }) => {
        if (fail) {
          if (kind === 'timeout') throw new DOMException('Injected timeout', 'AbortError');
          if (kind === 'network') throw new Error('SENTINEL-MUST-NOT-LEAK');
          return response('SENTINEL-UPSTREAM-BODY', 503);
        }
        if (holdRetry) await pending.promise;
        return response(url.pathname.includes("A_BillingDocumentRequest('") ? { d: rawRecord('RETRYGOOD') } : envelope([rawRecord('RETRYGOOD')]));
      }, async ({ p, calls }) => {
        try {
          await connect(p); await recovered(p, kind === 'timeout' ? /Read timed out/ : kind === 'network' ? /Network failure/ : /Service failure/);
          assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
          fail = false;
          const requested = p.waitForRequest(r => new URL(r.url()).pathname === '/api/billing-requests');
          await p.locator('#retry-read').click(); await requested;
          await p.locator('#retry-read').evaluate(e => { e.click(); e.click(); e.click(); });
          assert.equal(calls.length, 2);
          holdRetry = false; pending.release(); await row(p, 'RETRYGOOD');
          await select(p, 'RETRYGOOD'); await review(p);
          assert.equal(calls.length, 3);
          assert.doesNotMatch(await p.locator('body').innerText(), /SENTINEL/);
          await noStorage(p);
        } finally { pending.release(); }
      });
    });
  }

  test('issue 8 R03: a failed next-page read clears old validity and Retry requests exactly that page', async () => {
    let failed = false;
    await scenario(({ url }) => {
      if (url.pathname.includes("A_BillingDocumentRequest('")) return response({ d: rawRecord(url.pathname.includes('PAGE2') ? 'PAGE2' : 'PAGE1') });
      if (!url.searchParams.has('$skip')) return response(envelope([rawRecord('PAGE1')], '?$skip=10'));
      if (!failed) { failed = true; return response({}, 503); }
      return response(envelope([rawRecord('PAGE2')]));
    }, async ({ p, calls }) => {
      await connect(p); await row(p, 'PAGE1'); await select(p, 'PAGE1'); await review(p); await p.locator('#back-to-list').click();
      await p.locator('#next-page').click(); await recovered(p, /Service failure/);
      await text(p, '#list-meta', /Page 2 read failed.*No previous page/);
      assert.equal(await p.locator('#records-body tr.selectable').count(), 0);
      assert.equal(await p.locator('#detail-actions').isVisible(), false);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      await p.locator('#retry-read').click(); await row(p, 'PAGE2');
      assert.equal(calls[2].url.searchParams.get('$skip'), '10');
      assert.equal(calls[3].url.href, calls[2].url.href);
      await select(p, 'PAGE2'); await review(p); await noStorage(p);
    });
  });

  test('issue 8 R04: malformed JSON and wrong-shape payloads remain contract/data errors, not empty lists', async () => {
    for (const bad of ['{invalid', { wrong: [] }]) {
      let valid = false;
      await scenario(() => response(valid ? envelope([rawRecord('DATAGOOD')]) : bad), async ({ p, calls }) => {
        await connect(p); await recovered(p, /Contract \/ data failure/);
        assert.doesNotMatch(await p.locator('#read-recovery-message').innerText(), /Empty page|zero spending/);
        assert.equal(await p.locator('#records-body tr.selectable').count(), 0);
        valid = true; await p.locator('#retry-read').click(); await row(p, 'DATAGOOD');
        assert.equal(calls.length, 2); await noStorage(p);
      });
    }
  });

  for (const kind of ['seconds', 'http-date']) {
    test(`issue 8 R05 ${kind}: 429 cooldown is shared by equivalent controls, expires without auto-send and permits one Retry`, async () => {
      let fail = true;
      await scenario(() => fail ? response({}, 429, kind === 'seconds' ? '5' : new Date(Date.now() + 6000).toUTCString()) : response(envelope([rawRecord('RATEGOOD')])), async ({ p, calls }) => {
        await p.clock.install({ time: Date.now() });
        await connect(p); await recovered(p, /Rate limited.*Wait/);
        await p.locator('#api-key').fill(KEY);
        for (const selector of ['#retry-read', '#connect-live', '#restart-list', '#next-page']) {
          assert.equal(await p.locator(selector).isDisabled(), true);
          await p.locator(selector).evaluate(e => { e.click(); e.click(); });
        }
        assert.equal(calls.length, 1);
        await p.clock.runFor(4000); assert.equal(await p.locator('#retry-read').isDisabled(), true);
        await p.clock.runFor(4000); assert.equal(await p.locator('#retry-read').isEnabled(), true);
        assert.equal(calls.length, 1, 'Cooldown expiry must not send');
        fail = false; await p.locator('#retry-read').click(); await row(p, 'RATEGOOD');
        assert.equal(calls.length, 2); await noStorage(p);
      });
    });
  }

  test('issue 8 R06: missing, malformed, zero and past Retry-After are explicit and never automatic', async () => {
    for (const value of [null, 'not-a-date', '-1', '1.5', '0', 'Wed, 01 Jan 2020 00:00:00 GMT']) {
      let fail = true;
      await scenario(() => fail ? response({}, 429, value) : response(envelope([rawRecord('RATEGOOD')])), async ({ p, calls }) => {
        await p.clock.install({ time: Date.now() });
        await connect(p); await recovered(p, /Rate limited/);
        if (value === '0' || value?.includes('2020')) assert.equal(await p.locator('#retry-read').isEnabled(), true);
        else {
          await text(p, '#read-recovery-message', /No valid Retry-After.*one-second local wait/);
          assert.equal(await p.locator('#retry-read').isDisabled(), true);
          await p.clock.runFor(1001);
        }
        assert.equal(calls.length, 1);
        fail = false; await p.locator('#retry-read').click(); await row(p, 'RATEGOOD');
        assert.equal(calls.length, 2); await noStorage(p);
      });
    }
  });

  test('issue 8 R07: valid long delays are not shortened, unrepresentable delays stay blocked, and source changes cancel timers', async () => {
    for (const value of ['7200', '999999999999999999999999999999']) {
      await scenario(() => response({}, 429, value), async ({ p, calls }) => {
        await p.clock.install({ time: Date.now() });
        await connect(p); await recovered(p, value === '7200' ? /Wait 7200 seconds/ : /exceeds the supported clock range/);
        await p.clock.fastForward(3601000);
        assert.equal(await p.locator('#retry-read').isDisabled(), true);
        assert.equal(calls.length, 1);
        await p.locator('#use-fixture').click(); await row(p, '9000000001');
        await p.clock.fastForward(7201000);
        assert.equal(await p.locator('#read-recovery').isVisible(), false);
        await text(p, '#provenance', /Fixture demonstration/);
        assert.equal(calls.length, 1);
        await noStorage(p);
      });
    }
  });

  test('issue 8 R08: optional item service failure keeps valid header evidence and retries only the item read', async () => {
    let itemFail = true;
    await scenario(({ url }) => {
      if (url.pathname.endsWith('/to_Item')) return itemFail ? response({}, 503, '3') : response(envelope([{ BillingDocumentRequest: 'ITEMHDR', BillingDocumentRequestItem: '000010', NetAmount: '11.125', TaxAmount: '0.005', GrossAmount: '11.130', TransactionCurrency: 'USD' }]));
      return response(url.pathname.includes("A_BillingDocumentRequest('") ? { d: rawRecord('ITEMHDR') } : envelope([rawRecord('ITEMHDR')], '?$skip=10'));
    }, async ({ p, calls }) => {
      await p.clock.install({ time: Date.now() });
      await connect(p); await row(p, 'ITEMHDR'); await select(p, 'ITEMHDR');
      await p.locator('#check-items').click(); await recovered(p, /Service failure.*Wait/);
      await review(p); await text(p, '#cost-fields', /unavailable/); await text(p, '#cost-amounts', /250\.000/);
      await p.locator('#back-to-list').click();
      for (const id of ['next-page', 'restart-list', 'reload-detail', 'check-items']) {
        assert.equal(await p.locator(`#${id}`).isDisabled(), true);
        await p.locator(`#${id}`).evaluate(e => e.click());
      }
      assert.equal(calls.length, 3);
      await p.clock.runFor(4000); itemFail = false;
      await p.locator('#retry-read').click();
      await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Optional item coverage: partial'));
      assert.equal(calls.length, 4); assert.ok(calls.at(-1).url.pathname.endsWith('/to_Item'));
      assert.equal(await p.locator('#review-cost-evidence').evaluate(e => e === document.activeElement), true);
      await review(p); await text(p, '#cost-items', /11\.125/); await text(p, '#cost-fields', /partial/);
      await noStorage(p);
    });
  });

  test('issue 8 R09: detail Retry keeps the selected key/page, requires valid read-back and restores useful focus', async () => {
    let fail = true;
    await scenario(({ url }) => {
      if (!url.pathname.includes("A_BillingDocumentRequest('")) return response(envelope([rawRecord('FIRST'), rawRecord('SECOND')]));
      if (fail) throw new Error('Injected network failure');
      return response({ d: rawRecord('SECOND', 'EUR', '-18.750') });
    }, async ({ p, calls }) => {
      await connect(p); await row(p, 'SECOND'); await p.locator('#records-body tr[data-key="SECOND"]').click();
      await recovered(p, /Network failure/);
      assert.equal(await p.locator('#review-cost-evidence').isDisabled(), true);
      assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
      fail = false; await p.locator('#retry-read').click();
      await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded for document SECOND'));
      assert.equal(calls.length, 3); assert.equal(calls[1].url.href, calls[2].url.href);
      assert.equal(await p.locator('#review-cost-evidence').evaluate(e => e === document.activeElement), true);
      await review(p); await text(p, '#cost-summary', /SECOND.*EUR|EUR.*SECOND/s);
      await text(p, '#cost-amounts', /-18\.750/);
      await p.locator('#back-to-list').click(); await text(p, '#list-meta', /Page 1/);
      await noStorage(p);
    });
  });

  for (const action of ['source', 'key', 'reset']) {
    test(`issue 8 S04 ${action}: superseding a delayed page cannot restore old rows, evidence or retry coordinates`, async () => {
      const pending = gate();
      await scenario(async ({ url, options }) => {
        if (url.searchParams.has('$skip') && options.headers.APIKey === KEY) { await pending.promise; return response(envelope([rawRecord('STALEPAGE')])); }
        return response(envelope([rawRecord(options.headers.APIKey === KEY ? 'PAGE1' : 'NEWKEY')], '?$skip=10'));
      }, async ({ p, calls }) => {
        try {
          await connect(p); await row(p, 'PAGE1');
          const requested = p.waitForRequest(r => new URL(r.url()).searchParams.has('continuation'));
          await p.locator('#next-page').click(); await requested;
          const arrived = p.waitForResponse(r => new URL(r.url()).searchParams.has('continuation'));
          if (action === 'source') { await p.locator('#use-fixture').click(); await row(p, '9000000001'); }
          if (action === 'key') { await connect(p, 'SENTINEL-NEW-KEY'); await row(p, 'NEWKEY'); }
          if (action === 'reset') await p.locator('#disconnect').click();
          pending.release(); await (await arrived).finished();
          assert.equal(await p.locator('#records-body tr[data-key="STALEPAGE"]').count(), 0);
          assert.equal(await p.evaluate(() => window.__issue6CostSnapshot), undefined);
          assert.equal(await p.locator('#read-recovery').isVisible(), false);
          if (action === 'key') {
            await p.locator('#next-page').click(); await row(p, 'NEWKEY');
            assert.equal(calls.at(-1).options.headers.APIKey, 'SENTINEL-NEW-KEY');
          } else assert.equal(calls.length, 2);
          await noStorage(p); safeCalls(calls);
        } finally { pending.release(); }
      });
    });
  }

  for (const kind of ['detail', 'items']) {
    test(`issue 8 S05 ${kind}: a late previous-page response cannot replace the new selected snapshot`, async () => {
      const pending = gate();
      await scenario(async ({ url }) => {
        if (url.pathname.includes("('PAGE1')") && (kind === 'detail' || url.pathname.endsWith('/to_Item'))) {
          await pending.promise;
          return response(url.pathname.endsWith('/to_Item') ? envelope([{ BillingDocumentRequest: 'PAGE1', BillingDocumentRequestItem: '000010', NetAmount: '999.999', TransactionCurrency: 'EUR' }]) : { d: rawRecord('PAGE1') });
        }
        if (url.pathname.includes("A_BillingDocumentRequest('")) return response({ d: rawRecord(url.pathname.includes('PAGE2') ? 'PAGE2' : 'PAGE1') });
        return response(url.searchParams.has('$skip') ? envelope([rawRecord('PAGE2')]) : envelope([rawRecord('PAGE1')], '?$skip=10'));
      }, async ({ p }) => {
        try {
          await connect(p); await row(p, 'PAGE1');
          const match = r => new URL(r.url()).pathname === `/api/billing-requests/PAGE1${kind === 'items' ? '/items' : ''}`;
          if (kind === 'items') await select(p, 'PAGE1');
          const requested = p.waitForRequest(match);
          if (kind === 'items') await p.locator('#check-items').click(); else await p.locator('#records-body tr.selectable').click();
          await requested;
          const arrived = p.waitForResponse(match);
          await p.locator('#next-page').click(); await row(p, 'PAGE2'); await select(p, 'PAGE2'); await review(p);
          pending.release(); await (await arrived).finished();
          await text(p, '#cost-summary', /PAGE2/);
          assert.doesNotMatch(await p.locator('#cost-items').innerText(), /999\.999/);
          const snapshot = await p.evaluate(() => window.__issue6CostSnapshot);
          assert.equal(snapshot.document.key, 'PAGE2'); assert.equal(snapshot.materialInconsistency, false);
          await noStorage(p);
        } finally { pending.release(); }
      });
    });
  }

  for (const failure of [false, true]) {
    test(`issue 8 S06 ${failure ? 'failed' : 'successful'} page completion: an open historical receipt keeps its provenance and stored bytes`, async () => {
      const pending = gate();
      await scenario(async ({ url }) => {
        if (url.searchParams.has('$skip')) { await pending.promise; return failure ? response({}, 503) : response(envelope([rawRecord('PAGE2')])); }
        return response(envelope([rawRecord('PAGE1')], '?$skip=10'));
      }, async ({ p, calls }) => {
        try {
          const bytes = await saveFixture(p);
          await connect(p); await row(p, 'PAGE1');
          const requested = p.waitForRequest(r => new URL(r.url()).searchParams.has('continuation'));
          await p.locator('#next-page').click(); await requested;
          await p.locator('#reopen-receipt').click(); await p.locator('#api-key').focus();
          const arrived = p.waitForResponse(r => new URL(r.url()).searchParams.has('continuation'));
          pending.release(); await (await arrived).finished();
          await p.waitForFunction(failed => document.querySelector('#status').textContent.includes(failed ? 'Connection failed' : 'Loaded 1'), failure);
          await text(p, '#provenance', /Fixture demonstration/); await text(p, '#decision-summary', /Fixture demonstration/);
          assert.equal(await p.locator('#api-key').evaluate(e => e === document.activeElement), true);
          assert.equal(await p.evaluate(key => localStorage.getItem(key), RECEIPT), bytes);
          await p.locator('#decision-return-to-list').click();
          await text(p, '#provenance', failure ? /Not connected/ : /Live SAP sandbox/);
          assert.equal(calls.length, 2); safeCalls(calls);
        } finally { pending.release(); }
      });
    });
  }

  test('issue 8 S07: key/source/reset during a cooldown cancels obsolete retry effects', async () => {
    for (const action of ['key', 'source', 'reset', 'receipt-reset']) {
      await scenario(({ options }) => options.headers.APIKey === KEY ? response({}, 429, '10') : response(envelope([rawRecord('NEWKEY')])), async ({ p, calls }) => {
        await p.clock.install({ time: Date.now() });
        if (action === 'receipt-reset') await saveFixture(p);
        await connect(p); await recovered(p, /Wait 10 seconds/);
        if (action === 'key') { await connect(p, 'SENTINEL-NEW-KEY'); await row(p, 'NEWKEY'); }
        if (action === 'source') { await p.locator('#use-synthetic').click(); await row(p, 'SYN-0001'); }
        if (action === 'reset') await p.locator('#disconnect').click();
        if (action === 'receipt-reset') {
          await p.locator('#reopen-receipt').click(); await p.locator('#reset-demo').click(); await p.locator('#confirm-reset').click();
          assert.equal(await p.locator('#api-key').inputValue(), '');
        }
        await p.clock.runFor(12000);
        assert.equal(await p.locator('#read-recovery').isVisible(), false);
        await p.locator('#retry-read').evaluate(e => { e.click(); e.click(); });
        assert.equal(calls.length, action === 'key' ? 2 : 1);
        await noStorage(p);
      });
    }
  });

  test('issue 8 U01: keyboard next/retry navigation has useful visible focus without background focus theft', async () => {
    let pageFailed = false;
    await scenario(({ url }) => {
      if (url.pathname.includes("A_BillingDocumentRequest('")) return response({ d: rawRecord('PAGE2') });
      if (!url.searchParams.has('$skip')) return response(envelope([rawRecord('PAGE1')], '?$skip=10'));
      if (!pageFailed) { pageFailed = true; return response({}, 503); }
      return response(envelope([rawRecord('PAGE2')]));
    }, async ({ p }) => {
      await connect(p); await row(p, 'PAGE1');
      await tabTo(p, 'next-page'); await p.keyboard.press('Enter');
      await recovered(p, /Service failure/);
      assert.equal(await p.locator('#read-recovery-title').evaluate(e => e === document.activeElement && e.checkVisibility()), true);
      await tabTo(p, 'retry-read'); await p.keyboard.press('Enter'); await row(p, 'PAGE2');
      assert.equal(await p.locator('#records-title').evaluate(e => e === document.activeElement && e.checkVisibility()), true);
      await p.keyboard.press('Tab'); // Scrollable table region.
      await p.keyboard.press('Tab'); // First usable row.
      assert.equal(await p.evaluate(() => document.activeElement.matches('#records-body tr.selectable')), true);
      await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.querySelector('#status').textContent.includes('Detail loaded'));
      await tabTo(p, 'review-cost-evidence'); await p.keyboard.press('Enter');
      await p.keyboard.press('Enter'); // Back is focused on entry.
      assert.equal(await p.locator('#records-body tr.selected').evaluate(e => e === document.activeElement), true);
      await noStorage(p);
    });
  });

  test('issue 8 U02: representative pagination/empty/auth/cooldown/retry layouts remain usable at 1280, 1366 and 390px', async () => {
    for (const width of [1280, 1366, 390]) {
      let state = 'pages';
      await scenario(({ url }) => {
        if (state === 'empty') return response(envelope([]));
        if (state === 'auth') return response({}, 403);
        if (state === 'rate') return response({}, 429, '5');
        return response(url.searchParams.has('$skip') ? envelope([rawRecord('PAGE2')]) : envelope([rawRecord('PAGE1')], '?$skip=10'));
      }, async ({ p }) => {
        await p.clock.install({ time: Date.now() });
        const layout = async name => {
          assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px ${name}`);
          const input = await p.locator('#api-key').boundingBox();
          assert.ok(input.width >= (width === 390 ? 280 : 340));
          for (const button of await p.locator('button:visible').all()) {
            const box = await button.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width, `${width}px ${name} button overflow`);
          }
          await screenshot(p, `${name}-${width}`);
        };
        await connect(p); await row(p, 'PAGE1'); await p.locator('#next-page').click(); await row(p, 'PAGE2');
        await layout('pagination');
        state = 'empty'; await p.locator('#restart-list').click(); await recovered(p, /Empty page/); await layout('empty');
        state = 'auth'; await p.locator('#retry-read').click(); await recovered(p, /Authentication/); await p.locator('#correct-key').click(); await layout('authentication');
        state = 'rate'; await connect(p); await recovered(p, /Wait 5 seconds/); await layout('cooldown');
        await p.clock.runFor(6000); await text(p, '#read-recovery-message', /Retry read is available/); await layout('retry-ready');
        state = 'pages'; await p.locator('#retry-read').click(); await row(p, 'PAGE1');
        await noStorage(p);
      }, { width, height: 844 });
    }
  });
}
