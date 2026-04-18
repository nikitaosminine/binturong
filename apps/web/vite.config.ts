import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "url";

export default defineConfig({
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
