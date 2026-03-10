export function calculateAgeYears(dateOfBirthIso: string, now = new Date()) {
  const dob = new Date(dateOfBirthIso);
  if (Number.isNaN(dob.getTime())) return null;

  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function validatePlayerEligibility(params: {
  dateOfBirth?: string | null;
  eligibilityCriteria?: Record<string, unknown> | null;
}) {
  const criteria = (params.eligibilityCriteria ?? {}) as any;

  const minAgeYears = typeof criteria.minAgeYears === "number" ? criteria.minAgeYears : null;
  const maxAgeYears = typeof criteria.maxAgeYears === "number" ? criteria.maxAgeYears : null;

  if ((minAgeYears !== null || maxAgeYears !== null) && !params.dateOfBirth) {
    return { ok: false as const, message: "dateOfBirth is required for eligibility checks" };
  }

  if (params.dateOfBirth) {
    const age = calculateAgeYears(params.dateOfBirth);
    if (age === null) return { ok: false as const, message: "invalid dateOfBirth" };
    if (minAgeYears !== null && age < minAgeYears) return { ok: false as const, message: `player must be at least ${minAgeYears}` };
    if (maxAgeYears !== null && age > maxAgeYears) return { ok: false as const, message: `player must be at most ${maxAgeYears}` };
  }

  return { ok: true as const };
}

export function getMaxRosterSize(eligibilityCriteria?: Record<string, unknown> | null) {
  const criteria = (eligibilityCriteria ?? {}) as any;
  const maxRosterSize = typeof criteria.maxRosterSize === "number" ? criteria.maxRosterSize : null;
  if (maxRosterSize !== null && maxRosterSize > 0) return maxRosterSize;
  return null;
}

