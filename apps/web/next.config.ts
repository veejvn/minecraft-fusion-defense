import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: false,
  images: {
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
