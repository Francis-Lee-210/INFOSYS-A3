import { SOURCE_API_ID, SOURCE_API_VERSION, SANDBOX_BASE_URL, LIST_PATH, DEFAULT_TOP, ITEMS_TOP, REQUEST_TIMEOUT_MS, MAX_RESPONSE_BYTES } from './config.js';
import { normaliseODataDate, isKnownCurrency, validateDecimalString, odataQuoteKey, validateSubContinuation, validateItemContinuation } from './contracts.js';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function redactError(status) {
  if (status === 401 || status === 403) return { code: 'AUTH', status, message: 'SAP sandbox rejected or did not recognize the supplied key.' };
  if (status === 429) return { code: 'RATE_LIMIT', status, message: 'SAP sandbox rate limit reached. Try again later.' };
  if (status >= 500) return { code: 'SERVER', status, message: 'SAP sandbox service failure. Try again later.' };
  return { code: 'HTTP', status, message: `SAP sandbox returned HTTP ${status}.` };
}

const UPSTREAM_STATUS = Symbol('upstream-status');
const SELECT_HEADER = 'BillingDocumentRequest,BillingDocumentDate,TotalNetAmount,TotalTaxAmount,TotalGrossAmount,TransactionCurrency,PayerParty,ContractAccount';

async function fetchUpstream(url, key, transport) {
  const target = new URL(url);
  const base = new URL(SANDBOX_BASE_URL);
  const tail = target.pathname.slice(base.pathname.length);
  if (target.origin !== base.origin || target.username || target.password || target.hash ||
      !target.pathname.startsWith(base.pathname) ||
      !/^\/A_BillingDocumentRequest(?:\('[A-Za-z0-9._-]{1,10}'\)(?:\/to_Item)?)?$/.test(tail) ||
      [...target.searchParams.keys()].some(k => !['$top', '$format', '$select'].includes(k) || target.searchParams.getAll(k).length !== 1) ||
      target.searchParams.get('$format') !== 'json') {
    throw makeError('DESTINATION', 'The requested destination is outside the configured SAP read contract.');
  }
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
      throw makeError(category.code, category.message, { retryAfter: parseRetryAfter(response) });
    }
    const body = await response.text();
    if (Buffer.byteLength(body) > MAX_RESPONSE_BYTES) throw makeError('PAYLOAD_TOO_LARGE', 'The SAP response exceeded the read limit.');
    let json;
    try { json = JSON.parse(body); } catch { throw makeError('NOT_JSON', 'The SAP response was not JSON.'); }
    if (!json || typeof json !== 'object' || json.error) throw makeError('SAP_ERROR', 'The SAP response did not contain usable OData.');
    Object.defineProperty(json, UPSTREAM_STATUS, { value: response.status });
    return json;
  } catch (error) {
    if (error.name === 'AbortError') throw makeError('TIMEOUT', 'The SAP read timed out. Try again.');
    if (error.code && error.details) throw error;
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
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 3600) return seconds;
  return null;
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

