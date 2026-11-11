"use client"
// Place the blanks on the agent's own PDF. Click the page to add one, drag to move,
// pull the corner to resize. "Find blanks for me" picks up wording like "(client's name)".
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PDF_AUTO, guessKey, isCustom, labelFor, type PdfField } from "@/lib/pdf-fields"
import { savePdfFields, deletePdfTemplate } from "../../pdf-actions"

type PageInfo = { w: number; h: number; url: string }
type PdfJs = typeof import("pdfjs-dist")
const VIEW_W = 720
const uid = () => Math.random().toString(36).slice(2, 10)

export default function PdfEditor({ id, title, url, initial }: { id: string; title: string; url: string; initial: PdfField[] }) {
  const router = useRouter()
  const [pages, setPages] = useState<PageInfo[]>([])
  const [fields, setFields] = useState<PdfField[]>(initial)
  const [sel, setSel] = useState<string | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [saved, setSaved] = useState<"" | "saving" | "saved" | "error">("")
  const [found, setFound] = useState<string>("")
  const doc = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null)
  const drag = useRef<{ id: string; mode: "move" | "size"; sx: number; sy: number; f: PdfField; pw: number; ph: number } | null>(null)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const pdfjs: PdfJs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
        const d = await pdfjs.getDocument(url).promise
        doc.current = d
        const out: PageInfo[] = []
        for (let i = 1; i <= Math.min(d.numPages, 20); i++) {
          const p = await d.getPage(i)
          const base = p.getViewport({ scale: 1 })
          const vp = p.getViewport({ scale: (VIEW_W / base.width) * 2 })
          const c = document.createElement("canvas")
          c.width = vp.width
          c.height = vp.height
          await p.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise
          out.push({ w: base.width, h: base.height, url: c.toDataURL("image/png") })
        }
        if (!off) {
          setPages(out)
          setState("ready")
        }
      } catch {
        if (!off) setState("error")
      }
    })()
    return () => {
      off = true
    }
  }, [url])

  async function findBlanks() {
    const d = doc.current
    if (!d) return
    const add: PdfField[] = []
    for (let i = 0; i < pages.length; i++) {
      const p = await d.getPage(i + 1)
      const { w: W, h: H } = pages[i]
      const tc = await p.getTextContent()
      for (const it of tc.items) {
        if (!("str" in it) || !it.str) continue
        const str = it.str
        const fs = Math.hypot(it.transform[2], it.transform[3]) || it.height || 11
        const charW = it.width / Math.max(1, str.length)
        for (const m of str.matchAll(/\(([^()]{2,40})\)/g)) {
          const x = it.transform[4] + (m.index ?? 0) * charW
          const w = m[0].length * charW
          const top = H - (it.transform[5] + fs * 0.95)
          const nf: PdfField = {
            id: uid(),
            key: guessKey(m[1]),
            label: "",
            page: i,
            x: x / W,
            y: top / H,
            w: Math.max(w, fs * 6) / W,
            h: (fs * 1.25) / H,
            size: Math.round(Math.min(14, Math.max(8, fs))),
            cover: true,
          }
          nf.label = labelFor(nf.key)
          const dup = fields.concat(add).some((f) => f.page === i && Math.abs(f.x - nf.x) < 0.01 && Math.abs(f.y - nf.y) < 0.01)
          if (!dup) add.push(nf)
        }
      }
    }
    setFields((x) => [...x, ...add])
    setFound(add.length ? `Found ${add.length} blank${add.length === 1 ? "" : "s"}. Check each one, then add any that are missing.` : "I didn’t find any. Click the page to add blanks.")
  }

  function addAt(e: React.MouseEvent<HTMLDivElement>, page: number) {
    if (e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const f: PdfField = {
      id: uid(),
      key: "custom:New blank",
      label: "New blank",
      page,
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height - 0.012,
      w: 0.3,
      h: 0.024,
      size: 11,
      cover: false,
    }
    setFields((x) => [...x, f])
    setSel(f.id)
  }

  function down(e: React.PointerEvent, f: PdfField, mode: "move" | "size") {
    e.stopPropagation()
    const box = (e.currentTarget as HTMLElement).closest("[data-page]") as HTMLElement
    const r = box.getBoundingClientRect()
    drag.current = { id: f.id, mode, sx: e.clientX, sy: e.clientY, f: { ...f }, pw: r.width, ph: r.height }
    setSel(f.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / d.pw
    const dy = (e.clientY - d.sy) / d.ph
    setFields((xs) =>
      xs.map((f) =>
        f.id !== d.id
          ? f
          : d.mode === "move"
            ? { ...f, x: Math.min(1 - f.w, Math.max(0, d.f.x + dx)), y: Math.min(1 - f.h, Math.max(0, d.f.y + dy)) }
            : { ...f, w: Math.max(0.03, d.f.w + dx), h: Math.max(0.012, d.f.h + dy) },
      ),
    )
  }
  const up = () => (drag.current = null)
  const patch = (fid: string, p: Partial<PdfField>) => setFields((xs) => xs.map((f) => (f.id === fid ? { ...f, ...p } : f)))

  async function save() {
    setSaved("saving")
    const r = await savePdfFields(id, fields).catch(() => ({ ok: false }))
    setSaved(r.ok ? "saved" : "error")
  }

  const cur = fields.find((f) => f.id === sel) ?? null

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <Link href="/templates" className="text-sm text-ink/50 hover:text-ink">&larr; Templates</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink/55">Place the blanks where Marvberry should write. Your form keeps its logo and layout.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={findBlanks} disabled={state !== "ready"} className="rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-ink/5 disabled:opacity-50">
            Find blanks for me
          </button>
          <button type="button" onClick={save} className="rounded-lg bg-ox px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">
            {saved === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {found && <p className="mt-3 text-sm text-[#93407A]">{found}</p>}
      {saved === "saved" && <p className="mt-3 text-sm text-green-700">Saved. Pick this form when you send an offer.</p>}
      {saved === "error" && <p className="mt-3 text-sm text-red-700">That didn’t save. Try again.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6" onPointerMove={move} onPointerUp={up}>
          {state === "loading" && <p className="text-sm text-ink/50">Opening your form…</p>}
          {state === "error" && <p className="text-sm text-red-700">Couldn’t open this PDF. Try uploading it again.</p>}
          {pages.map((p, i) => (
            <div
              key={i}
              data-page={i}
              onClick={(e) => addAt(e, i)}
              className="relative mx-auto w-full max-w-[720px] cursor-crosshair overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm"
              style={{ aspectRatio: `${p.w} / ${p.h}`, backgroundImage: `url(${p.url})`, backgroundSize: "100% 100%" }}
            >
              {fields
                .filter((f) => f.page === i)
                .map((f) => (
                  <div
                    key={f.id}
                    onPointerDown={(e) => down(e, f, "move")}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute flex cursor-move items-center overflow-hidden rounded-[3px] border px-1 text-[10px] leading-none ${
                      sel === f.id ? "border-[#BC559E] bg-[#FBEDF5]/90 text-[#93407A]" : isCustom(f.key) ? "border-amber-400 bg-amber-50/85 text-amber-800" : "border-emerald-400 bg-emerald-50/85 text-emerald-800"
                    }`}
                    style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}
                    title={f.label}
                  >
                    <span className="truncate">{f.label}</span>
                    <span onPointerDown={(e) => down(e, f, "size")} className="absolute bottom-0 right-0 h-2 w-2 cursor-nwse-resize bg-[#BC559E]" />
                  </div>
                ))}
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 h-fit rounded-2xl border border-ink/10 bg-card p-5">
          {cur ? (
            <div className="space-y-4">
              <p className="font-semibold">This blank</p>
              <label className="block text-sm">
                <span className="text-ink/60">What goes here</span>
                <select
                  value={isCustom(cur.key) ? "custom" : cur.key}
                  onChange={(e) => {
                    const k = e.target.value === "custom" ? `custom:${isCustom(cur.key) ? cur.label : "New blank"}` : e.target.value
                    patch(cur.id, { key: k, label: labelFor(k) })
                  }}
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2"
                >
                  {PDF_AUTO.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                  <option value="custom">Something else (you fill it in)</option>
                </select>
              </label>
              {isCustom(cur.key) && (
                <label className="block text-sm">
                  <span className="text-ink/60">Name it</span>
                  <input
                    value={cur.label}
                    onChange={(e) => patch(cur.id, { label: e.target.value.slice(0, 60), key: `custom:${e.target.value.slice(0, 60)}` })}
                    className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2"
                  />
                </label>
              )}
              <label className="block text-sm">
                <span className="text-ink/60">Text size</span>
                <input type="number" min={6} max={24} value={cur.size} onChange={(e) => patch(cur.id, { size: Number(e.target.value) || 11 })} className="mt-1 w-24 rounded-lg border border-ink/15 bg-white px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cur.cover} onChange={(e) => patch(cur.id, { cover: e.target.checked })} />
                <span>White out what’s printed here</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSel(null)} className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm">Done</button>
                <button
                  type="button"
                  onClick={() => {
                    setFields((xs) => xs.filter((f) => f.id !== cur.id))
                    setSel(null)
                  }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-ink/65">
              <p className="font-semibold text-ink">How it works</p>
              <p>Click anywhere on the form to add a blank, drag it into place, and pull the corner to fit the line.</p>
              <p><span className="rounded bg-emerald-50 px-1 text-emerald-800">Green</span> blanks fill in on their own. <span className="rounded bg-amber-50 px-1 text-amber-800">Amber</span> ones you type when you send.</p>
              <p className="pt-2 text-ink/45">{fields.length} blank{fields.length === 1 ? "" : "s"} on this form.</p>
              <form
                action={async () => {
                  if (!confirm("Delete this form?")) return
                  await deletePdfTemplate(id)
                  router.push("/templates")
                }}
              >
                <button className="pt-4 text-xs text-red-700 underline underline-offset-2">Delete this form</button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
