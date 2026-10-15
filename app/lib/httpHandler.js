import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdapter } from './billingAdapter.js';
import { validateSubContinuation } from './contracts.js';
import { SOURCE_API_ID, SOURCE_API_VERSION, SANDBOX_BASE_URL } from './config.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const APP_ROOT = resolve(__dirname, '..');
const ALLOWED_STATIC_ROOT = resolve(APP_ROOT);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function allowedHosts(port) {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

function allowedOrigins(port) {
  return new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
}

function sendJson(res, status, body, requestOrigin, port) {
  const payload = JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  const origins = allowedOrigins(port);
  if (requestOrigin && origins.has(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(payload);
}

function sendError(res, status, code, message, requestOrigin, port) {
  sendJson(res, status, { error: { code, message } }, requestOrigin, port);
}

function readBodyAllowed(res) {
  // GET-only: no request body is read.
  return true;
}

function requestPort(req, fallback) {
  // Port is controlled by the server listener, not the Host header.
  return fallback;
}

function safeHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : (value || '');
}

function getApiKey(req) {
  const candidates = ['x-sap-api-key', 'x-sap-apikey', 'x-api-key', 'apikey'];
  for (const name of candidates) {
    const value = safeHeader(req, name);
    if (value && value.trim() !== '') return value.trim();
  }
  return '';
}

function resolveDataMode(searchParams) {
  if (searchParams.getAll('mode').length > 1) return null;
  const mode = safeParam(searchParams, 'mode').toLowerCase();
  if (['synthetic', 'synthetic-fixture', 'contract', 'contract-fixture', 'synthetic-contract', 'synthetic-billing-document'].includes(mode)) return 'synthetic';
  if (mode === 'fixture' || mode === 'demo') return 'fixture';
  if (mode === 'live') return 'live';
  if (mode !== '') return null;
  return safeParam(searchParams, 'fixture') === '1' || safeParam(searchParams, 'demo') === 'true' ? 'fixture' : 'live';
}

function compatibleProfile(params, mode) {
  const expected = mode === 'synthetic' ? 'synthetic-billing-document-v1' : 'billing-document-request-v1';
  return ['profile', 'sourceProfile', 'sourceProfileId'].every(name => params.getAll(name).length <= 1 && (!params.has(name) || safeParam(params, name) === expected));
}

function safeParam(params, name) {
  const value = params.get(name);
  return value === null ? '' : String(value).trim();
}

function parsePath(url) {
  try {
    return new URL(url, 'http://127.0.0.1');
  } catch {
    return null;
  }
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isLoopbackPathSegment(value) {
  return /^[^\s\u0000-\u001f\u007f<>"]+$/.test(value) && value.length <= 128;
}

function sanitizeAdapterError(error) {
  return {
    code: error?.code || 'ERROR',
    message: error?.message || 'The request failed.',
    retryAfter: error?.details?.retryAfter ?? null
  };
}

function adapterFromRequest(req, modeKind, transport) {
  const synthetic = modeKind === 'synthetic';
  const fixture = modeKind === 'fixture';
  const apiKey = (fixture || synthetic) ? '' : getApiKey(req);
  return createAdapter({ fixtureMode: fixture, syntheticMode: synthetic, apiKey, transport: transport || null });
}

async function handleApi(req, res, pathname, searchParams, port, requestOrigin, transport) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', requestOrigin, port);
    return;
  }
  if (pathname === '/api/health' || pathname === '/api/status') {
    sendJson(res, 200, {
      ok: true,
      sourceApi: SOURCE_API_ID,
      sourceApiVersion: SOURCE_API_VERSION,
      host: '127.0.0.1',
      port
    }, requestOrigin, port);
    return;
  }
  if (pathname === '/api/source' || pathname === '/api/config') {
    sendJson(res, 200, {
      sourceApi: SOURCE_API_ID,
      sourceApiVersion: SOURCE_API_VERSION,
      allowlistedHost: 'sandbox.api.sap.com',
      transport: 'https GET-only',
      mode: 'live-source'
    }, requestOrigin, port);
    return;
  }
  if (pathname === '/api/billing-requests' || pathname === '/api/billingRequests') {
    const modeKind = resolveDataMode(searchParams);
    if (!modeKind) { sendError(res, 400, 'INVALID_MODE', 'The requested source mode is not allowed.', requestOrigin, port); return; }
    if (!compatibleProfile(searchParams, modeKind)) { sendError(res, 400, 'INVALID_PROFILE', 'The requested source profile is not allowed for this mode.', requestOrigin, port); return; }
    const adapter = adapterFromRequest(req, modeKind, transport);
    try {
      const result = await adapter.list();
      sendJson(res, 200, result, requestOrigin, port);
    } catch (error) {
      const sanitized = sanitizeAdapterError(error);
      sendJson(res, statusForError(sanitized.code), { error: sanitized }, requestOrigin, port);
    }
    return;
  }
  const detailMatch = pathname.match(/^\/api\/billing-requests\/([^/]+)$/);
  if (detailMatch) {
    let key = decodePath(detailMatch[1]);
    if (key === null || !isLoopbackPathSegment(key)) {
      sendError(res, 400, 'INVALID_KEY', 'Invalid billing request key.', requestOrigin, port);
      return;
    }
    const modeKind = resolveDataMode(searchParams);
    if (!modeKind) { sendError(res, 400, 'INVALID_MODE', 'The requested source mode is not allowed.', requestOrigin, port); return; }
    if (!compatibleProfile(searchParams, modeKind)) { sendError(res, 400, 'INVALID_PROFILE', 'The requested source profile is not allowed for this mode.', requestOrigin, port); return; }
    const selected = safeParam(searchParams, 'selected');
    const adapter = adapterFromRequest(req, modeKind, transport);
    try {
      const result = await adapter.detail(key, selected || key);
      sendJson(res, 200, result, requestOrigin, port);
    } catch (error) {
      const sanitized = sanitizeAdapterError(error);
      sendJson(res, statusForError(sanitized.code), { error: sanitized }, requestOrigin, port);
    }
    return;
  }
  const itemsMatch = pathname.match(/^\/api\/billing-requests\/([^/]+)\/items$/);
  if (itemsMatch) {
    let key = decodePath(itemsMatch[1]);
    if (key === null || !isLoopbackPathSegment(key)) {
      sendError(res, 400, 'INVALID_KEY', 'Invalid billing request key.', requestOrigin, port);
      return;
    }
    const modeKind = resolveDataMode(searchParams);
    if (!modeKind) { sendError(res, 400, 'INVALID_MODE', 'The requested source mode is not allowed.', requestOrigin, port); return; }
    if (!compatibleProfile(searchParams, modeKind)) { sendError(res, 400, 'INVALID_PROFILE', 'The requested source profile is not allowed for this mode.', requestOrigin, port); return; }
    const adapter = adapterFromRequest(req, modeKind, transport);
    try {
      const result = await adapter.items(key);
      sendJson(res, 200, result, requestOrigin, port);
    } catch (error) {
      const sanitized = sanitizeAdapterError(error);
      sendJson(res, statusForError(sanitized.code), { error: sanitized }, requestOrigin, port);
    }
    return;
  }
  if (pathname === '/api/billing-requests/continuation' || pathname === '/api/continuation') {
    const link = safeParam(searchParams, 'link') || safeParam(searchParams, 'next');
    const result = validateSubContinuation(link);
    sendJson(res, result.ok ? 200 : 400, result, requestOrigin, port);
    return;
  }
  if (pathname === '/api/evidence' || pathname === '/api/b0-evidence' || pathname === '/api/b0') {
    // The adapter does not retain live data globally. Return sanitized static/provenance metadata only.
    // Parent performs actual live reads; this endpoint intentionally exposes no keys, IDs, amounts,
    // account IDs or raw bodies.
    sendJson(res, 200, {
      timestamp: new Date().toISOString(),
      sourceApi: SOURCE_API_ID,
      sourceApiVersion: SOURCE_API_VERSION,
      transport: 'https GET-only (live) / none (fixture)',
      localApiTransport: 'http GET-only',
      getOnly: true,
      rawBodiesStored: false,
      credentialIncluded: false,
      note: 'Live read evidence is collected separately with a locally supplied key. Fixture tests do not set B0 to passed.'
    }, requestOrigin, port);
    return;
  }
  sendError(res, 404, 'NOT_FOUND', 'Unknown API endpoint.', requestOrigin, port);
}

function statusForError(code) {
  if (code === 'INVALID_KEY' || code === 'DESTINATION') return 400;
  if (code === 'AUTH') return 401;
  if (code === 'RATE_LIMIT') return 429;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'REDIRECT') return 502;
  if (code === 'CONTRACT' || code === 'KEY_MISMATCH' || code === 'NO_USABLE_RECORDS') return 422;
  if (code === 'METHOD_NOT_ALLOWED') return 405;
  return 502;
}

function serveStatic(req, res, pathname, port, requestOrigin) {
  if (!['/', '/index.html', '/app.mjs', '/styles.css'].includes(pathname)) {
    sendError(res, 404, 'NOT_FOUND', 'Static resource not found.', requestOrigin, port); return;
  }
  let relative = pathname === '/' ? '/index.html' : pathname;
  relative = relative.replace(/^\/+/, '');
  const filePath = resolve(ALLOWED_STATIC_ROOT, relative);
  if (!filePath.startsWith(ALLOWED_STATIC_ROOT + sep) && filePath !== resolve(ALLOWED_STATIC_ROOT, 'index.html')) {
    sendError(res, 403, 'FORBIDDEN', 'Path traversal is not allowed.', requestOrigin, port);
    return;
  }
  readFile(filePath).then((data) => {
    const mime = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  }).catch(() => {
    sendError(res, 404, 'NOT_FOUND', 'Static resource not found.', requestOrigin, port);
  });
}

export function createHandler(options = {}) {
  const port = Number.isInteger(options.port) ? options.port : 6285;
  const injectedTransportFactory = options.transportFactory || null;
  return async (req, res) => {
    const host = safeHeader(req, 'host');
    const hosts = allowedHosts(port);
    if (!hosts.has(host)) {
      sendError(res, 403, 'BAD_HOST', 'Host header is not allowed.', safeHeader(req, 'origin'), port);
      return;
    }
    const origin = safeHeader(req, 'origin');
    const origins = allowedOrigins(port);
    if (origin && !origins.has(origin)) {
      sendError(res, 403, 'BAD_ORIGIN', 'Origin is not allowed.', origin, port);
      return;
    }
    const parsed = parsePath(req.url || '/');
    if (!parsed) {
      sendError(res, 400, 'BAD_REQUEST', 'Invalid request URL.', origin, port);
      return;
    }
    if (parsed.pathname.startsWith('/api/')) {
      await handleApi(req, res, parsed.pathname, parsed.searchParams, port, origin, options.transport || null);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and HEAD are allowed for static resources.', origin, port);
      return;
    }
    await serveStatic(req, res, parsed.pathname, port, origin);
  };
}

export function createServerInstance(options = {}) {
  const port = Number.isInteger(options.port) ? options.port : 6285;
  const host = '127.0.0.1';
  const handler = createHandler({ port, transport: options.transport || null });
  const server = createServer(handler);
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return { server, host, port };
}
