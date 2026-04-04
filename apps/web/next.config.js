/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: `${process.env.API_URL || 'http://localhost:3001'}/v1/:path*` },
      { source: '/admin/:path*', destination: `${process.env.API_URL || 'http://localhost:3001'}/admin/:path*` },
      { source: '/health', destination: `${process.env.API_URL || 'http://localhost:3001'}/health` },
    ];
  },
};

export default nextConfig;
