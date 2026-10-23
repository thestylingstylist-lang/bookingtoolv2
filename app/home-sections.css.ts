// Styles for the new home page sections (see home-sections.tsx and before-after.tsx).
export const SECTIONS_CSS = `
  --gold:#C9A46C; --rust:#8F4E2A; --sun:#FFBD59; --rule:#E7DED1;
  --serif:'Playfair Display', Georgia, serif; --hand:'Caveat', cursive;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  background:var(--linen); color:var(--ink); font-family:var(--sans)}
.mb .lead.c{max-width:40rem; margin:18px auto 0}
.mb .one{background:var(--cream)}
.mb .hub{display:block; width:100%; max-width:1000px; margin:56px auto 0}
.mb .tl{fill:none; stroke:var(--rust); stroke-opacity:.35; stroke-width:1.5}
.mb .nl{fill:none; stroke:var(--espresso); stroke-width:2}
.mb .chip-m{fill:#fff; stroke:var(--rule)}
.mb .chip-n{fill:var(--espresso)}
.mb .chip-t{font-family:var(--sans); font-size:14px}
.mb .chip-t.m{fill:var(--body)}
.mb .chip-t.n{fill:var(--cream); font-weight:500}
.mb .core{fill:var(--espresso); stroke:var(--gold); stroke-width:3}
.mb .core-t{fill:var(--cream); font-family:var(--serif); font-size:19px}
.mb .ba{max-width:980px; margin:48px auto 0}
.mb .ba-frame{position:relative; height:440px; border-radius:24px; overflow:hidden; border:1px solid var(--rule); text-align:left; user-select:none}
.mb .ba-pane{position:absolute; inset:0; padding:28px}
.mb .ba-pane.after{background:var(--cream); display:flex; flex-direction:column; align-items:flex-end}
.mb .ba-pane.before{background:#E9E6E2}
.mb .ba-tag{font-family:var(--serif); font-style:italic; font-size:clamp(30px,1.2rem + 1.6vw,44px); line-height:1; color:var(--ink); margin-bottom:18px}
.mb .after .ba-tag{align-self:flex-end}
.mb .mess{max-width:380px; display:flex; flex-direction:column; gap:8px; transform:rotate(-1.2deg)}
.mb .mess .b{max-width:80%; padding:9px 13px; border-radius:16px; font-size:14px; line-height:1.4}
.mb .mess .l{background:#fff; align-self:flex-start}
.mb .mess .r{background:#cfd8e3; align-self:flex-end}
.mb .mess .call{align-self:flex-start; font-size:13px; color:#b42318; background:#fde8e6; padding:6px 12px; border-radius:999px}
.mb .mess .mail{align-self:flex-start; font-size:13px; color:var(--body); background:#fff; border:1px dashed #c7c0b8; padding:6px 12px; border-radius:8px}
.mb .deal{width:390px; background:#fff; border:1px solid var(--rule); border-radius:18px; padding:20px 22px; box-shadow:0 24px 48px -28px rgba(42,34,28,.35)}
.mb .deal-head{display:flex; gap:12px; align-items:center}
.mb .av{width:40px; height:40px; border-radius:50%; background:var(--cream); display:flex; align-items:center; justify-content:center; font-family:var(--serif)}
.mb .deal-name{font-family:var(--serif); font-size:20px}
.mb .deal-sub{font-size:12.5px; color:var(--muted)}
.mb .deal-track{list-style:none; padding:0; margin:16px 0 6px; display:flex; gap:8px}
.mb .deal-track li{flex:1; text-align:center; font-size:12px; padding:6px 0; border-radius:999px; background:#f4efe8; color:var(--muted)}
.mb .deal-track li.d{background:var(--gold); color:#fff}
.mb .deal-track li.n{background:var(--espresso); color:var(--cream)}
.mb .deal-rows{list-style:none; padding:0; margin:0}
.mb .deal-rows li{display:flex; justify-content:space-between; gap:10px; padding:9px 0; border-bottom:1px solid #f0ebe4; font-size:13.5px}
.mb .deal-rows em{font-style:normal; color:#2f7f5e; white-space:nowrap}
.mb .deal-note{margin-top:12px; font-size:12.5px; color:var(--body)}
.mb .ba-handle{position:absolute; top:0; bottom:0; width:1px; background:rgba(42,34,28,.55); pointer-events:none; transition:left .45s cubic-bezier(.3,.7,.2,1)}
.mb .ba-pane.before{transition:clip-path .45s cubic-bezier(.3,.7,.2,1)}
.mb .ba-frame:active .ba-handle,.mb .ba-frame:active .ba-pane.before{transition:none}
.mb .knob{position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:max-content; height:58px; padding:0 14px; border-radius:999px; display:flex; align-items:center; gap:10px;
  background:rgba(246,239,229,.55); -webkit-backdrop-filter:saturate(1.5) blur(14px); backdrop-filter:saturate(1.5) blur(14px);
  border:1px solid rgba(255,255,255,.75); box-shadow:0 12px 28px -10px rgba(42,34,28,.45), inset 0 1px 0 rgba(255,255,255,.7)}
.mb .knob img{height:20px; width:auto; display:block}
.mb .knob i{font-style:normal; font-size:20px; line-height:1; color:var(--ink); opacity:.7}
.mb .ba-range{position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:ew-resize; margin:0}
.mb .what{background:var(--linen)}
.mb .feat{display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; max-width:1080px; margin:96px auto 0; text-align:left}
.mb .feat.flip .feat-copy{order:2}
.mb .feat h3{font-size:clamp(28px,1.1rem + 1.6vw,40px); line-height:1.15; margin:8px 0 14px}
.mb .ticks{list-style:none; padding:0; margin:20px 0 0}
.mb .ticks li{position:relative; padding:8px 0 8px 30px; border-bottom:1px solid var(--rule); font-size:15.5px}
.mb .ticks li::before{content:"\\2713"; position:absolute; left:4px; color:var(--rust)}
.mb .feat-pic{background:var(--cream); border-radius:24px; padding:44px; display:flex; justify-content:center}
.mb .ui{width:100%; max-width:340px; background:#fff; border:1px solid var(--rule); border-radius:18px; padding:22px; box-shadow:0 24px 48px -28px rgba(42,34,28,.3)}
.mb .ui-k{font-family:var(--serif); font-size:19px; margin-bottom:14px}
.mb .ui-line{font-size:13.5px; color:var(--body); padding:7px 0; border-bottom:1px solid #f0ebe4}
.mb .ui-big{font-family:var(--serif); font-size:32px; margin-bottom:6px}
.mb .ui-ok{margin-top:14px; font-size:13px; color:#2f7f5e; font-weight:500}
.mb .ui-foot{margin-top:14px; font-size:13px; color:var(--body)}
.mb .sigline{font-family:var(--hand); font-size:30px; margin-top:16px; padding-bottom:4px; border-bottom:1px solid var(--ink); width:70%}
.mb .days,.mb .slots{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px}
.mb .days span,.mb .slots span{font-size:12.5px; padding:7px 11px; border-radius:10px; border:1px solid var(--rule)}
.mb .days span.on,.mb .slots span.on{background:var(--espresso); color:var(--cream); border-color:var(--espresso)}
.mb .cta{margin-top:96px}
@media (max-width:860px){
  .mb .feat{grid-template-columns:1fr; gap:28px}
  .mb .feat.flip .feat-copy{order:0}
  .mb .ba-frame{height:520px}
  .mb .deal{width:100%}
}
.mb .desk-in .paper{position:absolute; left:6%; top:28px; width:46%; height:330px; background:#fdfbf7; padding:22px 20px; transform:rotate(-4deg); box-shadow:0 18px 30px -16px rgba(42,34,28,.45)}
.mb .desk-in .p-k{font-family:var(--serif); font-size:15px; margin-bottom:16px}
.mb .desk-in .p-l{height:7px; background:#e8e2d8; border-radius:3px; margin:0 0 11px}
.mb .desk-in .p-l.s{width:62%}
.mb .desk-in .p-sign{position:absolute; bottom:26px; left:20px; font-size:11px; color:var(--muted)}
.mb .desk-in .cring{position:absolute; left:18px; top:205px; width:92px; height:92px; border-radius:50%; background:radial-gradient(circle, transparent 55%, rgba(120,72,30,.38) 58%, rgba(120,72,30,.14) 64%, transparent 69%)}
.mb .desk-in .cal{position:absolute; right:5%; top:22px; width:38%; background:#fff; padding:14px 14px 12px; transform:rotate(3deg); box-shadow:0 14px 26px -14px rgba(42,34,28,.45)}
.mb .desk-in .cal-k{font-family:var(--serif); font-size:15px; margin-bottom:8px}
.mb .desk-in .cal-grid{display:grid; grid-template-columns:repeat(7,1fr); gap:3px}
.mb .desk-in .cal-grid span{font-size:10px; color:var(--muted); text-align:center; padding:4px 0; border:1px solid #f0ebe4}
.mb .desk-in .cal-grid span.x{background:repeating-linear-gradient(45deg,transparent 0 4px,rgba(180,35,24,.35) 4px 5px)}
.mb .desk-in .cal-grid span.o{outline:2px solid rgba(180,35,24,.55); outline-offset:-1px; border-radius:50%}
.mb .desk-in .cal-scrawl{font-family:var(--hand); font-size:20px; color:#b42318; margin-top:6px; transform:rotate(-3deg)}
.mb .desk-in .phone{position:absolute; left:40%; top:178px; width:200px; background:#16151a; border-radius:26px; padding:14px 10px 18px; transform:rotate(6deg); box-shadow:0 24px 34px -14px rgba(0,0,0,.5)}
.mb .desk-in .ph-top{color:#fff; font-size:11px; text-align:center; margin-bottom:8px; opacity:.7}
.mb .desk-in .t{font-size:11px; line-height:1.35; padding:6px 9px; border-radius:12px; margin:0 0 5px; max-width:84%}
.mb .desk-in .t.l{background:#2b2b31; color:#eee}
.mb .desk-in .t.r{background:#3a7bd5; color:#fff; margin-left:auto}
.mb .desk-in .t.miss{background:transparent; color:#ff6b6b; text-align:center; max-width:100%}
.mb .desk-in .sticky{position:absolute; left:2%; top:318px; width:150px; background:#ffe680; padding:14px 12px; font-family:var(--hand); font-size:21px; line-height:1.1; color:#3a2e14; transform:rotate(-7deg); box-shadow:0 10px 16px -8px rgba(42,34,28,.45)}

.mb .one,.mb .what{position:relative; z-index:1; padding:clamp(80px,10vw,130px) clamp(20px,5vw,72px); text-align:center}
.mb .one h2,.mb .what h2{font-size:clamp(34px,1.4rem + 2.4vw,56px); line-height:1.1; margin-top:10px}
.mb .what .cta .fine{color:var(--muted)}
.mb .plan-band .ba{margin-top:48px}
.mb .ba-pane.before{background:linear-gradient(135deg,#d9c7ae,#c9b394)}
.mb .before .ba-tag{position:relative; z-index:2}
.mb .desk-in{position:absolute; left:0; top:86px; width:560px; height:360px}
.mb .desk-in .paper{left:28px; top:6px; width:230px; height:300px}
.mb .desk-in .cal{left:250px; right:auto; top:0; width:200px}
.mb .desk-in .phone{left:170px; top:120px}
.mb .desk-in .sticky{left:10px; top:240px; bottom:auto}
.mb .desk-in .cring{left:18px; top:180px}
@media (max-width:860px){ .mb .desk-in{transform:scale(.66); transform-origin:top left} }

`
