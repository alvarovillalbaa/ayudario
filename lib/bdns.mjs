const API = 'https://www.infosubvenciones.es/bdnstrans/api/convocatorias/busqueda';
const PORTAL = 'https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias';
const LIMIT = 50;
export const MAX_BODY_BYTES = 1024 * 1024;
export const MAX_TIMEOUT_MS = 15_000;
const NOTICE = 'Selección limitada a 50 convocatorias registradas en los últimos 30 días para personas físicas sin actividad económica. No es un catálogo completo: una convocatoria reciente no implica plazo abierto ni elegibilidad personal.';

export class BdnsError extends Error {
  constructor(code) {
    super(`BDNS refresh refused: ${code}`);
    this.name = 'BdnsError';
    this.code = code;
  }
}

function requireValue(condition, code = 'payload') {
  if (!condition) throw new BdnsError(code);
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function text(value, maximum, { optional = false, multiline = false } = {}) {
  if (optional && (value === null || value === undefined || value === '')) return null;
  requireValue(typeof value === 'string' && value.trim().length > 0
    && value.length <= maximum
    && !(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(value));
  return value;
}

function isoDate(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value), 'metadata');
  const date = new Date(`${value}T00:00:00.000Z`);
  requireValue(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, 'metadata');
  return date;
}

function metadata(fetchedAt, window) {
  requireValue(typeof fetchedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(fetchedAt)
    && Number.isFinite(Date.parse(fetchedAt)) && new Date(fetchedAt).toISOString() === fetchedAt
    && object(window), 'metadata');
  const from = isoDate(window.from);
  const to = isoDate(window.to);
  requireValue(to.getTime() - from.getTime() === 29 * 86_400_000
    && fetchedAt.slice(0, 10) === window.to, 'metadata');
}

/** T2 boundary: parse only the public call-search response, never recipient records. */
export function parseBdnsResponse(payload, { fetchedAt, window } = {}) {
  metadata(fetchedAt, window);
  requireValue(object(payload) && Array.isArray(payload.content));
  const { content, number, size, numberOfElements, totalElements, totalPages, first, last, empty, pageable } = payload;
  requireValue(Number.isSafeInteger(number) && number === 0
    && Number.isSafeInteger(size) && size > 0 && size <= LIMIT
    && content.length <= size && content.length <= LIMIT
    && numberOfElements === content.length && Number.isSafeInteger(totalElements) && totalElements >= content.length
    && Number.isSafeInteger(totalPages) && totalPages === Math.ceil(totalElements / size)
    && first === true && last === (totalPages <= 1) && empty === (content.length === 0)
    && (totalElements === 0 || content.length > 0)
    && object(pageable) && pageable.pageNumber === 0 && pageable.pageSize === size
    && pageable.offset === 0 && pageable.paged === true && pageable.unpaged === false);
  const seen = new Set();
  const items = content.map(row => {
    requireValue(object(row) && typeof row.numeroConvocatoria === 'string'
      && /^[0-9]{1,20}$/u.test(row.numeroConvocatoria) && !seen.has(row.numeroConvocatoria));
    const id = row.numeroConvocatoria;
    seen.add(id);
    const title = text(row.descripcion, 2_000, { multiline: true });
    const agencyParts = [row.nivel1, row.nivel2, row.nivel3]
      .map(value => text(value, 500, { optional: true })).filter(value => value !== null);
    requireValue(agencyParts.length > 0);
    // Retain source date text; it is not a deadline or an inferred open status.
    const registeredAt = text(row.fechaRecepcion, 64);
    return { id, title, agency: [...new Set(agencyParts)].join(' · '), registeredAt,
      sourceUrl: `${PORTAL}/${id}` };
  });
  const upstreamWarning = text(payload.advertencia, 4_096, { optional: true, multiline: true });
  return {
    version: 1,
    source: { name: 'SNPSAP / BDNS — Intervención General de la Administración del Estado', url: PORTAL },
    fetchedAt,
    window: { from: window.from, to: window.to },
    items,
    warning: upstreamWarning ? `${NOTICE}\n${upstreamWarning}` : NOTICE,
  };
}

function requestMetadata(now) {
  requireValue(now instanceof Date && Number.isFinite(now.getTime()), 'metadata');
  const fetchedAt = now.toISOString();
  const end = isoDate(fetchedAt.slice(0, 10));
  const start = new Date(end.getTime() - 29 * 86_400_000);
  const window = { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  const spanishDate = value => `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  const url = new URL(API);
  for (const [key, value] of Object.entries({ vpd: 'GE', page: '0', pageSize: String(LIMIT),
    tiposBeneficiario: '1', fechaDesde: spanishDate(window.from), fechaHasta: spanishDate(window.to),
    order: 'fechaRecepcion', direccion: 'desc' })) url.searchParams.set(key, value);
  return { fetchedAt, window, url };
}

/** Exactly one serialized request. Smaller timeout/body limits are test ports, never larger limits. */
export async function fetchBdnsCalls({ now = new Date(), fetchImpl = globalThis.fetch,
  timeoutMs = MAX_TIMEOUT_MS, maxBytes = MAX_BODY_BYTES } = {}) {
  requireValue(typeof fetchImpl === 'function' && Number.isInteger(timeoutMs) && timeoutMs > 0
    && timeoutMs <= MAX_TIMEOUT_MS && Number.isInteger(maxBytes) && maxBytes > 0 && maxBytes <= MAX_BODY_BYTES,
  'request_options');
  const { fetchedAt, window, url } = requestMetadata(now);
  const controller = new AbortController();
  let timer;
  let timedOut = false;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      const error = new BdnsError('timeout');
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  async function request() {
    const response = await fetchImpl(url.href, { method: 'GET', redirect: 'error', credentials: 'omit',
      headers: { Accept: 'application/json' }, signal: controller.signal });
    requireValue(response.status === 200, 'status');
    requireValue(response.redirected === false && (!response.url || response.url === url.href), 'redirect');
    requireValue(/^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type') ?? ''), 'content_type');
    const length = response.headers.get('content-length');
    requireValue(length === null || /^\d+$/u.test(length) && Number(length) <= maxBytes, 'body_bound');
    requireValue(response.body && typeof response.body.getReader === 'function', 'body');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    let done = false;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) { done = true; break; }
        requireValue(part.value instanceof Uint8Array, 'body');
        bytes += part.value.byteLength;
        requireValue(bytes <= maxBytes, 'body_bound');
        chunks.push(part.value.slice());
      }
    } finally {
      if (!done) {
        controller.abort();
        await reader.cancel().catch(() => {});
      }
      reader.releaseLock();
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    let payload;
    try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
    catch { throw new BdnsError('json'); }
    return parseBdnsResponse(payload, { fetchedAt, window });
  }
  try {
    return await Promise.race([request(), timeout]);
  } catch (error) {
    controller.abort();
    throw timedOut ? new BdnsError('timeout') : error instanceof BdnsError ? error : new BdnsError('network');
  } finally {
    clearTimeout(timer);
  }
}
