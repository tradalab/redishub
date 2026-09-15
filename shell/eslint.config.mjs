import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import prettier from "eslint-config-prettier"
import prettierPlugin from "eslint-plugin-prettier"
import prettierConfig from "./.prettierrc.json" with { type: "json" }

/** @type {import("eslint").Linter.FlatConfig[]} */
const eslintConfig = defineConfig([
  ...nextVitals,
  prettier,
  {
    name: "lyra-custom",
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": ["error", prettierConfig],
      "@typescript-eslint/no-explicit-any": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/immutability": "off",
      "no-restricted-properties": [
        "error",
        { object: "crypto", property: "randomUUID", message: "Undefined outside a secure context. Use v7 from uuid." },
        { object: "navigator", property: "clipboard", message: "Undefined outside a secure context. Use writeClipboard from @/lib/clipboard." },
      ],
    },
  },
  {
    files: ["lib/clipboard.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  // public/ is served verbatim; monaco alone puts a 5.5MB single-line tsWorker.js
  // there, and building an AST for that runs the linter out of memory rather than
  // failing - the run just dies with no output.
  //
  // types/index.ts, api/index.ts and hooks/events.ts carry "DO NOT EDIT": scorix
  // regenerates them, so a lint fix there survives exactly until the next `make generate`.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "dist/**",
    ".scorix/**",
    "public/**",
    "types/index.ts",
    "api/index.ts",
    "hooks/events.ts",
  ]),
])

export default eslintConfig
