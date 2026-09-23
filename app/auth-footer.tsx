import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"

// Footer for logged-out pages so nobody is left stranded.
export default function AuthFooter() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
  return (
    <footer className="mt-12 flex items-center justify-between border-t border-ink/10 pt-6 text-sm text-ink/60">
      <span className="font-serif text-base text-ink/80">{PRODUCT_NAME}</span>
      {SUPPORT_EMAIL && (
        <a href={mailto} className="font-medium text-brass hover:underline">
          Need help? Contact support
        </a>
      )}
    </footer>
  )
}
