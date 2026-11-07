import { normalizeProfile } from "./matcher.js";

export const STORAGE_KEY = "ayudario.plan.v1";
export const STATUSES = Object.freeze({ saved: "Por revisar", preparing: "Preparando", submitted: "Presentada", resolved: "Resuelta" });
export function emptyPlan() { return { version: 1, profile: null, entries: {} }; }

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactKeys(value, allowed) { return Object.keys(value).every((key) => allowed.includes(key)); }
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePlan(value, guides) {
  if (!isRecord(value) || value.version !== 1 || !exactKeys(value, ["version", "profile", "entries"])
    || !isRecord(value.entries)) throw new Error("La copia no tiene el formato de Ayudario 1.");
  const result = emptyPlan();
  result.profile = value.profile == null ? null : normalizeProfile(value.profile);
  const keys = Object.keys(value.entries);
  if (keys.length > guides.length) throw new Error("La copia contiene demasiadas ayudas.");
  for (const id of keys) {
    const guide = guides.find((item) => item.id === id);
    const entry = value.entries[id];
    if (!guide || !isRecord(entry) || !exactKeys(entry, ["status", "checks", "notes", "reminder"])
      || !Object.hasOwn(STATUSES, entry.status) || !Array.isArray(entry.checks)
      || entry.checks.length > guide.documents.length || new Set(entry.checks).size !== entry.checks.length
      || entry.checks.some((index) => !Number.isInteger(index) || index < 0 || index >= guide.documents.length)
      || typeof entry.notes !== "string" || entry.notes.length > 2000
      || typeof entry.reminder !== "string" || (entry.reminder !== "" && !validDate(entry.reminder))) {
      throw new Error("Una ayuda de la copia contiene datos no válidos.");
    }
    result.entries[id] = { status: entry.status, checks: [...entry.checks], notes: entry.notes, reminder: entry.reminder };
  }
  return result;
}

export function parseBackup(text, guides) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > 128 * 1024) throw new Error("La copia supera el límite de 128 KB.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("La copia no es un archivo JSON válido."); }
  return validatePlan(value, guides);
}

export function newEntry() { return { status: "saved", checks: [], notes: "", reminder: "" }; }

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
