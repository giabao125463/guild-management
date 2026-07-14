import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@guild/shared-types", "@guild/shared-utils"],
};

export default nextConfig;
