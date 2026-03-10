import { describe, expect, it } from "vitest";

import { encryptNik, validateNik } from "./nik";

describe("validateNik", () => {
  it("accepts 16 digit numbers", () => {
    const r = validateNik("3201010101010101");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("3201010101010101");
  });

  it("rejects non-digits or wrong length", () => {
    expect(validateNik("")).toEqual({ ok: false, message: "NIK harus 16 digit angka" });
    expect(validateNik("123")).toEqual({ ok: false, message: "NIK harus 16 digit angka" });
    expect(validateNik("320101010101010A")).toEqual({ ok: false, message: "NIK harus 16 digit angka" });
  });
});

describe("encryptNik", () => {
  it("produces stable shape and keyed hmac", () => {
    const iv = Buffer.alloc(12, 1);
    const out = encryptNik("3201010101010101", "test-secret", iv);
    expect(out.encrypted.startsWith("v1.")).toBe(true);
    expect(out.hmac).toMatch(/^[0-9a-f]{64}$/);
    expect(out.last4).toBe("0101");
  });
});

