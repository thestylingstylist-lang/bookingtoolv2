import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"

// Footer for logged-out pages so nobody is left stranded.
export default function AuthFooter() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
  return (
    <footer className="mt-12 flex items-center justify-between border-t border-ink/10 pt-6 text-sm text-ink/60">
      <img src="/marvberry-wordmark.png" alt={PRODUCT_NAME} width={90} height={18} className="h-[18px] w-auto opacity-80" />
      {SUPPORT_EMAIL && (
        <a href={mailto} className="font-medium text-brass hover:underline">
          Need help? Contact support
        </a>
      )}
    </footer>
  )
}
