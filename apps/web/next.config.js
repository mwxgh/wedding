/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // @repo/ui and @repo/types ship TypeScript source
  transpilePackages: ['@repo/ui', '@repo/types'],
};

export default nextConfig;
