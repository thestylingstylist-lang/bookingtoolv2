// Homepage styles, scoped under .hv3 so nothing else in the app is touched.
export const HV3_CSS = String.raw`html{overflow-x:clip}
.hv3{color-scheme:light;--char:#141414;--cream:#F3EDE2;--paper:#F8F8F8;--ink:#1F1C18;--soft:#4A453E;--gold:#C2A46B;--golddeep:#8C7040;--hair:rgba(31,28,24,.1);
  --serif:"Cormorant Garamond",Georgia,serif;--mono:"Cutive Mono","Courier New",monospace;--bar:56px;--menu:48px}
.hv3 *{box-sizing:border-box;min-width:0}
.hv3{margin:0}
.hv3{overflow-x:clip}
.hv3{background:var(--paper) url(/home/marvberry-paper-texture.png) repeat;background-size:512px;color:var(--ink);font:400 20px/1.55 var(--serif);overflow-x:clip;-webkit-font-smoothing:antialiased}
.hv3 button,.hv3 input{font:inherit;color:inherit}
.hv3 a{color:inherit}
.hv3 :focus-visible{outline:1px solid var(--golddeep);outline-offset:4px}
.hv3 .top{position:fixed;top:0;left:0;right:0;z-index:1;height:100vh;height:100svh;background:var(--char) url(/home/charcoal-grain.png) repeat;background-size:512px;overflow:hidden;color:var(--cream)}
.hv3 .art{position:absolute;inset:-14px;background:url(/home/ny-emboss.png) no-repeat center bottom/100% auto;pointer-events:none;opacity:.82;will-change:transform;
  -webkit-mask-image:linear-gradient(to bottom,transparent 16%,rgba(0,0,0,.35) 38%,rgba(0,0,0,.85) 62%,#000 80%);mask-image:linear-gradient(to bottom,transparent 16%,rgba(0,0,0,.35) 38%,rgba(0,0,0,.85) 62%,#000 80%)}
.hv3 .vig{position:absolute;inset:0;pointer-events:none;background:
  radial-gradient(ellipse 48% 38% at 50% 40%,rgba(243,237,226,.045),rgba(243,237,226,0) 70%),
  radial-gradient(ellipse 90% 80% at 50% 42%,rgba(20,20,20,0) 48%,rgba(20,20,20,.72) 100%),
  linear-gradient(to bottom,rgba(20,20,20,0) 82%,rgba(20,20,20,.55) 100%)}
.hv3 .top::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 44% 34% at 50% 40%,rgba(20,20,20,.7),rgba(20,20,20,0) 72%);pointer-events:none}
.hv3 .wm{position:absolute;left:50%;top:44px;width:110px;aspect-ratio:1360/262;transform:translateX(-50%);z-index:3;
  -webkit-mask:url(/marvberry-wordmark.png) center/contain no-repeat;mask:url(/marvberry-wordmark.png) center/contain no-repeat;background:#C2A46B}
.hv3 .house{position:absolute;left:50%;top:calc(44px + 110px * 262 / 1360 + 14px);transform:translateX(-50%);padding-left:.42em;font:400 11px/1 var(--serif);letter-spacing:.42em;color:rgba(243,237,226,.78);z-index:3;white-space:nowrap}
.hv3 .hin{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8vh max(8vw,40px) 26vh;will-change:transform,opacity}
.hv3 .hh{margin:0;max-width:14em;font:400 clamp(38px,5.6vw,80px)/1.08 var(--serif);letter-spacing:-.005em;text-wrap:balance}
.hv3 .hs{margin:26px 0 0;max-width:62ch;font:400 clamp(16px,1.5vw,21px)/1.7 var(--mono);color:rgba(243,237,226,.82);text-wrap:balance}
.hv3 .gl{width:min(200px,40vw);height:1px;background:var(--gold);margin:34px auto 0;transform:scaleX(0);transition:transform 1.8s cubic-bezier(.65,.05,.25,1)}
.hv3 .gl.in{transform:scaleX(1)}
.hv3 .hbtn{margin-top:38px;background:#FFFFFF;color:var(--char);border:0;border-radius:0;padding:17px 42px;min-height:48px;font:400 16px var(--mono);letter-spacing:.04em;cursor:pointer;transition:background .5s}
.hv3 .hbtn:hover{background:#ECE7DE}
.hv3 .hcue{position:absolute;left:50%;bottom:20px;width:1px;height:30px;background:linear-gradient(transparent,var(--gold));z-index:3}
.hv3 .hcue::after{content:"";position:absolute;left:-3px;bottom:0;width:6px;height:6px;border-right:1px solid var(--gold);border-bottom:1px solid var(--gold);transform:rotate(45deg)}
.hv3 .fadeup{opacity:0;transform:translateY(14px);animation:up 1.6s cubic-bezier(.2,.7,.2,1) forwards}
.hv3 .fadeup.d2{animation-delay:.25s}
.hv3 .fadeup.d3{animation-delay:.5s}
@keyframes up{to{opacity:1;transform:none}}
.hv3 .spacer{height:100vh;height:100svh}
.hv3 .bar{position:fixed;top:0;left:0;right:0;height:var(--bar);z-index:60;background:var(--char) url(/home/charcoal-grain.png) repeat;background-size:512px;transform:translateY(-100%);transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.hv3 .bar.show{transform:none}
.hv3 .bwm{position:absolute;left:50%;top:50%;width:92px;aspect-ratio:1360/262;transform:translate(-50%,-50%);-webkit-mask:url(/marvberry-wordmark.png) center/contain no-repeat;mask:url(/marvberry-wordmark.png) center/contain no-repeat;background:#C2A46B}
.hv3 .stack>.sheet:first-child{position:relative;top:auto;box-shadow:0 -40px 80px -30px rgba(0,0,0,.6);border-top:0}
.hv3 .menu{position:fixed;left:0;right:0;top:var(--bar);height:var(--menu);z-index:55;display:flex;align-items:center;justify-content:space-between;padding:0 max(4vw,20px);
  background:rgba(248,248,248,.62);-webkit-backdrop-filter:blur(14px) saturate(1.1);backdrop-filter:blur(14px) saturate(1.1);border-bottom:1px solid rgba(31,28,24,.08);
  transform:translateY(calc(-100% - var(--bar)));transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.hv3 .menu.show{transform:none}
.hv3 .menu button,.hv3 .menu a{background:none;border:0;padding:10px 0;font:400 16px var(--mono);color:var(--ink);cursor:pointer;text-decoration:none;letter-spacing:.02em}
.hv3 .menu a{border-bottom:1px solid var(--gold);padding:2px 0}
.hv3 .stack{position:relative}
.hv3 .sheet{position:sticky;top:calc(var(--bar) + var(--menu));min-height:calc(100vh - var(--bar) - var(--menu));background:var(--paper) url(/home/marvberry-paper-texture.png) repeat;background-size:512px;
  display:flex;align-items:center;padding:clamp(48px,7vh,90px) max(6vw,22px);box-shadow:0 -26px 50px -30px rgba(31,28,24,.22);border-top:1px solid rgba(31,28,24,.05);overflow-x:clip}
.hv3 .sheet:first-child{box-shadow:none;border-top:0}
.hv3 .inner{width:100%;max-width:1240px;margin:0 auto}
.hv3 .two{display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:clamp(36px,5vw,84px);align-items:center}
.hv3 h2{margin:0;font:400 clamp(40px,4.6vw,66px)/1.06 var(--serif);text-wrap:balance}
.hv3 .sub2{margin:16px 0 0;font:italic 400 clamp(25px,2.3vw,32px)/1.25 var(--serif);color:var(--soft)}
.hv3 .body{margin:22px 0 0;max-width:30em;font:400 clamp(20px,1.6vw,23px)/1.6 var(--serif);color:var(--ink);text-wrap:pretty}
.hv3 .center{text-align:center}
.hv3 .center h2{max-width:16em;margin:0 auto}
.hv3 .center .body{margin:28px auto 0;max-width:32em}
.hv3 .mv{opacity:0;transition:opacity 1.3s ease,transform 1.6s cubic-bezier(.16,.8,.2,1)}
.hv3 .mv.l{transform:translateX(-70px)}
.hv3 .mv.r{transform:translateX(70px)}
.hv3 .mv.g{transform:scale(.82)}
.hv3 .mv.in{opacity:1;transform:none}
.hv3 .soft{opacity:0;transform:translateY(16px);transition:opacity 1.4s ease .35s,transform 1.6s cubic-bezier(.2,.7,.2,1) .35s}
.hv3 .soft.in{opacity:1;transform:none}
.hv3 .video{position:relative;width:100%;max-width:1100px;margin:0 auto;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:#1a1a1a url(/home/charcoal-grain.png);background-size:512px;box-shadow:0 40px 80px -46px rgba(31,28,24,.5)}
.hv3 .video .play{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border:1px solid var(--gold);border-radius:50%}
.hv3 .video .play::after{content:"";position:absolute;left:31px;top:25px;border-left:18px solid var(--gold);border-top:13px solid transparent;border-bottom:13px solid transparent;opacity:.9}
.hv3 .ctl{margin-top:30px;display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 28px}
.hv3 .ctl input[type=text]{width:min(300px,100%);border:0;border-bottom:1px solid var(--golddeep);background:transparent;padding:6px 0 8px;font:400 26px/1.2 var(--serif);color:var(--golddeep);caret-color:var(--gold)}
.hv3 .ctl input[type=text]::placeholder{color:rgba(140,112,64,.6)}
.hv3 .ctl input[type=text]:focus{outline:none;border-bottom-width:2px;padding-bottom:7px}
.hv3 .up{font:400 16px var(--mono);border-bottom:1px solid var(--gold);padding-bottom:2px;cursor:pointer;color:var(--soft)}
.hv3 .fn{flex-basis:100%;font:400 13px var(--mono);color:var(--soft);word-break:break-all;min-height:1em}
.hv3 .pv{position:relative;width:640px;height:640px;transform-origin:top left}
.hv3 .pvw{width:100%;overflow:hidden}
.hv3 .bk{position:absolute;left:0;top:10px;width:290px;height:600px;border-radius:30px;background:#FAFAFA;box-shadow:0 0 0 7px #1d1d1d,0 0 0 8px #3a3a3a,0 40px 70px -30px rgba(31,28,24,.45);overflow:hidden;color:#2A2522;font-family:var(--serif)}
.hv3 .bk .hero{position:relative;height:215px;background:#e7e3dd;display:grid;place-items:center}
.hv3 .bk .hero .ini{font-size:70px;color:#9a9188;letter-spacing:.02em}
.hv3 .bk .hero img{display:none;max-width:62%;max-height:42%;object-fit:contain}
.hv3 .has-logo .bk .hero .ini{display:none}
.hv3 .has-logo .bk .hero img{display:block;animation:dock 1s cubic-bezier(.2,.7,.2,1)}
.hv3 .bk .fade{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 58%,#FAFAFA 99%)}
.hv3 .bk .in{padding:0 22px;text-align:center}
.hv3 .bk .nm{margin:-4px 0 0;position:relative;font-size:24px;letter-spacing:.06em;text-transform:uppercase;line-height:1.05}
.hv3 .bk .ttl{margin:6px 0 0;font-size:9px;letter-spacing:.2em;color:#8a8279;text-transform:uppercase;font-family:var(--serif)}
.hv3 .bk .t1i{margin:12px 0 0;font-size:18px;color:#6b6259;font-style:italic;line-height:1}
.hv3 .bk .t2i{margin:3px 0 0;font-size:20px;line-height:1.1}
.hv3 .bk .bts{margin-top:18px;display:flex;flex-direction:column;gap:9px}
.hv3 .bk .bt{border:1px solid #2A2522;border-radius:14px;padding:9px 12px;display:flex;flex-direction:column;align-items:center;gap:2px}
.hv3 .bk .bt.main{border-width:1.5px}
.hv3 .bk .bt b{font-weight:400;font-size:15px;line-height:1.2}
.hv3 .bk .bt span{font-size:11.5px;color:#8a8279}
.hv3 .su{position:absolute;right:0;bottom:0;width:420px;background:#FCFAF6;border-radius:18px;padding:26px 28px 26px;box-shadow:0 1px 2px rgba(31,28,24,.04),0 40px 80px -36px rgba(31,28,24,.35)}
.hv3 .sh{display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid rgba(194,164,107,.5)}
.hv3 .sini{width:36px;height:36px;border-radius:50%;border:1px solid var(--gold);display:grid;place-items:center;font:400 14px var(--serif);letter-spacing:1px;flex:none}
.hv3 .slogo{display:none;height:32px;width:auto;max-width:110px;object-fit:contain;flex:none}
.hv3 .has-logo .sini{display:none}
.hv3 .has-logo .slogo{display:block;animation:dock 1s cubic-bezier(.2,.7,.2,1)}
@keyframes dock{from{opacity:0;transform:translateY(-12px) scale(.94)}to{opacity:1;transform:none}}
.hv3 .who b{display:block;font:400 17px/1.2 var(--serif)}
.hv3 .who small{display:block;font:400 11px/1.4 var(--mono);color:var(--soft)}
.hv3 .hello{margin:18px 0 0;font:400 23px/1.2 var(--serif)}
.hv3 .hello .nmg{color:var(--gold);border-bottom:1px solid rgba(194,164,107,.5)}
.hv3 .trk{margin-top:18px;display:flex;align-items:flex-start;gap:8px}
.hv3 .st{display:flex;flex-direction:column;align-items:center;gap:7px;flex:none}
.hv3 .st:first-child{align-items:flex-start}
.hv3 .st:last-child{align-items:flex-end}
.hv3 .dot{height:11px;display:flex;align-items:center}
.hv3 .dot i{width:6px;height:6px;border-radius:50%;background:var(--gold)}
.hv3 .dot .ring{width:11px;height:11px;border:1px solid var(--gold);background:none;display:grid;place-items:center}
.hv3 .dot .ring::after{content:"";width:4px;height:4px;border-radius:50%;background:var(--gold)}
.hv3 .dot .todo{background:none;border:1px solid rgba(31,28,24,.3)}
.hv3 .lb{font:400 13px var(--serif);color:var(--soft);white-space:nowrap}
.hv3 .lb.now{font-style:italic;color:var(--ink)}
.hv3 .ln{flex:1;height:1px;margin-top:5px;background:rgba(31,28,24,.15)}
.hv3 .ln.done{background:var(--gold)}
.hv3 .note{margin-top:18px;padding-top:16px;border-top:1px solid var(--hair);display:flex;gap:12px}
.hv3 .dd{width:28px;height:28px;border-radius:50%;border:1px solid var(--gold);display:grid;place-items:center;font:400 14px var(--serif);color:var(--golddeep);flex:none}
.hv3 .note p{margin:0;font:400 12.5px/1.6 var(--mono);color:var(--soft)}
.hv3 .sig{margin-top:4px;font:italic 400 14px var(--serif);color:var(--soft)}
.hv3 .chat{width:100%;max-width:540px;margin-left:auto;background:#FCFAF6;border-radius:18px;padding:24px 26px 28px;box-shadow:0 1px 2px rgba(31,28,24,.04),0 40px 80px -36px rgba(31,28,24,.35)}
.hv3 .chat .hd{display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--hair);font:400 20px var(--serif)}
.hv3 .chat .hd small{display:block;font:400 12px var(--mono);color:var(--soft)}
.hv3 .msg{margin-top:16px;display:flex;gap:10px;font:400 15px/1.6 var(--mono);color:var(--soft);opacity:0;transform:translateY(8px);transition:opacity .9s ease,transform 1s ease}
.hv3 .msg.show{opacity:1;transform:none}
.hv3 .draft{margin-top:10px;border:1px solid rgba(194,164,107,.55);border-radius:12px;padding:12px 14px;font-size:14px}
.hv3 .draft small{display:block;font-size:12px;color:#8a8279;margin-bottom:4px}
.hv3 .appr{display:inline-block;margin-top:12px;border-radius:999px;background:var(--ink);color:var(--paper);padding:8px 18px;font:400 13px var(--mono);transition:transform .25s,background .4s}
.hv3 .appr.tap{transform:scale(.94);background:#4a4238}
.hv3 .sent{color:var(--golddeep)}
.hv3 .room{height:40vh;position:relative;z-index:2;background:var(--paper) url(/home/marvberry-paper-texture.png);background-size:512px}
.hv3 footer{position:relative;z-index:2;background:var(--paper) url(/home/marvberry-paper-texture.png);background-size:512px;padding:40px 20px 56px;text-align:center;font:400 15px var(--mono);color:var(--soft);border-top:1px solid var(--hair)}
.hv3 footer a{text-decoration:none;margin:0 14px}
.hv3 footer a:hover{color:var(--ink)}
@media(max-width:860px){.hv3{--bar:52px;--menu:46px}
.hv3 .two{grid-template-columns:minmax(0,1fr);gap:34px}
.hv3 .chat{margin:0 auto}
.hv3 .hin{padding:10vh 30px 20vh}
.hv3 .art{inset:0;-webkit-mask-image:linear-gradient(to bottom,transparent 52%,rgba(0,0,0,.7) 68%,#000 80%);mask-image:linear-gradient(to bottom,transparent 52%,rgba(0,0,0,.7) 68%,#000 80%);opacity:.95}
.hv3 .hh{font-size:clamp(34px,9vw,44px)}
.hv3 .hs{font-size:15px;max-width:22em}
.hv3 .house{font-size:9px;letter-spacing:.36em;top:calc(34px + 96px * 262 / 1360 + 12px)}
.hv3 .wm{width:96px;top:34px}
.hv3 .sheet{padding:40px 22px 48px}
.hv3 h2{font-size:clamp(34px,8.6vw,42px)}
.hv3 .sub2{font-size:24px}
.hv3 .body{font-size:19px}
.hv3 .menu button,.hv3 .menu a{font-size:14px}
.hv3 footer a{display:inline-block;margin:6px 10px}}
@media(prefers-reduced-motion:reduce){.hv3 *{animation:none!important;transition:none!important}
.hv3 .fadeup,.hv3 .mv,.hv3 .soft,.hv3 .msg{opacity:1;transform:none}
.hv3 .gl{transform:scaleX(1)}}
/* the menu: only the private fitting for now */
.hv3 .menu{justify-content:flex-end}
/* 3 the client journey: the video fills its half edge to edge; the words take the other half */
.hv3 #s3{padding:0}
.hv3 .cj{width:100%;display:grid;grid-template-columns:1fr 1fr;min-height:calc(100svh - var(--bar) - var(--menu))}
.hv3 .cjv{position:relative;overflow:hidden;background:#d9d2c6}
.hv3 .cjv video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:49% 50%;display:block}
.hv3 .cjc{display:flex;flex-direction:column;justify-content:center;padding:clamp(48px,7vw,120px) clamp(32px,6vw,110px)}
.hv3 .cjc .body{max-width:30ch}
/* 4 the card builder */
.hv3 .two4{display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);grid-template-areas:"copy pv";column-gap:clamp(36px,5vw,84px);align-items:center}
.hv3 .two4 .copy{grid-area:copy}.hv3 .two4 .pvw{grid-area:pv}
/* the builder: one step at a time, in the same spot, sliding in like a turned page */
.hv3 .stage{min-height:360px;display:flex;flex-direction:column;justify-content:center;animation:hv3page .55s cubic-bezier(.2,.7,.2,1) both}
@keyframes hv3page{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}
.hv3 .stage .go{align-self:flex-start;margin-top:30px;background:var(--ink);color:var(--paper);border:0;border-radius:0;padding:16px 38px;min-height:48px;font:400 15px var(--mono);letter-spacing:.04em;cursor:pointer;transition:background .4s}
.hv3 .stage .go:hover{background:#3a342c}.hv3 .stage .go:disabled{opacity:.4;cursor:default}
.hv3 .prog{display:flex;align-items:center;gap:14px;font:400 13px var(--mono);color:var(--soft);margin-bottom:26px}
.hv3 .prog i{flex:1;max-width:180px;height:1px;background:var(--hair);position:relative}
.hv3 .prog b{position:absolute;left:0;top:0;bottom:0;background:var(--golddeep);transition:width .6s cubic-bezier(.2,.7,.2,1)}
.hv3 .sh3{margin:0;font:400 clamp(30px,3vw,44px)/1.1 var(--serif);color:var(--ink)}
.hv3 .hint{margin:12px 0 0;font:400 15px/1.5 var(--mono);color:var(--soft)}
.hv3 .fields{display:grid;gap:18px;margin-top:28px;max-width:420px}
.hv3 .fields input,.hv3 .claim input{width:100%;border:0;border-bottom:1px solid rgba(31,28,24,.3);background:transparent;padding:6px 0 8px;font:400 22px/1.2 var(--serif);color:var(--ink);border-radius:0}
.hv3 .fields input:focus,.hv3 .claim input:focus{outline:none;border-bottom-color:var(--golddeep)}
.hv3 .fields input::placeholder,.hv3 .claim input::placeholder{color:rgba(74,69,62,.55)}
.hv3 .kind{display:flex;gap:24px;margin:26px 0 22px}
.hv3 .kind button{border:0;background:none;padding:0 0 4px;font:400 16px var(--mono);color:var(--soft);cursor:pointer;border-bottom:1px solid transparent}
.hv3 .kind button.on{color:var(--ink);border-bottom-color:var(--golddeep)}
.hv3 .stage .up{align-self:flex-start}
.hv3 .stage .fn{margin:10px 0 0;font:400 13px var(--mono);color:var(--soft);min-height:1.4em}
.hv3 .nav{display:flex;align-items:center;gap:26px;margin-top:34px}
.hv3 .nav .go{margin-top:0}
.hv3 .nav .back{border:0;background:none;padding:0 0 2px;font:400 15px var(--mono);color:var(--soft);cursor:pointer;border-bottom:1px solid var(--gold)}
.hv3 .claim{display:grid;gap:18px;max-width:420px}
.hv3 .claim .sh3{margin-bottom:10px}
.hv3 .claim .go{margin-top:10px}
.hv3 .claim .fine{margin:0;font:400 13px/1.6 var(--mono);color:var(--soft)}
.hv3 .claim .err{margin:0;font:400 14px/1.5 var(--mono);color:#8a2a1f}
.hv3 .claim + .nav{margin-top:20px}
.hv3 .sw{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:22px}
.hv3 .sw .l{font:400 16px var(--mono);color:var(--soft);margin-right:4px}
.hv3 .sw button{width:22px;height:22px;border:1px solid rgba(31,28,24,.12);border-radius:0;padding:0;cursor:pointer}
.hv3 .sw button.on{box-shadow:0 0 0 2px var(--paper),0 0 0 3px var(--golddeep)}
.hv3 .sw .cu{position:relative;font:400 14px var(--mono);color:var(--soft);border-bottom:1px solid var(--gold);padding-bottom:1px;cursor:pointer}
.hv3 .sw .cu input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.hv3 .bk .hero{overflow:hidden}
/* her card in her colour: the main button, the gold lines, the chosen date and time */
.hv3 .bk .bt.main{background:var(--ac);border-color:var(--ac);color:var(--on);transition:background-color .5s,border-color .5s,color .5s}
.hv3 .bk .bt.main span{color:var(--on);opacity:.75}
.hv3 .bk .blogo{display:block;height:20px;width:auto;max-width:130px;object-fit:contain;margin:4px auto 12px}
.hv3 .bk .in .nm::after{content:"";display:block;width:34px;height:1px;background:var(--ac);margin:10px auto 0;transition:background-color .5s}
.hv3 .b2{left:340px;top:30px;padding:22px 20px 0;display:flex;flex-direction:column}
.hv3 .b2 .tt{display:flex;align-items:center;gap:10px;height:22px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#2A2522}
.hv3 .b2 .bk-back{font-size:18px;color:#8a8279;line-height:1}
.hv3 .b2 .tlogo{height:16px;width:auto;max-width:120px;object-fit:contain}
.hv3 .b2 .th{margin:22px 0 0;font-size:25px;line-height:1.08}
.hv3 .b2 .tsub{margin:6px 0 0;font-size:13px;font-style:italic;color:#8a8279}
.hv3 .b2 .tmo{margin:20px 0 0;font-size:12px;font-style:italic;color:#8a8279}
.hv3 .b2 .tdays{margin-top:6px;display:flex;justify-content:space-between}
.hv3 .b2 .tdays span{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 6px 7px;color:#8a8279}
.hv3 .b2 .tdays small{font-size:10px}
.hv3 .b2 .tdays b{font-weight:400;font-size:19px;color:#2A2522;line-height:1.1}
.hv3 .b2 .tdays .on::after,.hv3 .b2 .ttimes .on::after{content:"";position:absolute;left:22%;right:22%;bottom:0;height:1px;background:var(--ac);transition:background-color .5s}
.hv3 .b2 .tday{margin:18px 0 0;font-size:13px;font-style:italic;color:#8a8279}
.hv3 .b2 .ttimes{margin-top:6px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px 6px}
.hv3 .b2 .ttimes span{position:relative;text-align:center;padding:8px 0 8px;font-size:14px;color:#2A2522}
.hv3 .b2 .ttimes .on{font-weight:600}
.hv3 .b2 .tgo{margin-top:auto;margin-bottom:22px;background:var(--ac);color:var(--on);text-align:center;padding:11px 0;font-size:15px;transition:background-color .5s,color .5s}
.hv3 .bk .hero img.ph{display:block;position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;object-position:center 22%;animation:none}
/* 5 Diana: a still of her chat panel */
.hv3 .dstill{display:block;width:100%;max-width:540px;height:auto;margin-left:auto}
.hv3 .try{display:inline-block;margin-top:30px;background:var(--ink);color:var(--paper);padding:16px 38px;min-height:48px;font:400 15px var(--mono);letter-spacing:.04em;text-decoration:none;transition:background .4s}
.hv3 .try:hover{background:#3a342c}
/* 6 luxury image */
.hv3 .lux{display:block;width:100%;height:auto;margin:clamp(34px,5vh,60px) auto 0;max-width:1240px}
@media(max-width:860px){
  .hv3 .sheet{position:relative;top:auto;box-shadow:none}
  .hv3 .two4{grid-template-columns:minmax(0,1fr);grid-template-areas:"pv" "copy";row-gap:22px}
  .hv3 #s4{padding-top:24px;padding-bottom:24px}
  .hv3 #s4 .pvw{max-width:300px;margin:0 auto}
  .hv3 .stage{min-height:330px;justify-content:flex-start}
  .hv3 .stage .go{padding:14px 32px}
  .hv3 .claim .sh3{margin-bottom:2px}
  .hv3 .claim input,.hv3 .fields input{font-size:20px}
  .hv3 .sh3{font-size:30px}
  .hv3 .prog{margin-bottom:16px}
  .hv3 .fields,.hv3 .claim{gap:14px}
  .hv3 .nav{margin-top:24px}
  .hv3 .cj{grid-template-columns:1fr;min-height:0}
  .hv3 .cjv{aspect-ratio:4/5}
  .hv3 .cjc{padding:44px 24px 64px}
  .hv3 .dstill{margin:0 auto}
}
`
