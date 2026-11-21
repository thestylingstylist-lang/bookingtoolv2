import Wordmark from "./wordmark"
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"

// Footer for logged-out pages so nobody is left stranded.
export default function AuthFooter() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
  return (
    <footer className="mt-12 flex items-center justify-between border-t border-lxink/10 pt-6 text-sm text-lxink/60">
      <Wordmark size={19} />
      {SUPPORT_EMAIL && (
        <a href={mailto} className="font-medium text-lxink hover:underline">
          Need help? Contact support
        </a>
      )}
    </footer>
  )
}
