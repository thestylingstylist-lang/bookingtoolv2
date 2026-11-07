import { Cormorant_Garamond } from "next/font/google"

// Editorial serif for marketing headlines only. Everything else stays Geist.
export const editorial = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
})
