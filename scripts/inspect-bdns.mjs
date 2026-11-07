// One manual diagnostic. It never writes the public catalogue or emits response values.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { BdnsError, fetchBdnsCalls, parseBdnsResponse, MAX_BODY_BYTES, MAX_TIMEOUT_MS } from '../lib/bdns.mjs';

const EXPECTED_PRODUCER = '65a12fecc1df2f80b65835aa9279c739d06d21ae2b9987e1b4d6a4e4f5e2cd3c';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const kind = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
const report = { version: 1, sourceCommit: process.env.SOURCE_COMMIT ?? null,
  node: process.version, status: 'failed', collectionComplete: false, publicFileWritten: false,
  requestCaptureCalls: 0, networkCalls: 0, errors: [] };

function requireValue(condition, code) {
  if (!condition) throw new Error(code);
}

function shape(value) {
  const result = { type: kind(value) };
  if (typeof value === 'string') Object.assign(result, { codeUnits: value.length,
    utf8Bytes: Buffer.byteLength(value), trimmedCodeUnits: value.trim().length,
    hasAsciiControl: /[\u0000-\u001f\u007f]/u.test(value) });
  if (typeof value === 'number') Object.assign(result, { finite: Number.isFinite(value), safeInteger: Number.isSafeInteger(value) });
  if (Array.isArray(value)) result.length = value.length;
  return result;
}

function keys(value) {
  if (!record(value)) return { type: kind(value), keys: [], count: 0 };
  const names = Object.keys(value);
  return { type: 'object', count: names.length, truncated: names.length > 64,
    keys: names.slice(0, 64).map(name => /^[A-Za-z][A-Za-z0-9_]{0,79}$/u.test(name)
      ? name : { nameWithheld: true, bytes: Buffer.byteLength(name), sha256: sha(name) }) };
}

function pagination(value) {
  const result = {};
  for (const name of ['number', 'size', 'numberOfElements', 'totalElements', 'totalPages',
    'first', 'last', 'empty', 'pageNumber', 'pageSize', 'offset', 'paged', 'unpaged']) {
    const scalar = record(value) ? value[name] : undefined;
    result[name] = { ...shape(scalar), present: record(value) && Object.hasOwn(value, name) };
    if (scalar === null || typeof scalar === 'boolean' || typeof scalar === 'number' && Number.isFinite(scalar)
      || typeof scalar === 'string' && /^-?[0-9]{1,16}$/u.test(scalar)) result[name].value = scalar;
  }
  return result;
}

function rowShape(row, index) {
  if (!record(row)) return { index, type: kind(row) };
  const fields = {};
  for (const name of ['id', 'numeroConvocatoria', 'descripcion', 'descripcionLeng', 'fechaRecepcion',
    'nivel1', 'nivel2', 'nivel3', 'codigoInvente', 'codigoINVENTE']) {
    fields[name] = { present: Object.hasOwn(row, name), ...shape(row[name]) };
  }
  const code = row.numeroConvocatoria;
  fields.numeroConvocatoria.canonicalDigitString = typeof code === 'string' && /^[0-9]{1,20}$/u.test(code);
  fields.numeroConvocatoria.leadingZero = typeof code === 'string' && /^0[0-9]/u.test(code);
  const date = row.fechaRecepcion;
  fields.fechaRecepcion.dateShape = typeof date !== 'string' ? 'not_string'
    : /^\d{4}-\d{2}-\d{2}$/u.test(date) ? 'iso_date'
    : /^\d{4}-\d{2}-\d{2}T/u.test(date) ? 'iso_date_time'
    : /^\d{2}\/\d{2}\/\d{4}$/u.test(date) ? 'day_month_year' : 'other';
  const optionalAgency = value => value === null || value === undefined || value === ''
    || typeof value === 'string' && value.trim().length > 0 && value.length <= 500
      && !/[\u0000-\u001f\u007f]/u.test(value);
  return { index, type: 'object', fields, agencyFieldsWithinProducerBounds:
    [row.nivel1, row.nivel2, row.nivel3].every(optionalAgency),
  hasNonemptyAgency: [row.nivel1, row.nivel2, row.nivel3].some(value => typeof value === 'string' && value.trim().length > 0) };
}

async function captureRequest(now) {
  let captured;
  try {
    await fetchBdnsCalls({ now, fetchImpl: async (url, options) => {
      report.requestCaptureCalls += 1;
      captured = { url, method: options.method, redirect: options.redirect,
        credentials: options.credentials, headers: { ...options.headers }, signalPresent: options.signal instanceof AbortSignal };
      throw new Error('capture_without_network');
    } });
  } catch (error) {
    requireValue(error instanceof BdnsError && error.code === 'network', 'capture_refusal_unexpected');
  }
  requireValue(report.requestCaptureCalls === 1 && captured, 'capture_missing');
  const url = new URL(captured.url);
  requireValue(url.origin === 'https://www.infosubvenciones.es'
    && url.pathname === '/bdnstrans/api/convocatorias/busqueda' && !url.username && !url.password && !url.hash,
  'capture_url_refused');
  requireValue(captured.method === 'GET' && captured.redirect === 'error' && captured.credentials === 'omit'
    && JSON.stringify(captured.headers) === JSON.stringify({ Accept: 'application/json' }) && captured.signalPresent,
  'capture_options_refused');
  report.request = { ...captured, timeoutMs: MAX_TIMEOUT_MS, maxBodyBytes: MAX_BODY_BYTES };
  const iso = value => {
    requireValue(/^\d{2}\/\d{2}\/\d{4}$/u.test(value ?? ''), 'capture_window_refused');
    return `${value.slice(6, 10)}-${value.slice(3, 5)}-${value.slice(0, 2)}`;
  };
  report.parserMetadata = { fetchedAt: now.toISOString(), window: {
    from: iso(url.searchParams.get('fechaDesde')), to: iso(url.searchParams.get('fechaHasta')) } };
  return captured;
}

