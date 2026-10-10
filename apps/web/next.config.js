/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // @repo/ui ships TypeScript source
  transpilePackages: ['@repo/ui'],
};

export default nextConfig;
