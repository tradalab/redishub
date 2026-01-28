import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"
import prettierPlugin from "eslint-plugin-prettier"
import prettierConfig from "./.prettierrc.json" with { type: "json" }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

/** @type {import("eslint").Linter.FlatConfig[]} */
const eslintConfig = [
  // Base ESLint config (Next.js + TypeScript)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Prettier integration
  {
    name: "prettier-integration",
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Chỉ để Prettier xử lý style
      "prettier/prettier": ["error", prettierConfig],
      "@typescript-eslint/no-explicit-any": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]

export default eslintConfig
