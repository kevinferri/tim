import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberPill } from "./member-pill";

const render = (
  member: { displayName: string; name: string | null },
  selected = false,
) =>
  renderToStaticMarkup(
    <MemberPill
      member={{ ...member, imageUrl: "https://example.com/a.png" }}
      selected={selected}
      onClick={() => {}}
    />,
  );

describe("MemberPill", () => {
  it("tells apart members who share a display name by their avatar initials", () => {
    const a = render({ displayName: "Josh", name: "Josh Allen" });
    const b = render({ displayName: "Josh", name: "Josh Brown" });

    expect(a).toContain(">JA<");
    expect(b).toContain(">JB<");
    expect(a).toContain("Josh</button>");
  });

  it("falls back to the display name for initials when there's no name", () => {
    expect(render({ displayName: "The Kid", name: null })).toContain(">TK<");
  });

  it("reflects selection with aria-pressed", () => {
    expect(render({ displayName: "Adam", name: "Adam" }, true)).toContain(
      'aria-pressed="true"',
    );
  });
});
