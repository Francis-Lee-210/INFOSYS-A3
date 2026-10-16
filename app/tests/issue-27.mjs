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

  test('issue 27: known saved receipt, reset first getItem throws: removal still happens and a second reset verifies it', async () => {
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

      // The first getItem during reset throws, then getItem works. removeItem works
      // throughout. Reset must not skip removal because of a getItem failure: the
      // unverified read-back keeps the uncertain state, but the bytes are gone, and
      // a second Confirm reset verifies the removal.
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

      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-decision').isVisible(), true);
      assert.match(await p.locator('#receipt-status').innerText(), /Deletion could not be verified/);
      assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /Saved/);
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);

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
    for (const partialWrite of [false, true]) {
      const { p, context } = await pageWithInit();
      try {
        await p.locator('#use-fixture').click();
        await p.locator('#records-body tr[data-key="9000000001"]').click();
        await p.locator('#review-cost-evidence').click();
        await p.locator('#continue-decision').click();
        await p.getByRole('radio', { name: 'Later', exact: true }).check();
        if (partialWrite) await p.evaluate(() => {
          const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
          let written = false, failed = false;
          Storage.prototype.setItem = function (key, value) {
            const result = set.call(this, key, value);
            if (key === 'planReviewSnapshot.receipt') written = true;
            return result;
          };
          Storage.prototype.getItem = function (key) {
            if (key === 'planReviewSnapshot.receipt' && written && !failed) {
              failed = true;
              throw new Error('Injected read-back failure after successful write');
            }
            return get.call(this, key);
          };
        });
        await p.locator('#confirm-intent').click();
        assert.match(await p.locator('#receipt-status').innerText(), partialWrite ? /^Unsaved/ : /^Saved/);
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
    }
  });

  test('issue 27: this session\'s own partial write is never adopted as Saved after the intent changes', async () => {
    const { p, context } = await pageWithInit();
    try {
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      // Receipt reads: 1 pre-read ok, 2 read-back after the Later write throws,
      // 3 Retry pre-read throws (marks storage unavailable), then reads work again.
      await p.evaluate(() => {
        const get = Storage.prototype.getItem;
        let reads = 0;
        Storage.prototype.getItem = function (key) {
          if (this === localStorage && key === 'planReviewSnapshot.receipt') {
            reads++;
            if (reads === 2 || reads === 3) throw new DOMException('flaky', 'SecurityError');
          }
          return get.call(this, key);
        };
      });
      await p.locator('#confirm-intent').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Unsaved — storage write or read-back verification failed/);
      await p.locator('#retry-receipt').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Unsaved — browser storage is unavailable/);
      assert.equal(JSON.parse(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt'))).intent, 'later');

      await p.getByRole('radio', { name: 'Help', exact: true }).check();
      await p.locator('#confirm-intent').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Saved/);
      assert.match(await p.locator('#decision-choice').innerText(), /Help/);
      assert.equal(JSON.parse(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt'))).intent, 'help');
    } finally { await context.close(); }
  });

  test('issue 27: persistent getItem failure, reset with no receipt clears the session instead of an uncertain loop', async () => {
    const { p, context } = await pageWithInit(() => {
      Storage.prototype.getItem = function () { throw new DOMException('blocked', 'SecurityError'); };
    });
    try {
      await p.locator('#api-key').fill('SESSION-KEY');
      await p.locator('#use-fixture').click();
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

  test('issue 27: a partial write is still known to reset after leaving the decision', async () => {
    const { p, context } = await pageWithInit();
    try {
      await p.locator('#use-fixture').click();
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();
      await p.getByRole('radio', { name: 'Later', exact: true }).check();
      await p.evaluate(() => {
        const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
        let written = false, failed = false;
        Storage.prototype.setItem = function (key, value) {
          const result = set.call(this, key, value);
          if (key === 'planReviewSnapshot.receipt') written = true;
          return result;
        };
        Storage.prototype.getItem = function (key) {
          if (key === 'planReviewSnapshot.receipt' && written && !failed) {
            failed = true;
            throw new Error('Injected read-back failure after successful write');
          }
          return get.call(this, key);
        };
      });
      await p.locator('#confirm-intent').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Unsaved/);

      // Leave the decision (clears the pending receipt), then come back to Screen 3.
      await p.locator('#back-to-evidence').click();
      await p.locator('#back-to-list').click();
      await p.locator('#records-body tr[data-key="9000000001"]').click();
      await p.locator('#review-cost-evidence').click();
      await p.locator('#continue-decision').click();

      await p.evaluate(() => {
        const storage = window.localStorage;
        window.__issue27StoredBytes = () => storage.getItem('planReviewSnapshot.receipt');
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Injected property denial', 'SecurityError'); } });
      });
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-decision').isVisible(), true);
      assert.match(await p.locator('#receipt-status').innerText(), /Deletion could not be verified/);
      assert.doesNotMatch(await p.locator('#status').innerText(), /no receipt could be read or deleted/);
      assert.equal(await p.evaluate(() => window.__issue27StoredBytes() !== null), true);
    } finally { await context.close(); }
  });


  async function reviewFixtureForReset(p, intent) {
    await p.locator('#use-fixture').click();
    await p.locator('#records-body tr[data-key="9000000001"]').click();
    await p.locator('#review-cost-evidence').click();
    await p.locator('#continue-decision').click();
    await p.getByRole('radio', { name: intent, exact: true }).check();
  }

  async function knownDataAfterFailedReset(kind) {
    const { p, context } = await pageWithInit();
    try {
      await reviewFixtureForReset(p, 'Later');
      await p.locator('#confirm-intent').click();
      if (kind === 'corrupt') await p.evaluate(() => localStorage.setItem('planReviewSnapshot.receipt', '{injected-corrupt'));
      const oldBytes = await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt'));
      assert.ok(oldBytes);
      await p.addInitScript(() => {
        const get = Storage.prototype.getItem;
        let failed = false;
        Storage.prototype.getItem = function (key) {
          if (key === 'planReviewSnapshot.receipt' && !failed) {
            failed = true;
            throw new DOMException('Injected one-off startup read', 'SecurityError');
          }
          return get.call(this, key);
        };
      });
      await p.reload();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      await reviewFixtureForReset(p, 'Help');
      await p.evaluate(() => {
        const f = window.__pr32KnownDataFaults = {
          storage: window.localStorage,
          descriptor: Object.getOwnPropertyDescriptor(window, 'localStorage'),
          get: Storage.prototype.getItem,
          set: Storage.prototype.setItem,
          remove: Storage.prototype.removeItem,
          readFail: false,
          removeFail: true,
          writes: 0
        };
        f.stored = () => f.get.call(f.storage, 'planReviewSnapshot.receipt');
        Storage.prototype.getItem = function (key) {
          if (this === f.storage && key === 'planReviewSnapshot.receipt' && f.readFail) throw new DOMException('Injected later read failure', 'SecurityError');
          return f.get.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (this === f.storage && key === 'planReviewSnapshot.receipt') f.writes++;
          return f.set.call(this, key, value);
        };
        Storage.prototype.removeItem = function (key) {
          if (this === f.storage && key === 'planReviewSnapshot.receipt' && f.removeFail) throw new DOMException('Injected remove failure', 'SecurityError');
          return f.remove.call(this, key);
        };
      });
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      return { p, context, oldBytes };
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  test('issue 27: known old bytes survive failed reset, cancellation and another confirmation until verified deletion', async () => {
    for (const kind of ['valid', 'corrupt']) {
      const { p, context, oldBytes } = await knownDataAfterFailedReset(kind);
      try {
        assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.stored()), oldBytes);
        assert.equal(await p.locator('#reset-confirmation').isVisible(), true);
        if (kind === 'valid') {
          assert.match(await p.locator('#decision-title').innerText(), /Saved receipt \(historical\)/);
          assert.match(await p.locator('#decision-choice').innerText(), /Later/);
          assert.match(await p.locator('#provenance').innerText(), /Fixture demonstration/);
        } else {
          assert.match(await p.locator('#decision-title').innerText(), /Receipt could not be recovered/);
          assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /\bSaved\b/);
        }
        await p.locator('#cancel-reset').click();
        if (await p.locator('#confirm-intent').isVisible()) await p.locator('#confirm-intent').click();
        assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.stored()), oldBytes);
        assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.writes), 0);
        assert.equal(await p.locator('#confirm-intent').isVisible(), false);
        await p.evaluate(() => { window.__pr32KnownDataFaults.removeFail = false; });
        await p.locator('#reset-demo').click();
        await p.locator('#confirm-reset').click();
        assert.equal(await p.locator('#screen-list').isVisible(), true);
        assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.stored()), null);
        await reviewFixtureForReset(p, 'Help');
        await p.locator('#confirm-intent').click();
        assert.match(await p.locator('#receipt-status').innerText(), /^Saved/);
        assert.equal(await p.evaluate(() => JSON.parse(window.__pr32KnownDataFaults.stored()).intent), 'help');
        assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.writes), 1);
      } finally { await context.close(); }
    }
  });

  test('issue 27: known old bytes retain uncertain reset when later read or property access fails', async () => {
    for (const kind of ['valid', 'corrupt']) {
      for (const failure of ['read', 'property']) {
        const { p, context, oldBytes } = await knownDataAfterFailedReset(kind);
        try {
          await p.evaluate(failure => {
            if (failure === 'read') window.__pr32KnownDataFaults.readFail = true;
            else Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Injected later property denial', 'SecurityError'); } });
          }, failure);
          await p.locator('#confirm-reset').click();
          assert.equal(await p.locator('#screen-decision').isVisible(), true);
          assert.match(await p.locator('#receipt-status').innerText(), /Deletion could not be verified/);
          assert.equal(await p.locator('#reset-confirmation').isVisible(), true);
          assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.stored()), oldBytes);
          assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.writes), 0);
          await p.evaluate(() => {
            const f = window.__pr32KnownDataFaults;
            if (f.descriptor) Object.defineProperty(window, 'localStorage', f.descriptor);
            else delete window.localStorage;
            f.readFail = false;
            f.removeFail = false;
          });
          await p.locator('#confirm-reset').click();
          assert.equal(await p.locator('#screen-list').isVisible(), true);
          assert.equal(await p.evaluate(() => window.__pr32KnownDataFaults.stored()), null);
          assert.equal(await p.locator('#api-key').inputValue(), '');
        } finally { await context.close(); }
      }
    }
  });

  test('issue 27: failed reset never promotes this sessions unverified wrong-intent write to Saved', async () => {
    const { p, context } = await pageWithInit();
    try {
      await reviewFixtureForReset(p, 'Later');
      await p.evaluate(() => {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'planReviewSnapshot.receipt') {
            const wrong = JSON.parse(value);
            wrong.intent = 'help';
            return set.call(this, key, JSON.stringify(wrong));
          }
          return set.call(this, key, value);
        };
        const remove = Storage.prototype.removeItem;
        window.__pr32RestoreRemove = () => { Storage.prototype.removeItem = remove; };
        Storage.prototype.removeItem = function (key) {
          if (key === 'planReviewSnapshot.receipt') throw new DOMException('Injected remove failure', 'SecurityError');
          return remove.call(this, key);
        };
      });
      await p.locator('#confirm-intent').click();
      assert.match(await p.locator('#receipt-status').innerText(), /^Unsaved/);
      const unverified = await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt'));
      assert.equal(JSON.parse(unverified).intent, 'help');
      await p.locator('#reset-demo').click();
      await p.locator('#confirm-reset').click();
      assert.doesNotMatch(await p.locator('#receipt-status').innerText(), /\bSaved\b/);
      assert.doesNotMatch(await p.locator('#decision-title').innerText(), /Saved receipt/);
      assert.equal(await p.locator('#confirm-intent').isVisible(), false);
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), unverified);
      await p.evaluate(() => window.__pr32RestoreRemove());
      await p.locator('#confirm-reset').click();
      assert.equal(await p.locator('#screen-list').isVisible(), true);
      assert.equal(await p.evaluate(() => localStorage.getItem('planReviewSnapshot.receipt')), null);
    } finally { await context.close(); }
  });
}
