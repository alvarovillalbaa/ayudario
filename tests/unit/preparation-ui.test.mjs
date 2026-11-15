// T2: actual UI callbacks with controlled DOM/storage; no browser or public API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { GUIDES, CATEGORIES } from '../../public/lib/catalog.js';
import * as matcher from '../../public/lib/matcher.js';
import * as planModule from '../../public/lib/plan.js';
const html = await readFile(new URL('../../public/index.html', import.meta.url), 'utf8');
const source = (await readFile(new URL('../../public/app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
async function application(saved = new Map()) {
  let focus;
  class Node {
    constructor(tag, attrs = '') {
      this.tag = tag; this.children = []; this.attrs = new Map(); this.events = new Map(); this.classes = new Set(); this.value = ''; this.ownText = ''; this.checked = false; this.disabled = false; this.hidden = /(?:^|\s)hidden(?:\s|$)/.test(attrs); this.open = false;
      this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name), toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
      for (const match of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) this.setAttribute(match[1], match[2]);
    }
    set className(value) { this.classes = new Set(value.split(' ')); }
    get className() { return [...this.classes].join(' '); }
    set textContent(value) { this.ownText = String(value); this.children = []; }
    get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
    setAttribute(key, value) { this.attrs.set(key, String(value)); if (key === 'value') this.value = String(value); if (key === 'class') this.className = value; }
    getAttribute(key) { return this.attrs.get(key); }
    removeAttribute(key) { this.attrs.delete(key); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.ownText = ''; this.children = children; }
    addEventListener(type, callback) { if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(callback); }
    focus() { focus = this; }
    showModal() { this.open = true; }
    close() { this.open = false; for (const callback of this.events.get('close') || []) callback(); }
    remove() {}
    async send(type) { if (type === 'click' && this.disabled) return; for (const callback of this.events.get(type) || []) await callback({ target: this, currentTarget: this, preventDefault() {} }); }
    click() { return this.send('click'); }
  }
  const statics = new Map();
  for (const match of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    assert.ok(!statics.has(match[3]), `duplicate ID ${match[3]}`); statics.set(match[3], new Node(match[1], match[2]));
  }
  const walk = root => [root, ...root.children.flatMap(walk)];
  const get = id => { const result = statics.get(id) || [...statics.values()].flatMap(walk).find(node => node.attrs.get('id') === id); assert.ok(result, `missing ID ${id}`); return result; };
  const document = { querySelector: selector => { assert.ok(selector.startsWith('#')); return get(selector.slice(1)); }, querySelectorAll: () => [], getElementById: get, createElement: tag => new Node(tag), createTextNode: text => { const node = new Node('#text'); node.textContent = text; return node; }, body: new Node('body') };
  class FormData {
    constructor(form) { this.entries = walk(form).filter(node => node.attrs.has('name') && (node.attrs.get('type') !== 'checkbox' || node.checked)).map(node => [node.attrs.get('name'), node.value]); }
    get(name) { return this.entries.find(row => row[0] === name)?.[1] ?? null; }
    getAll(name) { return this.entries.filter(row => row[0] === name).map(row => row[1]); }
  }
  const localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  vm.runInNewContext(source, { ...planModule, ...matcher, GUIDES, CATEGORIES, document, Node, localStorage, FormData, URL, Blob, TextEncoder, TextDecoder, AbortController,
    setTimeout: () => 1, clearTimeout() {}, window: { scrollTo() {} },
    fetch: async url => { assert.equal(url, '/data/calls.json'); return new Response(JSON.stringify({ version: 1, source: { name: 'BDNS T2', url: 'https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias' }, window: { from: '', to: '' }, fetchedAt: null, warning: null, items: [] })); }
  });
  for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve));
  return { get, walk, saved, focus: () => focus,
    open: async id => { const card = get('guide-grid').children.find(card => card.attrs.get('data-guide-id') === id); assert.ok(card); await card.children.at(-1).children[0].click(); },
    form: () => walk(get('guide-detail')).find(node => node.classes.has('plan-form')),
    progress: () => walk(get('guide-detail')).find(node => node.classes.has('preparation-summary')),
    checkbox: (name, index) => walk(get('guide-detail')).find(node => node.attrs.get('name') === name && node.value === String(index)) };
}
test('U01 all 16 guides open with visible documents/steps and a header add action before the details', async () => {
  const app = await application(); assert.equal(app.get('guide-grid').children.length, 16);
  assert.ok(html.indexOf('id="guide-save-action"') < html.indexOf('id="guide-detail"'));
  await app.open('dependencia'); assert.equal(app.get('guide-dialog').open, true); assert.equal(app.get('guide-save-action').disabled, false);
  assert.match(app.get('guide-detail').textContent, /Documentos por preparar/); assert.match(app.get('guide-detail').textContent, /Cómo dar el siguiente paso/);
  await app.get('guide-save-action').click(); assert.equal(app.get('guide-save-action').disabled, true);
  assert.ok(app.form()); assert.equal(app.focus(), app.get('entry-status')); assert.equal(app.get('plan-count').textContent, '1');
});
test('U02 criteria/documents update draft progress; explicit save persists and reloads the independent checklists', async () => {
  const app = await application(); await app.open('imv'); await app.get('guide-save-action').click();
  app.get('persistence-toggle').checked = true; await app.get('persistence-toggle').send('change');
  app.checkbox('criteria', 0).checked = true; app.checkbox('checks', 1).checked = true; await app.form().send('change');
  assert.match(app.progress().textContent, /2 de 6/); assert.match(app.progress().textContent, /Cambios sin guardar/);
  assert.deepEqual(JSON.parse(app.saved.get(planModule.STORAGE_KEY)).entries.imv.criteria, []);
  await app.form().send('submit'); assert.doesNotMatch(app.progress().textContent, /Cambios sin guardar/);
  const reloaded = await application(app.saved); await reloaded.open('imv');
  assert.equal(reloaded.checkbox('criteria', 0).checked, true); assert.equal(reloaded.checkbox('checks', 1).checked, true);
  assert.match(reloaded.get('plan-grid').textContent, /2 de 6 puntos revisados/);
});
test('U03 legacy saved notes/checks remain intact and never become reviewed requirements', async () => {
  const original = JSON.stringify({ version: 1, profile: null, entries: { imv: { status: 'preparing', checks: [0], notes: 'Mi nota anterior', reminder: '' } } });
  const saved = new Map([[planModule.LEGACY_STORAGE_KEY, original]]), app = await application(saved);
  assert.equal(saved.has(planModule.STORAGE_KEY), false); await app.open('imv');
  assert.equal(app.get('entry-notes').value, 'Mi nota anterior'); assert.equal(app.checkbox('checks', 0).checked, true); assert.equal(app.checkbox('criteria', 0).checked, false);
  await app.form().send('submit'); assert.equal(saved.get(planModule.LEGACY_STORAGE_KEY), original);
  assert.equal(JSON.parse(saved.get(planModule.STORAGE_KEY)).version, 2);
});
test('U04 opting into persistence cannot replace corrupt current data; the working plan remains usable', async () => {
  const saved = new Map([[planModule.STORAGE_KEY, '{broken']]), app = await application(saved);
  assert.match(app.get('notice-text').textContent, /No hemos podido leer/);
  await app.open('imv'); await app.get('guide-save-action').click();
  app.get('persistence-toggle').checked = true; await app.get('persistence-toggle').send('change');
  assert.equal(saved.get(planModule.STORAGE_KEY), '{broken'); assert.equal(app.get('persistence-toggle').checked, false);
  assert.equal(app.get('plan-count').textContent, '1'); assert.match(app.get('storage-status').textContent, /desactivado/);
});
