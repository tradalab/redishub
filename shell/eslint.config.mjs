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
    name: "trada-ui-custom",
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
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**", "dist/**", ".scorix/**"]),
])

export default eslintConfig
