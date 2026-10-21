// Marvberry home page (marvberry.com). The page itself lives in ./closer.tsx (earlier versions: ./brand.tsx, ./landing.tsx).
import type { Metadata } from "next";
import Closer from "./closer";
import SiteTracker from "./site-tracker";
import Clarity from "./clarity";

export const metadata: Metadata = {
  title: { absolute: "Marvberry — The closer behind the closer" },
  description:
    "For solo real estate agents. Marvberry builds your offer so you can send it in minutes, and gives every buyer their own page. We set it up with you.",
};

export default function Home() {
  return (
    <>
      <Closer />
      <SiteTracker />
      <Clarity />
    </>
  );
}
