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
  // Keep the Cloudflare Workers API calls working in dev without CORS issues
  // by proxying /api → the local wrangler dev server.
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/:path*",
            destination: "http://localhost:8787/api/:path*",
          },
        ]
      : [];
  },
};

export default nextConfig;
