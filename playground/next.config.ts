import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/parser", "@repo/renderer", "@repo/components"],
};

export default nextConfig;
