// T2: real Chromium controls, fictional private plans, one labelled failing-write adapter.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { GUIDES } from '../../public/lib/catalog.js';
import { validatePlan } from '../../public/lib/plan.js';

const output = process.env.AYUDARIO_PROOF_DIR, tools = process.env.AYUDARIO_PLAYWRIGHT_DIR;
if (!output || !tools) throw new Error('Owned output/tools required');
const require = createRequire(path.join(tools, 'package.json'));
const { chromium } = require('playwright');
const origin = 'http://127.0.0.1:4173';
const allowed = new Set(['/', '/app.js', '/styles.css', '/favicon.svg', '/lib/catalog.js', '/lib/matcher.js', '/lib/plan.js', '/data/calls.json']);
const v1Ref = 'f60033c8d6b10ea8dc46c3931b820d41525c6a3e';
const oldAssets = new Map();
for (const [url, file] of [['/', 'public/index.html'], ['/app.js', 'public/app.js'], ['/styles.css', 'public/styles.css'], ['/lib/catalog.js', 'public/lib/catalog.js'], ['/lib/plan.js', 'public/lib/plan.js']]) {
  oldAssets.set(url, { file, bytes: execFileSync('git', ['show', v1Ref + ':' + file]) });
}
await mkdir(output, { recursive: true });
const report = { tier: 'T2', source: process.env.GITHUB_SHA, node: process.version, cases: [], boundaries: [], passed: false, legacyRef: v1Ref, legacyAssets: [...oldAssets.values()].map(item => ({ path: item.file, bytes: item.bytes.length, sha256: createHash('sha256').update(item.bytes).digest('hex') })) };
const server = await chromium.launchServer({ headless: true });
const nativeProcess = server.process();
const browser = await chromium.connect(server.wsEndpoint());
report.browser = browser.version();
const contexts = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) { if (await check()) return; await pause(60); }
  throw new Error(message);
}
async function makeContext(options = {}) {
  const state = { errors: [], unexpected: [], requests: [], legacy: false, expectedFailure: false };
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options });
  contexts.push(context); state.context = context;
  context.on('page', page => {
    page.on('pageerror', error => state.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') state.errors.push(message.text()); });
    page.on('websocket', socket => state.unexpected.push('websocket:' + socket.url()));
  });
  context.on('requestfailed', request => state.errors.push(request.method() + ' ' + request.url() + ' ' + request.failure()?.errorText));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    state.requests.push({ method: request.method(), url: request.url(), legacy: state.legacy });
    if (request.method() !== 'GET' || url.origin !== origin || url.search || !allowed.has(url.pathname)) {
      state.unexpected.push(request.method() + ' ' + request.url()); await route.abort(); return;
    }
    if (state.legacy && oldAssets.has(url.pathname)) {
      const item = oldAssets.get(url.pathname);
      await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html', body: item.bytes });
    } else await route.continue();
  });
  state.page = await context.newPage(); state.page.setDefaultTimeout(8000);
  return state;
}
async function open(state, count = 16) {
  const response = await state.page.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await until(async () => await state.page.locator('#guide-grid article').count() === count, 'Guide count unavailable');
  await until(async () => await state.page.locator('#feed-grid').getAttribute('aria-busy') === 'false', 'Catalogue did not settle');
}
const modal = page => page.locator('#guide-dialog');
const saved = page => page.locator('#guide-save-action');
async function openGuide(page, id) {
  await page.locator('#browse-nav').click();
  await page.getByRole('searchbox', { name: 'Buscar en las guías' }).fill('');
  await page.locator('#categories').getByRole('button', { name: 'Todas', exact: true }).click();
  await page.locator('#guide-grid [data-guide-id="' + id + '"]').getByRole('button', { name: 'Conocer la ayuda', exact: true }).click();
  await modal(page).waitFor({ state: 'visible' });
}
async function toolbar(page, label) {
  const dialog = await modal(page).boundingBox(), add = await saved(page).boundingBox(), close = await page.getByRole('button', { name: 'Cerrar guía', exact: true }).boundingBox();
  assert.ok(dialog && add && close, label);
  assert.ok(add.x > dialog.x + dialog.width * 0.3 && add.x + add.width <= close.x + 1, label + ': right alignment');
  assert.ok(add.y >= dialog.y - 1 && add.y + add.height <= dialog.y + Math.min(dialog.height, 100), label + ': top action');
  assert.ok(await saved(page).evaluate(element => { const box = element.getBoundingClientRect(); const point = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return element === point || element.contains(point); }), label + ': unobstructed action');
  return { dialog, add, close };
}
async function snapshot(page) { return page.evaluate(() => ({ v1: localStorage.getItem('ayudario.plan.v1'), v2: localStorage.getItem('ayudario.plan.v2') })); }
async function backup(page, filename) {
  const waiting = page.waitForEvent('download'); await page.locator('#download-backup').click();
  const file = await waiting; assert.equal(await file.failure(), null);
  const destination = path.join(output, filename); await file.saveAs(destination);
  return validatePlan(JSON.parse(await readFile(destination, 'utf8')), GUIDES);
}
function boundary(state) {
  report.boundaries.push({ requests: state.requests, errors: state.errors, unexpected: state.unexpected });
  assert.deepEqual(state.errors, []); assert.deepEqual(state.unexpected, []);
  assert.ok(state.requests.length >= 5);
}
async function run(id, description, action) {
  const item = { id, description, status: 'running' }; report.cases.push(item);
  try { await action(item); item.status = 'passed'; }
  catch (error) { item.status = 'failed'; item.error = error.stack; throw error; }
  finally { await writeFile(path.join(output, 'preparation-browser.json'), JSON.stringify(report, null, 2) + '\n'); }
}
try {
  assert.equal(GUIDES.length, 16);
  await run('P01', 'All 16 guides, source/steps/documents, desktop sticky add and Escape close', async item => {
    const state = await makeContext(), page = state.page; await open(state);
    item.guideIds = [];
    for (const guide of GUIDES) {
      await openGuide(page, guide.id);
      assert.equal(await modal(page).getByRole('heading', { level: 2 }).innerText(), guide.title);
      assert.equal(await modal(page).getByRole('link', { name: 'Consultar la fuente oficial' }).getAttribute('href'), guide.sourceUrl);
      for (const text of [...guide.requirements, ...guide.documents, ...guide.steps]) assert.ok((await modal(page).innerText()).includes(text));
      await toolbar(page, guide.id + ' initial');
      const box = await modal(page).boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 1600);
      await until(async () => await modal(page).evaluate(element => element.scrollTop) > 0, 'Dialog did not scroll');
      await toolbar(page, guide.id + ' scrolled');
      if (guide.id === GUIDES[8].id) await page.screenshot({ path: path.join(output, 'desktop-sticky.png') });
      await page.keyboard.press('Escape'); assert.equal(await modal(page).isVisible(), false);
      item.guideIds.push(guide.id);
    }
    boundary(state); await state.context.close();
  });
  await run('P02', 'Independent draft/save/reload marks, complete-list wording and actual backup/future import', async item => {
    const state = await makeContext(), page = state.page, guide = GUIDES[8]; await open(state); await openGuide(page, guide.id); await saved(page).click();
    await page.locator('input[name=criteria]').first().check(); await page.locator('input[name=checks]').first().check();
    assert.match(await page.locator('.preparation-summary').innerText(), /Cambios sin guardar/);
    await page.keyboard.press('Escape'); await openGuide(page, guide.id);
    assert.equal(await page.locator('input[name=criteria]').first().isChecked(), false);
    assert.equal(await page.locator('input[name=checks]').first().isChecked(), false);
    await page.locator('input[name=criteria]').first().check(); await page.locator('input[name=checks]').first().check();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    assert.equal(await page.locator('.preparation-summary progress').getAttribute('value'), '2');
    assert.equal((await snapshot(page)).v2, null);
    await page.keyboard.press('Escape'); await page.locator('#persistence-toggle').check(); await page.reload({ waitUntil: 'networkidle' });
    await openGuide(page, guide.id);
    assert.equal(await page.locator('input[name=criteria]').first().isChecked(), true);
    assert.equal(await page.locator('input[name=checks]').first().isChecked(), true);
    for (const input of await page.locator('input[name=criteria],input[name=checks]').all()) await input.check();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    assert.match(await page.locator('.preparation-summary').innerText(), /no acredita elegibilidad ni presenta la solicitud/);
    assert.equal(await page.getByLabel('Mi progreso', { exact: true }).inputValue(), 'saved');
    await page.screenshot({ path: path.join(output, 'desktop-complete.png') }); await page.keyboard.press('Escape'); await page.locator('#plan-nav').click();
    const exported = await backup(page, 'p02-current-plan.json'); item.exported = exported;
    assert.equal(exported.version, 2); assert.equal(exported.entries[guide.id].criteria.length, guide.requirements.length); assert.equal(exported.entries[guide.id].checks.length, guide.documents.length);
    const chooser = page.waitForEvent('filechooser'); await page.locator('#import-backup').click();
    await (await chooser).setFiles({ name: 'future-authored.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...exported, version: 3 })) });
    await until(async () => (await page.locator('#notice-text').innerText()).includes('No se ha importado nada'), 'Future format was not refused');
    assert.equal((await snapshot(page)).v2, JSON.stringify(exported)); boundary(state); await state.context.close();
  });
  for (const width of [390, 320]) await run(width === 390 ? 'P03a' : 'P03b', 'Narrow ' + width + 'px real taps, native scrolling and accessible checklist', async item => {
    const state = await makeContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true }), page = state.page; await open(state);
    const guide = GUIDES[9]; await page.locator('#guide-grid [data-guide-id="' + guide.id + '"]').getByRole('button', { name: 'Conocer la ayuda', exact: true }).tap();
    item.initial = await toolbar(page, width + ' initial');
    const box = await modal(page).boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 1800);
    await until(async () => await modal(page).evaluate(element => element.scrollTop) > 0, 'Narrow dialog did not scroll');
    item.scrolled = await toolbar(page, width + ' scrolled'); await saved(page).tap();
    await page.locator('input[name=criteria]').first().check(); await page.locator('input[name=checks]').first().check();
    await page.getByRole('button', { name: 'Guardar cambios' }).tap();
    assert.equal(await page.locator('.preparation-summary progress').getAttribute('value'), '2');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await modal(page).evaluate(element => element.scrollWidth <= element.clientWidth));
    await page.screenshot({ path: path.join(output, 'narrow-' + width + '.png') });
    await page.getByRole('button', { name: 'Cerrar guía', exact: true }).tap(); assert.equal(await modal(page).isVisible(), false);
    boundary(state); await state.context.close();
  });
  await run('P04', 'Actual V1 client creates legacy storage; current client preserves it and adds unchecked criteria', async item => {
    const state = await makeContext(), page = state.page; state.legacy = true; await open(state, 8);
    await openGuide(page, 'imv'); await page.getByRole('button', { name: 'Añadir a mi plan +', exact: true }).click();
    await page.locator('input[name=checks]').first().check(); await page.getByLabel('Mis notas', { exact: true }).fill('Authored legacy recovery note.');
    await page.getByRole('button', { name: 'Guardar cambios' }).click(); await page.keyboard.press('Escape'); await page.locator('#persistence-toggle').check();
    const legacy = await snapshot(page); assert.ok(legacy.v1); assert.equal(legacy.v2, null);
    state.legacy = false; await page.reload({ waitUntil: 'networkidle' }); await openGuide(page, 'imv');
    assert.equal(await page.locator('input[name=checks]').first().isChecked(), true);
    assert.equal(await page.locator('input[name=criteria]:checked').count(), 0);
    assert.equal(await page.getByLabel('Mis notas', { exact: true }).inputValue(), 'Authored legacy recovery note.');
    assert.equal((await snapshot(page)).v1, legacy.v1);
    await page.locator('input[name=criteria]').first().check(); await page.getByRole('button', { name: 'Guardar cambios' }).click();
    const current = await snapshot(page); assert.equal(current.v1, legacy.v1); assert.ok(current.v2); item.legacyUnchanged = true;
    await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' }); await openGuide(page, 'imv');
    assert.equal(await page.locator('input[name=criteria]').first().isChecked(), true);
    assert.equal(await page.locator('input[name=checks]').first().isChecked(), true);
    await page.keyboard.press('Escape'); await page.locator('#plan-nav').click(); await page.locator('#clear-plan').click(); await page.locator('#confirm-accept').click();
    assert.deepEqual(await snapshot(page), { v1: null, v2: null }); boundary(state); await state.context.close();
  });
  await run('P05', 'Two actual tabs refuse to overwrite changed V2 storage and retain a recoverable working copy', async item => {
    const state = await makeContext(), page = state.page, guide = GUIDES[8]; await open(state); await openGuide(page, guide.id); await saved(page).click(); await page.keyboard.press('Escape'); await page.locator('#persistence-toggle').check();
    const second = await state.context.newPage(); second.setDefaultTimeout(8000); await second.goto(origin, { waitUntil: 'networkidle' });
    await openGuide(page, guide.id); await page.locator('input[name=criteria]').first().check(); await page.getByRole('button', { name: 'Guardar cambios' }).click();
    const firstValue = (await snapshot(page)).v2; await openGuide(second, guide.id); await second.locator('input[name=checks]').first().check(); await second.getByRole('button', { name: 'Guardar cambios' }).click();
    assert.equal((await snapshot(second)).v2, firstValue);
    assert.match(await second.locator('#notice-text').innerText(), /Tu plan sigue en esta pestaña/);
    assert.equal(await second.locator('#persistence-toggle').isChecked(), false);
    await second.keyboard.press('Escape'); await second.locator('#plan-nav').click(); const recovered = await backup(second, 'p05-recovery.json');
    assert.deepEqual(recovered.entries[guide.id].checks, [0]); assert.deepEqual(recovered.entries[guide.id].criteria, []);
    item.preservedStoredValueSha256 = createHash('sha256').update(firstValue).digest('hex'); boundary(state); await state.context.close();
  });
  await run('P06', 'Labelled failing-write fixture exercises current V2 recovery UI/export', async item => {
    const state = await makeContext(), page = state.page; await state.context.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key === 'ayudario.plan.v2') throw new DOMException('Authored T2 V2 write denial', 'QuotaExceededError'); return original.call(this, key, value); };
    });
    await open(state); const guide = GUIDES[10]; await openGuide(page, guide.id); await saved(page).click(); await page.locator('input[name=criteria]').first().check(); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await page.keyboard.press('Escape');
    await page.locator('#persistence-toggle').click(); assert.equal(await page.locator('#persistence-toggle').isChecked(), false);
    assert.match(await page.locator('#notice-text').innerText(), /Tu plan sigue en esta pestaña/); assert.equal((await snapshot(page)).v2, null);
    await page.locator('#plan-nav').click(); const recovered = await backup(page, 'p06-write-denial.json'); assert.deepEqual(recovered.entries[guide.id].criteria, [0]);
    item.storageBoundary = 'Authored failing method in actual browser; not native OS quota proof'; boundary(state); await state.context.close();
  });
  report.passed = true;
} finally {
  const failures = [];
  for (const context of contexts) { try { await context.close(); } catch (error) { failures.push(String(error)); } }
  try { await browser.close(); } catch (error) { failures.push(String(error)); }
  try { await server.close(); } catch (error) { failures.push(String(error)); }
  report.cleanup = { contextsClosed: failures.length === 0, nativePid: nativeProcess.pid, nativeExitCode: nativeProcess.exitCode, nativeSignal: nativeProcess.signalCode, failures };
  try { process.kill(nativeProcess.pid, 0); report.cleanup.nativeAbsent = false; } catch (error) { report.cleanup.nativeAbsent = error.code === 'ESRCH'; }
  await writeFile(path.join(output, 'preparation-browser.json'), JSON.stringify(report, null, 2) + '\n');
  if (failures.length || !report.cleanup.nativeAbsent || nativeProcess.exitCode !== 0) throw new Error('Owned browser cleanup failed');
}
