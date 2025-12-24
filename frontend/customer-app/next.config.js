/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow images from API URL domain (dynamically from env)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
    ],
  },
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

