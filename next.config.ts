import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "flashlocal.com",
        "www.flashlocal.com",
        "*.flashlocal.com",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
