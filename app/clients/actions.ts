"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

// Turn a booking into a client with one click. Copies the details the
// person already gave on the booking page — no retyping. Records
// booking_id so the same booking can't be added twice.
export async function addClientFromBooking(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const bookingId = String(formData.get("bookingId") ?? "").trim()
  if (!bookingId) redirect("/bookings?error=add")

  // Load the booking (RLS: agent owns it) and guard against a repeat add.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, first_name, last_name, email, phone")
    .eq("id", bookingId)
    .maybeSingle()
  if (!booking) redirect("/bookings?error=add")

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (existing) {
    redirect("/bookings?added=exists")
  }

  const { error } = await supabase.from("clients").insert({
    agent_id: user.id,
    booking_id: booking.id,
    first_name: booking.first_name ?? "",
    last_name: booking.last_name ?? "",
    email: booking.email || null,
    phone: booking.phone || null,
  })
  if (error) redirect("/bookings?error=add")

  revalidatePath("/clients")
  revalidatePath("/bookings")
  redirect("/bookings?added=1")
}


// Edit an existing client's details (name, contact, address). Runs as the
// logged-in agent; RLS "agent manages clients" scopes it to their own rows.
export async function updateClient(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const id = String(formData.get("id") ?? "").trim()
  const returnTo = String(formData.get("returnTo") ?? "").trim()
  const backOk = returnTo.startsWith("/clients/")
  if (!id) redirect(backOk ? `${returnTo}?error=save` : "/clients?error=save")

  const firstName = String(formData.get("firstName") ?? "").trim()
  const lastName = String(formData.get("lastName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()

  if (!firstName && !lastName) {
    redirect(backOk ? `${returnTo}?error=name` : "/clients?error=name")
  }

  const { error } = await supabase
    .from("clients")
    .update({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      address: address || null,
    })
    .eq("id", id)

  if (error) {
    redirect(backOk ? `${returnTo}?error=save` : "/clients?error=save")
  }

  revalidatePath("/clients")
  if (backOk) {
    revalidatePath(returnTo)
    redirect(`${returnTo}?updated=1`)
  }
  redirect("/clients?updated=1")
}

// Delete a client and everything filed under them. Ownership is checked
// through RLS first; the cleanup then runs with the admin client so no
// linked row (messages, notes, offers, uploads) blocks the delete.
export async function deleteClient(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) redirect("/clients?error=delete")

  const { data: owned } = await supabase
    .from("clients")
    .select("id, agent_id")
    .eq("id", id)
    .maybeSingle()
  if (!owned || owned.agent_id !== user.id) redirect("/clients?error=delete")

  const admin = createAdminClient()

  // Uploaded files live under <agent>/<client>/ in the client-docs bucket.
  const folder = `${user.id}/${id}`
  const { data: files } = await admin.storage.from("client-docs").list(folder, { limit: 1000 })
  if (files && files.length > 0) {
    await admin.storage.from("client-docs").remove(files.map((f) => `${folder}/${f.name}`))
  }

  for (const table of ["messages", "client_notes", "offers", "steps", "collected_docs", "documents"]) {
    const { error } = await admin.from(table).delete().eq("client_id", id)
    if (error) redirect("/clients?error=delete")
  }
  await admin.from("bookings").update({ client_id: null }).eq("client_id", id)

  const { error } = await admin.from("clients").delete().eq("id", id).eq("agent_id", user.id)
  if (error) redirect("/clients?error=delete")

  revalidatePath("/clients")
  revalidatePath("/bookings")
  redirect("/clients?deleted=1")
}

// Delete a booking. Agents can only read bookings under RLS, so ownership
// is checked first and the delete runs with the admin client.
export async function deleteBooking(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) redirect("/bookings?error=delete")

  const { data: owned } = await supabase
    .from("bookings")
    .select("id, agent_id")
    .eq("id", id)
    .maybeSingle()
  if (!owned || owned.agent_id !== user.id) redirect("/bookings?error=delete")

  const admin = createAdminClient()
  // A client made from this booking stays; it just loses the link.
  await admin.from("clients").update({ booking_id: null }).eq("booking_id", id)
  const { error } = await admin.from("bookings").delete().eq("id", id).eq("agent_id", user.id)
  if (error) redirect("/bookings?error=delete")

  revalidatePath("/bookings")
  revalidatePath("/clients")
  redirect("/bookings?deleted=1")
}
