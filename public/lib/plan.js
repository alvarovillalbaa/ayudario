import { normalizeProfile } from "./matcher.js";

export const STORAGE_KEY = "ayudario.plan.v2";
export const LEGACY_STORAGE_KEY = "ayudario.plan.v1";
export const STATUSES = Object.freeze({ saved: "Por revisar", preparing: "Preparando", submitted: "Presentada", resolved: "Resuelta" });
export function emptyPlan() { return { version: 2, profile: null, entries: {} }; }

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactKeys(value, allowed) { return Object.keys(value).every((key) => allowed.includes(key)); }
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePlan(value, guides) {
  if (!isRecord(value) || ![1, 2].includes(value.version) || !exactKeys(value, ["version", "profile", "entries"])
    || !isRecord(value.entries)) throw new Error("La copia no tiene un formato compatible de Ayudario.");
  const result = emptyPlan();
  result.profile = value.profile == null ? null : normalizeProfile(value.profile);
  const keys = Object.keys(value.entries);
  if (keys.length > guides.length) throw new Error("La copia contiene demasiadas ayudas.");
  for (const id of keys) {
    const guide = guides.find((item) => item.id === id);
    const entry = value.entries[id];
    const criteria = value.version === 1 ? [] : entry?.criteria;
    if (!guide || !isRecord(entry) || !exactKeys(entry, value.version === 1 ? ["status", "checks", "notes", "reminder"] : ["status", "checks", "criteria", "notes", "reminder"])
      || !Object.hasOwn(STATUSES, entry.status) || !Array.isArray(entry.checks)
      || entry.checks.length > guide.documents.length || new Set(entry.checks).size !== entry.checks.length
      || entry.checks.some((index) => !Number.isInteger(index) || index < 0 || index >= guide.documents.length)
      || !Array.isArray(criteria) || criteria.length > guide.requirements.length || new Set(criteria).size !== criteria.length
      || criteria.some((index) => !Number.isInteger(index) || index < 0 || index >= guide.requirements.length)
      || typeof entry.notes !== "string" || entry.notes.length > 2000
      || typeof entry.reminder !== "string" || (entry.reminder !== "" && !validDate(entry.reminder))) {
      throw new Error("Una ayuda de la copia contiene datos no válidos.");
    }
    result.entries[id] = { status: entry.status, checks: [...entry.checks], criteria: [...criteria], notes: entry.notes, reminder: entry.reminder };
  }
  return result;
}

export function parseBackup(text, guides) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > 128 * 1024) throw new Error("La copia supera el límite de 128 KB.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("La copia no es un archivo JSON válido."); }
  return validatePlan(value, guides);
}

export function newEntry() { return { status: "saved", checks: [], criteria: [], notes: "", reminder: "" }; }

export function preparationProgress(guide, entry) {
  const criteria = entry.criteria ?? [], complete = criteria.length + entry.checks.length;
  const total = guide.requirements.length + guide.documents.length;
  return { complete, total, remaining: total - complete,
    requirements: { complete: criteria.length, total: guide.requirements.length },
    documents: { complete: entry.checks.length, total: guide.documents.length },
    next: guide.requirements.find((_, index) => !criteria.includes(index)) ?? guide.documents.find((_, index) => !entry.checks.includes(index)) ?? null };
}

export function readStoredPlan(storage, guides) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw !== null) return { plan: parseBackup(raw, guides), raw, legacy: false, found: true };
  const legacy = storage.getItem(LEGACY_STORAGE_KEY);
  return { plan: legacy === null ? emptyPlan() : parseBackup(legacy, guides), raw: null, legacy: legacy !== null, found: legacy !== null };
}
export function writeStoredPlan(storage, value, guides, expectedRaw) {
  const current = storage.getItem(STORAGE_KEY);
  if (current !== null) parseBackup(current, guides);
  if (current !== expectedRaw) throw new Error("La copia local cambió en otra pestaña. Descarga tu plan antes de continuar.");
  const raw = JSON.stringify(validatePlan(value, guides)); storage.setItem(STORAGE_KEY, raw);
  if (storage.getItem(STORAGE_KEY) !== raw) throw new Error("No se pudo confirmar la copia local. Descarga tu plan.");
  return raw;
}
export function clearStoredPlan(storage) {
  storage.removeItem(STORAGE_KEY); storage.removeItem(LEGACY_STORAGE_KEY);
}

export function calendarText(guide, entry, now = new Date()) {
  if (!validDate(entry.reminder)) throw new Error("Añade primero una fecha de recordatorio válida.");
  const escape = (text) => text.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\r", "");
  const fold = (line) => {
    const chunks = [];
    let current = "";
    for (const character of line) {
      if (new TextEncoder().encode(current + character).length > 75) { chunks.push(current); current = " "; }
      current += character;
    }
    return [...chunks, current].join("\r\n");
  };
  const date = entry.reminder.replaceAll("-", "");
  const next = new Date(`${entry.reminder}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  if (!/^\d{4}-/.test(next.toISOString())) throw new Error("La fecha excede el calendario admitido.");
  const stamp = now.toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}/, "");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ayudario//Plan personal//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${guide.id}-${date}@ayudario.local`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replaceAll("-", "")}`,
    `SUMMARY:${escape(`Revisar: ${guide.title}`)}`, `DESCRIPTION:${escape(`Recordatorio personal. Comprueba el plazo oficial en ${guide.sourceUrl}`)}`,
    "END:VEVENT", "END:VCALENDAR", ""].map(fold).join("\r\n");
}
