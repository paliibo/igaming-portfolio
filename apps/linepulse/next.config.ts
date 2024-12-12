import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@igaming/ui', '@igaming/api-client', '@igaming/contracts'],
  typedRoutes: false,
  env: { NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000' },
};

export default nextConfig;
