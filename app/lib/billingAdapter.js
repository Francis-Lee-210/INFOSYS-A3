import { SOURCE_API_ID, SOURCE_API_VERSION, SANDBOX_BASE_URL, LIST_PATH, ITEMS_TOP, REQUEST_TIMEOUT_MS, MAX_RESPONSE_BYTES, REQUEST_SOURCE_PROFILE_ID, SYNTHETIC_SOURCE_PROFILE_ID, HEADER_SELECT, ITEM_SELECT } from './config.js';
import { normaliseODataDate, isKnownCurrency, validateDecimalString, odataQuoteKey, validateSubContinuation, validateListDestination, validateItemContinuation } from './contracts.js';

const ADAPTER_ERROR = Symbol('sanitized-adapter-error');

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error[ADAPTER_ERROR] = true;
  return error;
}

function redactError(status) {
  if (status === 401 || status === 403) return { code: 'AUTH', status, message: 'SAP sandbox rejected or did not recognize the supplied key.' };
  if (status === 429) return { code: 'RATE_LIMIT', status, message: 'SAP sandbox rate limit reached. Try again later.' };
  if (status >= 500) return { code: 'SERVER', status, message: 'SAP sandbox service failure. Try again later.' };
  return { code: 'HTTP', status, message: `SAP sandbox returned HTTP ${status}.` };
}

const UPSTREAM_STATUS = Symbol('upstream-status');
const SELECT_HEADER = HEADER_SELECT;

async function boundedBody(response) {
  const advertised = headerOf(response, 'content-length');
  if (advertised && /^\d+$/.test(advertised) && Number(advertised) > MAX_RESPONSE_BYTES) {
    try { await response.body?.cancel?.(); } catch {}
    throw makeError('PAYLOAD_TOO_LARGE', 'The SAP response exceeded the read limit.');
  }
  if (!response.body?.getReader) {
    const body = await response.text();
    if (Buffer.byteLength(body) > MAX_RESPONSE_BYTES) throw makeError('PAYLOAD_TOO_LARGE', 'The SAP response exceeded the read limit.');
    return body;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw makeError('PAYLOAD_TOO_LARGE', 'The SAP response exceeded the read limit.');
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, bytes).toString('utf8');
  } finally { reader.releaseLock(); }
}

async function fetchUpstream(url, key, transport) {
  let target = new URL(url);
  const base = new URL(SANDBOX_BASE_URL);
  const tail = target.pathname.slice(base.pathname.length);
  if (target.pathname === `${base.pathname}${LIST_PATH}`) {
    const checked = validateListDestination(url);
    if (!checked.ok) throw makeError('DESTINATION', 'The requested destination is outside the configured SAP read contract.');
    target = new URL(checked.url);
  } else if (target.origin !== base.origin || target.username || target.password || target.hash ||
      !target.pathname.startsWith(base.pathname) ||
      !/^\/A_BillingDocumentRequest(?:\('[A-Za-z0-9._-]{1,10}'\)(?:\/to_Item)?)?$/.test(tail) ||
      [...target.searchParams.keys()].some(k => !['$top', '$format', '$select'].includes(k) || target.searchParams.getAll(k).length !== 1) ||
       target.searchParams.get('$format') !== 'json') {
    throw makeError('DESTINATION', 'The requested destination is outside the configured SAP read contract.');
  }
  if (tail !== LIST_PATH && (target.searchParams.get('$select') !== (tail.endsWith('/to_Item') ? ITEM_SELECT : HEADER_SELECT) ||
      target.searchParams.get('$top') !== (tail.endsWith('/to_Item') ? String(ITEMS_TOP) : null))) throw makeError('DESTINATION', 'The requested projection or page bound is outside the configured SAP read contract.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await (transport || globalThis.fetch)(target.href, {
      method: 'GET', headers: { APIKey: key, Accept: 'application/json' }, redirect: 'manual', signal: controller.signal
    });
    if (!response || typeof response.status !== 'number') throw makeError('NETWORK', 'Invalid HTTPS response.');
    if (response.status >= 300 && response.status < 400) throw makeError('REDIRECT', 'SAP returned a redirect; no redirect was followed.');
    if (!response.ok) {
      const category = redactError(response.status);
      throw makeError(category.code, category.message, { retryAfter: parseRetryAfter(response), upstreamStatus: response.status });
    }
    const body = await boundedBody(response);
    let json;
    try { json = JSON.parse(body); } catch { throw makeError('NOT_JSON', 'The SAP response was not JSON.'); }
    if (!json || typeof json !== 'object' || json.error) throw makeError('SAP_ERROR', 'The SAP response did not contain usable OData.');
    Object.defineProperty(json, UPSTREAM_STATUS, { value: response.status });
    return json;
  } catch (error) {
    if (error.name === 'AbortError') throw makeError('TIMEOUT', 'The SAP read timed out. Try again.');
    if (error[ADAPTER_ERROR]) throw error;
    throw makeError('NETWORK', 'The SAP sandbox could not be reached. Check the connection and retry.');
  } finally { clearTimeout(timer); }
}

