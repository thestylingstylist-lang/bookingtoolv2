import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: "https://marvberry.com", lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: "https://marvberry.com/signup", lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://marvberry.com/login", lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
}
