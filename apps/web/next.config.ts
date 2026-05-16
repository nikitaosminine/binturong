import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
