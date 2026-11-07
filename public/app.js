import { GUIDES, CATEGORIES } from "./lib/catalog.js";
import { REGIONS, rankGuides, normalizeProfile } from "./lib/matcher.js";
import { STORAGE_KEY, STATUSES, emptyPlan, validatePlan, parseBackup, newEntry, calendarText } from "./lib/plan.js";

const $ = (selector, root = document) => root.querySelector(selector);
const FIELDS = { age: "edad", region: "territorio", employment: "situación laboral", studying: "estudios", renting: "alquiler", children: "hijos a cargo", lowIncome: "ingresos", disability: "discapacidad" };
const QUESTIONS = { studying: "¿Estás estudiando?", renting: "¿Vives de alquiler?", children: "¿Tienes hijos a cargo?", lowIncome: "¿Quieres explorar apoyos por ingresos?", disability: "¿Quieres explorar apoyos por discapacidad?" };
const EMPLOYMENTS = { employee: "Trabajo por cuenta ajena", unemployed: "Estoy en desempleo", "self-employed": "Trabajo por cuenta propia", retired: "Estoy jubilado/a", other: "Otra situación" };
const OFFICIAL_HOSTS = new Set(["infosubvenciones.es", "www.infosubvenciones.es"]);
const MAX_FEED_BYTES = 1024 * 1024;
let plan = emptyPlan();
let persistent = false;
let view = "browse";
let category = "Todas";
let search = "";
let openGuideId = null;
let confirmation = null;
let toastTimer;
let feedLoading = false;

function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") element.className = value;
    else if (key === "onClick") element.addEventListener("click", value);
    else if (key.startsWith("aria-") && typeof value === "boolean") element.setAttribute(key, String(value));
    else if (value !== false && value != null) element.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat()) if (child != null) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}
