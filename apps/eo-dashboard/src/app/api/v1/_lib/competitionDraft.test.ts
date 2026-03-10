import { describe, expect, it } from "vitest";

import { mergeDraftPayload, validateCompetitionPayload } from "./competitionDraft";

describe("competitionDraft", () => {
  it("merges template payload and draft payload with draft overriding", () => {
    const merged = mergeDraftPayload({
      eventOrganizerId: "eo-1",
      templatePayload: { name: "A", slug: "a", description: "t" },
      payload: { name: "B" }
    });
    expect(merged.name).toBe("B");
    expect(merged.slug).toBe("a");
    expect(merged.eventOrganizerId).toBe("eo-1");
  });

  it("validates required fields", () => {
    expect(validateCompetitionPayload({} as any).ok).toBe(false);
    expect(validateCompetitionPayload({ name: "X", slug: "x" } as any).ok).toBe(true);
  });
});

