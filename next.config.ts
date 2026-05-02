import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.ts is supported natively in Next.js 14+ without config
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
