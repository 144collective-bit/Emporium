/*
 * The aircraft far off on phones (docs/phone-far-plan.md Phase 2; aircraft.ts `createFleet()` loads it the first time a
 * fleet has one far off, so the boot doesn't carry it): each model in one piece and the far pieces' material.
 * Tested in tests/aircraftfar.test.ts.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nightU, toon } from './kit';
import { surfaceMatrix } from './airframe';
import { GREY, INK, WHITE, clean, type AircraftModel, type Role } from './aircraft';

/** The nav lights' and the beacon's brightness by day and at night (their neon's, `materials()`) */
const LIT: Partial<Record<Role, [number, number]>> = { neon: [0.35, 2.4], strobe: [0.6, 2.4] };

/**
 * A model in one piece, for far off: its body, livery, nav lights and beacon, the control surfaces at rest and the
 * spinners' blades merged; per vertex its colour, how much of the aircraft's livery it takes (`accent`) and its glow
 * (the lights', between their day and night brightness: `glow` and `glowLit`, as the places' far forms have). The
 * gear (folded away in flight) and the titles are left out. Made once a model
 */
const FAR_GEO = new WeakMap<AircraftModel, THREE.BufferGeometry>();
export function farGeometry(model: AircraftModel) {
  const hit = FAR_GEO.get(model);
  if (hit) return hit;
  const list: THREE.BufferGeometry[] = [];
  const put = (g: THREE.BufferGeometry, color: THREE.Color | null, accent: number, lit?: [number, number]) => {
    // (a copy: the near parts' geometry stays as it is)
    const n = clean(g.clone(), false, !color);
    const k = n.attributes.position.count;
    const col = new Float32Array(k * 3);
    const glow = new Float32Array(k * 3);
    const glowLit = new Float32Array(k * 2);
    for (let i = 0; i < k; i++) {
      const c = color ?? new THREE.Color().fromBufferAttribute(n.attributes.color as THREE.BufferAttribute, i);
      // (a light: no colour of its own lit by the sun, only its glow)
      (lit ? INK : c).toArray(col, i * 3);
      if (lit) {
        c.toArray(glow, i * 3);
        glowLit.set(lit, i * 2);
      }
    }
    n.setAttribute('color', new THREE.BufferAttribute(col, 3));
    n.setAttribute('accent', new THREE.BufferAttribute(new Float32Array(k).fill(accent), 1));
    n.setAttribute('glow', new THREE.BufferAttribute(glow, 3));
    n.setAttribute('glowLit', new THREE.BufferAttribute(glowLit, 2));
    list.push(n);
  };
  for (const p of model.parts) {
    if (p.role === 'gear' || p.role === 'decal') continue;
    put(p.geo, p.role === 'accent' ? WHITE : null, p.role === 'accent' ? 1 : 0, LIT[p.role]);
  }
  const T0 = new THREE.Matrix4();
  for (const f of model.frames) put(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0).applyMatrix4(surfaceMatrix(f, 0, T0)), f.paint === 'accent' ? WHITE : f.paint === 'grey' ? GREY : WHITE, f.paint === 'accent' ? 1 : 0);
  for (const sp of model.spinners) put(sp.blades, null, 0);
  const geo = mergeGeometries(list, false)!;
  FAR_GEO.set(model, geo);
  return geo;
}

/** The far pieces' one material: toon shading coloured per vertex, the livery's colour where `accent` is, the lights' glow following the night */
let farMat: THREE.MeshToonMaterial | null = null;
export function farMaterial() {
  if (farMat) return farMat;
  const m = toon('#ffffff', { vertexColors: true, name: 'aircraft-far' });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float accent;\nattribute vec3 glow;\nattribute vec2 glowLit;\nuniform float uNight;\nvarying vec3 vGlow;')
      .replace('#include <color_vertex>', 'vColor = vec4(color, 1.0);\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb *= mix(vec3(1.0), instanceColor.rgb, accent);\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow * mix(glowLit.x, glowLit.y, uNight);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;');
  };
  m.customProgramCacheKey = () => 'aircraft-far';
  return (farMat = m);
}

