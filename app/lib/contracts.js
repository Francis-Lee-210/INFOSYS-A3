import { SANDBOX_BASE_URL, INDEXED_COLLECTION_PATH, DEFAULT_TOP, MAX_SKIP, HEADER_SELECT, HEADER_ORDER } from './config.js';

export const ODATA_DATE_RE = /^\/Date\((-?\d+)\)\/$/;

export function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normaliseODataDate(raw) {
  const source = safeTrim(raw);
  if (source === '') return { raw: raw ?? null, value: null, valid: false };
  const match = ODATA_DATE_RE.exec(source);
  if (match) {
    const milliseconds = Number(match[1]);
    if (!Number.isFinite(milliseconds)) return { raw: source, value: null, valid: false };
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) return { raw: source, value: null, valid: false };
    const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    // Ensure the timestamp maps to the same calendar day on round trip.
    const roundTrip = Date.parse(`${iso}T00:00:00.000Z`);
    if (!Number.isFinite(roundTrip) || roundTrip !== Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) {
      return { raw: source, value: null, valid: false };
    }
    return { raw: source, value: iso, valid: true };
  }
  // Allow ordinary ISO YYYY-MM-DD without altering meaning or timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const [year, month, day] = source.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return { raw: source, value: null, valid: false };
    }
    return { raw: source, value: source, valid: true };
  }
  return { raw: source, value: null, valid: false };
}

export function isKnownCurrency(code) {
  const value = safeTrim(code).toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) return false;
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('currency').includes(value);
    } catch {
      // Fall through to the conservative fallback.
    }
  }
  // Conservative fallback for runtimes without Intl.supportedValuesOf.
  const fallback = new Set(['USD', 'EUR', 'GBP', 'NZD', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'ZAR']);
  return fallback.has(value);
}

export function validateDecimalString(raw, options = {}) {
  if (raw === null || raw === undefined || raw === '') return { raw: null, value: null, valid: false, missing: true };
  if (typeof raw !== 'string') return { raw: null, value: null, valid: false, missing: false };
  const source = raw.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(source)) return { raw: source, value: null, valid: false, missing: false };
  const precision = options.precision ?? 60;
  const scale = options.scale ?? 60;
  const [whole, fraction = ''] = source.replace(/^[+-]/, '').split('.');
  const integerDigits = whole.replace(/^0+/, '').length;
  if (fraction.length > scale || integerDigits > precision - scale) return { raw: source, value: null, valid: false, missing: false };
  return { raw: source, value: source, valid: true, missing: false };
}

function isValidKey(value) {
  const key = safeTrim(value);
  return key.length > 0 && key.length <= 10 && /^[A-Za-z0-9._-]+$/.test(key);
}

