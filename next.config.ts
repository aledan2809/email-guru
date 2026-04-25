import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  bundlePagesRouterDependencies: true,
  serverExternalPackages: ['ai-router'],
  outputFileTracingRoot: path.join(__dirname, '..'),
};

export default nextConfig;
