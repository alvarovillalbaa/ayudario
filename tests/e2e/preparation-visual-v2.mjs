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
const oldAssets = new Map();
await mkdir(output, { recursive: true });
const report = { tier: 'T2', source: process.env.GITHUB_SHA, node: process.version, cases: [], boundaries: [], passed: false };
const server = await chromium.launchServer({ headless: true });
const nativeProcess = server.process();
const browser = await chromium.connect(server.wsEndpoint());
report.browser = browser.version();
const contexts = [], states = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) { if (await check()) return; await pause(60); }
  throw new Error(message);
}
async function makeContext(options = {}) {
  const state = { errors: [], unexpected: [], requests: [], legacy: false, expectedFailure: false };
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options });
  contexts.push(context); states.push(state); state.context = context;
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
  await page.locator('#guide-grid [data-guide-id="' + id + '"]').getByRole('button', { name: 'Conocer la ayuda ↗', exact: true }).click();
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
  catch (error) {
    item.status = 'failed'; item.error = error.stack;
    const state = states.at(-1), page = state?.context.pages().at(-1);
    item.boundary = state && { requests: state.requests, errors: state.errors, unexpected: state.unexpected };
    if (page && !page.isClosed()) {
      try {
        await page.screenshot({ path: path.join(output, 'failure-' + id + '.png') });
        item.visibleState = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 16000), dialog: (() => { const e = document.querySelector('#guide-dialog'); return e && { open: e.open, scrollTop: e.scrollTop, scrollHeight: e.scrollHeight, clientHeight: e.clientHeight }; })() }));
      } catch (diagnosticError) { item.diagnosticError = String(diagnosticError); }
    }
    return;
  }
  finally { await writeFile(path.join(output, 'preparation-visual.json'), JSON.stringify(report, null, 2) + '\n'); }
}

async function measure(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('#guide-dialog'), rect = dialog.getBoundingClientRect();
    return { dialog: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, viewport: { innerWidth, innerHeight, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, visual: visualViewport && { width: visualViewport.width, height: visualViewport.height, offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale } }, scroll: { pageX: scrollX, pageY: scrollY, dialog: dialog.scrollTop }, open: dialog.open };
  });
}
async function capture(page, name) {
  const bytes = await page.screenshot({ path: path.join(output, name) });
  const colors = await page.evaluate(async values => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(values)], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext('2d');
    context.drawImage(bitmap,0,0); const pixels = context.getImageData(0,0,canvas.width,canvas.height).data, distinct = new Set();
    for(let index=0;index<pixels.length;index+=64) distinct.add(pixels[index]+','+pixels[index+1]+','+pixels[index+2]);
    bitmap.close(); return distinct.size;
  }, [...bytes]);
  return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), colors };
}
async function stablePaint(page) {
  let previous = '', stable = 0;
  await until(async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const current = JSON.stringify(await measure(page));
    stable = current === previous ? stable + 1 : 0; previous = current;
    return stable >= 3;
  }, 'Native viewport/dialog did not settle');
}
try {
  await run('V01','Stable desktop modal paint after actual sequential guide opening and native scrolling',async item => {
    const state = await makeContext(), page = state.page; await open(state); item.guides=[];
    for(const guide of GUIDES.slice(0,9)){
      await openGuide(page,guide.id); const box=await modal(page).boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.wheel(0,1600);
      await until(async()=>await modal(page).evaluate(e=>e.scrollTop)>0,'No native modal scroll');
      await toolbar(page,guide.id); item.guides.push(guide.id);
      if(guide.id===GUIDES[8].id){
        item.immediate = await capture(page,'visual-desktop-immediate.png');
        await stablePaint(page); item.geometry = await measure(page);
        item.stable = await capture(page,'visual-desktop-stable.png');
        assert.ok(item.stable.colors>64,'Stable desktop screenshot is blank');
        assert.equal(item.geometry.open,true); await toolbar(page,'stable desktop');
      }
      await page.keyboard.press('Escape');
    }
    boundary(state); await state.context.close();
  });
  await run('V02','320px modal fits actual screenshot viewport before and after native scroll',async item=>{
    const state=await makeContext({viewport:{width:320,height:844},isMobile:true,hasTouch:true}),page=state.page;await open(state);
    await page.locator('#guide-grid [data-guide-id="'+GUIDES[9].id+'"]').getByRole('button',{name:'Conocer la ayuda ↗',exact:true}).tap();
    await stablePaint(page); item.initial=await measure(page);item.initialImage=await capture(page,'visual-narrow-initial.png');
    const box=await modal(page).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,1800);
    await until(async()=>await modal(page).evaluate(e=>e.scrollTop)>0,'No native narrow scroll');await stablePaint(page);
    item.scrolled=await measure(page);item.scrolledImage=await capture(page,'visual-narrow-scrolled.png');
    const viewport=page.viewportSize();
    for(const geometry of [item.initial,item.scrolled]){
      const rect=geometry.dialog;assert.ok(rect.x>=-1 && rect.y>=-1 && rect.x+rect.width<=viewport.width+1 && rect.y+rect.height<=viewport.height+1,'Modal outside actual 320px capture viewport: '+JSON.stringify(geometry));
    }
    assert.ok(item.initialImage.colors>64&&item.scrolledImage.colors>64,'Narrow paint is blank');
    await toolbar(page,'stable narrow');boundary(state);await state.context.close();
  });
  report.passed=report.cases.length===2&&report.cases.every(item=>item.status==='passed');
} finally {
  const failures = [];
  for (const context of contexts) { try { await context.close(); } catch (error) { failures.push(String(error)); } }
  try { await browser.close(); } catch (error) { failures.push(String(error)); }
  try { await server.close(); } catch (error) { failures.push(String(error)); }
  report.cleanup = { contextsClosed: failures.length === 0, nativePid: nativeProcess.pid, nativeExitCode: nativeProcess.exitCode, nativeSignal: nativeProcess.signalCode, failures };
  try { process.kill(nativeProcess.pid, 0); report.cleanup.nativeAbsent = false; } catch (error) { report.cleanup.nativeAbsent = error.code === 'ESRCH'; }
  await writeFile(path.join(output, 'preparation-visual.json'), JSON.stringify(report, null, 2) + '\n');
  if (failures.length || !report.cleanup.nativeAbsent || nativeProcess.exitCode !== 0) throw new Error('Owned browser cleanup failed');
}

if(!report.passed)process.exitCode=1;
