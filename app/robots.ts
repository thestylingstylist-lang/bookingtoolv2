import type { MetadataRoute } from "next"

// Public marketing pages and realtor booking pages can be found on Google.
// Everything private (the app, client portals, signing, reschedule links) cannot.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/clients",
        "/bookings",
        "/calendar",
        "/settings",
        "/start-here",
        "/templates",
        "/documents",
        "/portal/",
        "/sign/",
        "/manage/",
        "/api/",
        "/auth/",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: "https://marvberry.com/sitemap.xml",
  }
}
