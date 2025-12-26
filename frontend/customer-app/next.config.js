/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fix for workspace dependency resolution
    const rootNodeModules = path.resolve(__dirname, '../../node_modules');
    const localNodeModules = path.resolve(__dirname, 'node_modules');
    
    config.resolve.modules = [
      localNodeModules,
      rootNodeModules,
      'node_modules',
    ];
    
    // Ensure proper module resolution for workspace packages
    config.resolve.symlinks = false;
    
    // Explicit alias for problematic workspace packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@nodelib/fs.walk': path.resolve(rootNodeModules, '@nodelib/fs.walk'),
    };
    
    return config;
  },
  images: {
    // Allow images from any domain (API URL is dynamic)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Output standalone for better performance
  output: 'standalone',
  // Rewrite logo.png requests to our API route
  async rewrites() {
    return [
      {
        source: '/logo.png',
        destination: '/api/logo',
      },
    ];
  },
};

module.exports = nextConfig;

