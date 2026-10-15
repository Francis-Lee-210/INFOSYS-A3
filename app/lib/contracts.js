import { SANDBOX_BASE_URL } from './config.js';

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
  const raw = safeTrim(link);
  if (raw === '') return { ok: false, reason: 'missing-link' };
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'insecure-protocol' };
  if (url.hostname !== 'sandbox.api.sap.com') return { ok: false, reason: 'wrong-host' };
  if (url.port !== '' && url.port !== '443') return { ok: false, reason: 'wrong-port' };
  const allowedPath = new URL(`${SANDBOX_BASE_URL}/A_BillingDocumentRequest`).pathname;
  if (url.pathname !== allowedPath) return { ok: false, reason: 'wrong-path' };
  const allowedParameters = new Set(['$skiptoken', 'skiptoken', '$format', '$top', '$orderby', '$select', '$filter']);
  for (const key of url.searchParams.keys()) {
    if (!allowedParameters.has(key)) return { ok: false, reason: 'disallowed-query' };
  }
  if (url.username !== '' || url.password !== '' || url.hash !== '') return { ok: false, reason: 'embedded-credentials-or-hash' };
  return { ok: true, url: url.href };
}

export function validateItemContinuation(link, key) {
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
    if (!allowedParameters.has(name)) return { ok: false, reason: 'disallowed-query' };
  }
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