async function readOnce(captured) {
  const controller = new AbortController();
  let timer;
  let timedOut = false;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error('request_timeout')); }, MAX_TIMEOUT_MS);
  });
  const operation = async () => {
    report.networkCalls += 1;
    const response = await fetch(captured.url, { method: captured.method, redirect: captured.redirect,
      credentials: captured.credentials, headers: captured.headers, signal: controller.signal });
    report.http = { status: response.status, redirected: response.redirected,
      jsonContentType: /^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type') ?? ''),
      responseUrlMatches: response.url === captured.url };
    const declared = response.headers.get('content-length');
    requireValue(declared === null || /^\d+$/u.test(declared) && Number(declared) <= MAX_BODY_BYTES, 'body_declared_bound');
    requireValue(response.body, 'body_missing');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    let complete = false;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) { complete = true; break; }
        bytes += part.value.byteLength;
        requireValue(bytes <= MAX_BODY_BYTES, 'body_stream_bound');
        chunks.push(Buffer.from(part.value));
      }
    } finally {
      if (!complete) { controller.abort(); await reader.cancel().catch(() => {}); }
      reader.releaseLock();
    }
    const body = Buffer.concat(chunks);
    report.body = { bytes: body.length, sha256: sha(body), complete, rawRetained: false };
    requireValue(response.status === 200 && !response.redirected && report.http.responseUrlMatches
      && report.http.jsonContentType, 'http_response_refused');
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
    catch { throw new Error('response_json_refused'); }
  };
  try { return await Promise.race([operation(), deadline]); }
  catch (error) {
    controller.abort();
    const allowed = new Set(['body_declared_bound', 'body_missing', 'body_stream_bound', 'http_response_refused', 'response_json_refused']);
    throw new Error(timedOut ? 'request_timeout' : allowed.has(error.message) ? error.message : 'request_network_refused');
  } finally { clearTimeout(timer); }
}

try {
  requireValue(process.argv.length === 2 && /^[a-f0-9]{40}$/u.test(report.sourceCommit ?? ''), 'source_or_arguments_refused');
  report.producerSha256 = sha(await readFile(new URL('../lib/bdns.mjs', import.meta.url)));
  report.diagnosticSha256 = sha(await readFile(new URL(import.meta.url)));
  requireValue(report.producerSha256 === EXPECTED_PRODUCER, 'producer_changed');
  const captured = await captureRequest(new Date());
  const payload = await readOnce(captured);
  report.root = keys(payload);
  report.pageable = keys(payload?.pageable);
  report.pagination = pagination(payload);
  report.pageableScalars = pagination(payload?.pageable);
  const rows = record(payload) && Array.isArray(payload.content) ? payload.content : [];
  report.content = { ...shape(payload?.content), rowsReported: Math.min(rows.length, 50), truncated: rows.length > 50,
    rows: rows.slice(0, 50).map(rowShape) };
  const ids = rows.slice(0, 50).map(row => record(row) ? row.numeroConvocatoria : undefined);
  report.duplicateCodeRowIndexes = ids.flatMap((id, index) => typeof id === 'string' && ids.indexOf(id) !== index ? [index] : []);
  report.upstreamWarning = { present: record(payload) && Object.hasOwn(payload, 'advertencia'), ...shape(payload?.advertencia) };
  try {
    const result = parseBdnsResponse(payload, report.parserMetadata);
    report.parser = { accepted: true, itemCount: result.items.length, refusal: null };
  } catch (error) {
    report.parser = { accepted: false, refusal: error instanceof BdnsError ? error.code : 'unexpected_parser_error' };
  }
  report.status = 'observed';
  report.collectionComplete = true;
} catch (error) {
  const allowed = new Set(['source_or_arguments_refused', 'producer_changed', 'capture_refusal_unexpected',
    'capture_missing', 'capture_url_refused', 'capture_options_refused', 'capture_window_refused',
    'request_timeout', 'body_declared_bound', 'body_missing', 'body_stream_bound', 'http_response_refused',
    'response_json_refused', 'request_network_refused']);
  report.errors.push(allowed.has(error.message) ? error.message : 'diagnostic_refused');
}
const output = JSON.stringify(report);
if (Buffer.byteLength(output) > 128 * 1024) {
  console.log('AYUDARIO_BDNS_DIAGNOSTIC={"version":1,"status":"failed","errors":["report_bound"],"publicFileWritten":false}');
  process.exitCode = 1;
} else {
  console.log(`AYUDARIO_BDNS_DIAGNOSTIC=${output}`);
  process.exitCode = report.collectionComplete ? 0 : 1;
}
