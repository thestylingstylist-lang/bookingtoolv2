"use client"

import { VAPID_PUBLIC_KEY } from "@/lib/notify-key"
import { saveSubscription } from "./notify-actions"

export function isIos() {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export function isStandalone() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

// On iPhone, notifications only work once Marvberry is on the Home Screen.
export function needsHomeScreen() {
  return isIos() && !isStandalone()
}

function keyBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration("/")
  return (await reg?.pushManager.getSubscription()) ?? null
}

export type TurnOnResult = "on" | "blocked" | "unsupported" | "failed"

export async function turnOn(): Promise<TurnOnResult> {
  if (!pushSupported()) return "unsupported"
  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return "blocked"
    await registration()
    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
    const res = await saveSubscription(JSON.parse(JSON.stringify(sub)))
    return res.ok ? "on" : "failed"
  } catch {
    return "failed"
  }
}
