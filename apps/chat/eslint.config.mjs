import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier";

// Games are self-contained folders under src/games/. Anything outside a game
// imports it only via @/games/<name> or @/games/<name>/server; a game imports
// its own files with relative paths. No per-game config needed.
const gameInternals = {
  regex: "^@/games/[^/]+/(?!server$)",
  message:
    "Import a game only via @/games/<name> or @/games/<name>/server (use relative paths inside the game).",
};
// The Game room is the shared shell; games register with it in src/games/index.tsx.
const anyGame = {
  regex: "^@/games(?!/game-room$)",
  message:
    "The Game room can't import a specific game; register games in src/games/index.tsx.",
};
const restrictImports = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const gameBoundaries = [
  { files: ["src/**/*.{ts,tsx}"], rules: restrictImports(gameInternals) },
  {
    files: ["src/games/game-room/**/*.{ts,tsx}"],
    rules: restrictImports(gameInternals, anyGame),
  },
];

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      // New in eslint-plugin-react-hooks v7 (pulled in via the Next 16
      // upgrade of eslint-config-next) -- part of the React Compiler rule
      // set, not a correctness check. Flags established, working patterns
      // used throughout this codebase (syncing state from an effect on
      // mount, reading ref.current during render) that predate this rule
      // and aren't being rewritten as a side effect of a dependency bump.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      // Same story: flags mutating a render-scoped local (reset every
      // render, never escapes) used to group a single .map pass -- not a
      // correctness issue, see mention-autocomplete.tsx's `lastSection`.
      "react-hooks/immutability": "off",
    },
  },
  ...gameBoundaries,
  eslintConfigPrettier,
];

export default eslintConfig;
