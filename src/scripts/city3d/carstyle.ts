/*
 * Your car dressed as the garage left it (vehicle plan Phase 5; the cars'
 * fine-detail chunk, carfine.ts, so the boot doesn't carry it): carcabin.ts's
 * `fitOut()` calls `dress()` with the look saved on the car (mycar.ts
 * `CarLook`; carlook.ts says where each part goes).
 *
 * - **Wheels:** the rim's style, colour and size in place of the model's
 *   own (`rimWheel()`): the tyre's outside where it was, so a bigger rim is
 *   a lower profile.
 * - **The kit:** the splitter, skirts, diffuser and spoiler (`kitParts()`),
 *   on the body, so they ride its springs; the paint's in the car's paint.
 *   The model's own part they replace was left out of its shell (cars.ts
 *   `build()`'s `bare`).
 * - **The livery:** one material on every painted piece (the body, both
 *   doors, the kit) working out the pattern from where each point is on the
 *   car (`liveryMat()`: a contrast roof, stripes over the top, a stripe down
 *   the sides) and, on the sides, one small texture drawn for this car
 *   (`liveTex()`, never baked): the flames, the number on the doors, the mark.
 * - **Underglow:** a pool of neon light on the ground under it and tubes
 *   under the sills, dark by day and soft at night (`neon(c, 0, 1.3)`: never
 *   blooming out), in the FX layer.
 *
 * What's made from the look alone (the wheels, the kit) is kept and shared by
 * every car of yours dressed the same; what's this car's (the livery's
 * materials and texture, the glow) goes when it does.
 */
import * as THREE from 'three';
import { BLACKOUT, Parts, carMaterials, extrude, merge, type Car } from './cars';
import type { CarSpec } from './carspec';
import { INTERIORS } from './carinside';
import { FONT_DISPLAY, fx, glowTex, lit, liveTex, neon, unlit } from './kit';
import { DIFFUSER_NAMES, GLOW_HEX, RIM_HEX, RIM_SIZE, doorPanel, isStock, kitFit, kitKey, paintOf, topOf, wheelKey } from './carlook';
import type { CarLook, PlayerCar } from './mycar';
import { MARK_ART } from './marks';

const TYRE = '#17151f';
const TRIM = '#2a2838';
const DISC = '#8e8aa3';
const SIDEWALL = '#3e3a4c';
const DARK = '#14121f';
const ROUNDEL = '#f3f2f7';

const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/* ---------- Wheels ---------- */

const wheels = new Map<string, THREE.BufferGeometry>();

/** One wheel in the look's rim (axle along z, the rim facing +z), with its disc and the ring on its sidewall */
export function rimWheel(s: CarSpec, l: CarLook, low: boolean) {
  const p = new Parts();
  const r = s.r;
  const h = s.tw / 2;
  const k = RIM_SIZE[l.rimSize];
  const shoulder = Math.max(0.86, k + 0.09);
  const prof: THREE.Vector2[] = [
    [r * k, -h],
    [r * shoulder, -h],
    [r * 0.97, -h * 0.8],
    [r, -h * 0.45],
    [r, h * 0.45],
    [r * 0.97, h * 0.8],
    [r * shoulder, h],
    [r * k, h],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  p.detail(new THREE.LatheGeometry(prof, 14).rotateX(Math.PI / 2), TYRE);
  const rim = l.rimColour === 'stock' ? (s.rim ?? '#c9c4e6') : RIM_HEX[l.rimColour];
  const face = r * (k - 0.02);
  p.detail(new THREE.CylinderGeometry(r * (k + 0.02), r * (k + 0.02), 0.012, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, h - 0.004), rim);
  p.detail(new THREE.CircleGeometry(face, 16).translate(0, 0, h - 0.015), l.rim === 'dish' ? rim : TRIM);
  // The spokes from the hub out to the rim: `n` of them, `w` wide, each turned `twist` about its own middle,
  // in pairs `pair` apart
  const spokes = (n: number, w: number, twist = 0, pair = 0) => {
    const len = face - r * 0.18;
    for (let i = 0; i < n; i++)
      for (const off of pair ? [-pair, pair] : [0])
        p.detail(
          new THREE.BoxGeometry(len, w, 0.016)
            .rotateZ(twist)
            .translate(r * 0.18 + len / 2, 0, 0)
            .rotateZ((i / n) * Math.PI * 2 + off)
            .translate(0, 0, h - 0.008),
          rim
        );
  };
  if (l.rim === 'stock') {
    if (s.spokes !== 0) spokes(s.spokes ?? 5, r * 0.13);
  } else if (l.rim === 'five') spokes(5, r * 0.15);
  else if (l.rim === 'mesh') {
    spokes(14, r * 0.035);
    p.detail(new THREE.RingGeometry(face * 0.62, face * 0.68, 20).translate(0, 0, h - 0.0005), rim);
  } else if (l.rim === 'turbine') spokes(10, r * 0.07, 0.45);
  else if (l.rim === 'split') spokes(6, r * 0.05, 0, 0.11);
  else {
    // The dish: a flat face with a ring of holes in it
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.detail(new THREE.CircleGeometry(r * 0.07, 8).translate(Math.cos(a) * face * 0.62, Math.sin(a) * face * 0.62, h - 0.009), TRIM);
    }
  }
  p.detail(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.03, 8).rotateX(Math.PI / 2).translate(0, 0, h), rim);
  p.detail(new THREE.CylinderGeometry(r * 0.09, r * 0.09, 0.03, 6).rotateX(Math.PI / 2).translate(0, 0, h + 0.012), TRIM);
  // The disc behind the spokes (5.5 mm in front of the rim's dark face), the ring on the sidewall
  p.detail(new THREE.RingGeometry(r * 0.2, Math.min(r * 0.5, face * 0.8), 12).translate(0, 0, h - 0.0095), DISC);
  if (!low) p.detail(new THREE.RingGeometry(r * ((k + 1) / 2 - 0.025), r * ((k + 1) / 2 + 0.025), 16).translate(0, 0, h + 0.006), SIDEWALL);
  return merge(p.details, true)!;
}

