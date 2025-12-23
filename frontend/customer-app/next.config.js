/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'your-image-domain.com', 'images.unsplash.com'],
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