function normaliseRecord(record, provenance) {
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
    sourceApiId: SOURCE_API_ID,
    sourceApiVersion: SOURCE_API_VERSION,
    provenance,
    documentKind: 'billing request',
    key,
    dateRaw: date.raw,
    dateNormalized: date.value,
    dateValid: date.valid,
    dateMeaning: 'Date on which the subsequent billing document is processed and booked for accounting purposes. Not a payment or service-coverage date.',
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
  const apiKey = safeTrim(options.apiKey || '');
  const transport = options.transport || null;

  function requireLiveKey() {
    if (apiKey === '') throw makeError('AUTH', 'A session API key is required before connecting to the live SAP sandbox.');
    if (apiKey.length > 256 || /[\u0000-\u001F\u007F]/.test(apiKey) || !/^[A-Za-z0-9._-]+$/.test(apiKey)) throw makeError('AUTH', 'The supplied API key has an invalid format.');
    return apiKey;
  }

  return {
    async list() {
      if (fixtureMode) {
        const fixtureModule = await import('./fixtureData.js');
        const records = fixtureModule.fixtureRecords.map((record) => normaliseRecord(record, 'fixture-demonstration'));
        return {
          mode: 'fixture',
          provenance: 'fixture-demonstration',
          records,
          continuation: null,
          continuationAvailable: false,
          loadedCount: records.length,
          usableCount: records.filter((record) => record.usable).length,
          transport: 'none (fixture)',
          sourceApiId: SOURCE_API_ID,
          sourceApiVersion: SOURCE_API_VERSION
        };
      }
      const cleanedKey = requireLiveKey();
      const url = `${SANDBOX_BASE_URL}${LIST_PATH}?$top=${DEFAULT_TOP}&$format=json&$select=${SELECT_HEADER}`;
      const json = await fetchUpstream(url, cleanedKey, transport);
      const envelope = readEnvelope(json);
      if (!Array.isArray(envelope.results)) {
        throw makeError('CONTRACT', 'The SAP list response did not contain a result array.');
      }
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
        continuation: continuationAvailable ? envelope.continuation : null,
        continuationAvailable,
        continuationValidation: continuationAvailable ? 'available' : (continuationPresented ? 'rejected' : 'none'),
        loadedCount: records.length,
        usableCount,
        transport: 'https GET-only',
        upstreamStatus: json[UPSTREAM_STATUS],
        sourceApiId: SOURCE_API_ID,
        sourceApiVersion: SOURCE_API_VERSION
      };
    },
    async detail(key, selectedKey = null) {
      if (fixtureMode) {
        const fixtureModule = await import('./fixtureData.js');
        const raw = fixtureModule.fixtureRecords.find((item) => item.BillingDocumentRequest === safeTrim(key));
        const record = raw ? normaliseRecord(raw, 'fixture-demonstration') : null;
        if (!record) throw makeError('NOT_FOUND', 'Fixture billing request was not found.');
        if (selectedKey && safeTrim(selectedKey) !== safeTrim(key)) throw makeError('KEY_MISMATCH', 'Selected key does not match the detail key.');
        return { provenance: 'fixture-demonstration', record: { ...record }, keyConsistent: true };
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
      return { provenance: 'live-sap-sandbox', record, keyConsistent: true, upstreamStatus: json[UPSTREAM_STATUS] };
    },
    async items(key) {
      const cleanedKey = safeTrim(key);
      if (cleanedKey === '') throw makeError('INVALID_KEY', 'A billing request key is required for item navigation.');
      if (fixtureMode) {
        return { status: 'unavailable', count: 0, hasContinuation: false, note: 'Item-level raw evidence is not fetched in fixture mode for this scope.' };
      }
      const liveKey = requireLiveKey();
      const quoted = odataQuoteKey(cleanedKey);
      const url = `${SANDBOX_BASE_URL}/A_BillingDocumentRequest('${quoted}')/to_Item?$top=${ITEMS_TOP}&$format=json&$select=BillingDocumentRequest,BillingDocumentRequestItem`;
      try {
        const json = await fetchUpstream(url, liveKey, transport);
        const envelope = readEnvelope(json);
        if (!Array.isArray(envelope.results)) {
          return { status: 'unavailable', count: 0, hasContinuation: false, note: 'Item navigation did not contain a recognizable result array.' };
        }
        const rawContinuation = envelope.continuation;
        const presented = rawContinuation !== null && rawContinuation !== undefined;
        if (presented && typeof rawContinuation !== 'string') {
          return { status: 'unavailable', count: 0, hasContinuation: false, note: 'Item navigation continuation was rejected before use: malformed-continuation-type.' };
        }
        const continuation = presented ? safeTrim(rawContinuation) : '';
        const continuationCheck = presented ? validateItemContinuation(continuation, cleanedKey) : { ok: true };
        if (!continuationCheck.ok) {
          return { status: 'unavailable', count: 0, hasContinuation: false, note: `Item navigation continuation was rejected before use: ${continuationCheck.reason}.` };
        }
        const hasContinuation = Boolean(continuation);
        const parentsVerified = envelope.results.length === 0 || envelope.results.every((item) =>
          typeof item === 'object' && item !== null &&
          typeof item.BillingDocumentRequest === 'string' &&
          item.BillingDocumentRequest === cleanedKey
        );
        if (envelope.results.length > 0 && !parentsVerified) {
          return { status: 'unavailable', count: 0, hasContinuation: false, note: 'Item parent linkage could not be verified before any result was counted.' };
        }
        if (hasContinuation) {
          if (envelope.results.length === 0) {
            return { status: 'partial', count: 0, hasContinuation: true, note: 'Item navigation returned no rows but provided a continuation; coverage remains partial and was not declared absent or complete.' };
          }
          return { status: 'partial', count: envelope.results.length, hasContinuation: true, note: 'Item navigation returned rows and a verified continuation; coverage is partial only and was not summed.' };
        }
        if (envelope.results.length === 0) {
          return { status: 'absent', count: 0, hasContinuation: false, note: 'Item navigation returned no item rows and no continuation.' };
        }
        const extra = envelope.results.length >= ITEMS_TOP
          ? ' absence of next after a full page is not proof of complete coverage.'
          : ' no amounts were summed.';
        return { status: 'partial', count: envelope.results.length, hasContinuation: false, note: 'Item navigation returned verified parent rows with bounded loaded coverage;' + extra };
      } catch {
        return { status: 'unavailable', count: 0, hasContinuation: false, note: 'Optional item navigation could not be read; no item amounts were invented.' };
      }
    },
    validateContinuation(link) {
      return validateSubContinuation(link);
    }
  };
}

export { makeError };
