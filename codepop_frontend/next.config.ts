import type { NextConfig } from "next";
import path from "path";

const backend = process.env.BACKEND_URL ?? "http://backend:9000";

const nextConfig: NextConfig = {
  trailingSlash: true,
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*/',
        destination: `${backend}/backend/:path*/`,
      },
      {
        source: '/backend/:path*',
        destination: `${backend}/backend/:path*`,
      },
      {
        source: '/api/servers',
        destination: `${backend}/backend/servers/`,
      },
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
