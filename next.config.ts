import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true, // Enable React Strict Mode
  // Next 15.2+ "streams" metadata (<title>, meta description, canonical) into <body> for any user
  // agent not matched here - including Googlebot. Google only honors rel=canonical inside <head>,
  // so match every user agent: metadata is then always rendered in <head>.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Performance optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake lucide-react imports
  },
  
  webpack(config) {
    // Enable production optimizations
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };
    return config;
  },
};

export default nextConfig;
