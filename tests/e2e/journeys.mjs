// T2: real Chromium + authored local plans. No private data or external application submissions.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GUIDES } from "../../public/lib/catalog.js";
import { validatePlan } from "../../public/lib/plan.js";

const toolRoot = process.env.AYUDARIO_PLAYWRIGHT_DIR;
const output = process.env.AYUDARIO_PROOF_DIR;
if (!toolRoot || !output) throw new Error("Owned browser tools and proof directories are required");
const require = createRequire(path.join(toolRoot, "package.json"));
const { chromium } = require("playwright");
const origin = "http://127.0.0.1:4173";
const STATIC_PATHS = new Set(["/", "/app.js", "/styles.css", "/favicon.svg", "/lib/catalog.js", "/lib/matcher.js", "/lib/plan.js", "/data/calls.json"]);
await mkdir(output, { recursive: true });
const report = { tier: "T2", source: process.env.GITHUB_SHA ?? null, node: process.version, browser: null, cases: [], passed: false };
const browser = await chromium.launch({ headless: true });
report.browser = browser.version();
const contexts = [];

async function context(options = {}) {
  const instance = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options });
  contexts.push(instance);
  const errors = [];
  const requests = [];
  instance.on("page", (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  });
  instance.on("requestfailed", (request) => errors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  instance.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  const page = await instance.newPage();
  page.setDefaultTimeout(8000);
  return { instance, page, errors, requests };
}

async function open(page) {
  const response = await page.goto(origin, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelectorAll("#guide-grid article").length === 8);
  await page.waitForFunction(() => document.querySelector("#feed-grid").getAttribute("aria-busy") === "false");
}

function boundary(state) {
  assert.deepEqual(state.errors, [], "No console, page or failed-request errors");
  assert.ok(state.requests.length >= 5);
  assert.ok(state.requests.every((request) => new URL(request.url).origin === origin && request.method === "GET" && STATIC_PATHS.has(new URL(request.url).pathname)), "Only finite static application resources are requested");
  assert.ok(state.requests.every((request) => !new URL(request.url).search), "No profile-dependent query strings");
}

async function download(page, click, filename) {
  const waiting = page.waitForEvent("download");
  await click();
  const file = await waiting;
  const target = path.join(output, filename);
  assert.equal(await file.failure(), null);
  await file.saveAs(target);
  return readFile(target, "utf8");
}

async function upload(page, file) {
  const waiting = page.waitForEvent("filechooser");
  await page.locator("#import-backup").click();
  await (await waiting).setFiles(file);
}

async function run(id, title, action) {
  const result = { id, title, status: "running" };
  report.cases.push(result);
  try { await action(); result.status = "passed"; }
  catch (error) { result.status = "failed"; result.error = error.stack; throw error; }
  finally { await writeFile(path.join(output, "browser.json"), `${JSON.stringify(report, null, 2)}\n`); }
}

