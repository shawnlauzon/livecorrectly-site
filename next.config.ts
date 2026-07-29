import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Allow access from local network IP addresses during development
  allowedDevOrigins: ['192.168.1.247'],
};

export default nextConfig;
