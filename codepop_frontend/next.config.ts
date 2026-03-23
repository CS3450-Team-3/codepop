import type { NextConfig } from "next";
import path from "path";

const backend1 = process.env.BACKEND1_URL ?? "http://localhost:9001";
const backend2 = process.env.BACKEND2_URL ?? "http://localhost:9002";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async rewrites() {
    return [
      // Route /api/1/... to backend1
      {
        source: "/api/1/:path*",
        destination: `${backend1}/backend/:path*`,
      },
      // Route /api/2/... to backend2
      {
        source: "/api/2/:path*",
        destination: `${backend2}/backend/:path*`,
      },
      // Fallback: /api/... goes to backend1 (e.g. server discovery on home page)
      {
        source: "/api/:path*",
        destination: `${backend1}/backend/:path*`,
      },
    ];
  },
};

export default nextConfig;
