import assert from 'node:assert/strict';

export function registerIssue27Tests({ test, browser, startInjectedServer, injectedServers, TEST_PORT }) {
  let port = TEST_PORT + 700;
  async function pageWithInit(init, initArg) {
    const currentPort = port++;
    injectedServers.push(await startInjectedServer(currentPort, () => assert.fail('Fixture review sent an upstream request')));
    const context = await browser().newContext();
    const p = await context.newPage();
    if (init) await p.addInitScript(init, initArg);
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

  test('issue 27: one-off startup read failure recovers to a saved receipt, notice cleared, confirmed reset removes it across reload', async () => {
    const { p, context } = await pageWithInit(() => {
      const ogGet = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'issue27-one-off') return ogGet.call(this, key);
        if (!ogGet.call(sessionStorage, 'issue27-one-off')) {
          sessionStorage.setItem('issue27-one-off', 'yes');
          Storage.prototype.getItem = ogGet;
          throw new DOMException('one-off', 'SecurityError');
        }
        return ogGet.call(this, key);
      };
    });
    try {
      // Startup: unreadable storage stays on Screen 1 with an honest notice, no invented receipt.
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.match(await p.locator('#storage-unavailable').innerText(), /Browser storage is unavailable/);
      assert.doesNotMatch(await p.locator('body').innerText(), /could not be recovered/i);

      // Storage recovers after the one-off failure; a valid save/read-back succeeds and clears the notice.
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.locator('#receipt-status').filter({ hasText: 'Saved' }).waitFor({ state: 'visible' });
      const notice = p.locator('#storage-unavailable');
      assert.equal(await notice.getAttribute('hidden') !== null, true);
      assert.doesNotMatch(await p.locator('body').innerText(), /receipts cannot be saved in this browser/i);

      // Cancel reset preserves the saved receipt.
      await p.locator('#reset-demo').click();
      await p.locator('#cancel-reset').click();
      assert.equal(await p.locator('#screen-decision').isVisible(), true);
      assert.match(await p.locator('#receipt-status').innerText(), /Saved/);
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt') !== null), true);

      // Confirmed reset uses current evidence: removes the receipt with verified read-back.
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.equal(await p.locator('#api-key').inputValue(), '');
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);

      // Reload: no receipt resurrects.
      await p.reload();
      await p.locator('#screen-list').waitFor({ state: 'visible' });
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);
    } finally { await context.close(); }
  });

  test('issue 27: one-off startup read failure with pre-existing valid receipt preserves original bytes on Confirm', async () => {
    const currentPort = port++;
    injectedServers.push(await startInjectedServer(currentPort, () => assert.fail('Fixture review sent an upstream request')));
    const context = await browser().newContext();
    let originalBytes = '';
    // Phase 1: real fixture journey generates a valid historical receipt in the same context.
    const p1 = await context.newPage();
    await p1.goto(`http://127.0.0.1:${currentPort}`);
    try {
      await p1.locator('#use-fixture').click();
      await p1.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p1.locator('#records-body tr[data-key="9000000001"]').click();
      await p1.locator('#review-cost-evidence').click();
      await p1.locator('#continue-decision').click();
      await p1.getByRole('radio', { name: 'Later', exact: true }).check();
      await p1.locator('#confirm-intent').click();
      await p1.locator('#receipt-status').filter({ hasText: 'Saved' }).waitFor({ state: 'visible' });
      originalBytes = await p1.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt'));
      assert.ok(originalBytes);
      await p1.close();
    } catch (error) {
      await p1.close();
      throw error;
    }

    // Phase 2: new page in the same context; the valid receipt pre-exists and startup read fails once.
    await context.addInitScript(({ bytes }) => {
      localStorage.setItem('planReviewSnapshot.receipt', bytes);
      const originalGet = Storage.prototype.getItem;
      let failed = false;
      Storage.prototype.getItem = function (key) {
        if (!failed) {
          failed = true;
          Storage.prototype.getItem = originalGet;
          throw new DOMException('one-off', 'SecurityError');
        }
        return originalGet.call(this, key);
      };
    }, { bytes: originalBytes });
    const p2 = await context.newPage();
    await p2.goto(`http://127.0.0.1:${currentPort}`);
    try {
      await p2.locator('#screen-list').waitFor({ state: 'visible' });
      assert.match(await p2.locator('#storage-unavailable').innerText(), /Browser storage is unavailable/);

      // A new Confirm after startup-unavailable must preserve the original bytes and identity.
      await p2.locator('#use-fixture').click();
      await p2.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p2.locator('#records-body tr[data-key="9000000001"]').click();
      await p2.locator('#review-cost-evidence').click();
      await p2.locator('#continue-decision').click();
      await p2.getByRole('radio', { name: 'Help', exact: true }).check();
      await p2.locator('#confirm-intent').click();
      await p2.locator('#screen-decision').waitFor({ state: 'visible' });
      assert.match(await p2.locator('#decision-title').innerText(), /Saved receipt \(historical\)/);
      assert.equal(await p2.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), originalBytes);
      const preserved = await p2.evaluate(() => window.__issue7Receipt);
      const original = JSON.parse(originalBytes);
      assert.equal(preserved.receiptId, original.receiptId);
      assert.equal(preserved.reviewId, original.reviewId);
      assert.equal(preserved.document.key, original.document.key);
    } finally { await context.close(); }
  });

  test('issue 27: one-off startup read failure with pre-existing corrupt/unsupported bytes preserves them until deliberate reset', async () => {
    for (const corrupted of ['{corrupt', 'unsupported-bytes']) {
      const { p, context } = await pageWithInit(({ value }) => {
        localStorage.setItem('planReviewSnapshot.receipt', value);
        const ogGet = Storage.prototype.getItem;
        let failed = false;
        Storage.prototype.getItem = function (key) {
          if (!failed) {
            failed = true;
            Storage.prototype.getItem = ogGet;
            throw new DOMException('one-off', 'SecurityError');
          }
          return ogGet.call(this, key);
        };
      }, { value: corrupted });
      try {
        // Startup: one-off read failure while pre-existing bytes are present. No
        // receipt or recovery screen is invented because the bytes could not be read.
        await p.locator('#screen-list').waitFor({ state: 'visible' });
        assert.match(await p.locator('#storage-unavailable').innerText(), /Browser storage is unavailable/);
        assert.doesNotMatch(await p.locator('body').innerText(), /could not be recovered/i);

        // A new Confirm after startup-unavailable preserves the pre-existing bytes and
        // routes to recovery instead of saving a new intent over them.
        await p.locator('#use-fixture').click();
        await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
        await p.locator('#records-body tr[data-key="9000000001"]').click();
        await p.locator('#review-cost-evidence').click();
        await p.locator('#continue-decision').click();
        await p.getByRole('radio', { name: 'Later', exact: true }).check();
        await p.locator('#confirm-intent').click();
        await p.locator('#screen-decision').waitFor({ state: 'visible' });
        assert.equal(await p.locator('#confirm-intent').isVisible(), false);
        assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), corrupted);

        // Deliberate reset clears the pre-existing bytes.
        await p.locator('#reset-demo').click();
        await p.locator('#confirm-reset').click();
        assert.equal(await p.locator('#screen-list').isVisible(), true);
        assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);
      } finally { await context.close(); }
    }
  });

  test('issue 27: persistent read failure with writable setItem does not write on Confirm or Retry', async () => {
    const { p, context } = await pageWithInit(() => {
      const originalSet = Storage.prototype.setItem;
      const writes = [];
      Storage.prototype.setItem = function (k, v) {
        if (this === localStorage && k === 'planReviewSnapshot.receipt') writes.push(v);
        return originalSet.call(this, k, v);
      };
      Storage.prototype.getItem = function () { throw new DOMException('blocked', 'SecurityError'); };
      window.__receiptWrites = writes;
    });
    try {
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.match(await p.locator('#storage-unavailable').innerText(), /Browser storage is unavailable/);

      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.locator('#retry-receipt').waitFor({ state: 'visible' });
      assert.match(await p.locator('#receipt-status').innerText(), /Unsaved/);
      assert.match(await p.locator('#receipt-status').innerText(), /cannot be saved in this browser/);
      assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Saved/);
      // No write was attempted despite a working setItem.
      assert.equal(await p.evaluate(() => window.__receiptWrites.length), 0);

      // Retry is still unsaved and retryable, and still does not write.
      await p.locator('#retry-receipt').click();
      assert.match(await p.locator('#receipt-status').innerText(), /Unsaved/);
      assert.equal(await p.evaluate(() => window.__receiptWrites.length), 0);
    } finally { await context.close(); }
  });

  test('issue 27: known saved receipt, reset first getItem throws then working remove/readback empties it', async () => {
    const { p, context } = await pageWithInit();
    try {
      // Save a receipt with working storage.
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      await p.locator('#receipt-status').filter({ hasText: 'Saved' }).waitFor({ state: 'visible' });
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt') !== null), true);

      // The first getItem throws (as it would have in the old pre-read check), then
      // getItem works. removeItem works throughout. Reset does not skip removal based
      // on a getItem failure; removal + read-back empties the receipt.
      await p.evaluate(() => {
        const ogGet = Storage.prototype.getItem;
        let firstGet = true;
        Storage.prototype.getItem = function (key) {
          if (this === localStorage && key === 'planReviewSnapshot.receipt' && firstGet) {
            firstGet = false;
            Storage.prototype.getItem = ogGet;
            throw new DOMException('first-get', 'SecurityError');
          }
          return ogGet.call(this, key);
        };
      });
      await p.evaluate(() => { try { localStorage.getItem('planReviewSnapshot.receipt'); } catch {} });

      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
      assert.equal(await p.locator('#api-key').inputValue(), '');
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);
      assert.equal(await p.locator('#storage-unavailable').getAttribute('hidden') !== null, true);
    } finally { await context.close(); }
  });

  test('issue 27: recovered storage, reset before any save, clears the stale unavailable notice', async () => {
    const { p, context } = await pageWithInit(() => {
      const ogGet = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (!ogGet.call(sessionStorage, 'issue27-reset-notice')) {
          sessionStorage.setItem('issue27-reset-notice', 'yes');
          Storage.prototype.getItem = ogGet;
          throw new DOMException('one-off', 'SecurityError');
        }
        return ogGet.call(this, key);
      };
    });
    try {
      // Startup: one-off failure, notice shown.
      assert.match(await p.locator('#storage-unavailable').innerText(), /Browser storage is unavailable/);
      // Review but do NOT save.
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').waitFor({ state: 'visible' });
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#screen-cost').waitFor({ state: 'visible' });
      await p.locator('#continue-decision').click();
      await p.locator('#screen-decision').waitFor({ state: 'visible' });
      // Confirm reset when storage is readable again: clears the stale flag/notice.
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.locator('#storage-unavailable').getAttribute('hidden') !== null, true);
      assert.equal(await p.locator('#api-key').inputValue(), '');
    } finally { await context.close(); }
  });

  test('issue 27: schema-valid wrong-intent read-back is never adopted by Retry', async () => {
    const { p, context } = await pageWithInit();
    try {
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.evaluate(() => {
        const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
        const gate = window.__issue27RetryFault = { readFails: false, alterWrite: true, writes: [] };
        Storage.prototype.getItem = function (key) {
          if (key === 'planReviewSnapshot.receipt' && gate.readFails) throw new Error('Injected read denial');
          return get.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (key === 'planReviewSnapshot.receipt') {
            gate.writes.push(value);
            if (gate.alterWrite) {
              const receipt = JSON.parse(value);
              receipt.intent = 'help';
              value = JSON.stringify(receipt);
            }
          }
          return set.call(this, key, value);
        };
      });
      await p.locator('#confirm-intent').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Unsaved/);
      await p.evaluate(() => { window.__issue27RetryFault.readFails = true; });
      await p.locator('#retry-receipt').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Unsaved/);
      assert.equal(await p.evaluate(() => window.__issue27RetryFault.writes.length), 1);
      await p.evaluate(() => { window.__issue27RetryFault.readFails = false; window.__issue27RetryFault.alterWrite = false; });
      await p.locator('#retry-receipt').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Saved/);
      assert.match(await p.locator('#decision-choice').innerText(), /Later/);
      const result = await p.evaluate(() => ({ bytes: localStorage.getItem('planReviewSnapshot.receipt'), writes: window.__issue27RetryFault.writes }));
      assert.equal(result.writes.length, 2);
      assert.equal(result.writes[0], result.writes[1]);
      assert.equal(result.bytes, result.writes[0]);
      assert.equal(JSON.parse(result.bytes).intent, 'later');
    } finally { await context.close(); }
  });
  test('issue 27: known receipt property denial retains uncertain reset and can be verified after recovery', async () => {
    const { p, context } = await pageWithInit();
    try {
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.locator('#confirm-intent').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Saved/);
      await p.evaluate(() => {
        const storage = window.localStorage;
        window.__issue27RestoreStorage = () => Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
        window.__issue27StoredBytes = () => storage.getItem('planReviewSnapshot.receipt');
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Injected property denial', 'SecurityError'); } });
      });
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-decision').isVisible(), true);
      assert.match(await p.locator('#receipt-status').innerText(), /Deletion could not be verified/);
      assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Saved/);
      assert.equal(await p.evaluate(() => window.__issue27StoredBytes() !== null), true);
      await p.evaluate(() => window.__issue27RestoreStorage());
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);
      await p.reload();
      assert.equal(await p.locator('#screen-decision').isVisible(), false);
    } finally { await context.close(); }
  });

}
