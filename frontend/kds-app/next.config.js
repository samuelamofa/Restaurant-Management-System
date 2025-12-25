/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
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
    
    // Fix for socket.io-client nested dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  images: {
    unoptimized: true,
  },
  // Railway deployment: Output standalone for better performance
  output: 'standalone',
};

module.exports = nextConfig;
