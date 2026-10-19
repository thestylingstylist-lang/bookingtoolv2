import type { Metadata } from "next"
import "./globals.css"
import "@fontsource/instrument-serif/400.css"
import "@fontsource/instrument-serif/400-italic.css"
import { GeistSans } from "geist/font/sans"

const DESCRIPTION =
  "Clients book themselves, sign without the chase, and always know what's next. Made for solo real estate agents. 14-day trial, no card needed."

export const metadata: Metadata = {
  metadataBase: new URL("https://marvberry.com"),
  title: {
    default: "Marvberry · The Realtor\u2019s Client Experience Assistant",
    template: "%s · Marvberry",
  },
  description: DESCRIPTION,
  applicationName: "Marvberry",
  keywords: [
    "real estate agent booking page",
    "realtor client portal",
    "realtor e-signature",
    "real estate client management",
    "realtor scheduling",
    "buyer document checklist",
  ],
  openGraph: {
    type: "website",
    siteName: "Marvberry",
    url: "https://marvberry.com",
    title: "Marvberry · The Realtor\u2019s Client Experience Assistant",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marvberry · The Realtor\u2019s Client Experience Assistant",
    description: DESCRIPTION,
  },
  alternates: { canonical: "/" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
