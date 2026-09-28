// Internal Marvberry team area. Carries the brand (unlike the neutral realtor app).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F4F3F1] text-[#16151A]">
      {/* brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(40% 50% at 30% 50%, rgba(232,155,180,1), transparent 70%), radial-gradient(35% 45% at 55% 40%, rgba(217,70,122,.35), transparent 70%), radial-gradient(40% 50% at 75% 55%, rgba(251,201,142,1), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-6 pt-8">
        <p className="text-lg font-semibold tracking-tight">
          Marvberry
          <span className="ml-2 rounded-full bg-gradient-to-r from-[#D9467A] to-[#EE7C55] px-2.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wider text-white">
            Team
          </span>
        </p>
      </header>
      <div className="relative">{children}</div>
    </div>
  )
}
