import{a as e}from"./vehicleids.D6Ql0F6P.js";import{Bs as t,zs as n}from"./solids.BTgpSVA4.js";import{fn as r,tn as i}from"./tycoon.BI847hOr.js";import{n as a,t as o}from"./kart-cups.BXR7TEMg.js";import{a as s,i as c,o as l}from"./ui.DBGpOf18.js";var u=(e=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`)(`<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M9 20h6l-.5-3h-5z"/>`),d=e=>e===1?`st`:e===2?`nd`:e===3?`rd`:`th`,f=e=>`${e}${d(e)}`,p=e=>{let t=n[e];return`${s(t.name.replace(` · reverse`,``))}${t.reverse?`<i class="kart-rev">rev</i>`:``}`},m=`<span class="race-none">No time yet</span>`;function h(e){let t=a.filter(t=>e.karts.trophies[t]);return t.length?t.map(t=>`<span class="kart-trophy is-${e.karts.trophies[t]}">${u}${s(o[t].name)} ${f(e.karts.trophies[t])}</span>`).join(``):`<span class="race-none">None yet</span>`}function g(e){let t=e.counters;return`  <div><dt>Kart races</dt><dd>${l.format(t.kartRaces)}</dd></div>
  <div><dt>Podiums</dt><dd>${l.format(t.podiums)}</dd></div>
  <div><dt>Wins</dt><dd>${l.format(t.kartWins)}</dd></div>
  <div><dt>Clean laps</dt><dd>${l.format(t.cleanLaps)}</dd></div>
  <div><dt>Overtakes</dt><dd>${l.format(t.overtakes)}</dd></div>`}function _(n){let a=e.filter(e=>i(n,e)).length,o=e=>{let t=n.karts.records[r(e,`sport`)];return t===void 0?m:c(t.lap)};return`<p class="kart-records-head">Best laps · Sport class</p>
<dl class="race-meta kart-records">
${t.map(e=>`  <div class="kart-record-time"><dt>${p(e)}</dt><dd>${o(e)}</dd></div>`).join(`
`)}
  <div class="kart-record-wide"><dt>Trophies</dt><dd class="kart-trophies">${h(n)}</dd></div>
${g(n)}
  <div><dt>Karts</dt><dd>${a} of ${e.length}</dd></div>
</dl>`}export{_ as a,h as c,p as i,u as n,d as o,g as r,f as s,m as t};