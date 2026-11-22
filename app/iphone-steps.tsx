// The short how-to iPhone users see in place of "Turn on".
export default function IphoneSteps() {
  return (
    <div>
      <p className="text-[15px] text-lxink">On iPhone, add Marvberry to your Home Screen first.</p>
      <p className="mt-1 text-[13px] text-lxsoft">iPhone only sends notifications to apps on your Home Screen. It takes a moment.</p>
      <ol className="mt-3 space-y-0 text-[14px] text-lxink">
        {[
          "In Safari, tap Share at the bottom of the screen.",
          "Tap Add to Home Screen, then Add.",
          "Open Marvberry from your Home Screen, and turn on notifications.",
        ].map((t, i) => (
          <li key={t} className="flex gap-3 border-b border-lxhair py-2.5">
            <span className="w-3 font-lux text-[18px] leading-none text-lxgold">{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
