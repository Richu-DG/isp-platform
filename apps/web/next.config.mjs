/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@isp/shared"],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
    NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002",
  },
};

export default nextConfig;
