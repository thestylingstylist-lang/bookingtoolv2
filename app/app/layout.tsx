import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Book a consultation",
  description: "Schedule a private consultation.",
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
