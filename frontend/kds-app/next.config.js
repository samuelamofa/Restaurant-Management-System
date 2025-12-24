/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Environment variables are automatically available via NEXT_PUBLIC_* prefix
  // No need to hardcode defaults - let them be undefined in production if not set
  // This ensures proper error handling and prevents silent failures
  // Disable image optimization if not needed
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig

