import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Explicitly point envDir at this workspace so .env is found regardless
  // of what cwd npm workspaces sets when running from the repo root.
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
