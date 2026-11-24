const TABLE_PATH = /^\/circles\/([^/?#]+)\/casino\/blackjack$/;

export const blackjackTablePath = (circleId: string) =>
  `/circles/${encodeURIComponent(circleId)}/casino/blackjack`;

/** The circle in a table path (what a sit-down message stores as its mediaUrl), or null. */
export function parseBlackjackTablePath(path: string) {
  const match = path.match(TABLE_PATH);
  return match ? { circleId: decodeURIComponent(match[1]) } : null;
}
