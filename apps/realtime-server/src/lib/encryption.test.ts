import { describe, it, expect } from "vitest";
import { encrypt, decrypt, DecryptionError } from "./encryption";

describe("encrypt/decrypt", () => {
  it("round-trips plain text", () => {
    const plaintext = "hello, tim";
    expect(decrypt(encrypt(plaintext, "msg-1"), "msg-1")).toBe(plaintext);
  });

  it("round-trips unicode text", () => {
    const plaintext = "🎉 emoji and ünïcödé";
    expect(decrypt(encrypt(plaintext, "msg-1"), "msg-1")).toBe(plaintext);
  });

  it("produces ciphertext that differs from the input", () => {
    const plaintext = "hello, tim";
    expect(encrypt(plaintext, "msg-1")).not.toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext across calls (random IV)", () => {
    const plaintext = "hello, tim";
    expect(encrypt(plaintext, "msg-1")).not.toBe(encrypt(plaintext, "msg-1"));
  });

  it("throws when the ciphertext has been tampered with", () => {
    const envelope = encrypt("hello, tim", "msg-1");
    const [version, iv, authTag, ciphertext] = envelope.split(":");
    const tamperedByte = (parseInt(ciphertext.slice(0, 2), 16) ^ 0xff)
      .toString(16)
      .padStart(2, "0");
    const tampered = [
      version,
      iv,
      authTag,
      tamperedByte + ciphertext.slice(2),
    ].join(":");

    expect(() => decrypt(tampered, "msg-1")).toThrow(DecryptionError);
  });

  it("throws when the auth tag has been tampered with", () => {
    const envelope = encrypt("hello, tim", "msg-1");
    const [version, iv, authTag, ciphertext] = envelope.split(":");
    const tamperedByte = (parseInt(authTag.slice(0, 2), 16) ^ 0xff)
      .toString(16)
      .padStart(2, "0");
    const tampered = [
      version,
      iv,
      tamperedByte + authTag.slice(2),
      ciphertext,
    ].join(":");

    expect(() => decrypt(tampered, "msg-1")).toThrow(DecryptionError);
  });

  it("throws when decrypted with the wrong AAD (messageId)", () => {
    const envelope = encrypt("hello, tim", "msg-1");

    expect(() => decrypt(envelope, "msg-2")).toThrow(DecryptionError);
  });

  it("throws on a malformed envelope", () => {
    expect(() => decrypt("not-a-valid-envelope", "msg-1")).toThrow(
      DecryptionError,
    );
  });
});