/* ---------- The kit ---------- */

const kits = new Map<string, { paint: THREE.BufferGeometry | null; detail: THREE.BufferGeometry | null }>();

/** The look's splitter, skirts, diffuser and spoiler on a model: what's in the car's paint, and what's coloured */
export function kitParts(s: CarSpec, l: CarLook) {
  const p = new Parts();
  const f = kitFit(s);
  // The splitter: a dark blade under the nose (the race one wider and longer, with end plates)
  if (l.splitter !== 'stock') {
    const { x, y, w } = f.splitter;
    const race = l.splitter === 'race';
    const len = race ? 0.22 : 0.15;
    const wide = race ? w + 0.06 : w;
    p.detail(box(len, 0.02, wide, x - 0.08 + len / 2, y - 0.007, 0), BLACKOUT);
    if (race) for (const z of [-1, 1]) p.detail(box(len - 0.06, 0.045, 0.016, x - 0.07 + len / 2, y + 0.016, z * (wide / 2 - 0.008)), BLACKOUT);
  }
  // The skirts: painted, along each side between the arches, a dark edge under them
  if (l.skirts !== 'stock') {
    const { x0, x1, y0, y1, z } = f.skirts;
    for (const side of [-1, 1]) {
      p.paint(box(x1 - x0, y1 - y0, 0.05, (x0 + x1) / 2, (y0 + y1) / 2, side * (z - 0.025)));
      p.detail(box(x1 - x0 + 0.01, 0.012, 0.056, (x0 + x1) / 2, y0 - 0.004, side * (z - 0.025)), BLACKOUT);
    }
  }
  // The diffuser: a dark plate under the tail with fins standing down from it
  if (l.diffuser !== 'stock' && DIFFUSER_NAMES[l.diffuser]) {
    const { x, y, w } = f.diffuser;
    p.detail(box(0.2, 0.02, w, x + 0.02, y, 0), BLACKOUT);
    for (let i = 0; i < 5; i++) p.detail(box(0.18, 0.07, 0.014, x + 0.01, y - 0.035, (i / 4 - 0.5) * w * 0.86), BLACKOUT);
  }
  // The spoiler: on the boot's deck, or at the roof's back edge
  const sp = f.spoiler;
  const roof = sp.mode === 'roof';
  if (l.spoiler === 'lip') p.paint(box(roof ? 0.18 : 0.13, 0.03, sp.w * 0.92, roof ? sp.x - 0.04 : sp.x - 0.01, sp.y + 0.012, 0));
  else if (l.spoiler === 'duck') {
    // An upswept wedge across the back (its foot just inside the deck, so it never floats)
    const x0 = sp.x + (roof ? 0.06 : 0.12);
    const x1 = sp.x - (roof ? 0.14 : 0.1);
    const y = sp.y - 0.012;
    const wedge = new THREE.Shape([new THREE.Vector2(x0, y), new THREE.Vector2(x1, y), new THREE.Vector2(x1 - 0.02, y + 0.085), new THREE.Vector2(x1 + 0.03, y + 0.09)]);
    p.paint(extrude(wedge, sp.w * 0.94, 0.01));
  } else if (l.spoiler === 'wing') {
    // An aerofoil on two posts, with end plates
    const up = roof ? 0.09 : 0.17;
    const x = roof ? sp.x - 0.06 : sp.x + 0.02;
    p.paint(box(0.24, 0.032, sp.w, x, sp.y + up, 0));
    for (const z of [-1, 1]) {
      p.detail(box(0.27, 0.11, 0.02, x, sp.y + up - 0.01, z * (sp.w / 2 + 0.01)), TRIM);
      p.detail(box(0.045, up + 0.02, 0.035, x + 0.02, sp.y + up / 2 - 0.02, z * sp.w * 0.3), TRIM);
    }
  }
  return { paint: merge(p.paints, false), detail: merge(p.details, true) };
}