function button(text, action, className = "small-button", attrs = {}) {
  return node("button", { type: "button", class: className, onClick: action, ...attrs }, text);
}
function notice(message) { $("#notice-text").textContent = message; $("#notice").hidden = false; }
function toast(message) {
  clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").hidden = false;
  toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 5500);
}
function dateLabel(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value) return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  return value;
}
function publicUrl(value, bdnsOnly = false) {
  if (typeof value !== "string" || value.length > 2048) throw new Error("source_url");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || (bdnsOnly && !OFFICIAL_HOSTS.has(url.hostname))) throw new Error("source_url");
  return url.href;
}
function sourceLink(text, href, className = "") {
  return node("a", { href: publicUrl(href), target: "_blank", rel: "noopener noreferrer", class: className }, text, node("span", { "aria-hidden": "true" }, " ↗"));
}
function updateStorageStatus() {
  $("#persistence-toggle").checked = persistent;
  $("#storage-status").textContent = persistent ? "Guardado local activado en este navegador. Tus respuestas no se envían a ningún servidor." : "Guardado local desactivado. El plan de esta pestaña se perderá al cerrarla; puedes descargar una copia JSON.";
}
function saveLocal() {
  if (!persistent) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); }
  catch {
    persistent = false;
    notice("El navegador no ha permitido guardar los cambios. Tu plan sigue en esta pestaña: descarga una copia JSON antes de salir. Una copia anterior podría seguir en el navegador.");
  }
  updateStorageStatus();
}
function commit(value) {
  plan = validatePlan(value, GUIDES);
  saveLocal();
  render();
}
function loadPlan() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) { plan = parseBackup(saved, GUIDES); persistent = true; }
  } catch {
    notice("No hemos podido leer el plan guardado. No se ha modificado esa copia. Puedes seguir en esta pestaña o importar una copia JSON válida; el guardado local está desactivado.");
  }
  updateStorageStatus();
}
function setView(next, focus = false) {
  view = next;
  $("#browse-view").hidden = view !== "browse";
  $("#plan-view").hidden = view !== "plan";
  for (const key of ["browse", "plan"]) {
    const nav = $(`#${key}-nav`); nav.classList.toggle("is-active", view === key);
    if (view === key) nav.setAttribute("aria-current", "page"); else nav.removeAttribute("aria-current");
  }
  if (focus) {
    if (view === "plan") $("#plan-title").focus();
    else $("#guide-search").focus();
    window.scrollTo({ top: view === "plan" ? 0 : $("#guias").offsetTop - 20, behavior: "auto" });
  }
}
function ranked() { return rankGuides(GUIDES, plan.profile ?? {}); }
function categoryLabel(guide) {
  return node("span", { class: `category-label category-${Math.max(0, CATEGORIES.indexOf(guide.category))}` }, guide.category);
}
function relevance(match, detailed = false) {
  const box = node("div", { class: detailed ? "detail-explainer" : "relevance" });
  box.append(node("strong", {}, match.label));
  if (match.territoryMismatch) box.append(node("p", { class: "territory-warning" }, "Esta guía señala una excepción en tu territorio. Consulta la vía autonómica indicada antes de continuar."));
  if (match.matchedReasons.length) box.append(node("p", {}, match.matchedReasons.join(" · ")));
  else box.append(node("p", {}, plan.profile ? "No hay una coincidencia específica con tus respuestas. Puedes consultar sus requisitos." : "Añade un perfil opcional para ver coincidencias y lo que falta por comprobar."));
  if (match.unknownFields.length) box.append(node("p", { class: "unknown" }, `Sin responder: ${match.unknownFields.map((field) => FIELDS[field]).join(", ")}.`));
  if (detailed) box.append(node("p", {}, "La afinidad no comprueba todos los requisitos. Revisa las condiciones oficiales, incluso si hay coincidencias."));
  return box;
}
function toggleSave(id) {
  const guide = GUIDES.find((item) => item.id === id);
  if (plan.entries[id]) {
    confirmAction("¿Quitar esta guía de tu plan?", `Se borrarán el progreso, las notas y el recordatorio de «${guide.title}». La guía seguirá disponible para explorar.`, "Quitar del plan", () => {
      const next = validatePlan(plan, GUIDES); delete next.entries[id]; commit(next);
      if (openGuideId === id && $("#guide-dialog").open) renderGuide(id);
      toast("Guía retirada de tu plan.");
    });
  } else {
    const next = validatePlan(plan, GUIDES); next.entries[id] = newEntry(); commit(next); toast("Guía añadida a tu plan.");
    if (openGuideId === id && $("#guide-dialog").open) { renderGuide(id); $("#entry-status").focus(); }
  }
}
function guideCard(match, savedView = false) {
  const { guide } = match; const entry = plan.entries[guide.id];
  const card = node("article", { class: "guide-card", "data-guide-id": guide.id });
  const save = button(entry ? "✓" : "+", () => toggleSave(guide.id), `save-icon${entry ? " is-saved" : ""}`, { "aria-label": `${entry ? "Quitar de mi plan" : "Añadir a mi plan"}: ${guide.title}`, "aria-pressed": Boolean(entry) });
  card.append(node("div", { class: "card-top" }, savedView ? node("span", { class: "entry-status" }, STATUSES[entry.status]) : categoryLabel(guide), save));
  card.append(node("h3", {}, guide.title), node("p", { class: "card-summary" }, guide.summary));
  if (savedView) {
    const complete = entry.checks.length; const total = guide.documents.length;
    card.append(node("progress", { class: "progress-track", value: complete, max: total || 1, "aria-label": "Documentos preparados" }), node("p", { class: "progress-label" }, `${complete} de ${total} documentos preparados`));
    if (entry.reminder) card.append(node("p", { class: "entry-note" }, `Recordatorio: ${dateLabel(entry.reminder)}`));
  } else { card.append(node("p", { class: "card-scope" }, guide.scope), relevance(match)); }
  card.append(node("div", { class: "card-footer" }, button(savedView ? "Continuar con mi plan ↗" : "Conocer la ayuda ↗", () => openGuide(guide.id)), node("span", { class: "official-note" }, "Fuente oficial")));
  return card;
}
function render() {
  const matches = ranked(); const count = Object.keys(plan.entries).length;
  $("#plan-count").textContent = count;
  const normalized = search.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filtered = matches.filter(({ guide }) => (category === "Todas" || guide.category === category) && `${guide.title} ${guide.summary} ${guide.category} ${guide.agency}`.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalized));
  $("#guide-grid").replaceChildren(...filtered.map((match) => guideCard(match)));
  $("#guide-empty").hidden = filtered.length !== 0;
  $("#results-count").textContent = `${filtered.length} ${filtered.length === 1 ? "guía para explorar" : "guías para explorar"}${plan.profile ? " · ordenadas por afinidad" : ""}`;
  $("#categories").replaceChildren(...["Todas", ...CATEGORIES].map((label) => button(label, () => { category = label; render(); }, "category-chip", { "aria-pressed": category === label })));
  const summary = $("#profile-summary"); summary.hidden = plan.profile === null;
  if (plan.profile) {
    const answers = Object.values(plan.profile).filter((value) => value !== null).length;
    summary.replaceChildren(node("span", {}, `Tu perfil tiene ${answers} ${answers === 1 ? "respuesta" : "respuestas"}. Las preguntas sin responder siguen pendientes de comprobar.`), button("Editar perfil", openProfile));
  }
  $("#plan-summary").textContent = `${count} ${count === 1 ? "guía en tu plan" : "guías en tu plan"}`;
  $("#plan-grid").replaceChildren(...matches.filter(({ guide }) => plan.entries[guide.id]).map((match) => guideCard(match, true)));
  $("#plan-empty").hidden = count !== 0;
  updateStorageStatus();
}
function option(value, label) { return node("option", { value }, label); }
function initProfile() {
  $("#profile-region").append(option("", "Prefiero no decirlo"), ...REGIONS.map((region) => option(region, region)));
  $("#profile-employment").append(option("", "Prefiero no decirlo"), ...Object.entries(EMPLOYMENTS).map(([value, label]) => option(value, label)));
  for (const [field, question] of Object.entries(QUESTIONS)) {
    const select = node("select", { name: field, id: `profile-${field}`, "aria-label": question }, option("", "Prefiero no decirlo"), option("yes", "Sí"), option("no", "No"));
    $("#profile-booleans").append(node("label", { for: `profile-${field}` }, question, select));
  }
}
function openProfile() {
  const profile = plan.profile ?? normalizeProfile();
  $("#profile-age").value = profile.age ?? "";
  $("#profile-region").value = profile.region ?? "";
  $("#profile-employment").value = profile.employment ?? "";
  for (const field of Object.keys(QUESTIONS)) $(`#profile-${field}`).value = profile[field] === null ? "" : profile[field] ? "yes" : "no";
  $("#profile-error").hidden = true;
  $("#profile-dialog").showModal();
}
function openGuide(id) {
  openGuideId = id; renderGuide(id);
  if (!$("#guide-dialog").open) $("#guide-dialog").showModal();
}
function listBlock(title, items, ordered = false) {
  return node("section", { class: "detail-block" }, node("h3", {}, title), node(ordered ? "ol" : "ul", {}, ...items.map((item) => node("li", {}, item))));
}
function renderGuide(id) {
  const match = ranked().find((row) => row.guide.id === id); const { guide } = match; const entry = plan.entries[id];
  const root = $("#guide-detail"); root.replaceChildren();
  const cat = categoryLabel(guide); cat.classList.add("detail-category");
  root.append(cat, node("h2", { id: "guide-detail-title", class: "detail-title" }, guide.title), node("p", { class: "detail-summary" }, guide.summary));
  root.append(node("div", { class: "detail-meta" }, node("p", {}, guide.agency), node("p", {}, guide.scope), node("p", {}, `Revisada: ${dateLabel(guide.reviewedAt)}`)));
  root.append(relevance(match, true));
  root.append(node("section", { class: "detail-block" }, node("h3", {}, "Antes de empezar"), node("p", {}, guide.availability)));
  root.append(listBlock("Requisitos que debes comprobar", guide.requirements), listBlock("Cómo dar el siguiente paso", guide.steps, true));
  root.append(node("div", { class: "detail-source" }, sourceLink("Consultar la fuente oficial", guide.sourceUrl, "button button-primary"), node("p", {}, guide.sourceLabel, node("br"), "Se abre una web oficial en otra pestaña.")));
  if (entry) root.append(planEditor(guide, entry));
  else root.append(node("section", { class: "plan-editor" }, node("h3", {}, "Hazle un hueco en tu plan."), node("p", {}, "Guarda esta guía para preparar sus documentos, tomar notas y recordar tu próximo paso."), button("Añadir a mi plan +", () => toggleSave(id), "button button-outline")));
}
function entryFromForm(form, guide) {
  const data = new FormData(form);
  return { status: String(data.get("status")), checks: data.getAll("checks").map(Number), notes: String(data.get("notes") ?? ""), reminder: String(data.get("reminder") ?? "") };
}
function planEditor(guide, entry) {
  const section = node("section", { class: "plan-editor" }, node("h3", {}, "Tu plan para esta ayuda"), node("p", {}, "Un espacio de preparación personal. El estado que elijas no presenta ni consulta ningún trámite oficial. Pulsa «Guardar cambios» cuando termines de editar."));
  const form = node("form", { class: "plan-form" });
  const status = node("select", { name: "status", id: "entry-status", "aria-label": "Mi progreso" }, ...Object.entries(STATUSES).map(([value, label]) => option(value, label))); status.value = entry.status;
  form.append(node("label", { for: "entry-status" }, "Mi progreso", status));
  const checks = node("fieldset", { class: "document-checklist" }, node("legend", {}, "Documentos por preparar"));
  for (const [index, text] of guide.documents.entries()) {
    const input = node("input", { type: "checkbox", name: "checks", value: index }); input.checked = entry.checks.includes(index);
    checks.append(node("label", {}, input, node("span", {}, text)));
  }
  form.append(checks);
  const notes = node("textarea", { name: "notes", id: "entry-notes", maxlength: 2000, rows: 4, "aria-describedby": "notes-help" }); notes.value = entry.notes;
  form.append(node("label", { for: "entry-notes" }, "Mis notas", notes), node("p", { id: "notes-help", class: "notes-help" }, "No hace falta incluir datos personales. Evita nombres, DNI, cuentas bancarias, contraseñas o información sensible. Máximo 2.000 caracteres."));
  const reminder = node("input", { type: "date", name: "reminder", id: "entry-reminder" }); reminder.value = entry.reminder;
  const download = button("Descargar recordatorio .ics ↓", () => {
    try {
      const value = entryFromForm(form, guide); const next = validatePlan(plan, GUIDES); next.entries[guide.id] = value;
      const valid = validatePlan(next, GUIDES); const text = calendarText(guide, valid.entries[guide.id]);
      commit(valid); downloadText(text, `${guide.id}-recordatorio.ics`, "text/calendar;charset=utf-8");
      message.textContent = "Cambios guardados y recordatorio descargado. Impórtalo en tu calendario; no es una fecha límite oficial."; message.hidden = false;
    } catch { error.textContent = "Revisa los campos y añade una fecha válida antes de descargar el recordatorio."; error.hidden = false; }
  }, "button button-outline");
  form.append(node("div", { class: "reminder-row detail-block" }, node("label", { for: "entry-reminder" }, "Mi fecha de recordatorio", reminder), download), node("p", { class: "notes-help" }, "Es una fecha elegida por ti, no el plazo oficial de la ayuda."));
  const error = node("p", { class: "form-error", role: "alert", hidden: true });
  const message = node("p", { class: "detail-form-message", role: "status", hidden: true });
  const submit = node("button", { type: "submit", class: "button button-primary" }, "Guardar cambios", node("span", { "aria-hidden": "true" }, "✓"));
  form.append(error, node("div", { class: "form-actions" }, submit, button("Quitar esta guía de mi plan", () => toggleSave(guide.id), "small-button danger-text")), message);
  form.addEventListener("submit", (event) => {
    event.preventDefault(); error.hidden = true; message.hidden = true;
    try {
      const next = validatePlan(plan, GUIDES); next.entries[guide.id] = entryFromForm(form, guide); commit(next);
      message.textContent = persistent ? "Cambios guardados en este navegador." : "Cambios guardados en esta pestaña. Puedes descargar una copia para conservarlos.";
      message.hidden = false;
    } catch { error.textContent = "No se pudieron guardar los cambios. Revisa la fecha y los campos del plan."; error.hidden = false; }
  });
  section.append(form); return section;
}
function confirmAction(title, description, label, action, danger = true) {
  $("#confirm-title").textContent = title; $("#confirm-description").textContent = description;
  $("#confirm-accept").textContent = label; $("#confirm-accept").className = `button ${danger ? "button-danger" : "button-primary"}`;
  $("#confirm-error").hidden = true; confirmation = action; $("#confirm-dialog").showModal();
  $("#confirm-cancel").focus();
}
function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime }); const url = URL.createObjectURL(blob);
  const link = node("a", { href: url, download: filename }); document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function boundedString(value, max, allowEmpty = false) { return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value); }