function headerOf(response, name) {
  try {
    if (typeof response.headers?.get === 'function') return response.headers.get(name);
    return response.headers?.[name] ?? null;
  } catch {
    return null;
  }
}

function parseRetryAfter(response) {
  const value = headerOf(response, 'retry-after');
  if (value === null || value === undefined) return { status: 'missing', delayMs: 0 };
  if (typeof value !== 'string') return { status: 'invalid', delayMs: 0 };
  const raw = value.trim();
  if (/^\d+$/.test(raw)) {
    const digits = raw.replace(/^0+(?=\d)/, '');
    // Never clamp a valid server delay down to a shorter timeout.
    if (digits.length > 16 || BigInt(digits) > BigInt(Math.floor((8640000000000000 - Date.now()) / 1000))) return { status: 'unrepresentable', delayMs: null };
    return { status: 'delay-seconds', delayMs: Number(digits) * 1000 };
  }
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(raw)) {
    const date = Date.parse(raw);
    if (Number.isFinite(date) && new Date(date).toUTCString() === raw) return { status: date <= Date.now() ? 'past' : 'http-date', delayMs: Math.max(0, date - Date.now()) };
  }
  return { status: 'invalid', delayMs: 0 };
}

function readEnvelope(json) {
  if (!json || typeof json !== 'object') return { results: null, continuation: null, count: null, single: null };
  const top = json.d && typeof json.d === 'object' ? json.d : json;
  const results = Array.isArray(top.results) ? top.results : Array.isArray(top.value) ? top.value : Array.isArray(json.value) ? json.value : null;
  const continuation = top.__next ?? json.__next ?? json['@odata.nextLink'] ?? top['@odata.nextLink'] ?? null;
  const count = typeof top.__count === 'string' || typeof top.__count === 'number' ? Number(top.__count) : null;
  const single = results ? null : top;
  return { results, continuation, count, single };
}

function property(record, name) {
  return Object.prototype.hasOwnProperty.call(record || {}, name) ? record[name] : null;
}

function sourceContext(mode) {
  if (mode === 'synthetic') {
    return {
      provenance: 'synthetic-fixture',
      mode: 'synthetic',
      sourceApiId: null,
      sourceApiVersion: null,
      sourceProfileId: SYNTHETIC_SOURCE_PROFILE_ID,
      documentKind: 'synthetic billing document',
      sourceLabel: 'Synthetic fixture',
      transport: 'none (synthetic fixture)'
    };
  }
  const requestFixture = mode === 'fixture';
  return {
    provenance: requestFixture ? 'fixture-demonstration' : 'live-sap-sandbox',
    mode: requestFixture ? 'fixture' : 'live',
    sourceApiId: SOURCE_API_ID,
    sourceApiVersion: SOURCE_API_VERSION,
    sourceProfileId: REQUEST_SOURCE_PROFILE_ID,
    documentKind: 'billing request',
    sourceLabel: requestFixture ? 'Fixture demonstration' : 'Live SAP sandbox',
    transport: requestFixture ? 'none (fixture)' : 'https GET-only'
  };
}

function normaliseContext(record) {
  const payer = property(record, 'PayerParty');
  const account = property(record, 'ContractAccount');
  return {
    payerPartyAvailable: typeof payer === 'string' && payer.trim() !== '' && payer.trim().length <= 10,
    contractAccountAvailable: typeof account === 'string' && account.trim() !== '' && account.trim().length <= 12
  };
}

