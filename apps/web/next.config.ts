import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@onecare/ui'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  },
};

export default nextConfig;
