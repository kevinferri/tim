import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { getUserSummary } from "./users";

beforeEach(resetDb);

describe("getUserSummary", () => {
  it("returns the id/imageUrl/name for an existing user", async () => {
    const [user] = await pgClient("users")
      .insert({
        id: crypto.randomUUID(),
        googleId: `google-${crypto.randomUUID()}`,
        name: "Test User",
        imageUrl: "http://example.com/avatar.png",
      })
      .returning(["id"]);

    await expect(getUserSummary({ userId: user.id })).resolves.toEqual({
      id: user.id,
      name: "Test User",
      imageUrl: "http://example.com/avatar.png",
    });
  });

  it("returns undefined for a nonexistent user", async () => {
    await expect(
      getUserSummary({ userId: crypto.randomUUID() })
    ).resolves.toBeUndefined();
  });
});
