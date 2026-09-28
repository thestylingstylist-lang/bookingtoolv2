/** @type {import('next').NextConfig} */
const nextConfig = {
  // fonts read at runtime by the booking-link preview card
  outputFileTracingIncludes: { '/book/[slug]/*': ['./assets/og/**'] },
  // The old Vercel address forwards to the real site (API routes excluded so crons and webhooks keep working).
  async redirects() {
    return [
      {
        source: '/:path((?!api/).*)',
        has: [{ type: 'host', value: '(?<sub>.+)\\.vercel\\.app' }],
        destination: 'https://www.marvberry.com/:path',
        permanent: true,
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
}
export default nextConfig
