import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

// https://vite.dev/config/
export default defineConfig(() => ({
  base: "/Space-Rogue/",
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __GIT_HASH__: JSON.stringify(execSync("git rev-parse --short HEAD").toString().trim()),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
}));
