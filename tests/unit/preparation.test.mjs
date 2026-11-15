// T2: authored plans and controlled storage; no eligibility or browser claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDES } from "../../public/lib/catalog.js";
import { STORAGE_KEY, LEGACY_STORAGE_KEY, emptyPlan, newEntry, validatePlan, parseBackup, preparationProgress, readStoredPlan, writeStoredPlan, clearStoredPlan } from "../../public/lib/plan.js";
const guide = GUIDES[0];
const current = () => ({ ...emptyPlan(), entries: { imv: { ...newEntry(), checks: [1], criteria: [0], notes: "Conservar mis palabras.", reminder: "2027-02-28" } } });
const legacy = () => ({ version: 1, profile: null, entries: { imv: { status: "preparing", checks: [1], notes: "Copia anterior", reminder: "2027-02-28" } } });
function storage(entries = []) { const values = new Map(entries); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }

test("A01 legacy import preserves documents, notes, reminder and status; never infers reviewed criteria", () => {
  const source = legacy(), before = JSON.stringify(source), restored = validatePlan(source, GUIDES);
  assert.equal(restored.version, 2); assert.deepEqual(restored.entries.imv.criteria, []);
  assert.deepEqual(restored.entries.imv.checks, [1]); assert.equal(restored.entries.imv.notes, "Copia anterior");
  assert.equal(restored.entries.imv.status, "preparing"); assert.equal(restored.entries.imv.reminder, "2027-02-28");
  assert.equal(JSON.stringify(source), before);
});
test("A02 v2 round trip keeps criteria isolated from documents and rejects malformed/future checklists", () => {
  const source = current(), restored = parseBackup(JSON.stringify(source), GUIDES);
  restored.entries.imv.criteria.push(1); assert.deepEqual(source.entries.imv.criteria, [0]);
  for (const criteria of [undefined, null, [0, 0], [-1], [guide.requirements.length], [0.1], ["0"], {}]) {
    const value = current(); value.entries.imv.criteria = criteria; assert.throws(() => validatePlan(value, GUIDES));
  }
  assert.throws(() => validatePlan({ ...current(), version: 3 }, GUIDES));
  const old = legacy(); old.entries.imv.criteria = [0]; assert.throws(() => validatePlan(old, GUIDES));
});
test("A03 every guide starts unchecked; progress counts requirements plus documents and finds the next missing item", () => {
  for (const item of GUIDES) {
    const entry = newEntry(), progress = preparationProgress(item, entry);
    assert.equal(progress.complete, 0); assert.equal(progress.total, item.requirements.length + item.documents.length);
    assert.equal(progress.remaining, progress.total); assert.equal(progress.next, item.requirements[0]);
    entry.criteria = item.requirements.map((_, index) => index);
    assert.equal(preparationProgress(item, entry).next, item.documents[0]);
    entry.checks = item.documents.map((_, index) => index);
    const done = preparationProgress(item, entry); assert.equal(done.remaining, 0); assert.equal(done.next, null);
    assert.equal(entry.status, "saved"); assert.equal(Object.hasOwn(done, "eligible"), false);
  }
});
test("A04 legacy storage is read without writes; first v2 save keeps the original bytes", () => {
  const original = JSON.stringify(legacy()), store = storage([[LEGACY_STORAGE_KEY, original]]);
  const loaded = readStoredPlan(store, GUIDES); assert.equal(loaded.legacy, true); assert.equal(loaded.raw, null);
  assert.equal(store.getItem(STORAGE_KEY), null);
  const raw = writeStoredPlan(store, loaded.plan, GUIDES, loaded.raw);
  assert.equal(store.getItem(LEGACY_STORAGE_KEY), original); assert.equal(readStoredPlan(store, GUIDES).raw, raw);
});
test("A05 malformed/newer current storage is not replaced or hidden by a valid legacy fallback", () => {
  for (const raw of ["{broken", JSON.stringify({ ...current(), version: 99 })]) {
    const store = storage([[STORAGE_KEY, raw], [LEGACY_STORAGE_KEY, JSON.stringify(legacy())]]);
    assert.throws(() => readStoredPlan(store, GUIDES)); assert.throws(() => writeStoredPlan(store, current(), GUIDES, raw));
    assert.equal(store.getItem(STORAGE_KEY), raw);
  }
});
test("A06 changed storage, denied access, quota and failed readback cannot be reported as a confirmed save", () => {
  const initial = JSON.stringify(current()), store = storage([[STORAGE_KEY, initial]]), changed = current(); changed.entries.imv.notes = "Otra pestaña";
  const other = JSON.stringify(changed); store.setItem(STORAGE_KEY, other);
  assert.throws(() => writeStoredPlan(store, current(), GUIDES, initial), /otra pestaña/); assert.equal(store.getItem(STORAGE_KEY), other);
  assert.throws(() => readStoredPlan({ getItem() { throw new Error("SecurityError"); } }, GUIDES));
  assert.throws(() => writeStoredPlan({ getItem: () => null, setItem() { throw new Error("QuotaExceededError"); } }, current(), GUIDES, null));
  assert.throws(() => writeStoredPlan({ getItem: () => null, setItem() {} }, current(), GUIDES, null), /confirmar/);
});
test("A07 explicit local deletion removes current and legacy copies", () => {
  const store = storage([[STORAGE_KEY, "current"], [LEGACY_STORAGE_KEY, "old"]]); clearStoredPlan(store);
  assert.equal(store.getItem(STORAGE_KEY), null); assert.equal(store.getItem(LEGACY_STORAGE_KEY), null);
});
