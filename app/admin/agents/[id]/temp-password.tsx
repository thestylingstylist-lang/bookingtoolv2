"use client"

import { useActionState, useState } from "react"
import { makeTempPassword, type TempResult } from "./assistant-actions"

// Gives the realtor a temporary password you can read to them. They choose their own right after signing in.
export default function TempPassword({ agentId, email }: { agentId: string; email: string }) {
  const [state, action, pending] = useActionState<TempResult | null, FormData>(makeTempPassword, null)
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-3 rounded-xl bg-[#16151a]/[0.04] px-3 py-2.5">
      <p className="text-sm font-medium text-[#16151a]">Temporary password</p>
      <p className="text-xs text-[#16151a]/50">
        No email needed. Give it to them, they sign in at marvberry.com/login, then choose their own password.
      </p>
      {state?.password ? (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm tracking-wide text-[#16151a]">{state.password}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(state.password!).then(() => setCopied(true))}
              className="rounded-full border border-[#16151a]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#16151a]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-[#16151a]/60">
            Email: <span className="font-medium text-[#16151a]">{email}</span>. This password works until they change it.
          </p>
        </div>
      ) : (
        <form action={action} className="mt-2">
          <input type="hidden" name="agentId" value={agentId} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-[#16151a]/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#16151a] disabled:opacity-60"
          >
            {pending ? "Making it…" : "Make a temporary password"}
          </button>
          {state?.error && <span className="ml-2 text-xs text-[#9b2c52]">{state.error}</span>}
        </form>
      )}
    </div>
  )
}
