import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to the monorepo root (apps/web/../..). Without this,
  // Next.js walks up the tree, finds a stray lockfile in the user's home dir,
  // and infers the wrong root. This keeps Node_assets/ (used by a relative SVG
  // import in src/components/portfolio-chart.tsx) inside the traced root.
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  // ESLint is run separately (npm run lint). Pre-existing CRLF line endings
  // in Windows-authored files cause false prettier/prettier errors during build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
