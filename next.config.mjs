/** @type {import('next').NextConfig} */
const nextConfig = {
  // fonts read at runtime by the booking-link preview card
  outputFileTracingIncludes: { '/book/[slug]/*': ['./assets/og/**'] },
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
}
export default nextConfig
