import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse must not be bundled — it reads its own package files at
  // runtime and breaks when webpack rewrites its paths. Added now so
  // feature 08 (resume upload) doesn't have to rediscover it.
  serverExternalPackages: ["pdf-parse"],
  devIndicators: false,
};

export default nextConfig;
