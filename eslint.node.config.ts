import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig(
  {
    files: [
      "scripts/**/*.{ts,tsx,mts,cts}",
      "*.config.{ts,mts,cts}",
      "eslint*.{ts,mts,cts}",
    ],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores([
    "node_modules",
    "dist",
    "src",
  ]),
);
