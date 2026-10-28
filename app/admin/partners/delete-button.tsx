"use client"
import { deletePartner } from "./actions"

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deletePartner}
      onSubmit={(e) => {
        if (!confirm(`Delete ${name}? Their link stops working, and their clicks and earnings are removed. This can't be undone.`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-full px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">Delete</button>
    </form>
  )
}
