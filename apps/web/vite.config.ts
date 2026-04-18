import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Resolve envDir relative to this config file so .env is always
  // loaded from apps/web/ regardless of which directory npm is invoked from.
  envDir: new URL(".", import.meta.url).pathname,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
