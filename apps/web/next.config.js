/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/public/:path*', destination: `${process.env.API_URL || 'http://localhost:3001'}/public/:path*` },
      { source: '/admin/:path*', destination: `${process.env.API_URL || 'http://localhost:3001'}/admin/:path*` },
      { source: '/health', destination: `${process.env.API_URL || 'http://localhost:3001'}/health` },
    ];
  },
};

export default nextConfig;