export function odataQuoteKey(key) {
  const cleaned = safeTrim(key);
  if (!isValidKey(cleaned)) throw new Error('invalid-key');
  const quoted = cleaned.replace(/'/g, "''");
  return encodeURIComponent(quoted).replaceAll("'", '%27');
}

export function validateSubContinuation(link) {
  return validateListDestination(link, true);
}

// The frozen V2 collection declares $skip, not $skiptoken/skiptoken. Support a
// deliberately small subset: fixed projection/order and server-provided offsets.
// Validation and the credential-bearing transport share this exact contract.
export function validateListDestination(link, requireSkip = false) {
  if (typeof link !== 'string' || !link || link.length > 4096) return { ok: false, reason: 'missing-or-invalid-link' };
  const raw = link;
  if (/[\s\\#]/.test(raw) || /%(?![a-f\d]{2})/i.test(raw) || raw.startsWith('//') ||
      /(?:^|\/)(?:\.|%2e){1,2}(?:\/|[?]|$)/i.test(raw)) return { ok: false, reason: 'malformed-url' };
  let url;
  try {
    url = new URL(raw, INDEXED_COLLECTION_PATH);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'insecure-protocol' };
  if (url.hostname !== 'sandbox.api.sap.com') return { ok: false, reason: 'wrong-host' };
  if (url.port !== '' && url.port !== '443') return { ok: false, reason: 'wrong-port' };
  const allowedPath = new URL(`${SANDBOX_BASE_URL}/A_BillingDocumentRequest`).pathname;
  if (url.pathname !== allowedPath) return { ok: false, reason: 'wrong-path' };
  const allowedParameters = new Set(['$skip', '$format', '$top', '$orderby', '$select']);
  for (const name of url.searchParams.keys()) {
    if (!allowedParameters.has(name) || url.searchParams.getAll(name).length !== 1) return { ok: false, reason: 'ambiguous-or-unsupported-query' };
  }
  if (url.username !== '' || url.password !== '' || /^[a-z]+:\/\/[^/]*@/i.test(raw)) return { ok: false, reason: 'embedded-credentials' };
  const params = url.searchParams;
  const skip = params.get('$skip');
  if ((requireSkip && skip === null) || (skip !== null && (!/^(0|[1-9]\d{0,6})$/.test(skip) || Number(skip) > MAX_SKIP))) return { ok: false, reason: 'unsupported-offset' };
  const top = params.get('$top') ?? String(DEFAULT_TOP);
  if (!/^(?:[1-9]|10)$/.test(top)) return { ok: false, reason: 'unsupported-page-size' };
  if ((params.has('$format') && params.get('$format') !== 'json') ||
      (params.has('$orderby') && params.get('$orderby') !== HEADER_ORDER)) return { ok: false, reason: 'changed-query-context' };
  if (params.has('$select')) {
    const fields = params.get('$select').split(',');
    if (fields.length !== new Set(fields).size || [...fields].sort().join(',') !== HEADER_SELECT.split(',').sort().join(',')) return { ok: false, reason: 'changed-projection' };
  }
  const canonical = new URL(INDEXED_COLLECTION_PATH);
  canonical.searchParams.set('$top', top);
  canonical.searchParams.set('$format', 'json');
  canonical.searchParams.set('$select', HEADER_SELECT);
  canonical.searchParams.set('$orderby', HEADER_ORDER);
  // Canonicalise zero to the initial request so cycles cannot hide behind aliases.
  if (Number(skip) > 0) canonical.searchParams.set('$skip', skip);
  return { ok: true, url: canonical.href, top: Number(top) };
}

export function validateItemContinuation(link, key) {
  if (typeof link !== 'string' || link.length > 4096 || /[\s\\#]/.test(link) || /%(?![a-f\d]{2})/i.test(link)) return { ok: false, reason: 'malformed-url' };
  const raw = safeTrim(link);
  if (raw === '') return { ok: false, reason: 'missing-link' };
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: 'invalid-url' }; }
  if (url.protocol !== 'https:') return { ok: false, reason: 'insecure-protocol' };
  if (url.hostname !== 'sandbox.api.sap.com') return { ok: false, reason: 'wrong-host' };
  if (url.port !== '' && url.port !== '443') return { ok: false, reason: 'wrong-port' };
  if (url.username !== '' || url.password !== '' || url.hash !== '') return { ok: false, reason: 'embedded-credentials-or-hash' };
  let expected;
  try { expected = new URL(`${SANDBOX_BASE_URL}/A_BillingDocumentRequest('${odataQuoteKey(key)}')/to_Item`); } catch (error) { return { ok: false, reason: 'invalid-key' }; }
  if (url.pathname !== expected.pathname) return { ok: false, reason: 'wrong-path' };
  const allowedParameters = new Set(['$skiptoken', 'skiptoken', '$format', '$top', '$orderby', '$select', '$filter', '$inlinecount']);
  for (const name of url.searchParams.keys()) {
    if (!allowedParameters.has(name) || url.searchParams.getAll(name).length !== 1) return { ok: false, reason: 'disallowed-or-ambiguous-query' };
  }
  if (url.searchParams.has('$skiptoken') && url.searchParams.has('skiptoken')) return { ok: false, reason: 'ambiguous-token' };
  return { ok: true, url: url.href };
}

export function finiteDecimal(recordAmount) {
  return Boolean(recordAmount && recordAmount.valid);
}

export function currencyRecognized(code) {
  return isKnownCurrency(code);
}

export const CONTRACT_LIMITS = Object.freeze({
  keyMaxLength: 10,
  currencyMaxLength: 5
});
