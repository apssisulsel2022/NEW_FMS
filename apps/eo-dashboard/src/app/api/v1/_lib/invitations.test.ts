import { describe, expect, it } from "vitest";

import { generateInviteToken, hashInviteToken } from "./invitations";

describe("invitations", () => {
  it("generates a token and hashes deterministically", () => {
    const token = generateInviteToken();
    expect(token.length).toBeGreaterThan(10);
    const h1 = hashInviteToken(token);
    const h2 = hashInviteToken(token);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

