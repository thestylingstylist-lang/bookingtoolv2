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
