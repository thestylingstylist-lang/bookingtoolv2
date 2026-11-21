// Stand-in for the new Marvberry logo files: a thin gold serif wordmark.
// Swap the text for the real logo when it arrives.
import "./suite-fonts"

export default function Wordmark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block font-lux font-normal leading-none tracking-[.04em] text-lxgold ${className}`}
      style={{ fontSize: size }}
      aria-label="Marvberry"
    >
      marvberry
    </span>
  )
}
