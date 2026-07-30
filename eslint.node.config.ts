import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import { commonRules } from "./eslint.rules";

export default defineConfig(
  {
    files: [
      "scripts/**/*.{ts,tsx,mts,cts}",
      "*.config.{ts,mts,cts}",
      "eslint*.{ts,mts,cts}",
    ],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
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
      ...commonRules,
    },
  },
);
