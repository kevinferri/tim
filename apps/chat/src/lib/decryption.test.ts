import { describe, it, expect } from "vitest";
import { decrypt, DecryptionError } from "@/lib/decryption";

// chat only ever decrypts (realtime-server owns encrypt, see
// packages/crypto/src/index.ts) -- this imports the same package's encrypt
// so the round trip can be tested from this side using the CRYPTO_KEY set
// in vitest.config.mts.
import { encrypt } from "@tim/crypto";

describe("decrypt", () => {
  it("reverses encryption produced with the same key and AAD", () => {
    const plaintext = "hello, tim";
    expect(decrypt(encrypt(plaintext, "msg-1"), "msg-1")).toBe(plaintext);
  });

  it("round-trips text containing unicode", () => {
    const plaintext = "🎉 emoji and ünïcödé";
    expect(decrypt(encrypt(plaintext, "msg-1"), "msg-1")).toBe(plaintext);
  });

  it("throws when the AAD (messageId) doesn't match", () => {
    const envelope = encrypt("hello, tim", "msg-1");

    expect(() => decrypt(envelope, "msg-2")).toThrow(DecryptionError);
  });
});
