/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['storage.googleapis.com', 'firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.clerk.dev',
      },
      {
        protocol: 'https',
        hostname: '*.stripe.com',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors. Only for testing purposes
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Only for testing purposes
    ignoreDuringBuilds: true,
  },
}

export default nextConfig