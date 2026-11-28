import{a as e}from"./vehicleids.D6Ql0F6P.js";import{ls as t,us as n,xs as r}from"./solids.3QfOTosb.js";import{n as i,t as a}from"./kart-cups.BXR7TEMg.js";import{un as o,xn as s}from"./tycoon.BdtIuybJ.js";import{a as c,i as l,o as u}from"./ui.DBGpOf18.js";var d=[-585,138.7,-410,342],f={on:!1,surfaceAt:null,wall:null},p=e=>new URLSearchParams(e).get(`karts`)===`new`,m=(e=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`)(`<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M9 20h6l-.5-3h-5z"/>`),h=e=>e===1?`st`:e===2?`nd`:e===3?`rd`:`th`,g=e=>`${e}${h(e)}`,_=e=>{let n=e===`riverside`||e===`riverside-reverse`?{name:r,reverse:e===`riverside-reverse`}:t[e];return`${c(n.name.replace(` · reverse`,``))}${n.reverse?`<i class="kart-rev">rev</i>`:``}`},v=`<span class="race-none">No time yet</span>`;function y(e){let t=i.filter(t=>e.karts.trophies[t]);return t.length?t.map(t=>`<span class="kart-trophy is-${e.karts.trophies[t]}">${m}${c(a[t].name)} ${g(e.karts.trophies[t])}</span>`).join(``):`<span class="race-none">None yet</span>`}function b(e){let t=e.counters;return`  <div><dt>Kart races</dt><dd>${u.format(t.kartRaces)}</dd></div>
  <div><dt>Podiums</dt><dd>${u.format(t.podiums)}</dd></div>
  <div><dt>Wins</dt><dd>${u.format(t.kartWins)}</dd></div>
  <div><dt>Clean laps</dt><dd>${u.format(t.cleanLaps)}</dd></div>
  <div><dt>Overtakes</dt><dd>${u.format(t.overtakes)}</dd></div>`}function x(t){let r=e.filter(e=>o(t,e)).length,i=e=>{let n=t.karts.records[s(e,`sport`)];return n===void 0?v:l(n.lap)};return`<p class="kart-records-head">Best laps · Sport class</p>
<dl class="race-meta kart-records">
${n.map(e=>`  <div class="kart-record-time"><dt>${_(e)}</dt><dd>${i(e)}</dd></div>`).join(`
`)}
  <div class="kart-record-wide"><dt>Trophies</dt><dd class="kart-trophies">${y(t)}</dd></div>
${b(t)}
  <div><dt>Karts</dt><dd>${r} of ${e.length}</dd></div>
</dl>`}export{x as a,y as c,p as d,_ as i,d as l,m as n,h as o,b as r,g as s,v as t,f as u};