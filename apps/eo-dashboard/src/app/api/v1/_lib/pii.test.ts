import { describe, expect, it } from "vitest";

import { decryptBytes, encryptBytes, sha256Hex } from "./pii";

describe("pii", () => {
  it("encrypts and decrypts bytes", () => {
    const secret = "test-secret";
    const input = Buffer.from("hello world", "utf8");
    const enc = encryptBytes(input, secret);
    expect(enc.startsWith("v1.")).toBe(true);
    const out = decryptBytes(enc, secret);
    expect(out.toString("utf8")).toBe("hello world");
  });

  it("hashes bytes", () => {
    expect(sha256Hex(Buffer.from("a", "utf8"))).toMatch(/^[0-9a-f]{64}$/);
  });
});

