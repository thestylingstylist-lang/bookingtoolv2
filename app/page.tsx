// Marvberry home page (marvberry.com). The page itself lives in ./editorial.tsx (the older version is ./landing.tsx).
import type { Metadata } from "next";
import Editorial from "./editorial";
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
      <Editorial />
      <SiteTracker />
      <Clarity />
    </>
  );
}
