export const REGIONS = Object.freeze([
  "Andalucía", "Aragón", "Asturias", "Illes Balears", "Canarias", "Cantabria",
  "Castilla-La Mancha", "Castilla y León", "Cataluña", "Comunitat Valenciana",
  "Extremadura", "Galicia", "Comunidad de Madrid", "Región de Murcia", "Navarra",
  "País Vasco", "La Rioja", "Ceuta", "Melilla",
]);

export const EMPLOYMENTS = Object.freeze(["employee", "unemployed", "self-employed", "retired", "other"]);
const BOOLEAN_FIELDS = ["studying", "renting", "children", "lowIncome", "disability"];
const FIELDS = ["age", "region", "employment", ...BOOLEAN_FIELDS];

export function normalizeProfile(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !FIELDS.includes(key))) throw new Error("El perfil tiene campos no admitidos.");
  const profile = { age: null, region: null, employment: null };
  if (value.age != null) {
    if (!Number.isInteger(value.age) || value.age < 18 || value.age > 110) throw new Error("La edad debe estar entre 18 y 110 años.");
    profile.age = value.age;
  }
  if (value.region != null) {
    if (!REGIONS.includes(value.region)) throw new Error("Selecciona un territorio de la lista.");
    profile.region = value.region;
  }
  if (value.employment != null) {
    if (!EMPLOYMENTS.includes(value.employment)) throw new Error("La situación laboral no es válida.");
    profile.employment = value.employment;
  }
  for (const field of BOOLEAN_FIELDS) {
    if (value[field] != null && typeof value[field] !== "boolean") throw new Error("La respuesta del perfil no es válida.");
    profile[field] = value[field] ?? null;
  }
  return profile;
}

export function rankGuides(guides, value = {}) {
  const profile = normalizeProfile(value);
  return guides.map((guide, position) => {
    const matchedReasons = [];
    const unknownFields = new Set();
    for (const clue of guide.clues) {
      const answer = profile[clue.field];
      if (answer == null) {
        unknownFields.add(clue.field);
        continue;
      }
      const matches = clue.field === "age"
        ? answer >= (clue.min ?? 18) && answer <= (clue.max ?? 110)
        : answer === clue.value;
      if (matches) matchedReasons.push(clue.label);
    }
    const territoryMismatch = guide.excludedRegions?.includes(profile.region) ?? false;
    return {
      guide,
      matchedReasons,
      unknownFields: [...unknownFields],
      territoryMismatch,
      score: territoryMismatch ? -1 : matchedReasons.length,
      label: territoryMismatch ? "Consulta tu normativa territorial" : matchedReasons.length ? "Puede interesarte" : "Para explorar",
      position,
    };
  }).sort((left, right) => right.score - left.score || left.position - right.position);
}
