import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit Turbopack root to avoid Next.js root inference warnings
  experimental: {
    turbopack: {
      // Path relative to workspace root where the Next.js app lives
      root: "./frontend",
    },
  },
};

export default nextConfig;
