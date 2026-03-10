import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";

export function validateNik(nik: string) {
  const normalized = nik.trim();
  if (!/^[0-9]{16}$/.test(normalized)) {
    return { ok: false as const, message: "NIK harus 16 digit angka" };
  }
  return { ok: true as const, value: normalized };
}

function deriveKey(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptNik(nik: string, secret: string, iv?: Buffer) {
  const key = deriveKey(secret);
  const nonce = iv ?? randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(nik, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const hmac = createHmac("sha256", key).update(nik, "utf8").digest("hex");
  const encrypted = `v1.${nonce.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
  const last4 = nik.slice(-4);

  return { encrypted, hmac, last4 };
}

