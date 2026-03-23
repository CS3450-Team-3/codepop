import type { NextConfig } from "next";

import path from "path";

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
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
