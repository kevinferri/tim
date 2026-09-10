import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "./encryption";

describe("encrypt/decrypt", () => {
  it("round-trips plain text", () => {
    const plaintext = "hello, tim";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips unicode text", () => {
    const plaintext = "🎉 emoji and ünïcödé";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("produces ciphertext that differs from the input", () => {
    const plaintext = "hello, tim";
    expect(encrypt(plaintext)).not.toBe(plaintext);
  });

  it("is deterministic for a fixed key/iv", () => {
    const plaintext = "hello, tim";
    expect(encrypt(plaintext)).toBe(encrypt(plaintext));
  });
});
