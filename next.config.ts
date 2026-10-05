import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'bcryptjs'],
  experimental: { serverActions: { bodySizeLimit: '6mb' } }, // CV uploads up to 5 MB
};

export default nextConfig;
