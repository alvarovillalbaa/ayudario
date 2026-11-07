// B05: hosted public-catalogue observation; no personal profile, plan or application submission.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://ayudario-xi.vercel.app";
const PATHS = new Set(["/", "/app.js", "/styles.css", "/favicon.svg", "/lib/catalog.js", "/lib/matcher.js", "/lib/plan.js", "/data/calls.json"]);
const GUIDE_IDS = ["imv", "complemento-infancia", "paro-contributivo", "subsidio-mayores-52", "beca-general", "bono-alquiler-joven", "bono-social", "pnc-incapacidad"];
const CATALOGUE = { bytes: 20888, sha256: "66b4d8eb4335077b9c13c67b76001a97c894fbe59d2200990d5876ea8878b5f8" };
const output = process.env.AYUDARIO_PROOF_DIR;
const tools = process.env.AYUDARIO_PLAYWRIGHT_DIR;
const source = process.env.SOURCE_COMMIT;
assert.ok(output && tools && /^[a-f0-9]{40}$/.test(source ?? ""), "Owned proof/tools directories and exact source commit are required");
assert.equal(process.version, "v24.22.2");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const require = createRequire(path.join(tools, "package.json"));
const { chromium } = require("playwright");
const packageInfo = JSON.parse(await readFile(path.join(tools, "node_modules/playwright/package.json"), "utf8"));
assert.equal(packageInfo.version, "1.65.0");
await mkdir(output, { recursive: true });

const report = {
  schemaVersion: 1, tier: "hosted-public-observation", sourceCommit: source, origin: ORIGIN,
  startedAt: new Date().toISOString(), node: process.version, playwright: packageInfo.version,
  case: { id: "B05", title: "Hosted public catalogue matches the committed BDNS bytes and renders all fifty official announcements as text", status: "running", checks: {} },
  requests: [], errors: [], catalogue: null, ui: null, screenshot: null,
  cleanup: { contextCreated: false, pagesCreated: 0, contextCloseAttempted: false, contextClosedObserved: false, pageClosedObserved: false, browserCloseAttempted: false, browserDisconnectedObserved: false, errors: [] },
  passed: false,
  proofLimits: [
    "One anonymous desktop observation of this alias at the recorded time; B01–B04 are not invoked or carried forward.",
    "Catalogue equality binds the decoded HTTP representation to the checked-out JSON, not compressed wire bytes or every deployed application asset.",
    "Recent BDNS registrations are not a current-deadline list, a personal eligibility decision or a verified right to an award.",
    "No profile, account, plan mutation, external application-site navigation, model or production write is performed.",
    "Network policy is checked on actual context events; this observation is not a general browser egress firewall or deployment-commit attestation."
  ]
};
let browser;
let context;
let page;
let contextClosing = false;
let browserClosing = false;
let functionalComplete = false;
let diagnostics = 0;

function problem(code, detail = "") {
  diagnostics++;
  if (report.errors.length < 24) report.errors.push({ code, detail: String(detail).slice(0, 1000) });
}
function allowed(request) {
  try {
    const url = new URL(request.url());
    return request.method() === "GET" && url.origin === ORIGIN && !url.search && !url.username && !url.password && PATHS.has(url.pathname);
  } catch { return false; }
}
async function bounded(promise, milliseconds, code) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(code)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
async function saveReport() {
  const text = `${JSON.stringify(report, null, 2)}\n`;
  assert.ok(Buffer.byteLength(text) <= 256 * 1024, "Hosted report exceeds its bound");
  await writeFile(path.join(output, "hosted.json"), text);
}

