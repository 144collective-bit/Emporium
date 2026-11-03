/*
 * The gun hands, polished (docs/firstperson-plan.md, Phase 3), as data: DOM-free, tested in tests/fpgun.test.ts.
 * fpgun.ts (a chunk of its own, fetched the first time the first-person gun hands show) draws them.
 *
 * - `sleeveParts()`: the forearm's sleeve and cuff for every top the wardrobe has (the suit's tailored sleeve over
 *   a shirt cuff with its four horn buttons, the hoodie's and the track top's gathered sleeve into a ribbed cuff and
 *   the track top's stripes, the varsity's cream sleeve and striped rib, the puffer's quilted sleeve, the fatigues),
 *   the gold watch on his left wrist when he wears it, and the hand's colour (the fatigues' gloves). Each part is a
 *   geometry in the gun's frame round the wrist (`at`, the hand's bone) up the forearm (`dir`), and its colour.
 * - `EJECT`: where each gun throws its spent case (the port, the way out, how fast, how big, brass or a red hull,
 *   the shotgun's on the pump); the revolver keeps its in the cylinder.
 * - `FLASH`: each gun's flash shaped its own way (the star or the round burst, how long and wide, a muzzle brake's
 *   side jets).
 * - `smokeFor()`: how long the barrel smokes after a string (a few shots of an automatic, any shot of the big ones).
 * - `lampLight()`: the light the hands take from the nearest street lamp at night (white or sodium) over the
 *   moon's cool cast, as one colour.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WeaponId } from './combat-sim';
import type { Outfit } from './wardrobe';
import { LAMP } from './palette';

/* ---------- Sleeves ---------- */

const SKIN = '#e8c39e';
/** The shirt cuff and the track top's stripes (a shade under white, as the viewmodel's) */
export const SHIRT = '#d4d1de';
/** The varsity's sleeves and its rib's stripe (wardrobe.ts's CREAM) */
export const CREAM = '#e4dcc4';
/** The suit's horn buttons (wardrobe.ts's HORN) */
export const HORN = '#3d302a';
export const GOLD = '#e2b04a';
const DIAL = '#1a1a2a';
/** The fatigues' gloves (wardrobe.ts's soldier fingers) */
export const GLOVE = '#2b2a33';

export const shade = (c: string, k: number) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

/** How far up the forearm the sleeves reach (they run on out of view), and the wrist's reach into them */
export const SLEEVE_LEN = 0.56;
/** The hand's widest under the cuff (bakedHand at the viewmodel's size, measured): a cuff stays outside it */
export const WRIST_R = 0.0375;
/** How far the cuff starts up from the wrist's bone, and how much further when the watch is worn */
export const CUFF_AT = 0.026;
export const WATCH_LIFT = 0.018;

export interface Part {
  geo: THREE.BufferGeometry;
  color: string;
}

/** A frame round the wrist: y up the forearm, x out to the side the hand is on (`side` -1 his right: the gun's -x) */
function frame(at: THREE.Vector3, dir: THREE.Vector3, side: -1 | 1) {
  const Y = dir.clone().normalize();
  const X = new THREE.Vector3(side, 0, 0).addScaledVector(Y, -side * Y.x);
  if (X.lengthSq() < 1e-6) X.set(0, 0, 1);
  X.normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(at);
}

/**
 * A tube round the frame's y axis through the given heights, radius `r(y, a)` (a from the outside, x), over the
 * angles a0 to a1 (the whole way round by default). A radius of 0 closes it.
 */
