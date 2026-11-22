// One size for header-row circles: nav icons and the topic header's presence avatars match exactly.
// 36px, the same as the left rail's ghost icon buttons (sound, theme).
export const HEADER_CIRCLE_SIZE = "h-9 w-9";

// The circle inside an icon nav button (its parent has `group`), styled like the left rail's ghost icon buttons; presses down like the circle avatars.
export const NAV_ICON_CIRCLE = `flex ${HEADER_CIRCLE_SIZE} items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4 transition-colors group-hover:bg-accent group-hover:text-accent-foreground group-active:scale-[.98]`;
