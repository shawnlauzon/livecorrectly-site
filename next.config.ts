import type { NextConfig } from "next";
import { PRODUCTION_URL } from "./lib/site-url";

// Upload URLs are absolute and baked in with the APP_URL of wherever the upload
// ran, and every environment reads the same DB — so production-host URLs show
// up locally too. Allow /i/ on both hosts.
const imageProxyOrigins = [
  ...new Set([PRODUCTION_URL, process.env.APP_URL ?? PRODUCTION_URL]),
].map((origin) => new URL(origin));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      // Newsletter images uploaded since the /i/ proxy (below) use the app's own
      // host, so the newsletter index thumbnails must be allowed through it too.
      ...imageProxyOrigins.map(({ protocol, hostname, port }) => ({
        protocol: protocol.replace(':', '') as 'http' | 'https',
        hostname,
        port,
        pathname: '/i/**',
      })),
    ],
  },
  turbopack: {
    root: __dirname,
  },
  // Allow access from local network IP addresses during development
  allowedDevOrigins: ['192.168.1.247'],
  async rewrites() {
    const blobUrl = process.env.BLOB_BASE_URL;
    if (!blobUrl) return [];
    return [
      {
        source: '/i/:path*',
        destination: `${blobUrl}/:path*`,
      },
    ];
  },
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