export function tube(ys: number[], r: (y: number, a: number) => number, na = 24, a0 = 0, a1 = Math.PI * 2) {
  const full = a1 - a0 >= Math.PI * 2 - 1e-6;
  const cols = full ? na : na + 1;
  const pos: number[] = [];
  for (const y of ys)
    for (let j = 0; j < cols; j++) {
      const a = a0 + ((a1 - a0) * j) / na;
      const rr = r(y, a);
      pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
    }
  const idx: number[] = [];
  for (let i = 0; i < ys.length - 1; i++)
    for (let j = 0; j < na; j++) {
      const a = i * cols + j;
      const b = i * cols + ((j + 1) % cols);
      const c = a + cols;
      const d = b + cols;
      // (wound so the faces look outward)
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A flat ring at height y facing down the forearm (where a sleeve's hem stands off the cuff under it) */
export function hem(y: number, rIn: number, rOut: number, na = 24) {
  return new THREE.RingGeometry(rIn, rOut, na).rotateX(Math.PI / 2).translate(0, y, 0);
}

/** Heights from y0 to y1 every `step`, with both ends */
export const heights = (y0: number, y1: number, step: number) => {
  const n = Math.max(1, Math.ceil((y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => y0 + ((y1 - y0) * i) / n);
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (y: number, at: number, w: number) => Math.exp(-(((y - at) / w) ** 2));

/** The sleeve's run up the forearm, closed off at the far end (out of view) */
const run = (y0: number, step = 0.02) => [...heights(y0, SLEEVE_LEN, step), SLEEVE_LEN + 0.012];
const closing = (y: number, r: number) => (y > SLEEVE_LEN + 1e-6 ? r * 0.5 : r);

/** A ribbed cuff from y0 to y1: `n` ribs round it standing `amp` proud */
function ribCuff(y0: number, y1: number, r: number, amp = 0.032, n = 18) {
  return tube(heights(y0, y1, 0.008), (_, a) => r * (1 + amp * Math.max(0, Math.cos(a * n))), n * 3);
}

/** The colour of his hands (the fatigues' gloves) */
export const handColor = (o: Outfit) => (o.kind === 'soldier' ? GLOVE : SKIN);

/**
 * The sleeve, the cuff and what's on the wrist for the top `o` on the hand `side` (-1 his right, 1 his left), round
 * the wrist's bone `at` up the forearm `dir`, in the gun's frame.
 */
export function sleeveParts(o: Outfit, side: -1 | 1, at: THREE.Vector3, dir: THREE.Vector3): Part[] {
  const parts: Part[] = [];
  const add = (geo: THREE.BufferGeometry, color: string) => parts.push({ geo, color });
  const top = o.top;
  // The watch on his left wrist, just under the cuff (which starts further up for it)
  const watch = !!o.watch && side === 1;
  const c0 = CUFF_AT + (watch ? WATCH_LIFT : 0);
  if (watch) {
    const y = CUFF_AT + 0.004;
    // (its band just off the wrist, the edges rounded in)
    add(tube(heights(y, y + 0.012, 0.004), (yy) => WRIST_R + (yy > y + 1e-6 && yy < y + 0.012 - 1e-6 ? 0.0012 : 0.0002), 28), GOLD);
    // The face on the outside of the wrist, its dial a touch proud
    const face = new THREE.CylinderGeometry(0.0125, 0.0125, 0.005, 18).rotateZ(-Math.PI / 2).translate(WRIST_R + 0.0028, y + 0.006, 0);
    const dial = new THREE.CylinderGeometry(0.0095, 0.0095, 0.002, 18).rotateZ(-Math.PI / 2).translate(WRIST_R + 0.0058, y + 0.006, 0);
    add(face, GOLD);
    add(dial, DIAL);
  }
  switch (o.kind) {
    case 'suit': {
      // A tailored sleeve, a shirt cuff showing past it, four horn buttons up the back of the sleeve's cuff
      const s0 = c0 + 0.032;
      add(tube(heights(c0, s0 + 0.004, 0.008), () => WRIST_R + 0.0005, 24), SHIRT);
      const rs = (y: number) => WRIST_R + 0.0035 + 0.009 * smooth(s0, SLEEVE_LEN, y);
      add(tube(run(s0), (y) => closing(y, rs(y)), 24), top);
      add(hem(s0, WRIST_R, rs(s0) + 0.0002), shade(top, 0.45));
      for (let i = 0; i < 4; i++) {
        const y = s0 + 0.012 + i * 0.0125;
        const a = -0.55;
        const r = rs(y) + 0.0012;
        add(
          new THREE.CylinderGeometry(0.0042, 0.0042, 0.0022, 12)
            .rotateZ(-Math.PI / 2)
            .rotateY(-a)
            .translate(Math.cos(a) * r, y, Math.sin(a) * r),
          HORN
        );
      }
      break;
    }
    case 'puffer': {
      // A knit cuff, then the fat quilted sleeve pinched in at every baffle's seam
      add(ribCuff(c0, c0 + 0.046, WRIST_R + 0.001, 0.025, 20), shade(top, 0.75));
      const s0 = c0 + 0.04;
      const PITCH = 0.06;
      const rs = (y: number) => {
        const base = 0.056 + 0.006 * smooth(s0, SLEEVE_LEN, y);
        const f = (((y - s0) / PITCH) % 1 + 1) % 1;
        return base * (0.88 + 0.12 * Math.sin(Math.PI * f));
      };
      add(tube(run(s0, 0.006), (y) => closing(y, rs(y)), 28), top);
      add(hem(s0, WRIST_R, rs(s0) + 0.0002), shade(top, 0.45));
      break;
    }
    default: {
      // The casual tops and the fatigues: a looser sleeve gathered onto a ribbed cuff
      const varsity = o.kind === 'varsity';
      const track = o.kind === 'track';
      const cuffC = varsity ? shade(top, 0.72) : shade(top, 0.8);
      const s0 = c0 + 0.046;
      add(ribCuff(c0, s0 + 0.004, WRIST_R + 0.0012), cuffC);
      if (varsity) add(tube(heights(c0 + 0.017, c0 + 0.029, 0.006), () => (WRIST_R + 0.0012) * 1.045, 36), CREAM);
      const slim = track ? 0.004 : o.kind === 'soldier' ? -0.002 : 0;
      // (gathered: narrow onto the cuff, bunched just above it, then easing out up the arm; soft folds round it)
      const rs = (y: number, a: number) =>
        WRIST_R + 0.0025 + (0.0105 - slim) * smooth(s0, s0 + 0.03, y) - 0.003 * smooth(s0 + 0.05, s0 + 0.12, y) + 0.008 * smooth(s0 + 0.12, SLEEVE_LEN, y) + 0.0016 * Math.sin(y * 110 + a * 2) * bump(y, s0 + 0.06, 0.05);
      add(tube(run(s0, 0.01), (y, a) => closing(y, rs(y, a)), 28), varsity ? CREAM : top);
      if (track)
        // Two stripes up the outside of the sleeve, just proud of it
        for (const [a0, a1] of [
          [-0.2, -0.1],
          [0.1, 0.2],
        ])
          add(tube(heights(s0 + 0.03, SLEEVE_LEN, 0.02), (y, a) => rs(y, a) + 0.0016, 3, a0, a1), SHIRT);
    }
  }
  const m = frame(at, dir, side);
  for (const p of parts) p.geo.applyMatrix4(m);
  return parts;
}

/** The parts merged by colour (one mesh a colour) */
export function byColour(parts: Part[]): Part[] {
  const map = new Map<string, THREE.BufferGeometry[]>();
  for (const p of parts) {
    // (the rings and cylinders carry uvs the tubes don't, and every piece is indexed: they merge as one)
    p.geo.deleteAttribute('uv');
    map.set(p.color, [...(map.get(p.color) ?? []), p.geo]);
  }
  return [...map].map(([color, gs]) => ({ color, geo: gs.length > 1 ? mergeGeometries(gs)! : gs[0] }));
}

/* ---------- Spent cases ---------- */

export interface Eject {
  /** The port, in the gun's frame (its origin the pistol grip, the barrel along +z, his right -x) */
  port: [number, number, number];
  /** Out of it (the gun's frame) and how fast */
  dir: [number, number, number];
  speed: number;
  /** The case: radius and length, brass or a red hull */
  r: number;
  len: number;
  hull?: boolean;
  /** Seconds after the shot it comes out (the shotgun's on the pump) */
  delay: number;
}

export const EJECT: Record<WeaponId, Eject | null> = {
  rifle: { port: [-0.022, 0.06, -0.085], dir: [-1, 0.6, -0.2], speed: 1.7, r: 0.0034, len: 0.022, delay: 0 },
  smg: { port: [-0.02, 0.058, -0.05], dir: [-1, 0.7, -0.1], speed: 1.5, r: 0.003, len: 0.014, delay: 0 },
  shotgun: { port: [-0.024, 0.062, -0.11], dir: [-1, 0.5, -0.1], speed: 1.3, r: 0.0058, len: 0.03, hull: true, delay: 0.32 },
  dmr: { port: [-0.022, 0.062, -0.165], dir: [-1, 0.55, -0.25], speed: 1.9, r: 0.0036, len: 0.028, delay: 0 },
  // (the revolver's stay in the cylinder until the reload)
  revolver: null,
  burst: { port: [-0.022, 0.06, -0.235], dir: [-1, 0.6, -0.1], speed: 1.6, r: 0.0034, len: 0.02, delay: 0 },
  lmg: { port: [-0.024, 0.048, -0.06], dir: [-0.7, -0.6, 0], speed: 1.2, r: 0.0034, len: 0.022, delay: 0 },
};

/** A case's flight: gravity, how long it lives (it's out of view long before), its spin */
export const CASE = { gravity: 9.8, life: 0.55, spin: 28, max: 24 };

/* ---------- Muzzle flashes ---------- */

export interface Flash {
  /** The star (a rifle's spikes) or the round burst (a shotgun's, a revolver's) */
  shape: 'star' | 'burst';
  /** Along the barrel and across it (1 the rifle's), the face-on plane's size */
  len: number;
  wide: number;
  front: number;
  /** A muzzle brake: two jets out to the sides */
  brake: boolean;
  /** How long it shows (seconds) */
  life: number;
}

export const FLASH: Record<WeaponId, Flash> = {
  rifle: { shape: 'star', len: 1, wide: 1, front: 1, brake: false, life: 0.045 },
  smg: { shape: 'star', len: 0.7, wide: 0.75, front: 0.8, brake: false, life: 0.035 },
  shotgun: { shape: 'burst', len: 1.05, wide: 1.6, front: 1.6, brake: false, life: 0.06 },
  dmr: { shape: 'star', len: 1.2, wide: 0.75, front: 0.8, brake: true, life: 0.05 },
  revolver: { shape: 'burst', len: 0.85, wide: 1.35, front: 1.35, brake: false, life: 0.055 },
  burst: { shape: 'star', len: 0.9, wide: 0.85, front: 0.9, brake: false, life: 0.04 },
  lmg: { shape: 'star', len: 1.15, wide: 1.1, front: 1.1, brake: true, life: 0.05 },
};

/* ---------- Smoke off the barrel ---------- */

/** A string is shots no further apart than `gap`; the barrel smokes once it's over */
export const SMOKE = { gap: 0.3, string: 5, max: 1.6, puff: 0.04, life: 1.2, rise: 0.34, count: 40 };
/** The big guns smoke after any shot */
const BIG: WeaponId[] = ['shotgun', 'dmr', 'revolver'];

/** How long the barrel smokes after a string of `shots` from `id` (0: not at all) */
export function smokeFor(id: WeaponId, shots: number) {
  if (shots <= 0) return 0;
  if (BIG.includes(id)) return Math.min(SMOKE.max, 0.6 + 0.15 * shots);
  if (shots < SMOKE.string) return 0;
  return Math.min(SMOKE.max, 0.4 + 0.06 * shots);
}

/* ---------- The light on the hands ---------- */

/** A street lamp lights the hands within `reach` tiles, at night, up to `most` */
export const LIGHT = { reach: 5.5, most: 0.55, moon: '#c3cbff', moonMost: 0.3 };
const MOON = new THREE.Color(LIGHT.moon);
const WHITE = new THREE.Color(LAMP.white.pool);
const SODIUM = new THREE.Color(LAMP.sodium.pool);

/**
 * The colour the hands' shading is multiplied by: white by day; at night (0..1) the moon's cool cast, and the
 * nearest lamp's light (`dist` tiles away; Infinity for none; `sodium` orange or the town's white) brightening and
 * tinting them as it nears.
 */
export function lampLight(night: number, dist: number, sodium: boolean, out = new THREE.Color()) {
  out.setRGB(1, 1, 1).lerp(MOON, night * LIGHT.moonMost);
  const k = night * LIGHT.most * Math.pow(Math.max(0, 1 - dist / LIGHT.reach), 1.5);
  if (k > 0) {
    const c = sodium ? SODIUM : WHITE;
    // (lit, they come up as well as warm: the lamp's colour over the dimmed night shading)
    out.lerp(c, k).multiplyScalar(1 + k * 0.8);
  }
  return out;
}
