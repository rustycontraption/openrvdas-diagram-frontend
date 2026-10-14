import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static site for Amplify Hosting; the diagram API lives in lambda/
  output: "export",
  // Writes diagram/index.html rather than diagram.html, so /diagram works on any static host without rewrite rules
  trailingSlash: true,
};

export default nextConfig;
