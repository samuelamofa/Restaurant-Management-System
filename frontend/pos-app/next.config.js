/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Ensure webpack resolves modules from the local node_modules first
    const localNodeModules = path.resolve(__dirname, 'node_modules');
    config.resolve.modules = [
      localNodeModules,
      'node_modules',
    ];
    
    // Prevent resolving from parent directories
    config.resolve.symlinks = false;
    
    // Ignore parent node_modules to avoid workspace conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
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
  // Transpile packages that might have issues
  transpilePackages: [],
};

module.exports = nextConfig;

