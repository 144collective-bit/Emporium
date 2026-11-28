import{et as e,m as t,o as n,s as r}from"./three.sr-vEXge.js";import{A as i,K as a,X as o}from"./kit.NZuBMmgG.js";import{i as s,n as c,o as l,r as u,t as d}from"./aircraft.Bk8IzHqh.js";var f={neon:[.35,2.4],strobe:[.6,2.4]},p=new WeakMap;function m(i){let a=p.get(i);if(a)return a;let m=[],h=(e,n,i,a)=>{let o=s(e.clone(),!1,!n),l=o.attributes.position.count,u=new Float32Array(l*3),d=new Float32Array(l*3),f=new Float32Array(l*2);for(let e=0;e<l;e++){let r=n??new t().fromBufferAttribute(o.attributes.color,e);(a?c:r).toArray(u,e*3),a&&(r.toArray(d,e*3),f.set(a,e*2))}o.setAttribute(`color`,new r(u,3)),o.setAttribute(`accent`,new r(new Float32Array(l).fill(i),1)),o.setAttribute(`glow`,new r(d,3)),o.setAttribute(`glowLit`,new r(f,2)),m.push(o)};for(let e of i.parts)e.role!==`gear`&&e.role!==`decal`&&h(e.geo,e.role===`accent`?u:null,+(e.role===`accent`),f[e.role]);let g=new e;for(let e of i.frames)h(new n(1,1,1).translate(.5,0,0).applyMatrix4(l(e,0,g)),e.paint===`accent`?u:e.paint===`grey`?d:u,+(e.paint===`accent`));for(let e of i.spinners)h(e.blades,null,0);let _=o(m,!1);return p.set(i,_),_}var h=null;function g(){if(h)return h;let e=a(`#ffffff`,{vertexColors:!0,name:`aircraft-far`});return e.onBeforeCompile=e=>{e.uniforms.uNight=i,e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
attribute float accent;
attribute vec3 glow;
attribute vec2 glowLit;
uniform float uNight;
varying vec3 vGlow;`).replace(`#include <color_vertex>`,`vColor = vec4(color, 1.0);
#ifdef USE_INSTANCING_COLOR
vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, accent);
#endif`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vGlow = glow * mix(glowLit.x, glowLit.y, uNight);`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
varying vec3 vGlow;`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
totalEmissiveRadiance += vGlow;`)},e.customProgramCacheKey=()=>`aircraft-far`,h=e}export{m as farGeometry,g as farMaterial};