/** @type {import('next').NextConfig} */
const nextConfig = {
  // fonts read at runtime by the booking-link preview card
  // fonts the signed-agreement PDF is set in
  outputFileTracingIncludes: {
    '/book/[slug]/*': ['./assets/og/**'],
    '/c/[code]/*': ['./assets/og/**'],
    '/sign/[token]': ['./assets/fonts/**'],
    '/sign/[token]/*': ['./assets/fonts/**'],
    '/documents/[id]/*': ['./assets/fonts/**'],
  },
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