function validateFeed(value) {
  if (!value || Array.isArray(value) || value.version !== 1 || !value.source || !boundedString(value.source.name, 200)
    || !value.window || !boundedString(value.window.from, 80, true) || !boundedString(value.window.to, 80, true)
    || !Array.isArray(value.items) || value.items.length > 50 || !(value.warning === null || boundedString(value.warning, 4500))) throw new Error("feed_schema");
  publicUrl(value.source.url, true);
  if (value.fetchedAt !== null && (!boundedString(value.fetchedAt, 40) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.fetchedAt) || !Number.isFinite(Date.parse(value.fetchedAt)))) throw new Error("feed_date");
  if (value.fetchedAt === null && value.items.length) throw new Error("feed_unfetched");
  const ids = new Set();
  for (const item of value.items) {
    if (!item || typeof item.id !== "string" || !/^[0-9]{1,20}$/.test(item.id) || ids.has(item.id) || !boundedString(item.title, 2000) || !boundedString(item.agency, 1506) || !boundedString(item.registeredAt, 64)) throw new Error("feed_item");
    ids.add(item.id); publicUrl(item.sourceUrl, true);
  }
  return value;
}
async function readFeed(response) {
  if (!response.ok || !response.body) throw new Error("feed_http");
  const length = response.headers.get("content-length"); if (length && Number(length) > MAX_FEED_BYTES) throw new Error("feed_size");
  const reader = response.body.getReader(); const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_FEED_BYTES) { await reader.cancel(); throw new Error("feed_size"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return validateFeed(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)));
}
async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true; $("#retry-feed").disabled = true; $("#feed-grid").setAttribute("aria-busy", "true");
  $("#feed-freshness").textContent = "Consultando el catálogo público…"; $("#feed-freshness").classList.remove("stale");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const feed = await readFeed(await fetch("/data/calls.json", { signal: controller.signal, credentials: "omit", cache: "no-cache", headers: { Accept: "application/json" } }));
    $("#feed-grid").replaceChildren();
    const now = Date.now(); const fetched = feed.fetchedAt === null ? null : Date.parse(feed.fetchedAt);
    if (fetched !== null && fetched > now + 5 * 60 * 1000) throw new Error("feed_future");
    const stale = fetched !== null && now - fetched > 48 * 60 * 60 * 1000;
    $("#feed-freshness").classList.toggle("stale", stale);
    $("#feed-freshness").textContent = fetched === null ? "Todavía no hay una descarga pública verificada." : `${stale ? "Datos con más de 48 horas · " : "Última descarga correcta · "}${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(fetched))}`;
    const messages = [];
    if (feed.warning) messages.push(feed.warning);
    if (fetched === null) messages.push("Aún no hay anuncios disponibles aquí. Las ocho guías de orientación siguen disponibles arriba.");
    else if (!feed.items.length) messages.push("La última descarga no contiene anuncios en su ventana de consulta. Esto no significa que no existan otras ayudas.");
    if (stale) messages.push("El catálogo puede haber cambiado. Consulta la BDNS para confirmar la información más reciente.");
    $("#feed-message").replaceChildren(...messages.map((message) => node("p", {}, message)));
    $("#feed-message").hidden = messages.length === 0;
    for (const item of feed.items) $("#feed-grid").append(node("article", { class: "feed-card" }, node("h3", {}, item.title), node("p", {}, item.agency), node("p", {}, `Registro en la fuente: ${item.registeredAt ? dateLabel(item.registeredAt) : "no indicado"}`), sourceLink("Ver publicación oficial", item.sourceUrl)));
  } catch {
    $("#feed-grid").replaceChildren(); $("#feed-freshness").textContent = "No se pudo consultar el catálogo público.";
    $("#feed-message").textContent = "El catálogo no está disponible en este momento. Tus guías y tu plan siguen funcionando. Puedes volver a consultar o visitar la Base de Datos Nacional de Subvenciones.";
    $("#feed-message").append(node("br"), sourceLink("Abrir BDNS", "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias"));
    $("#feed-message").hidden = false;
  } finally { clearTimeout(timer); feedLoading = false; $("#retry-feed").disabled = false; $("#feed-grid").setAttribute("aria-busy", "false"); }
}

