import type { NextConfig } from "next";
import path from "path";

const backend1 = process.env.BACKEND1_URL ?? "http://localhost:9001";
const backend2 = process.env.BACKEND2_URL ?? "http://localhost:9002";

const nextConfig: NextConfig = {
  trailingSlash: true,
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*/',
        destination: 'http://127.0.0.1:8000/backend/:path*/',
      },
      {
        source: '/backend/:path*',
        destination: 'http://127.0.0.1:8000/backend/:path*',
      },
      {
        source: '/api/servers',
        destination: `${backend1}/backend/servers/`,
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