function normaliseAmounts(record, issues) {
  const definitions = [
    ['net', 'TotalNetAmount', 16, 3],
    ['tax', 'TotalTaxAmount', 14, 3],
    ['gross', 'TotalGrossAmount', 17, 3]
  ];
  const result = {};
  const basis = {};
  for (const [alias, field, precision, scale] of definitions) {
    const validation = validateDecimalString(property(record, field), { precision, scale });
    result[alias] = validation.value;
    if (validation.valid) {
      basis[alias] =
        alias === 'net' ? 'TotalNetAmount (net excluding sales tax, including surcharges and discounts)' :
        alias === 'tax' ? 'TotalTaxAmount (document-currency sales tax)' :
        'TotalGrossAmount (reported gross document amount)';
    } else {
      basis[alias] = null;
      if (!validation.missing && property(record, field) !== null) {
        issues.push(`${field} is not a valid decimal string and cannot be used.`);
      }
    }
  }
  return { amounts: result, basis };
}

function normaliseRecord(record, context = 'live-sap-sandbox') {
  const ctx = typeof context === 'string'
    ? (context.includes('synthetic') ? sourceContext('synthetic') :
       context.includes('fixture') ? sourceContext('fixture') : sourceContext('live'))
    : context;
  const issues = [];
  const rawKey = property(record, 'BillingDocumentRequest');
  const key = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!/^[A-Za-z0-9._-]{1,10}$/.test(key)) issues.push('BillingDocumentRequest is not a valid stable identifier.');
  if (key === '') issues.push('BillingDocumentRequest is empty.');
  else if (key.length > 10) issues.push('BillingDocumentRequest exceeds maxLength 10.');
  const date = normaliseODataDate(property(record, 'BillingDocumentDate'));
  if (!date.valid) issues.push('BillingDocumentDate is missing or not a valid OData /Date value.');
  const currencyRaw = safeTrim(property(record, 'TransactionCurrency'));
  const currencyValid = currencyRaw !== '' && currencyRaw.length <= 5 && isKnownCurrency(currencyRaw);
  if (currencyRaw === '') issues.push('TransactionCurrency is missing.');
  else if (!currencyValid) issues.push(`TransactionCurrency "${currencyRaw}" is not a recognized currency.`);
  const { amounts, basis } = normaliseAmounts(record, issues);
  const hasFiniteAmount = Boolean(amounts.net || amounts.tax || amounts.gross);
  if (!hasFiniteAmount) issues.push('No finite document-level amount is available.');
  const usable = key !== '' && key.length <= 10 && date.valid && currencyValid && hasFiniteAmount && issues.length === 0;
  return {
    sourceApiId: ctx.sourceApiId,
    sourceApiVersion: ctx.sourceApiVersion,
    sourceProfileId: ctx.sourceProfileId,
    configuredSourceLabel: ctx.sourceLabel,
    provenance: ctx.provenance,
    profileMode: ctx.mode,
    documentKind: ctx.documentKind,
    key,
    dateRaw: date.raw,
    dateNormalized: date.value,
    dateValid: date.valid,
    dateMeaning: ctx.mode === 'synthetic' ? 'Synthetic processing date supplied by the fixture; not a payment or service-coverage date.' : 'Date on which the subsequent billing document is processed and booked for accounting purposes. Not a payment or service-coverage date.',
    amounts,
    amountBasis: basis,
    currency: currencyValid ? currencyRaw.toUpperCase() : currencyRaw || null,
    currencyKnown: currencyValid,
    context: normaliseContext(record),
    itemCoverage: null,
    validationIssues: issues,
    usable,
    retrievedAt: new Date().toISOString()
  };
}



