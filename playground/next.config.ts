import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@verdant/parser",
    "@verdant/renderer",
    "@verdant/primitives",
    "@verdant/nodes",
  ],
};

export default nextConfig;
