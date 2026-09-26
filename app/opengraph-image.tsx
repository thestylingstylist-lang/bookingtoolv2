import { ImageResponse } from "next/og"

// The preview card shown when marvberry.com is shared in a text, DM or email.
export const alt = "Marvberry · Booking & client portal for real estate agents"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#5c0a17",
          color: "#f5ece4",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: 2 }}>Marvberry</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.1, maxWidth: 950 }}>
            Clients book, sign and stay in the loop. You just sell.
          </div>
          <div style={{ fontSize: 30, marginTop: 28, color: "#d9c9bc" }}>
            Made for real estate agents · 14-day trial
          </div>
        </div>
      </div>
    ),
    size
  )
}