try {
  await run("B01", "Desktop profile, official guide, checklist, notes, calendar and opt-in reload", async () => {
    const state = await context(); const { page } = state;
    await open(page);
    await page.screenshot({ path: path.join(output, "desktop.png") });
    assert.equal(await page.locator("#categories button[aria-pressed=true]").innerText(), "Todas");
    await page.locator("#hero-profile").click();
    await page.locator("#profile-age").fill("31");
    await page.locator("#profile-region").selectOption("Andalucía");
    await page.locator("#profile-employment").selectOption("employee");
    await page.locator("#profile-children").selectOption("yes");
    await page.locator("#profile-lowIncome").selectOption("yes");
    await page.locator("#profile-form button[type=submit]").click();
    assert.equal(await page.locator("#profile-dialog").evaluate((element) => element.open), false);
    assert.match(await page.locator('#guide-grid [data-guide-id="imv"]').innerText(), /Puede interesarte/);
    await page.getByRole("searchbox", { name: "Buscar en las guías" }).fill("ingreso mínimo");
    assert.deepEqual((await page.locator("#guide-grid article").evaluateAll((cards) => cards.map((card) => card.dataset.guideId))).sort(), ["complemento-infancia", "imv"]);
    await page.locator('#guide-grid [data-guide-id="imv"]').getByRole("button", { name: "Conocer la ayuda" }).click();
    const source = page.getByRole("link", { name: "Consultar la fuente oficial" });
    assert.equal(await source.getAttribute("href"), GUIDES.find((guide) => guide.id === "imv").sourceUrl);
    await page.getByRole("button", { name: "Añadir a mi plan +", exact: true }).click();
    await page.getByLabel("Mi progreso", { exact: true }).selectOption("preparing");
    await page.locator('.document-checklist input[type="checkbox"]').first().check();
    await page.getByLabel("Mis notas", { exact: true }).fill("Revisar los requisitos con calma. 東京");
    await page.getByLabel("Mi fecha de recordatorio", { exact: true }).fill("2028-02-29");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    const calendar = await download(page, () => page.getByRole("button", { name: "Descargar recordatorio .ics" }).click(), "b01-reminder.ics");
    assert.match(calendar, /DTSTART;VALUE=DATE:20280229/);
    assert.match(calendar, /DTEND;VALUE=DATE:20280301/);
    assert.ok(!calendar.includes("東京"));
    await page.getByRole("button", { name: "Cerrar guía", exact: true }).click();
    await page.locator("#persistence-toggle").check();
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#plan-nav").click();
    assert.equal(await page.locator("#plan-grid article").count(), 1);
    assert.match(await page.locator("#plan-grid").innerText(), /Preparando/);
    await page.getByRole("button", { name: "Continuar con mi plan" }).click();
    assert.equal(await page.getByLabel("Mis notas", { exact: true }).inputValue(), "Revisar los requisitos con calma. 東京");
    assert.equal(await page.locator('.document-checklist input[type="checkbox"]').first().isChecked(), true);
    assert.equal(await page.getByLabel("Mi progreso", { exact: true }).inputValue(), "preparing");
    boundary(state);
    await state.instance.close();
  });

  await run("B02", "Narrow touch-emulated discovery and session-only application progress", async () => {
    const state = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { page } = state;
    const old = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    await page.route(`${origin}/data/calls.json`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ version: 1, source: { name: "BDNS — fixture T2", url: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias" }, fetchedAt: old, window: { from: old.slice(0, 10), to: old.slice(0, 10) }, items: [{ id: "1000001", title: "Convocatoria de prueba authored T2", agency: "Organismo de prueba", registeredAt: old.slice(0, 10), sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias/1000001" }], warning: "Fixture de verificación, no una convocatoria real." }) }));
    await open(page);
    assert.equal(await page.locator("#feed-grid article").count(), 1);
    assert.match(await page.locator("#feed-freshness").innerText(), /48 horas/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
    await page.locator("#hero-profile").tap();
    await page.locator("#profile-age").fill("58");
    await page.locator("#profile-employment").selectOption("unemployed");
    await page.locator("#profile-form button[type=submit]").tap();
    await page.locator("#categories").getByRole("button", { name: "Empleo", exact: true }).tap();
    assert.equal(await page.locator("#categories button[aria-pressed=true]").innerText(), "Empleo");
    assert.equal(await page.locator("#guide-grid article").count(), 2);
    await page.getByRole("searchbox", { name: "Buscar en las guías" }).fill("52");
    assert.equal(await page.locator("#guide-grid article").count(), 1);
    await page.screenshot({ path: path.join(output, "narrow.png") });
    await page.locator('#guide-grid [data-guide-id="subsidio-mayores-52"] .save-icon').tap();
    await page.locator("#plan-nav").tap();
    await page.getByRole("button", { name: "Continuar con mi plan" }).tap();
    await page.getByLabel("Mi progreso", { exact: true }).selectOption("submitted");
    await page.getByRole("button", { name: "Guardar cambios" }).tap();
    assert.match(await page.locator(".plan-editor").innerText(), /no presenta ni consulta ningún trámite oficial/);
    await page.getByRole("button", { name: "Cerrar guía", exact: true }).tap();
    assert.equal(await page.evaluate(() => localStorage.getItem("ayudario.plan.v1")), null);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#plan-nav").tap();
    assert.equal(await page.locator("#plan-grid article").count(), 0);
    assert.ok(await page.locator("#plan-empty").isVisible());
    boundary(state);
    await state.instance.close();
  });

  await run("B03", "Real JSON chooser, replacement confirmation, hostile text, backup and clear", async () => {
    const state = await context(); const { page } = state;
    await open(page); await page.locator("#plan-nav").click();
    const imported = { version: 1, profile: { age: 24, studying: true }, entries: { "beca-general": { status: "saved", checks: [], notes: "Revisar la convocatoria", reminder: "" }, imv: { status: "preparing", checks: [0], notes: '<img src="https://invalid.example/private" onerror="window.__injected=true">', reminder: "2028-02-29" } } };
    const file = { name: "authored-plan.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(imported)) };
    await upload(page, file);
    await page.locator("#confirm-dialog").waitFor({ state: "visible" });
    await page.locator("#confirm-cancel").click();
    assert.equal(await page.locator("#plan-grid article").count(), 0);
    await upload(page, file);
    await page.getByRole("button", { name: "Reemplazar mi plan", exact: true }).click();
    assert.equal(await page.locator("#plan-grid article").count(), 2);
    await page.locator('#plan-grid [data-guide-id="imv"]').getByRole("button", { name: "Continuar con mi plan" }).click();
    assert.equal(await page.getByLabel("Mis notas", { exact: true }).inputValue(), imported.entries.imv.notes);
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    await page.getByRole("button", { name: "Cerrar guía", exact: true }).click();
    const backup = await download(page, () => page.locator("#download-backup").click(), "b03-backup.json");
    assert.deepEqual(JSON.parse(backup), validatePlan(imported, GUIDES));
    await upload(page, { name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version":2,"entries":{}}') });
    await page.locator("#notice").waitFor({ state: "visible" });
    assert.match(await page.locator("#notice-text").innerText(), /No se ha importado nada/);
    assert.equal(await page.locator("#plan-grid article").count(), 2);
    await page.locator("#persistence-toggle").check();
    await page.locator("#clear-plan").click(); await page.locator("#confirm-cancel").click();
    assert.equal(await page.locator("#plan-grid article").count(), 2);
    await page.locator("#clear-plan").click(); await page.locator("#confirm-accept").click();
    assert.equal(await page.locator("#plan-grid article").count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("ayudario.plan.v1")), null);
    assert.equal(await page.locator("#persistence-toggle").isChecked(), false);
    boundary(state);
    await state.instance.close();
  });

  await run("B04", "Blocked storage and refused catalogue preserve an operable in-memory plan", async () => {
    const state = await context(); const { instance, page } = state;
    await instance.addInitScript(() => {
      for (const key of ["getItem", "setItem", "removeItem"]) Object.defineProperty(Storage.prototype, key, { value() { throw new DOMException("Authored unavailable-storage fixture", "SecurityError"); }, configurable: true });
    });
    await page.route(`${origin}/data/calls.json`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"version":99}' }));
    await open(page);
    assert.match(await page.locator("#notice-text").innerText(), /No hemos podido leer/);
    assert.match(await page.locator("#feed-freshness").innerText(), /No se pudo consultar/);
    await page.locator('#guide-grid [data-guide-id="imv"] .save-icon').click();
    await page.locator("#persistence-toggle").click();
    assert.equal(await page.locator("#persistence-toggle").isChecked(), false);
    assert.match(await page.locator("#notice-text").innerText(), /Tu plan sigue en esta pestaña/);
    await page.locator("#plan-nav").click();
    assert.equal(await page.locator("#plan-grid article").count(), 1);
    const backup = await download(page, () => page.locator("#download-backup").click(), "b04-backup.json");
    assert.ok(JSON.parse(backup).entries.imv);
    await page.locator("#clear-plan").click(); await page.locator("#confirm-accept").click();
    assert.equal(await page.locator("#plan-grid article").count(), 0);
    assert.match(await page.locator("#notice-text").innerText(), /no ha permitido borrar la copia local/);
    boundary(state);
    await state.instance.close();
  });
  report.passed = true;
} finally {
  for (const instance of contexts) await instance.close().catch(() => {});
  await browser.close();
  await writeFile(path.join(output, "browser.json"), `${JSON.stringify(report, null, 2)}\n`);
}
