import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static site for Amplify Hosting; the diagram API lives in lambda/
  output: "export",
};

export default nextConfig;
