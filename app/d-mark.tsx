// Diana, the assistant: a fine gold initial in a thin gold circle.
import "./suite-fonts"

export default function DMark({ size = 36, letter = "D", className = "" }: { size?: number; letter?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-lxgold bg-lxbg font-lux font-light text-lxgold ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52), lineHeight: 1 }}
    >
      {letter.charAt(0).toUpperCase()}
    </span>
  )
}