/* ---------- The livery ---------- */

const PATTERN: Record<CarLook['livery'], number> = { none: 0, twotone: 1, stripes: 2, side: 3, flames: 0 };

/** The sides' texture: the right side in the top half, the left in the bottom (each with the nose towards the front) */
function sidesTexture(s: CarSpec, l: CarLook, y0: number, H: number) {
  const W = 512;
  const R = 128;
  const half = s.L / 2;
  const accent = paintOf(l.accent);
  return liveTex(W, R * 2, (c) => {
    c.clearRect(0, 0, W, R * 2);
    for (const row of [0, 1]) {
      // (car x, y to the canvas: the viewer's left to right along the side)
      const px = (x: number) => (row === 0 ? 0.5 + x / s.L : 0.5 - x / s.L) * W;
      const py = (y: number) => row * R + (1 - (y - y0) / H) * R;
      const kx = W / s.L;
      const ky = R / H;
      if (l.livery === 'flames') {
        // Flames licking back from the nose along the body: five tongues, each a teardrop from the nose to its tip,
        // the outer ones in the accent outlined in ink, smaller ones in a pale yellow inside them
        const tongues: [number, number][] = [
          [0.42, 0.24],
          [0.58, 0.4],
          [0.5, 0.56],
          [0.66, 0.68],
          [0.38, 0.8],
        ];
        for (const [scale, fill, ink] of [
          [1, accent, true],
          [0.45, '#fff1a8', false],
        ] as const) {
          for (const [len, yt] of tongues) {
            const base = half + 0.02;
            const tip = base - s.L * len * scale;
            const ym = y0 + H * yt;
            const fat = H * (scale < 1 ? 0.06 : 0.13);
            c.beginPath();
            c.moveTo(px(base), py(ym - fat));
            c.bezierCurveTo(px(base - s.L * len * scale * 0.5), py(ym - fat * 1.1), px(tip + s.L * 0.08), py(ym - fat * 0.2), px(tip), py(ym + fat * 0.5));
            c.bezierCurveTo(px(tip + s.L * 0.12 * scale), py(ym + fat * 0.6), px(base - s.L * len * scale * 0.35), py(ym + fat * 1.2), px(base), py(ym + fat));
            c.closePath();
            c.fillStyle = fill;
            c.fill();
            if (ink) {
              c.lineWidth = 3;
              c.strokeStyle = DARK;
              c.stroke();
            }
          }
          // (the outlines inside the union covered again, so only the outer edge shows)
          if (ink)
            for (const [len, yt] of tongues) {
              const base = half + 0.02;
              const tip = base - s.L * len;
              const ym = y0 + H * yt;
              const fat = H * 0.13 * 0.85;
              c.beginPath();
              c.moveTo(px(base), py(ym - fat));
              c.bezierCurveTo(px(base - s.L * len * 0.5), py(ym - fat * 1.05), px(tip + s.L * 0.1), py(ym - fat * 0.15), px(tip + 0.02), py(ym + fat * 0.45));
              c.bezierCurveTo(px(tip + s.L * 0.14), py(ym + fat * 0.55), px(base - s.L * len * 0.35), py(ym + fat * 1.1), px(base), py(ym + fat));
              c.closePath();
              c.fillStyle = fill;
              c.fill();
            }
        }
      }
      const panel = doorPanel(s);
      const door = INTERIORS[s.id]?.door;
      // The mark on the door, or behind it on the rear quarter when there's a number
      if (l.mark !== 'none') {
        const art = MARK_ART[l.mark];
        const x = l.number && door ? (s.axles[0] + door.back) / 2 : panel.x;
        const size = panel.h * (l.number ? 0.62 : 0.8);
        c.save();
        c.translate(px(x) - (size * kx) / 2, py(panel.y) - (size * ky) / 2);
        c.scale((size * kx) / 100, (size * ky) / 100);
        c.lineJoin = 'round';
        if (art.fill) (c.fillStyle = accent), c.fill(new Path2D(art.fill));
        if (art.dark) (c.fillStyle = DARK), c.fill(new Path2D(art.dark));
        if (art.stroke) (c.strokeStyle = accent), (c.lineWidth = art.width ?? 8), c.stroke(new Path2D(art.stroke));
        c.strokeStyle = DARK;
        c.lineWidth = 5;
        if (art.line) c.stroke(new Path2D(art.line));
        if (art.fill) c.stroke(new Path2D(art.fill));
        c.restore();
      }
      // The number in a white roundel on the door
      if (l.number) {
        const rad = panel.h * 0.44;
        c.beginPath();
        c.ellipse(px(panel.x), py(panel.y), rad * kx, rad * ky, 0, 0, Math.PI * 2);
        c.fillStyle = ROUNDEL;
        c.fill();
        c.lineWidth = 4;
        c.strokeStyle = DARK;
        c.stroke();
        c.save();
        c.translate(px(panel.x), py(panel.y));
        c.scale(kx / ky, 1);
        c.font = `900 ${Math.round(rad * ky * 1.25)}px ${FONT_DISPLAY}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = DARK;
        c.fillText(String(l.number), 0, rad * ky * 0.08);
        c.restore();
      }
    }
  });
}

const LIVERY_VERT = /* glsl */ `
uniform vec3 uOff;
varying vec3 vLiv;
varying vec3 vLivN;
`;
const LIVERY_FRAG = /* glsl */ `
uniform vec3 uAccent;
uniform float uPat;
uniform float uRoof;
uniform vec2 uStripe;
uniform vec2 uSide;
uniform vec4 uMap;
uniform sampler2D uSides;
uniform float uHasMap;
varying vec3 vLiv;
varying vec3 vLivN;
`;
/** What the livery does to the paint's colour, from where the point is on the car (`vLiv`) and which way it faces */
const LIVERY_COLOUR = /* glsl */ `
{
  vec3 lp = vLiv;
  float onSide = step(0.7, abs(normalize(vLivN).z));
  vec3 c = diffuseColor.rgb;
  if (uPat == 1.0 && lp.y > uRoof) c = uAccent;
  if (uPat == 2.0 && onSide < 0.5 && abs(abs(lp.z) - uStripe.x) < uStripe.y) c = uAccent;
  if (uPat == 3.0 && onSide > 0.5 && abs(lp.y - uSide.x) < uSide.y) c = uAccent;
  if (uHasMap > 0.5 && onSide > 0.5) {
    float v = (lp.y - uMap.z) / uMap.w;
    if (v > 0.0 && v < 1.0) {
      vec2 uv = lp.z > 0.0 ? vec2(0.5 + lp.x / uMap.x, 0.5 + v * 0.5) : vec2(0.5 - lp.x / uMap.x, v * 0.5);
      vec4 t = texture2D(uSides, uv);
      c = mix(c, t.rgb, t.a);
    }
  }
  diffuseColor.rgb = c;
}
`;

/** The livery's materials: one a painted piece (the doors' with where their hinge is), all on one program */
function liveryMats(base: THREE.MeshToonMaterial, s: CarSpec, l: CarLook) {
  const tops = s.top.map(([, y]) => y);
  const y0 = s.clr + 0.02;
  const H = Math.max(...tops) - y0;
  const side = topOf(s, 0) - 0.1;
  const map = l.livery === 'flames' || l.number || l.mark !== 'none' ? sidesTexture(s, l, y0, H) : null;
  const shared = {
    uAccent: { value: new THREE.Color(paintOf(l.accent)) },
    uPat: { value: PATTERN[l.livery] },
    // (the roof: above the body's top line, the cabin's pillars and roof)
    uRoof: { value: Math.max(...tops) + 0.02 },
    uStripe: { value: new THREE.Vector2(0.1, 0.035) },
    uSide: { value: new THREE.Vector2(side, 0.022) },
    uMap: { value: new THREE.Vector4(s.L, 0, y0, H) },
    uSides: { value: map },
    uHasMap: { value: map ? 1 : 0 },
  };
  const made: THREE.MeshToonMaterial[] = [];
  const make = (off: THREE.Vector3) => {
    const m = new THREE.MeshToonMaterial({ color: base.color, gradientMap: base.gradientMap, name: 'car-livery' });
    const u = { ...shared, uOff: { value: off } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = LIVERY_VERT + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLiv = position + uOff;\nvLivN = normal;');
      sh.fragmentShader = LIVERY_FRAG + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${LIVERY_COLOUR}`);
    };
    m.customProgramCacheKey = () => 'car-livery';
    made.push(m);
    return m;
  };
  return { make, made, map };
}

/* ---------- Dressing a car ---------- */

/** Dress your fitted car (carcabin.ts `fitOut()`, once its pieces are in place) */
export function dress(car: Car, l: CarLook, m: { body: THREE.Object3D; wheels: THREE.Object3D[]; doors: THREE.Object3D[]; paint: THREE.Material; low: boolean }) {
  if (isStock(l)) return;
  const s = car.spec;
  const id = s.id as PlayerCar;
  const own: { dispose(): void }[] = [];

  // The wheels
  if (l.rim !== 'stock' || l.rimColour !== 'stock' || l.rimSize !== 'stock') {
    const key = wheelKey(id, l);
    let g = wheels.get(key);
    if (!g) wheels.set(key, (g = rimWheel(s, l, m.low)));
    for (const w of m.wheels) (w.children[0] as THREE.Mesh).geometry = g;
  }

  // The kit, on the body
  const key = kitKey(id, l);
  let kit = kits.get(key);
  if (!kit) kits.set(key, (kit = kitParts(s, l)));
  const add = (g: THREE.BufferGeometry, mat: THREE.Material) => {
    const k = new THREE.Mesh(g, mat);
    k.castShadow = k.receiveShadow = true;
    m.body.add(k);
    return k;
  };
  if (kit.paint) add(kit.paint, m.paint);
  if (kit.detail) add(kit.detail, carMaterials().detail);

  // The livery, on everything painted: the body, the doors (their hinge where it is on the car), the kit
  if (l.livery !== 'none' || l.number || l.mark !== 'none') {
    const lv = liveryMats(m.paint as THREE.MeshToonMaterial, s, l);
    const D = INTERIORS[s.id]?.door;
    const onBody = lv.make(new THREE.Vector3());
    for (const c of m.body.children) if ((c as THREE.Mesh).material === m.paint) (c as THREE.Mesh).material = onBody;
    for (const [i, door] of m.doors.entries()) {
      const mat = lv.make(new THREE.Vector3(D?.hinge ?? 0, 0, ((i ? 1 : -1) * s.W) / 2));
      for (const c of door.children) if ((c as THREE.Mesh).material === m.paint) (c as THREE.Mesh).material = mat;
    }
    own.push(...lv.made);
    if (lv.map) own.push(lv.map);
  }

  // Underglow: the pool on the ground and the tubes under the sills
  if (l.glow !== 'off') {
    const hex = GLOW_HEX[l.glow];
    const poolMat = new THREE.MeshBasicMaterial({ color: hex, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: true });
    // (dark by day: lit() scales an unlit material's colour, and black adds nothing)
    const tubeMat = neon(hex, 0, 1.3);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(s.L + 1.2, s.W + 1.4).rotateX(-Math.PI / 2), lit(poolMat, 0, 0.55));
    pool.position.y = 0.025;
    pool.renderOrder = 2;
    car.group.add(fx(pool));
    const span = s.axles[1] - s.axles[0] - (s.r + 0.08) * 2;
    const y = Math.max(0.03, s.clr * 0.6);
    const tubes = merge(
      [
        ...[-1, 1].map((z) => box(Math.max(0.3, span), 0.02, 0.02, (s.axles[0] + s.axles[1]) / 2, y, z * (s.W / 2 - 0.09))),
        ...[-1, 1].map((x) => box(0.02, 0.02, s.W * 0.6, x * (s.L / 2 - 0.25), y, 0)),
      ],
      false
    )!;
    const tube = new THREE.Mesh(tubes, tubeMat);
    m.body.add(fx(tube));
    own.push(poolMat, tubeMat, pool.geometry, tubes, { dispose: () => (unlit(poolMat), unlit(tubeMat)) });
  }

  const dispose = car.dispose;
  car.dispose = () => {
    dispose();
    for (const o of own) o.dispose();
  };
}
