/** Tier 2 integration: authored public API fixtures and disposable filesystem; no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BdnsError, MAX_BODY_BYTES, fetchBdnsCalls, parseBdnsResponse } from '../../lib/bdns.mjs';
import { refreshCalls } from '../../scripts/refresh-calls.mjs';

const now = new Date('2026-11-07T08:30:00.000Z');
const meta = { fetchedAt: now.toISOString(), window: { from: '2026-10-09', to: '2026-11-07' } };
const row = () => ({ id: 999, numeroConvocatoria: '891459', descripcion: 'Convocatoria pública de ejemplo',
  fechaRecepcion: '2026-11-06', nivel1: 'ESTADO', nivel2: 'Órgano de ejemplo', nivel3: null,
  sourceUrl: 'https://untrusted.invalid/not-used', abierto: true });
function fixture(rows = [row()], { total = rows.length, size = 50 } = {}) {
  const pages = Math.ceil(total / size);
  return { content: rows, pageable: { pageNumber: 0, pageSize: size, offset: 0, paged: true, unpaged: false },
    totalElements: total, totalPages: pages, last: pages <= 1, first: true, size, number: 0,
    numberOfElements: rows.length, empty: rows.length === 0, advertencia: 'Aviso oficial.\nOrigen: IGAE.' };
}
const response = (value, options = {}) => new Response(JSON.stringify(value),
  { status: 200, headers: { 'content-type': 'application/json' }, ...options });
const fetchFixture = value => async () => response(value);
const refused = code => error => error instanceof BdnsError && error.code === code;

test('T2 parser preserves public source metadata and constructs official stable links', () => {
  const source = fixture();
  const before = structuredClone(source);
  const result = parseBdnsResponse(source, meta);
  assert.deepEqual(source, before);
  assert.deepEqual(result.items, [{ id: '891459', title: 'Convocatoria pública de ejemplo',
    agency: 'ESTADO · Órgano de ejemplo', registeredAt: '2026-11-06',
    sourceUrl: 'https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias/891459' }]);
  assert.deepEqual(result.window, meta.window);
  assert.equal(result.fetchedAt, meta.fetchedAt);
  assert.match(result.source.name, /Intervención General/u);
  assert.match(result.warning, /No es un catálogo completo/u);
  assert.match(result.warning, /Aviso oficial\.\nOrigen: IGAE\./u);
  assert.equal(Object.hasOwn(result.items[0], 'abierto'), false);
});

test('T2 parser preserves bounded registration text without deadline coercion', () => {
  const source = fixture();
  source.content[0].fechaRecepcion = '2026-11-06T00:00:00';
  source.content[0].nivel3 = source.content[0].nivel2;
  const result = parseBdnsResponse(source, meta);
  assert.equal(result.items[0].registeredAt, '2026-11-06T00:00:00');
  assert.equal(result.items[0].agency, 'ESTADO · Órgano de ejemplo');
});

test('T2 public titles round-trip TAB LF and CR without changing their text', () => {
  const source = fixture();
  const title = 'Ayuda\tcon separación\nsegunda línea\r\ntercera línea';
  source.content[0].descripcion = title;
  const result = parseBdnsResponse(source, meta);
  assert.equal(result.items[0].title, title);
  assert.deepEqual(Buffer.from(result.items[0].title), Buffer.from(title));
});

test('T2 public titles still refuse NUL DEL and other non-whitespace controls', () => {
  for (const code of [0, 1, 11, 12, 31, 127]) {
    const source = fixture();
    source.content[0].descripcion = `Ayuda${String.fromCharCode(code)}pública`;
    assert.throws(() => parseBdnsResponse(source, meta), refused('payload'));
  }
});

test('T2 a genuinely empty validated response remains a dated bounded snapshot', () => {
  const source = fixture([]);
  delete source.advertencia;
  const result = parseBdnsResponse(source, meta);
  assert.deepEqual(result.items, []);
  assert.equal(result.fetchedAt, meta.fetchedAt);
  assert.match(result.warning, /50 convocatorias/u);
});

test('T2 parser refuses malformed root and inconsistent or excessive pagination', () => {
  for (const value of [null, [], {}, { ...fixture(), content: {} }, { ...fixture(), number: 1 },
    { ...fixture(), numberOfElements: 0 }, { ...fixture(), totalPages: 3 },
    { ...fixture(), first: false }, { ...fixture(), last: false },
    { ...fixture(), pageable: { ...fixture().pageable, offset: 50 } },
    fixture(Array.from({ length: 51 }, (_, i) => ({ ...row(), numeroConvocatoria: String(i + 1) })), { size: 51 })]) {
    assert.throws(() => parseBdnsResponse(value, meta), refused('payload'));
  }
});

test('T2 parser refuses duplicate/nonstring IDs and missing or oversized metadata', () => {
  for (const rows of [[row(), row()], [{ ...row(), numeroConvocatoria: 891459 }],
    [{ ...row(), numeroConvocatoria: '../1' }], [{ ...row(), descripcion: '' }],
    [{ ...row(), descripcion: 'x'.repeat(2001) }], [{ ...row(), fechaRecepcion: 'x'.repeat(65) }],
    [{ ...row(), fechaRecepcion: '2026\u0000' }], [{ ...row(), nivel1: null, nivel2: null }]]) {
    assert.throws(() => parseBdnsResponse(fixture(rows), meta), refused('payload'));
  }
});

test('T2 parser refuses invented refresh metadata and wrong 30-day windows', () => {
  for (const metadata of [{}, { ...meta, fetchedAt: null }, { ...meta, fetchedAt: 'not-a-date' },
    { ...meta, window: { from: '2026-10-08', to: '2026-11-07' } },
    { ...meta, window: { from: '2026-02-30', to: '2026-03-29' } },
    { ...meta, window: { from: '2026-10-08', to: '2026-11-06' } }]) {
    assert.throws(() => parseBdnsResponse(fixture(), metadata), refused('metadata'));
  }
});

test('T2 fetch makes exactly one fixed anonymous recipient-1 request', async () => {
  let calls = 0;
  const result = await fetchBdnsCalls({ now, fetchImpl: async (input, options) => {
    calls += 1;
    const url = new URL(input);
    assert.equal(url.origin, 'https://www.infosubvenciones.es');
    assert.equal(url.pathname, '/bdnstrans/api/convocatorias/busqueda');
    assert.deepEqual(Object.fromEntries(url.searchParams), { vpd: 'GE', page: '0', pageSize: '50',
      tiposBeneficiario: '1', fechaDesde: '09/10/2026', fechaHasta: '07/11/2026',
      order: 'fechaRecepcion', direccion: 'desc' });
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    assert.equal(options.signal.aborted, false);
    return response(fixture());
  } });
  assert.equal(calls, 1);
  assert.equal(result.items.length, 1);
});

test('T2 fetch refuses non-200 status, redirects and non-JSON content', async () => {
  for (const status of [204, 400, 429, 500]) {
    await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => new Response(null, { status }) }), refused('status'));
  }
  await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => ({ status: 200, redirected: true }) }), refused('redirect'));
  await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => ({ status: 200, redirected: false,
    url: 'https://untrusted.invalid/', headers: new Headers() }) }), refused('redirect'));
  await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => response(fixture(),
    { headers: { 'content-type': 'text/html' } }) }), refused('content_type'));
});

test('T2 fetch refuses both declared and streamed body overflow', async () => {
  await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => response(fixture(),
    { headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) } }) }), refused('body_bound'));
  await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => new Response('x'.repeat(MAX_BODY_BYTES + 1),
    { headers: { 'content-type': 'application/json' } }) }), refused('body_bound'));
});

test('T2 fetch refuses malformed JSON/UTF-8 and suppresses raw network errors', async () => {
  for (const value of ['not JSON', new Uint8Array([255])]) {
    await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => new Response(value,
      { headers: { 'content-type': 'application/json' } }) }), refused('json'));
  }
  await assert.rejects(fetchBdnsCalls({ now, fetchImpl: async () => { throw new Error('private diagnostic'); } }),
    error => refused('network')(error) && !error.message.includes('private diagnostic'));
});

test('T2 timeout aborts the request without retry', async () => {
  let calls = 0;
  let aborted = false;
  await assert.rejects(fetchBdnsCalls({ now, timeoutMs: 10, fetchImpl: (_url, { signal }) => {
    calls += 1;
    return new Promise((_, reject) => signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('aborted transport'));
    }, { once: true }));
  } }), refused('timeout'));
  assert.equal(aborted, true);
  assert.equal(calls, 1);
});

test('T2 body consumption shares the request deadline', async () => {
  let bodyAborted = false;
  let calls = 0;
  await assert.rejects(fetchBdnsCalls({ now, timeoutMs: 10, fetchImpl: async (_url, { signal }) => {
    calls += 1;
    const stream = new ReadableStream({ start(controller) {
      signal.addEventListener('abort', () => {
        bodyAborted = true;
        controller.error(new Error('aborted body'));
      }, { once: true });
    } });
    return new Response(stream, { headers: { 'content-type': 'application/json' } });
  } }), refused('timeout'));
  assert.equal(bodyAborted, true);
  assert.equal(calls, 1);
});

async function temporary(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'ayudario-bdns-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('T2 refresh atomically publishes a fully validated fixture and leaves no temporary file', async t => {
  const root = await temporary(t);
  const outputPath = join(root, 'calls.json');
  await writeFile(outputPath, 'old bytes\n');
  const result = await refreshCalls({ outputPath, now, fetchImpl: fetchFixture(fixture()) });
  assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), result);
  assert.deepEqual(await readdir(root), ['calls.json']);
});

test('T2 failed HTTP, body and payload refreshes preserve last-good bytes exactly', async t => {
  const root = await temporary(t);
  const outputPath = join(root, 'calls.json');
  const original = '{"version":1,"fetchedAt":null,"items":[]}\n';
  await writeFile(outputPath, original);
  for (const fetchImpl of [async () => new Response(null, { status: 503 }),
    async () => new Response('broken', { headers: { 'content-type': 'application/json' } }),
    fetchFixture({ ...fixture(), content: [row(), row()] })]) {
    await assert.rejects(refreshCalls({ outputPath, now, fetchImpl }));
    assert.equal(await readFile(outputPath, 'utf8'), original);
    assert.deepEqual(await readdir(root), ['calls.json']);
  }
});

test('T2 failed first refresh does not invent a fresh output', async t => {
  const root = await temporary(t);
  const outputPath = join(root, 'calls.json');
  await assert.rejects(refreshCalls({ outputPath, now, fetchImpl: fetchFixture({}) }));
  assert.deepEqual(await readdir(root), []);
});

test('T2 output symlink or directory is refused without changing the target', async t => {
  const root = await temporary(t);
  const target = join(root, 'last-good.json');
  await writeFile(target, 'keep');
  const outputPath = join(root, 'calls.json');
  await symlink(target, outputPath);
  await assert.rejects(refreshCalls({ outputPath, now, fetchImpl: fetchFixture(fixture()) }), refused('output_path'));
  assert.equal(await readFile(target, 'utf8'), 'keep');
  const directory = join(root, 'directory.json');
  await mkdir(directory);
  await assert.rejects(refreshCalls({ outputPath: directory, now, fetchImpl: fetchFixture(fixture()) }), refused('output_path'));
  assert.deepEqual(await readdir(directory), []);
});
