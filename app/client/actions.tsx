"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Add a client by hand. Runs as the logged-in agent, so RLS
// ("agent manages clients") ties the row to them automatically.
export async function addClient(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const firstName = String(formData.get("firstName") ?? "").trim()
  const lastName = String(formData.get("lastName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()

  if (!firstName && !lastName) {
    redirect("/clients?error=name")
  }

  const { error } = await supabase.from("clients").insert({
    agent_id: user.id,
    first_name: firstName,
    last_name: lastName,
    email: email || null,
    phone: phone || null,
    address: address || null,
  })

  if (error) {
    redirect("/clients?error=save")
  }

  revalidatePath("/clients")
  redirect("/clients?added=1")
}
