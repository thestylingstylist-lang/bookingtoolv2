// Marvberry home page (marvberry.com). The page itself lives in ./brand.tsx (the older version is ./landing.tsx).
import type { Metadata } from "next";
import Brand from "./brand";
import SiteTracker from "./site-tracker";
import Clarity from "./clarity";

export const metadata: Metadata = {
  title: { absolute: "Marvberry — Client management built for solo realtors" },
  description:
    "Showing booking, e-signatures, and a client portal in one place. Clients book themselves, sign from their phone, and always know what's next.",
};

export default function Home() {
  return (
    <>
      <Brand />
      <SiteTracker />
      <Clarity />
    </>
  );
}
