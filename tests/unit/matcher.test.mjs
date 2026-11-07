// T2: authored profiles against the source-reviewed programme catalogue. No entitlement claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDES } from "../../public/lib/catalog.js";
import { normalizeProfile, rankGuides } from "../../public/lib/matcher.js";

test("Unknown answers retain all guides without inventing a positive match", () => {
  const rows = rankGuides(GUIDES);
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map((row) => row.guide.id), GUIDES.map((guide) => guide.id));
  assert.ok(rows.every((row) => row.score === 0 && row.label === "Para explorar"));
});

test("Working adults with limited resources can still discover IMV", () => {
  const row = rankGuides(GUIDES, { age: 21, employment: "employee", lowIncome: true }).find((item) => item.guide.id === "imv");
  assert.ok(row.score > 0);
  assert.equal(row.territoryMismatch, false);
  assert.ok(row.guide.requirements.length >= 3);
  assert.equal(Object.hasOwn(row, "eligible"), false);
});

test("Young renters in excluded territories are not presented as a matching national rental scheme", () => {
  for (const region of ["País Vasco", "Navarra"]) {
    const row = rankGuides(GUIDES, { age: 25, renting: true, region }).find((item) => item.guide.id === "bono-alquiler-joven");
    assert.equal(row.territoryMismatch, true);
    assert.equal(row.score, -1);
    assert.equal(row.label, "Consulta tu normativa territorial");
  }
});

test("A disability answer leaves recognition, income and residence checks unresolved", () => {
  const row = rankGuides(GUIDES, { age: 45, disability: true }).find((item) => item.guide.id === "pnc-incapacidad");
  assert.ok(row.matchedReasons.length > 0);
  assert.ok(row.guide.requirements.join(" ").includes("65"));
  assert.equal(Object.hasOwn(row, "eligible"), false);
});

test("Unknown is distinct from no, and malformed or identifying fields are refused", () => {
  assert.equal(normalizeProfile({ studying: null }).studying, null);
  assert.equal(normalizeProfile({ studying: false }).studying, false);
  for (const profile of [{ age: 17 }, { age: "25" }, { region: "Madrid<script>" }, { disability: "yes" }, { email: "private@example.test" }]) {
    assert.throws(() => normalizeProfile(profile));
  }
});

test("Programme links are official and every guide exposes source, uncertainty and next steps", () => {
  const hosts = new Set(["www.inclusion.gob.es", "www.sepe.es", "www.becaseducacion.gob.es", "www.boe.es", "www.dsca.gob.es", "imserso.es"]);
  assert.equal(new Set(GUIDES.map((guide) => guide.id)).size, 8);
  for (const guide of GUIDES) {
    const url = new URL(guide.sourceUrl);
    assert.equal(url.protocol, "https:");
    assert.ok(hosts.has(url.hostname), guide.sourceUrl);
    assert.equal(guide.reviewedAt, "2026-11-07");
    assert.ok(guide.requirements.length && guide.documents.length && guide.steps.length && guide.availability);
  }
});
