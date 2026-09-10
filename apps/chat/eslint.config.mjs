import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

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
    },
  },
];

export default eslintConfig;
