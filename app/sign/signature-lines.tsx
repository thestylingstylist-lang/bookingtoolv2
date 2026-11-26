// Every signature on a document, as it appears on the page: the name in script on the
// line, the date and time beside it. Only signatures that exist are drawn, so a signed
// document never shows an empty line.

export type SignedLine = { role: string; name: string; when: string }

export function whenLabel(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso))
}

export default function SignatureLines({ lines }: { lines: SignedLine[] }) {
  if (!lines.length) return null
  return (
    <div className="flex flex-col gap-[22px]">
      {lines.map((l) => (
        <div key={l.role} className="grid grid-cols-[minmax(0,1fr)_128px] gap-[18px] sm:grid-cols-[minmax(0,1fr)_190px]">
          <div>
            <p className="m-0 text-[12px] text-lxsoft">{l.role}</p>
            <div className="flex h-[54px] items-end border-b border-lxink pb-1">
              <span className="truncate font-sig text-[34px] leading-none text-lxink">{l.name}</span>
            </div>
            <p className="m-0 mt-1 text-[11.5px] text-lxsoft">{l.name}</p>
          </div>
          <div>
            <p className="m-0 text-[12px] text-lxsoft">Date and time</p>
            <div className="flex h-[54px] items-end border-b border-lxink pb-1.5">
              <span className="text-[13px] leading-snug text-lxink">{l.when}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
