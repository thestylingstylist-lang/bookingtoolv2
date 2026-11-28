// Marvberry home page (marvberry.com): v3, the charcoal New York hero. The previous page is ./home.tsx.
import type { Metadata } from "next"
import { existsSync } from "fs"
import { join } from "path"
import HomeV3 from "./home-v3/home-v3"
import SiteTracker from "./site-tracker"
import Clarity from "./clarity"

export const metadata: Metadata = {
  title: { absolute: "Marvberry — House of Marvberry" },
  description: "Custom systems that run your luxury real estate business, so your mind stays with the client in front of you.",
}

export default function Home() {
  // The luxury images show once they're in public/home.
  const luxury = ["luxury-desktop.jpg", "luxury-phone.jpg"].every((f) => existsSync(join(process.cwd(), "public", "home", f)))
  return (
    <>
      <HomeV3 luxury={luxury} />
      <SiteTracker />
      <Clarity />
    </>
  )
}
