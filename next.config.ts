import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

module.exports = {
  allowedDevOrigins: ['172.20.10.2'],
}

export default nextConfig;
