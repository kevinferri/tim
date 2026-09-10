import { describe, it, expect } from "vitest";
import { hydrateUrl, isValidUrl, isEmojiOnly } from "@/lib/utils";

describe("hydrateUrl", () => {
  it("prefixes a bare host with https://", () => {
    expect(hydrateUrl("example.com")).toBe("https://example.com");
  });

  it("leaves a URL with a protocol untouched", () => {
    expect(hydrateUrl("http://example.com")).toBe("http://example.com");
    expect(hydrateUrl("https://example.com")).toBe("https://example.com");
  });
});

describe("isValidUrl", () => {
  it("accepts http/https URLs with a real domain", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://sub.example.com/path")).toBe(true);
  });

  it("rejects missing, empty, or malformed input", () => {
    expect(isValidUrl(undefined)).toBe(false);
    expect(isValidUrl(null)).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects hosts without a real domain", () => {
    expect(isValidUrl("https://localhost")).toBe(false);
  });
});

describe("isEmojiOnly", () => {
  it("accepts a single emoji", () => {
    expect(isEmojiOnly("🎉")).toBe(true);
  });

  it("accepts multiple emoji separated by spaces", () => {
    expect(isEmojiOnly("🎉 🔥")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(isEmojiOnly("hello")).toBe(false);
  });

  it("rejects text mixed with an emoji", () => {
    expect(isEmojiOnly("hi 🎉")).toBe(false);
  });

  it("rejects strings longer than 13 characters", () => {
    expect(isEmojiOnly("🎉".repeat(20))).toBe(false);
  });
});
