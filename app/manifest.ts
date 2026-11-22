import type { MetadataRoute } from "next"

// Lets agents add Marvberry to their Home Screen. On iPhone, that's what
// makes notifications possible.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marvberry",
    short_name: "Marvberry",
    description: "Your clients, deals and messages, in one place.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F8F8F8",
    theme_color: "#F8F8F8",
    icons: [
      { src: "/icons/mb-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/mb-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/mb-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
