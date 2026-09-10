import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { decrypt } from "@/lib/decryption";

// chat only ever decrypts (realtime-server owns encrypt, see
// apps/realtime-server/src/lib/encryption.ts) -- this mirrors that
// algorithm locally so the round trip can be tested from this side using
// the CRYPTO_* env vars set in vitest.config.ts.
function encrypt(text: string) {
  const algorithm = process.env.CRYPTO_ALGORITHM as string;
  const key = crypto.scryptSync(process.env.CRYPTO_SECRET as string, "salt", 24);
  const iv = Buffer.from(process.env.CRYPTO_IV as string, "utf8");
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

describe("decrypt", () => {
  it("reverses encryption produced with the same key/iv/algorithm", () => {
    const plaintext = "hello, tim";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips text containing unicode", () => {
    const plaintext = "🎉 emoji and ünïcödé";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });
});
