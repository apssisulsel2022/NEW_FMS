import { describe, expect, it } from "vitest";

import { calculateAgeYears, getMaxRosterSize, validatePlayerEligibility } from "@backend/services/rosterEligibility";

describe("rosterEligibility", () => {
  it("calculates age in years", () => {
    expect(calculateAgeYears("2000-01-01", new Date("2025-01-01T00:00:00Z"))).toBe(25);
    expect(calculateAgeYears("2000-12-31", new Date("2025-01-01T00:00:00Z"))).toBe(24);
  });

  it("validates min/max age", () => {
    const criteria = { minAgeYears: 12, maxAgeYears: 18 };
    expect(validatePlayerEligibility({ dateOfBirth: "2020-01-01", eligibilityCriteria: criteria as any }).ok).toBe(false);
    expect(validatePlayerEligibility({ dateOfBirth: "2000-01-01", eligibilityCriteria: criteria as any }).ok).toBe(false);
    expect(validatePlayerEligibility({ dateOfBirth: "2012-01-01", eligibilityCriteria: criteria as any }).ok).toBe(true);
  });

  it("reads maxRosterSize", () => {
    expect(getMaxRosterSize({ maxRosterSize: 18 } as any)).toBe(18);
    expect(getMaxRosterSize({} as any)).toBe(null);
  });
});

