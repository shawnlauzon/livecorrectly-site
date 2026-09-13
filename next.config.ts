import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  // Allow access from local network IP addresses during development
  allowedDevOrigins: ['192.168.1.247'],
  async redirects() {
    return [
      {
        source: '/chart',
        destination: '/see-your-design',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