try {
  const committed = await readFile(new URL("../../public/data/calls.json", import.meta.url));
  assert.equal(committed.length, CATALOGUE.bytes);
  assert.equal(sha(committed), CATALOGUE.sha256);
  const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(committed));
  assert.equal(data.version, 1);
  assert.equal(data.items.length, 50);
  assert.equal(new Set(data.items.map((item) => item.id)).size, 50);
  assert.equal(data.items.filter((item) => item.title.includes("\n")).length, 1);
  report.catalogue = { committed: CATALOGUE, fetchedAt: data.fetchedAt, source: data.source, window: data.window, itemCount: 50 };

  browser = await chromium.launch({ headless: true, timeout: 30000 });
  report.browser = browser.version();
  browser.on("disconnected", () => { report.cleanup.browserDisconnectedObserved = true; if (!browserClosing) problem("unexpected_browser_disconnect"); });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: false });
  report.cleanup.contextCreated = true;
  context.on("close", () => { report.cleanup.contextClosedObserved = true; if (!contextClosing) problem("unexpected_context_close"); });
  context.on("page", (opened) => {
    report.cleanup.pagesCreated++;
    if (report.cleanup.pagesCreated !== 1) problem("unexpected_extra_page");
    opened.on("pageerror", (error) => problem("page_error", error.message));
    opened.on("console", (message) => { if (message.type() === "error") problem("console_error", message.text()); });
    opened.on("crash", () => problem("page_crash"));
    opened.on("close", () => { if (opened === page) report.cleanup.pageClosedObserved = true; if (!contextClosing) problem("unexpected_page_close"); });
    opened.on("websocket", () => problem("unexpected_websocket"));
  });
  context.on("request", (request) => {
    if (report.requests.length < 100) report.requests.push({ method: request.method(), url: request.url() });
    else problem("request_count_bound");
    if (!allowed(request)) problem("request_boundary", `${request.method()} ${request.url()}`);
  });
  context.on("requestfailed", (request) => problem("request_failed", `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`));
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  const dataResponse = page.waitForResponse((response) => response.url() === `${ORIGIN}/data/calls.json`, { timeout: 30000 });
  dataResponse.catch(() => {}); // Cleanup may close the page if navigation fails first.
  // Observe the application's existing fetch. This does not issue a second request.
  const navigation = await page.goto(ORIGIN, { waitUntil: "networkidle" });
  assert.ok(navigation);
  assert.equal(navigation.status(), 200);
  assert.equal(new URL(page.url()).origin, ORIGIN);
  assert.equal(new URL(page.url()).pathname, "/");
  const response = await dataResponse;
  assert.equal(response.request().method(), "GET");
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-type"] ?? "", /^application\/json(?:;|$)/i);
  assert.equal(await bounded(response.finished(), 15000, "catalogue_response_finish_timeout"), null);
  const actual = await bounded(response.body(), 15000, "catalogue_response_body_timeout");
  assert.equal(actual.length, CATALOGUE.bytes);
  assert.equal(sha(actual), CATALOGUE.sha256);
  assert.ok(actual.equals(committed), "Hosted catalogue representation must match the committed bytes exactly");
  report.catalogue.response = { status: response.status(), contentType: response.headers()["content-type"], bytes: actual.length, sha256: sha(actual), encoding: "base64", data: actual.toString("base64"), exactCommittedBytes: true };
  report.case.checks.exactHostedCatalogueBytes = true;

  await page.waitForFunction(() => document.querySelector("#feed-grid")?.getAttribute("aria-busy") === "false");
  assert.equal(await page.locator("#guide-grid article").count(), 8);
  assert.deepEqual((await page.locator("#guide-grid article").evaluateAll((cards) => cards.map((card) => card.dataset.guideId))).sort(), [...GUIDE_IDS].sort());
  assert.equal(await page.locator("#feed-grid article").count(), 50);
  const fetched = Date.parse(data.fetchedAt);
  const observedAt = Date.now();
  assert.ok(Number.isFinite(fetched));
  assert.ok(fetched <= observedAt + 5 * 60 * 1000, "Catalogue fetch timestamp must not be in the future");
  assert.ok(observedAt - fetched <= 48 * 60 * 60 * 1000, "Hosted catalogue must be no more than 48 hours old");
  const freshness = await page.locator("#feed-freshness").textContent();
  const expectedFreshness = await page.evaluate((timestamp) => `Última descarga correcta · ${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp))}`, data.fetchedAt);
  assert.equal(freshness, expectedFreshness);
  assert.equal(await page.locator("#feed-freshness").evaluate((element) => element.classList.contains("stale")), false);
  const rows = await page.locator("#feed-grid article").evaluateAll((cards) => cards.map((card) => ({
    title: card.querySelector("h3")?.textContent,
    agency: card.querySelector("p")?.textContent,
    href: card.querySelector("a")?.getAttribute("href"),
    target: card.querySelector("a")?.getAttribute("target"),
    rel: card.querySelector("a")?.getAttribute("rel"),
    links: card.querySelectorAll("a").length,
    injectedElements: card.querySelectorAll("script,img,iframe").length
  })));
  for (const [index, item] of data.items.entries()) {
    const row = rows[index];
    assert.equal(row.title, item.title, `Title textContent at index ${index} must preserve the exact public string, including LF`);
    assert.equal(row.agency, item.agency);
    assert.equal(row.href, item.sourceUrl);
    assert.equal(row.links, 1);
    assert.equal(row.target, "_blank");
    assert.deepEqual(row.rel.split(/\s+/).sort(), ["noopener", "noreferrer"]);
    assert.equal(row.injectedElements, 0);
    const url = new URL(row.href);
    assert.equal(url.protocol, "https:");
    assert.ok(["www.infosubvenciones.es", "infosubvenciones.es"].includes(url.hostname));
    assert.equal(url.username, ""); assert.equal(url.password, ""); assert.equal(url.port, "");
  }
  const documentSafety = await page.evaluate(() => ({
    images: document.querySelectorAll("img").length,
    frames: document.querySelectorAll("iframe").length,
    scripts: [...document.querySelectorAll("script")].map((script) => ({ src: script.getAttribute("src"), type: script.getAttribute("type"), inlineBytes: script.textContent.length })),
    externalLinks: [...document.querySelectorAll("a[href]")].map((anchor) => anchor.href).filter((href) => new URL(href).origin !== location.origin),
    persistence: document.querySelector("#persistence-toggle").checked
  }));
  assert.equal(documentSafety.images, 0); assert.equal(documentSafety.frames, 0);
  assert.deepEqual(documentSafety.scripts, [{ src: "/app.js", type: "module", inlineBytes: 0 }]);
  assert.deepEqual(documentSafety.externalLinks, data.items.map((item) => item.sourceUrl));
  assert.equal(documentSafety.persistence, false);
  assert.equal(context.pages().length, 1);
  assert.equal(page.frames().length, 1);
  assert.equal(await page.locator("#plan-count").textContent(), "0");
  assert.equal(await page.locator("#profile-dialog").evaluate((element) => element.open), false);
  report.ui = { guideIds: GUIDE_IDS, feedRows: rows, freshness, observedAt: new Date(observedAt).toISOString(), catalogueAgeMs: observedAt - fetched, lfTitleIds: data.items.filter((item) => item.title.includes("\n")).map((item) => item.id), documentSafety };
  report.case.checks.eightGuidesAndFiftyAnnouncements = true;
  report.case.checks.freshTimestampDisplayed = true;
  report.case.checks.exactTextContentAndOfficialHrefs = true;
  report.case.checks.noInjectedScriptImageOrFrame = true;
  report.case.checks.anonymousUnmodifiedProfileAndPlan = true;

  await page.locator("#feed-grid article").first().scrollIntoViewIfNeeded();
  const image = await page.screenshot({ path: path.join(output, "hosted.png"), fullPage: false, timeout: 10000 });
  assert.ok(image.length <= 512 * 1024, "Hosted screenshot exceeds its proof bound");
  report.screenshot = { name: "hosted.png", bytes: image.length, sha256: sha(image), scope: "desktop viewport around the first actual BDNS cards" };
  assert.ok(report.requests.length >= 5);
  assert.ok(report.requests.every((request) => allowed({ method: () => request.method, url: () => request.url })));
  assert.equal(report.requests.filter((request) => request.url === `${ORIGIN}/data/calls.json`).length, 1);
  assert.equal(diagnostics, 0);
  report.case.checks.finiteStaticGetNetworkBoundary = true;
  functionalComplete = true;
} catch (error) {
  report.case.status = "failed";
  report.case.error = String(error?.stack ?? error).slice(0, 12000);
} finally {
  try { await saveReport(); }
  catch { report.cleanup.errors.push("pre_cleanup_report_write_failed"); }
  if (context) {
    contextClosing = true; report.cleanup.contextCloseAttempted = true;
    try { await bounded(context.close(), 10000, "context_close_timeout"); }
    catch { report.cleanup.errors.push("context_close_failed"); }
  }
  if (browser) {
    browserClosing = true; report.cleanup.browserCloseAttempted = true;
    try { await bounded(browser.close(), 10000, "browser_close_timeout"); }
    catch { report.cleanup.errors.push("browser_close_failed"); }
  }
  report.cleanup.normalClosure = Boolean(context && browser && report.cleanup.contextClosedObserved && report.cleanup.pageClosedObserved && report.cleanup.browserDisconnectedObserved && report.cleanup.errors.length === 0);
  report.passed = functionalComplete && diagnostics === 0 && report.cleanup.normalClosure;
  report.case.status = report.passed ? "passed" : "failed";
  report.case.checks.normalBrowserAndContextClosure = report.cleanup.normalClosure;
  report.finishedAt = new Date().toISOString();
  await saveReport();
  process.exitCode = report.passed ? 0 : 1;
}
