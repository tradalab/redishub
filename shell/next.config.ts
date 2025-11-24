import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  productionBrowserSourceMaps: true,
  distDir: "../.scorix/dist",
}

export default nextConfig
