import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack config for Next.js 16+
  turbopack: {
    // Set root to parent to allow importing CLI scrapers from ../src
    root: path.resolve(__dirname, '..'),
  },
};

export default nextConfig;
