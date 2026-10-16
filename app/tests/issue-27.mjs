import assert from 'node:assert/strict';

export function registerIssue27Tests({ test, browser, startInjectedServer, injectedServers, TEST_PORT }) {
  let port = TEST_PORT + 700;
  async function pageWithInit(init) {
    const currentPort = port++;
    injectedServers.push(await startInjectedServer(currentPort, () => assert.fail('Fixture review sent an upstream request')));
    const context = await browser().newContext();
    const p = await context.newPage();
    if (init) await p.addInitScript(init);
    await p.goto(`http://127.0.0.1:${currentPort}`);
    return { p, context };
  }
  async function expectScreenName(p, heading, title) {
    await p.waitForFunction(({ heading, title }) => document.querySelector('.title-row h1')?.textContent === heading && document.title === title, { heading, title });
  }

  test('issue 27: blocked storage at start-up stays on Screen 1 with a clear notice', async () => {
    const { p, context } = await pageWithInit(() => Object.defineProperty(window, 'localStorage', {
      configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); }
    }));
    try {
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.match(await p.locator('#storage-unavailable').innerText(), /Browser storage is unavailable.*receipts cannot be saved or reopened.*still review documents/i);
      assert.doesNotMatch(await p.locator('body').innerText(), /could not be recovered/i);
    } finally { await context.close(); }
  });

  test('issue 27: getItem failure at start-up is treated as unavailable storage', async () => {
    const { p, context } = await pageWithInit(() => {
      Storage.prototype.getItem = function () { throw new DOMException('blocked', 'SecurityError'); };
    });
    try {
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.match(await p.locator('#storage-unavailable').innerText(), /Browser storage is unavailable/);
      assert.doesNotMatch(await p.locator('body').innerText(), /could not be recovered/i);
    } finally { await context.close(); }
  });

  test('issue 27: blocked storage still permits fixture review and leaves confirmation unsaved with Retry', async () => {
    const { p, context } = await pageWithInit(() => Object.defineProperty(window, 'localStorage', {
      configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); }
    }));
    try {
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.locator('#retry-receipt').waitFor({ state: 'visible' });
      assert.match(await p.locator('#receipt-status').innerText(), /Unsaved/);
      assert.match(await p.locator('#receipt-status').innerText(), /receipts cannot be saved in this browser/i);
      assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Saved/);
    } finally { await context.close(); }
  });

  test('issue 27: reset with unavailable storage clears the session and reports no receipt was readable', async () => {
    const { p, context } = await pageWithInit(() => Object.defineProperty(window, 'localStorage', {
      configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); }
    }));
    try {
      await p.locator('#api-key').fill('SESSION-KEY');
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.locator('#retry-receipt').waitFor({ state: 'visible' });
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.equal(await p.locator('#api-key').inputValue(), '');
      assert.match(await p.locator('#status').innerText(), /Browser storage is unavailable, so no receipt could be read or deleted\. The review session and key were cleared\./);
      assert.doesNotMatch(await p.locator('body').innerText(), /may already be deleted|uncertain|still present/i);
    } finally { await context.close(); }
  });

  test('issue 27: corrupt receipt JSON still opens the existing recovery screen', async () => {
    const { p, context } = await pageWithInit(() => localStorage.setItem('planReviewSnapshot.receipt', '{corrupt'));
    try {
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.match(await p.locator('#decision-title').innerText(), /Receipt could not be recovered/);
      assert.match(await p.locator('#receipt-status').innerText(), /Reset demo/);
      await expectScreenName(p, 'Decide and save a receipt', 'Decision and receipt – Plan Review Snapshot');
    } finally { await context.close(); }
  });

  test('issue 27: heading and title follow list, cost, decision, Back to cost, and Back to list', async () => {
    const { p, context } = await pageWithInit();
    try {
      await expectScreenName(p, 'Choose a document to review', 'Choose a document – Plan Review Snapshot');
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await expectScreenName(p, 'Review cost evidence', 'Cost evidence – Plan Review Snapshot');
      await p.locator('#continue-decision').click();
      await expectScreenName(p, 'Decide and save a receipt', 'Decision and receipt – Plan Review Snapshot');
      await p.locator('#back-to-evidence').click();
      await expectScreenName(p, 'Review cost evidence', 'Cost evidence – Plan Review Snapshot');
      await p.locator('#back-to-list').click();
      await expectScreenName(p, 'Choose a document to review', 'Choose a document – Plan Review Snapshot');
    } finally { await context.close(); }
  });

  test('issue 27: saved receipt refresh and Return to list update heading and title', async () => {
    const { p, context } = await pageWithInit();
    try {
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.locator('#receipt-status').filter({ hasText: 'Saved' }).waitFor({ state: 'visible' });
      await p.reload();
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      await expectScreenName(p, 'Decide and save a receipt', 'Decision and receipt – Plan Review Snapshot');
      await p.locator('#decision-return-to-list').click();
      await expectScreenName(p, 'Choose a document to review', 'Choose a document – Plan Review Snapshot');
    } finally { await context.close(); }
  });
}
