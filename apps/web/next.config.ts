import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mfd/game', '@mfd/game-data'],
  cacheComponents: false,
  images: {
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
