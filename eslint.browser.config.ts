import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { commonRules } from "./eslint.rules";

export default defineConfig(
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    settings: { react: { version: "detect" } },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
      },
    },
    rules: {
      ...commonRules,
      "react-hooks/immutability": "error",
      "react/button-has-type": "error",
      "react/checked-requires-onchange-or-readonly": "error",
      "react/jsx-boolean-value": ["error", "always"],
      "react/jsx-no-leaked-render": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-pascal-case": "error",
      // Browser code has no business importing node builtins
      "@typescript-eslint/no-restricted-imports": ["error", {
        paths: ["fs", "path", "crypto", "child_process", "os", "http"],
      }],
    },
  },
);
