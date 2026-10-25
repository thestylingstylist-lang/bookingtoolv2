// Marvberry home page (marvberry.com). The page itself lives in ./home.tsx (the previous version is ./brand.tsx).
import type { Metadata } from "next";
import HomePage from "./home";
import SiteTracker from "./site-tracker";
import Clarity from "./clarity";

export const metadata: Metadata = {
  title: { absolute: "Marvberry — The Real Estate Agent\u2019s Client Experience Assistant" },
  description:
    "Booking, signatures, documents and client updates, for real estate agents who run their deals on relationships.",
};

export default function Home() {
  return (
    <>
      <HomePage />
      <SiteTracker />
      <Clarity />
    </>
  );
}
