import { describe, it, expect } from "vitest";
import { adjustReplyCounts } from "./topic-query-cache";
import { MessageProps } from "@/components/topics/message";

function msg(id: string, extra: Partial<MessageProps> = {}): MessageProps {
  return { id, variant: "default", ...extra } as MessageProps;
}

describe("adjustReplyCounts", () => {
  it("drops the count on every thread member when a reply is deleted", () => {
    // Root with two replies; one of them has just been filtered out.
    const pages = [
      [
        msg("root", { replyCount: 2 }),
        msg("reply-a", { threadRootId: "root", replyCount: 2 }),
      ],
    ];

    const [page] = adjustReplyCounts(pages, "root", -1);

    expect(page.map((m) => m.replyCount)).toEqual([1, 1]);
  });

  it("clears the count when the last reply is deleted", () => {
    const pages = [[msg("root", { replyCount: 1 })]];

    const [page] = adjustReplyCounts(pages, "root", -1);

    expect(page[0].replyCount).toBe(0);
  });

  it("never goes negative", () => {
    const pages = [[msg("root", { replyCount: 0 })]];

    expect(adjustReplyCounts(pages, "root", -1)[0][0].replyCount).toBe(0);
  });

  it("updates a root that has been paginated onto an older page", () => {
    const pages = [
      [msg("reply-a", { threadRootId: "root", replyCount: 1 })],
      [msg("older"), msg("root", { replyCount: 1 })],
    ];

    const result = adjustReplyCounts(pages, "root", 1, "reply-new");

    expect(result[1][1].replyCount).toBe(2);
    expect(result[0][0].replyCount).toBe(2);
    // Unrelated messages are untouched.
    expect(result[1][0].replyCount).toBeUndefined();
  });

  it("ignores the incoming message's own zeroed count when bumping", () => {
    // The new reply arrives with replyCount: 0 and must not be read as the
    // thread's current count.
    const pages = [
      [
        msg("root", { replyCount: 3 }),
        msg("reply-new", { threadRootId: "root", replyCount: 0 }),
      ],
    ];

    const [page] = adjustReplyCounts(pages, "root", 1, "reply-new");

    expect(page.map((m) => m.replyCount)).toEqual([4, 4]);
  });

  it("leaves other threads alone", () => {
    const pages = [
      [
        msg("root", { replyCount: 1 }),
        msg("other-root", { replyCount: 5 }),
        msg("other-reply", { threadRootId: "other-root", replyCount: 5 }),
      ],
    ];

    const [page] = adjustReplyCounts(pages, "root", -1);

    expect(page.map((m) => m.replyCount)).toEqual([0, 5, 5]);
  });
});
