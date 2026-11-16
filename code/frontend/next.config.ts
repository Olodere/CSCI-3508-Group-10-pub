import type { NextConfig } from "next";

// Where the Express API runs (code/api). The browser never calls it directly:
// requests to /api/* on this site are forwarded there (see rewrites below).
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  // Forward /api/* to the Express API, so the browser sees ONE site.
  // That keeps the SameSite=Lax session cookie working in production, where
  // the frontend (Vercel) and API (Render) are on different domains and a
  // direct cross-site request would not carry the cookie.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        // Skip CSS modules so `as: "*.css"` doesn't turn them into global CSS.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