export function createAdapter(options = {}) {
  const fixtureMode = options.fixtureMode === true;
  const syntheticMode = options.syntheticMode === true;
  if (fixtureMode && syntheticMode) throw makeError('INVALID_PROFILE', 'Fixture source profiles are mutually exclusive.');
  const apiKey = safeTrim(options.apiKey || '');
  const transport = options.transport || null;

  function requireLiveKey() {
    if (apiKey === '') throw makeError('AUTH', 'A session API key is required before connecting to the live SAP sandbox.');
    if (apiKey.length > 256 || /[\u0000-\u001F\u007F]/.test(apiKey) || !/^[A-Za-z0-9._-]+$/.test(apiKey)) throw makeError('AUTH', 'The supplied API key has an invalid format.');
    return apiKey;
  }

  return {
    async list(continuation = null) {
      if (syntheticMode) {
        if (continuation !== null) throw makeError('DESTINATION', 'The synthetic fixture has no further page.');
        const syntheticModule = await import('./syntheticFixtureData.js');
        const ctx = sourceContext('synthetic');
        const records = syntheticModule.syntheticFixtureRecords.map((record) => normaliseRecord(record, ctx));
        return {
          mode: 'synthetic',
          provenance: 'synthetic-fixture',
          sourceProfileId: SYNTHETIC_SOURCE_PROFILE_ID,
          sourceApiId: null,
          sourceApiVersion: null,
          records,
          continuation: null,
          continuationAvailable: false,
          continuationValidation: 'none', pageCursor: 'synthetic:1', boundedComplete: true,
          loadedCount: records.length,
          usableCount: records.filter((record) => record.usable).length,
          transport: 'none (synthetic fixture)',
          synthetic: true
        };
      }
      if (fixtureMode) {
        const ctx = sourceContext('fixture');
        const fixtureModule = await import('./fixtureData.js');
        if (continuation !== null && continuation !== 'fixture:2') throw makeError('DESTINATION', 'Unsupported fixture page.');
        const secondPage = continuation === 'fixture:2';
        const records = (secondPage ? fixtureModule.fixtureNextRecords : fixtureModule.fixtureRecords).map((record) => normaliseRecord(record, ctx));
        return {
          mode: 'fixture',
          provenance: 'fixture-demonstration',
          sourceProfileId: REQUEST_SOURCE_PROFILE_ID,
          sourceApiId: SOURCE_API_ID,
          sourceApiVersion: SOURCE_API_VERSION,
          records,
          continuation: secondPage ? null : 'fixture:2',
          continuationAvailable: !secondPage,
          continuationValidation: secondPage ? 'none' : 'available', pageCursor: secondPage ? 'fixture:2' : 'fixture:1', boundedComplete: secondPage,
          loadedCount: records.length,
          usableCount: records.filter((record) => record.usable).length,
          transport: 'none (fixture)'
        };
      }
      const checked = continuation === null ? validateListDestination(`${SANDBOX_BASE_URL}${LIST_PATH}`) : validateSubContinuation(continuation);
      if (!checked.ok) throw makeError('DESTINATION', 'Continuation rejected before any SAP request. Restart the list or retry the last valid page.');
      const cleanedKey = requireLiveKey();
      const url = checked.url;
      const json = await fetchUpstream(url, cleanedKey, transport);
      const envelope = readEnvelope(json);
      if (!Array.isArray(envelope.results)) {
        throw makeError('CONTRACT', 'The SAP list response did not contain a result array.');
      }
      if (envelope.results.length > checked.top) throw makeError('CONTRACT', 'The SAP page exceeded the requested bounded page size.');
      const continuationPresented = envelope.continuation !== null;
      const validatedContinuation = validateSubContinuation(envelope.continuation);
      const continuationAvailable = continuationPresented && validatedContinuation.ok;
      const records = envelope.results.map((record) => normaliseRecord(record, 'live-sap-sandbox'));
      const usableCount = records.filter((record) => record.usable).length;
      if (records.length > 0 && usableCount === 0) {
        throw makeError('NO_USABLE_RECORDS', 'Loaded records did not satisfy the minimum usable contract.', { loadedCount: records.length });
      }
      return {
        mode: 'live',
        provenance: 'live-sap-sandbox',
        records,
        continuation: continuationAvailable ? validatedContinuation.url : null,
        continuationAvailable,
        continuationValidation: continuationAvailable ? 'available' : (continuationPresented ? 'rejected' : 'none'),
        loadedCount: records.length,
        usableCount,
        transport: 'https GET-only',
        upstreamStatus: json[UPSTREAM_STATUS],
        sourceApiId: SOURCE_API_ID,
        sourceApiVersion: SOURCE_API_VERSION,
        sourceProfileId: REQUEST_SOURCE_PROFILE_ID,
        pageCursor: url, boundedComplete: false
      };
    },
    async detail(key, selectedKey = null) {
      if (syntheticMode) {
        const syntheticModule = await import('./syntheticFixtureData.js');
        const raw = syntheticModule.syntheticFixtureRecords.find((item) => item.BillingDocumentRequest === safeTrim(key));
        const record = raw ? normaliseRecord(raw, sourceContext('synthetic')) : null;
        if (!record) throw makeError('NOT_FOUND', 'Synthetic billing document was not found.');
        if (selectedKey && safeTrim(selectedKey) !== safeTrim(key)) throw makeError('KEY_MISMATCH', 'Selected key does not match the detail key.');
        return { provenance: 'synthetic-fixture', sourceProfileId: SYNTHETIC_SOURCE_PROFILE_ID, sourceApiId: null, sourceApiVersion: null, record: { ...record }, keyConsistent: true };
      }
      if (fixtureMode) {
        const fixtureModule = await import('./fixtureData.js');
        const raw = [...fixtureModule.fixtureRecords, ...fixtureModule.fixtureNextRecords].find((item) => item.BillingDocumentRequest === safeTrim(key));
        const record = raw ? normaliseRecord(raw, sourceContext('fixture')) : null;
        if (!record) throw makeError('NOT_FOUND', 'Fixture billing request was not found.');
        if (selectedKey && safeTrim(selectedKey) !== safeTrim(key)) throw makeError('KEY_MISMATCH', 'Selected key does not match the detail key.');
        return { provenance: 'fixture-demonstration', sourceProfileId: REQUEST_SOURCE_PROFILE_ID, sourceApiId: SOURCE_API_ID, sourceApiVersion: SOURCE_API_VERSION, record: { ...record }, keyConsistent: true };
      }
      const cleanedKey = requireLiveKey();
      if (selectedKey && safeTrim(selectedKey) !== safeTrim(key)) throw makeError('KEY_MISMATCH', 'Selected key does not match the detail key.');
      const quoted = odataQuoteKey(key);
      const url = `${SANDBOX_BASE_URL}/A_BillingDocumentRequest('${quoted}')?$format=json&$select=${SELECT_HEADER}`;
      const json = await fetchUpstream(url, cleanedKey, transport);
      const envelope = readEnvelope(json);
      const header = envelope.single || (Array.isArray(envelope.results) ? envelope.results[0] : null);
      if (!header || typeof header !== 'object') throw makeError('CONTRACT', 'The SAP detail response did not contain one billing request header.');
      if (safeTrim(property(header, 'BillingDocumentRequest')) !== safeTrim(key)) {
        throw makeError('KEY_MISMATCH', 'The detail key does not match the requested billing request.');
      }
      const record = normaliseRecord(header, 'live-sap-sandbox');
      if (safeTrim(record.key) !== safeTrim(key)) throw makeError('KEY_MISMATCH', 'The detail key does not match the requested billing request.');
      if (!record.usable) throw makeError('NO_USABLE_RECORDS', 'Detail response did not satisfy the minimum usable contract.');
      return { provenance: 'live-sap-sandbox', sourceProfileId: REQUEST_SOURCE_PROFILE_ID, sourceApiId: SOURCE_API_ID, sourceApiVersion: SOURCE_API_VERSION, record, keyConsistent: true, upstreamStatus: json[UPSTREAM_STATUS] };
    },
    async items(key) {
      const cleanedKey = safeTrim(key);
      if (!/^[A-Za-z0-9._-]{1,10}$/.test(cleanedKey)) throw makeError('INVALID_KEY', 'A valid document key is required for item navigation.');
      const ctx = sourceContext(syntheticMode ? 'synthetic' : (fixtureMode ? 'fixture' : 'live'));
      const result = (value, parentVerified = true) => ({
        ...value, rows: value.rows || [], complete: value.complete === true,
        sourceApiId: ctx.sourceApiId, sourceApiVersion: ctx.sourceApiVersion,
        sourceProfileId: ctx.sourceProfileId, provenance: ctx.provenance,
        parentKey: cleanedKey, parentVerified
      });
      const normalizeRows = rows => rows.map(item => ({
        parentKey: item.BillingDocumentRequest,
        itemKey: typeof item.BillingDocumentRequestItem === 'string' && /^[A-Za-z0-9._-]{1,6}$/.test(item.BillingDocumentRequestItem.trim()) ? item.BillingDocumentRequestItem.trim() : null,
        netAmount: validateDecimalString(item.NetAmount, { precision: 16, scale: 3 }).value,
        taxAmount: validateDecimalString(item.TaxAmount, { precision: 14, scale: 3 }).value,
        grossAmount: validateDecimalString(item.GrossAmount, { precision: 16, scale: 3 }).value,
        currency: isKnownCurrency(item.TransactionCurrency) ? item.TransactionCurrency.trim().toUpperCase() : null
      }));
      if (syntheticMode) {
        const syntheticModule = await import('./syntheticFixtureData.js');
        if (!syntheticModule.syntheticFixtureRecords.some(record => record.BillingDocumentRequest === cleanedKey)) throw makeError('NOT_FOUND', 'Synthetic billing document was not found.');
        const rows = syntheticModule.syntheticItemRows[cleanedKey] || [];
        if (!rows.every(row => row?.BillingDocumentRequest === cleanedKey)) return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Synthetic item parent linkage could not be verified.' }, false);
        return result({ status: rows.length ? 'complete' : 'absent', count: rows.length, rows: normalizeRows(rows), hasContinuation: false, complete: true, note: 'Synthetic fixture explicitly declares bounded complete item coverage. Fixture-only semantics, not SAP history.' });
      }
      if (fixtureMode) return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Item-level raw evidence is not fetched in fixture mode for this scope.' }, null);
      const liveKey = requireLiveKey();
      const quoted = odataQuoteKey(cleanedKey);
      const url = `${SANDBOX_BASE_URL}/A_BillingDocumentRequest('${quoted}')/to_Item?$top=${ITEMS_TOP}&$format=json&$select=${ITEM_SELECT}`;
      try {
        const json = await fetchUpstream(url, liveKey, transport);
        const envelope = readEnvelope(json);
        if (!Array.isArray(envelope.results)) return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Item navigation did not contain a recognizable result array.' }, null);
        if (envelope.results.length > ITEMS_TOP) return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Item navigation exceeded the bounded page size.' }, null);
        const rawContinuation = envelope.continuation;
        const presented = rawContinuation !== null && rawContinuation !== undefined;
        if (presented && typeof rawContinuation !== 'string') return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Item navigation continuation was rejected before use: malformed-continuation-type.' }, false);
        const continuation = presented ? safeTrim(rawContinuation) : '';
        const continuationCheck = presented ? validateItemContinuation(continuation, cleanedKey) : { ok: true };
        if (!continuationCheck.ok) return result({ status: 'unavailable', count: 0, hasContinuation: false, note: `Item navigation continuation was rejected before use: ${continuationCheck.reason}.` }, false);
        const hasContinuation = Boolean(continuation);
        const parentsVerified = envelope.results.every(item => item && typeof item === 'object' && item.BillingDocumentRequest === cleanedKey);
        if (!parentsVerified) return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Item parent linkage could not be verified before any result was counted.' }, false);
        const rows = normalizeRows(envelope.results);
        const unavailableFields = rows.some(row => !row.itemKey || !row.currency) || envelope.results.some(item => [['NetAmount', 16], ['TaxAmount', 14], ['GrossAmount', 16]].some(([field, precision]) => { const checked = validateDecimalString(item[field], { precision, scale: 3 }); return !checked.valid && !checked.missing; }));
        const fieldNote = unavailableFields ? ' Missing or invalid optional item fields remain Unknown / Not available; header currency is never inherited.' : '';
        if (hasContinuation) return result({ status: 'partial', count: rows.length, rows, hasContinuation: true, note: (rows.length ? 'Item navigation returned rows and a verified continuation; coverage is partial only and was not summed.' : 'Item navigation returned no rows but provided a continuation; coverage remains partial and was not declared absent or complete.') + fieldNote });
        if (rows.length === 0) return result({ status: 'absent', count: 0, hasContinuation: false, note: 'Item navigation returned no item rows and no continuation.' });
        const extra = rows.length >= ITEMS_TOP ? ' absence of next after a full page is not proof of complete coverage.' : ' no amounts were summed.';
        return result({ status: 'partial', count: rows.length, rows, hasContinuation: false, note: 'Item navigation returned verified parent rows with bounded loaded coverage;' + extra + fieldNote });
      } catch (error) {
        return result({ status: 'unavailable', count: 0, hasContinuation: false, note: 'Optional item navigation could not be read; no item amounts were invented.', recovery: { code: error.code, message: error.message, retryAfter: error.details?.retryAfter ?? null } }, null);
      }
    },
    validateContinuation(link) {
      return validateSubContinuation(link);
    }
  };
}

export { makeError };
