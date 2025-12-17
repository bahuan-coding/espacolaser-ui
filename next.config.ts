import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip static generation for pages that use database
  experimental: {
    // This prevents build-time database connections
  },
};

export default nextConfig;