$("#browse-nav").addEventListener("click", () => setView("browse", true));
$("#plan-nav").addEventListener("click", () => setView("plan", true));
$("#empty-explore").addEventListener("click", () => setView("browse", true));
for (const link of document.querySelectorAll('.brand[href="#inicio"]')) link.addEventListener("click", () => setView("browse"));
$("#hero-profile").addEventListener("click", openProfile); $("#edit-profile").addEventListener("click", openProfile);
$("#guide-search").addEventListener("input", (event) => { search = event.target.value.trim(); render(); });
$("#reset-filters").addEventListener("click", () => { search = ""; category = "Todas"; $("#guide-search").value = ""; render(); $("#guide-search").focus(); });
$("#dismiss-notice").addEventListener("click", () => { $("#notice").hidden = true; });
for (const close of document.querySelectorAll("[data-close]")) close.addEventListener("click", () => document.getElementById(close.dataset.close).close());
$("#guide-dialog").addEventListener("close", () => { openGuideId = null; });
$("#confirm-cancel").addEventListener("click", () => $("#confirm-dialog").close());
$("#confirm-dialog").addEventListener("close", () => { confirmation = null; });
$("#confirm-accept").addEventListener("click", () => {
  try { confirmation?.(); $("#confirm-dialog").close(); }
  catch { $("#confirm-error").textContent = "No se ha podido completar el cambio. Tu plan sigue disponible en esta pestaña."; $("#confirm-error").hidden = false; }
});
$("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const data = new FormData(event.currentTarget); const age = String(data.get("age") ?? "").trim();
    const value = { age: age === "" ? null : Number(age), region: data.get("region") || null, employment: data.get("employment") || null };
    for (const field of Object.keys(QUESTIONS)) value[field] = data.get(field) === "" ? null : data.get(field) === "yes";
    const next = validatePlan(plan, GUIDES); next.profile = normalizeProfile(value); commit(next);
    $("#profile-dialog").close(); toast("Perfil aplicado. Las coincidencias son orientación, no una decisión de elegibilidad.");
  } catch { $("#profile-error").textContent = "Revisa tu edad (18 a 110 años) y selecciona las opciones de las listas. Puedes dejar cualquier pregunta sin responder."; $("#profile-error").hidden = false; }
});
$("#remove-profile").addEventListener("click", () => { const next = validatePlan(plan, GUIDES); next.profile = null; commit(next); $("#profile-dialog").close(); toast("Perfil eliminado. Las guías guardadas siguen en tu plan."); });
$("#persistence-toggle").addEventListener("change", (event) => {
  if (event.target.checked) {
    persistent = true; saveLocal();
    if (persistent) toast("Guardado local activado. Usa este dispositivo con cuidado si lo compartes.");
  } else {
    persistent = false;
    try { localStorage.removeItem(STORAGE_KEY); toast("Guardado local desactivado. Tu plan continúa en esta pestaña."); }
    catch { notice("El navegador no ha permitido borrar la copia guardada. No guardaremos nuevos cambios; una copia anterior podría seguir disponible en este dispositivo. Tu plan continúa en esta pestaña."); }
  }
  updateStorageStatus();
});
$("#download-backup").addEventListener("click", () => {
  try { const valid = validatePlan(plan, GUIDES); downloadText(`${JSON.stringify(valid, null, 2)}\n`, "ayudario-mi-plan.json", "application/json;charset=utf-8"); toast("Copia descargada. Incluye tu perfil y tus notas: guárdala en un lugar privado."); }
  catch { notice("No se ha podido preparar la copia. Tu plan sigue disponible en esta pestaña."); }
});
$("#import-backup").addEventListener("click", () => $("#backup-file").click());
$("#backup-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
  try {
    if (file.size > 128 * 1024) throw new Error("size");
    const imported = parseBackup(await file.text(), GUIDES);
    confirmAction("¿Reemplazar tu plan con esta copia?", `La copia es válida y contiene ${Object.keys(imported.entries).length} guías. Reemplazará por completo el perfil, el progreso y las notas actuales. Descarga primero tu plan si quieres conservarlo.`, "Reemplazar mi plan", () => { commit(imported); setView("plan", true); toast("Copia importada. El plan anterior ha sido reemplazado."); });
  } catch { notice("No se ha importado nada. La copia debe ser un JSON de Ayudario válido, de hasta 128 KB, con guías y campos reconocidos."); }
});
$("#clear-plan").addEventListener("click", () => {
  confirmAction("¿Borrar todo tu plan y tu perfil?", "Se borrarán las guías guardadas, las notas, los recordatorios y las respuestas del perfil de esta pestaña y se intentará eliminar la copia de este navegador. Una copia JSON que hayas descargado no se borra.", "Borrar todo", () => {
    plan = emptyPlan(); persistent = false;
    try { localStorage.removeItem(STORAGE_KEY); }
    catch { notice("El plan se ha vaciado en esta pestaña, pero el navegador no ha permitido borrar la copia local. Una copia anterior podría reaparecer al volver a abrir Ayudario."); }
    render(); toast("Plan y perfil vaciados en esta pestaña.");
  });
});
$("#retry-feed").addEventListener("click", loadFeed);

initProfile(); loadPlan(); render(); setView("browse"); loadFeed();
