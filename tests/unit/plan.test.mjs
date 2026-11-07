// T2: disposable authored plans only; no browser storage or public service.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDES } from "../../public/lib/catalog.js";
import { calendarText, emptyPlan, newEntry, parseBackup, validatePlan } from "../../public/lib/plan.js";

const fixture = () => ({ version: 1, profile: { age: 31, region: "Andalucía", children: true }, entries: { imv: { ...newEntry(), checks: [0], notes: "Revisar con José — mañana 東京", reminder: "2028-02-29" } } });

test("Backup round trip retains Unicode notes, profile, progress and checklist without aliases", () => {
  const source = fixture();
  const restored = parseBackup(JSON.stringify(source), GUIDES);
  assert.equal(restored.entries.imv.notes, source.entries.imv.notes);
  assert.equal(restored.profile.age, 31);
  restored.entries.imv.checks.push(1);
  assert.deepEqual(source.entries.imv.checks, [0]);
});

test("New plans and new entries have independent mutable state", () => {
  const first = emptyPlan(); first.entries.imv = newEntry(); first.entries.imv.checks.push(0);
  assert.deepEqual(emptyPlan().entries, {});
  assert.deepEqual(newEntry().checks, []);
});

test("Import refuses unknown guides, invalid progress, duplicate checks and impossible dates", () => {
  const cases = [];
  const unknown = fixture(); unknown.entries["invented-aid"] = newEntry(); cases.push(unknown);
  const status = fixture(); status.entries.imv.status = "approved-by-government"; cases.push(status);
  const duplicates = fixture(); duplicates.entries.imv.checks = [0, 0]; cases.push(duplicates);
  const index = fixture(); index.entries.imv.checks = [999]; cases.push(index);
  const date = fixture(); date.entries.imv.reminder = "2027-02-29"; cases.push(date);
  for (const value of cases) assert.throws(() => validatePlan(value, GUIDES));
});

test("Import refuses malformed JSON, oversized bodies, extra fields and prototype keys", () => {
  assert.throws(() => parseBackup("{broken", GUIDES));
  assert.throws(() => parseBackup(" ".repeat(128 * 1024 + 1), GUIDES));
  assert.throws(() => parseBackup('{"version":1,"entries":{},"__proto__":{"polluted":true}}', GUIDES));
  assert.throws(() => validatePlan({ ...fixture(), sessionToken: "not accepted" }, GUIDES));
  assert.equal({}.polluted, undefined);
});

test("Rejected imports do not mutate the existing plan", () => {
  const existing = fixture(); const before = JSON.stringify(existing);
  assert.throws(() => parseBackup('{"version":2,"entries":{}}', GUIDES));
  assert.equal(JSON.stringify(existing), before);
});

test("Calendar reminder is a personal all-day event with leap-day rollover and safe UTF-8 folding", () => {
  const guide = { ...GUIDES[0], title: "Revisión, para José; " + "á".repeat(90) };
  const calendar = calendarText(guide, fixture().entries.imv, new Date("2026-11-07T12:34:56Z"));
  assert.ok(calendar.includes("DTSTAMP:20261107T123456Z\r\n"));
  assert.ok(calendar.includes("DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301"));
  assert.ok(calendar.includes("Revisión\\, para José\\;"));
  assert.ok(calendar.includes("Recordatorio personal"));
  assert.ok(calendar.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert.ok(!calendar.includes("mañana 東京"), "Private notes do not enter the calendar export");
});

test("Calendar export refuses a missing or invalid reminder", () => {
  assert.throws(() => calendarText(GUIDES[0], newEntry()));
  assert.throws(() => calendarText(GUIDES[0], { ...newEntry(), reminder: "not-a-date" }));
});
