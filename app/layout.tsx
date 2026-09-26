import type { Metadata } from "next"
import "./globals.css"

const DESCRIPTION =
  "Clients book themselves, sign without the chase, and always know what's next. Made for solo real estate agents. 14-day trial, no card needed."

export const metadata: Metadata = {
  metadataBase: new URL("https://marvberry.com"),
  title: {
    default: "Marvberry · Booking & client portal for real estate agents",
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
    title: "Marvberry · Booking & client portal for real estate agents",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marvberry · Booking & client portal for real estate agents",
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
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
