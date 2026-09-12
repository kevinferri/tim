import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier";

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
  eslintConfigPrettier,
];

export default eslintConfig;
