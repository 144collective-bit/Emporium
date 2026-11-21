import{Ki as e,Ri as t}from"./solids.BTgpSVA4.js";import{a as n,o as r}from"./ui.DBGpOf18.js";var i={style:`brawler`,styles:[`brawler`],wins:0,losses:0,kos:0,bestChain:0,bouts:0,spars:0,bots:{},partners:{}},a=e=>e.fight??i,o=e=>{let t=Math.max(0,Math.ceil(e));return`${Math.floor(t/60)}:${String(t%60).padStart(2,`0`)}`},s=e=>`${r.format(e)} time${e===1?``:`s`}`,c=`<span class="race-none">Not beaten yet</span>`;function l(e,t){let n=e.bots[t];return!n||n.beaten<=0?c:`Beaten ${s(n.beaten)}${n.bestSeconds!==null&&n.bestSeconds!==void 0?` · best ${o(n.bestSeconds)}`:``}`}function u(e){return`  <div><dt>Wins</dt><dd>${r.format(e.wins)}</dd></div>
  <div><dt>Losses</dt><dd>${r.format(e.losses)}</dd></div>
  <div><dt>Knock-outs</dt><dd>${r.format(e.kos)}</dd></div>
  <div><dt>Best chain</dt><dd>${e.bestChain>0?`${e.bestChain} hits`:`<span class="race-none">—</span>`}</dd></div>`}var d=r=>t.map(t=>`  <div class="fight-record-bot"><dt>${n(e[t].name)}</dt><dd>${l(r,t)}</dd></div>`).join(`
`);function f(e){let t=a(e);return`<p class="fight-records-head">Your record</p>
<dl class="race-meta fight-records">
${u(t)}
${d(t)}
</dl>`}export{a,u as i,d as n,f as o,o as r,s,l as t};