import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("normalizes to lowercase kebab-case", () => {
    expect(slugify("National League 2026")).toBe("national-league-2026");
    expect(slugify("  A  B  ")).toBe("a-b");
  });
});

