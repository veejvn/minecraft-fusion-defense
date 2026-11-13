import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mfd/game'],
  cacheComponents: false,
  images: {
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
