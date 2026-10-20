/*
 * The guns in the Armoury's store, as cartoon shapes: the assault rifle (also
 * carried by the Armoury's soldiers), the Buzz SMG, the Street Sweeper
 * shotgun and the Long Shot marksman rifle. Each comes in the finishes
 * ("skins") Degen unlocks with his score.
 *
 * Units are metres at the character's scale: barrel along +z, the pistol grip
 * at the origin. No real-world makes or markings.
 */
import * as THREE from 'three';
import { PAL, canvasTex, fx, lit, toon, unlit } from './kit';
import type { SkinId } from '../net/profile-data';
import type { WeaponId } from './combat-sim';

/** Finishes and their unlock scores live with the profile data (the game server checks them too) */
export { SKINS, type SkinId } from '../net/profile-data';
const SKIN_COLORS: Record<SkinId, { furniture: string; accent: string; steel: string }> = {
  olive: { furniture: '#5a6b3a', accent: '#c9a04a', steel: '#34333f' },
  ink: { furniture: '#24212f', accent: '#8f8aa8', steel: '#16141d' },
  neon: { furniture: '#2c2350', accent: '#ffffff', steel: '#2a2440' },
};

type Key = 'steel' | 'furniture' | 'accent' | 'ink';
type Part = [THREE.BufferGeometry, Key];

const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0): THREE.BufferGeometry => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  return g.translate(x, y, z);
};
const tube = (r: number, len: number, x: number, y: number, z: number, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2).translate(x, y, z);

/** Pistol grip, trigger guard and trigger: the same on every gun, at the origin */
const grip = (): Part[] => [
  [box(0.04, 0.1, 0.05, 0, -0.045, -0.02, 0.3), 'furniture'],
  [box(0.008, 0.008, 0.07, 0, -0.022, 0.045), 'steel'],
  [box(0.006, 0.026, 0.006, 0, -0.008, 0.05), 'ink'],
];
/** A holo sight whose window is centred at (0, y, z), on a base at `base` */
const holo = (y: number, z: number, base: number): Part[] => [
  [box(0.04, 0.012, 0.07, 0, base, z), 'ink'],
  [box(0.03, y - 0.029 - base - 0.006, 0.05, 0, (base + y - 0.029) / 2, z), 'steel'],
  [box(0.044, 0.008, 0.07, 0, y - 0.027, z), 'ink'],
  [box(0.006, 0.058, 0.07, 0.031, y + 0.002, z), 'steel'],
  [box(0.006, 0.058, 0.07, -0.031, y + 0.002, z), 'steel'],
  [box(0.068, 0.008, 0.07, 0, y + 0.035, z), 'steel'],
  [box(0.024, 0.0085, 0.05, 0, y + 0.0355, z), 'accent'],
];

/** How each gun is put together, and where the hands, sight and muzzle are */
interface Spec {
  body: () => Part[];
  /** The magazine: a separate group so it can come out on a reload */
  mag: () => Part[];
  muzzle: THREE.Vector3;
  sight: { kind: 'holo' | 'irons' | 'scope'; at: THREE.Vector3; ads: number };
  /** Where the left hand holds the front, and where it reaches for the magazine (relative to that) */
  fore: THREE.Vector3;
  magAt: THREE.Vector3;
  /** Third person: the middle of the front hand's palm (under the handguard, round a foregrip or pump), close in for his short arms */
  hold: THREE.Vector3;
}

const SPECS: Record<WeaponId, Spec> = {
  revolver: null!,
  burst: null!,
  lmg: null!,
  rifle: {
    body: () => {
      const p: Part[] = [
        // Receiver, ejection port, charging handle, top rail
        [box(0.058, 0.05, 0.3, 0, 0.055, 0.04), 'steel'],
        [box(0.052, 0.046, 0.2, 0, 0.012, 0.03), 'steel'],
        [box(0.0605, 0.02, 0.055, 0, 0.06, 0.07), 'ink'],
        [box(0.05, 0.012, 0.022, 0, 0.078, -0.1), 'ink'],
        [box(0.03, 0.012, 0.26, 0, 0.086, 0.06), 'ink'],
        // Handguard with an accent stripe down each side, gas block, barrel, muzzle brake
        [box(0.066, 0.066, 0.2, 0, 0.05, 0.28), 'furniture'],
        [box(0.0685, 0.012, 0.17, 0, 0.034, 0.28), 'accent'],
        [box(0.03, 0.03, 0.03, 0, 0.074, 0.395), 'steel'],
        [tube(0.014, 0.12, 0, 0.05, 0.44), 'steel'],
        [box(0.036, 0.036, 0.05, 0, 0.05, 0.505), 'steel'],
        [box(0.038, 0.008, 0.012, 0, 0.05, 0.5), 'ink'],
        ...grip(),
        // Buffer tube, stock, cheek riser, butt pad
        [tube(0.016, 0.12, 0, 0.05, -0.15), 'steel'],
        [box(0.05, 0.085, 0.15, 0, 0.03, -0.24), 'furniture'],
        [box(0.03, 0.02, 0.1, 0, 0.08, -0.22), 'furniture'],
        [box(0.0515, 0.012, 0.13, 0, 0.0, -0.24), 'accent'],
        [box(0.054, 0.1, 0.02, 0, 0.025, -0.325), 'ink'],
        // Holo sight on a riser, so the stock stays out of the way when aiming
        ...holo(0.152, 0.075, 0.098),
      ];
      for (let i = 0; i < 11; i++) p.push([box(0.034, 0.006, 0.008, 0, 0.094, -0.06 + i * 0.024), 'ink']);
      return p;
    },
    mag: () => [
      [box(0.036, 0.08, 0.06, 0, -0.03, 0.12, -0.12), 'steel'],
      [box(0.036, 0.07, 0.058, 0, -0.094, 0.133, -0.32), 'steel'],
      [box(0.042, 0.012, 0.066, 0, -0.131, 0.146, -0.32), 'accent'],
    ],
    muzzle: new THREE.Vector3(0, 0.05, 0.535),
    sight: { kind: 'holo', at: new THREE.Vector3(0, 0.152, 0.075), ads: 0.36 },
    fore: new THREE.Vector3(0.008, 0.016, 0.28),
    magAt: new THREE.Vector3(-0.008, -0.075, -0.15),
    hold: new THREE.Vector3(0, -0.015, 0.22),
  },
  smg: {
    body: () => [
      // Boxy receiver, top cover, barrel shroud with a stripe, short barrel and cap
      [box(0.05, 0.06, 0.24, 0, 0.045, 0.04), 'steel'],
      [box(0.04, 0.012, 0.2, 0, 0.081, 0.04), 'ink'],
      [box(0.056, 0.052, 0.1, 0, 0.05, 0.21), 'furniture'],
      [box(0.058, 0.01, 0.08, 0, 0.034, 0.21), 'accent'],
      [tube(0.012, 0.08, 0, 0.05, 0.3), 'steel'],
      [box(0.028, 0.028, 0.03, 0, 0.05, 0.345), 'steel'],
      // Vertical foregrip
      [box(0.03, 0.085, 0.034, 0, -0.022, 0.2), 'furniture'],
      ...grip(),
      // Folding wire stock
      [box(0.006, 0.01, 0.2, 0.02, 0.045, -0.17), 'steel'],
      [box(0.006, 0.01, 0.2, -0.02, 0.045, -0.17), 'steel'],
      [box(0.006, 0.01, 0.17, 0.02, 0.0, -0.16), 'steel'],
      [box(0.006, 0.01, 0.17, -0.02, 0.0, -0.16), 'steel'],
      [box(0.05, 0.075, 0.014, 0, 0.022, -0.272), 'ink'],
      // A small holo sight
      ...holo(0.13, 0.03, 0.087),
    ],
    mag: () => [
      [box(0.03, 0.15, 0.045, 0, -0.06, 0.085, -0.08), 'steel'],
      [box(0.036, 0.012, 0.05, 0, -0.135, 0.09, -0.08), 'accent'],
    ],
    muzzle: new THREE.Vector3(0, 0.05, 0.365),
    sight: { kind: 'holo', at: new THREE.Vector3(0, 0.13, 0.03), ads: 0.34 },
    fore: new THREE.Vector3(0.004, -0.01, 0.2),
    magAt: new THREE.Vector3(-0.004, -0.06, -0.11),
    hold: new THREE.Vector3(0, -0.03, 0.2),
  },
  shotgun: {
    body: () => {
      const p: Part[] = [
        // Receiver, long barrel, the tube under it, the pump with ridges
        [box(0.052, 0.07, 0.2, 0, 0.04, 0.03), 'steel'],
        [tube(0.017, 0.42, 0, 0.066, 0.33), 'steel'],
        [tube(0.014, 0.3, 0, 0.03, 0.27), 'steel'],
        [box(0.052, 0.046, 0.14, 0, 0.03, 0.3), 'furniture'],
        ...grip(),
        // Stock and butt pad
        [box(0.048, 0.072, 0.2, 0, 0.02, -0.2, -0.08), 'furniture'],
        [box(0.05, 0.088, 0.02, 0, 0.004, -0.305), 'ink'],
        // Ghost-ring rear sight and the front bead
        [box(0.008, 0.016, 0.008, 0, 0.082, 0.0), 'steel'],
        [box(0.006, 0.02, 0.006, 0, 0.09, 0.53), 'steel'],
        // Spare shells on the side
        [box(0.012, 0.03, 0.09, 0.03, 0.045, 0.03), 'ink'],
      ];
      for (let k = 0; k < 4; k++) p.push([box(0.012, 0.024, 0.016, 0.037, 0.045, -0.005 + k * 0.022), 'accent']);
      for (let k = 0; k < 5; k++) p.push([box(0.054, 0.006, 0.006, 0, 0.054, 0.25 + k * 0.024), 'ink']);
      const ring = new THREE.TorusGeometry(0.014, 0.0045, 6, 16).translate(0, 0.1, 0);
      p.push([ring, 'steel']);
      p.push([new THREE.SphereGeometry(0.006, 8, 6).translate(0, 0.1, 0.53), 'accent']);
      return p;
    },
    mag: () => [
      [box(0.04, 0.075, 0.06, 0, -0.025, 0.115, -0.08), 'steel'],
      [box(0.044, 0.012, 0.064, 0, -0.064, 0.12, -0.08), 'accent'],
    ],
    muzzle: new THREE.Vector3(0, 0.066, 0.545),
    sight: { kind: 'irons', at: new THREE.Vector3(0, 0.1, 0), ads: 0.3 },
    fore: new THREE.Vector3(0.006, 0.0, 0.3),
    magAt: new THREE.Vector3(-0.006, -0.06, -0.19),
    hold: new THREE.Vector3(0, -0.022, 0.255),
  },
  dmr: {
    body: () => [
      // Long receiver and lower, handguard with a stripe, long barrel, muzzle brake
      [box(0.058, 0.055, 0.36, 0, 0.05, 0.06), 'steel'],
      [box(0.05, 0.045, 0.22, 0, 0.012, 0.04), 'steel'],
      [box(0.062, 0.062, 0.28, 0, 0.05, 0.38), 'furniture'],
      [box(0.064, 0.012, 0.24, 0, 0.034, 0.38), 'accent'],
      [tube(0.013, 0.22, 0, 0.05, 0.62), 'steel'],
      [box(0.036, 0.036, 0.06, 0, 0.05, 0.75), 'steel'],
      [box(0.038, 0.008, 0.014, 0, 0.05, 0.745), 'ink'],
      ...grip(),
      // Stock with a cheek riser, butt pad
      [box(0.05, 0.09, 0.2, 0, 0.03, -0.24), 'furniture'],
      [box(0.034, 0.03, 0.12, 0, 0.09, -0.2), 'furniture'],
      [box(0.054, 0.1, 0.02, 0, 0.025, -0.345), 'ink'],
      // Folded bipod under the handguard
      [box(0.008, 0.008, 0.18, 0.018, 0.012, 0.42), 'steel'],
      [box(0.008, 0.008, 0.18, -0.018, 0.012, 0.42), 'steel'],
      // Scope: rings, tube, bells, turret
      [box(0.03, 0.04, 0.025, 0, 0.098, -0.02), 'ink'],
      [box(0.03, 0.04, 0.025, 0, 0.098, 0.15), 'ink'],
      [tube(0.022, 0.26, 0, 0.13, 0.06, 14), 'steel'],
      [tube(0.031, 0.06, 0, 0.13, 0.21, 14), 'steel'],
      [tube(0.027, 0.05, 0, 0.13, -0.08, 14), 'steel'],
      [box(0.022, 0.022, 0.022, 0, 0.16, 0.06), 'accent'],
      [box(0.022, 0.022, 0.022, 0.029, 0.13, 0.06), 'accent'],
    ],
    mag: () => [
      [box(0.034, 0.09, 0.06, 0, -0.035, 0.13, -0.1), 'steel'],
      [box(0.04, 0.012, 0.064, 0, -0.078, 0.138, -0.1), 'accent'],
    ],
    muzzle: new THREE.Vector3(0, 0.05, 0.78),
    sight: { kind: 'scope', at: new THREE.Vector3(0, 0.13, -0.106), ads: 0.26 },
    fore: new THREE.Vector3(0.008, 0.016, 0.36),
    magAt: new THREE.Vector3(-0.008, -0.075, -0.23),
    hold: new THREE.Vector3(0, -0.013, 0.27),
  },
};

/** Where shots leave each gun, its sight, and where the hands go */
// PLACEHOLDERS: the Armoury's premium guns borrow a starter's shape until they get their own
SPECS.revolver = SPECS.dmr;
SPECS.burst = SPECS.rifle;
SPECS.lmg = SPECS.rifle;
export const gunSpec = (id: WeaponId) => SPECS[id];

const clean = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  return n;
};
function mergeAll(geos: THREE.BufferGeometry[]) {
  const list = geos.map(clean);
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv'] as const) {
    const total = list.reduce((a, g) => a + g.attributes[k].array.length, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of list) {
      arr.set(g.attributes[k].array as Float32Array, o);
      o += g.attributes[k].array.length;
    }
    out.setAttribute(k, new THREE.BufferAttribute(arr, k === 'uv' ? 2 : 3));
  }
  return out;
}
const byKey = (parts: Part[]) => {
  const out = new Map<Key, THREE.BufferGeometry>();
  for (const k of ['steel', 'furniture', 'accent', 'ink'] as Key[]) {
    const g = parts.filter(([, pk]) => pk === k).map(([g]) => g);
    if (g.length) out.set(k, mergeAll(g));
  }
  return out;
};

/** The assault rifle as one shape (instanced crowds: the soldiers carry it). */
export function rifleGeometry() {
  return mergeAll([...SPECS.rifle.body(), ...SPECS.rifle.mag()].map(([g]) => g));
}

/* ----- Finishes and sights ----- */

const neonTex = canvasTex(256, 16, (c) => {
  const g = c.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#ff2fb9');
  g.addColorStop(0.5, '#8f3dff');
  g.addColorStop(1, '#00eaff');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 16);
});

/** The red-dot reticle: a gradient ring and a centre dot */
export const reticleTex = canvasTex(128, 128, (c) => {
  const g = c.createLinearGradient(20, 20, 108, 108);
  g.addColorStop(0, '#ff2fb9');
  g.addColorStop(0.5, '#ff5aa8');
  g.addColorStop(1, '#00eaff');
  c.strokeStyle = g;
  c.lineWidth = 7;
  c.shadowColor = '#ff2fb9';
  c.shadowBlur = 10;
  c.beginPath();
  c.arc(64, 64, 38, 0, Math.PI * 2);
  c.stroke();
  for (const [x, y] of [
    [64, 14],
    [64, 114],
    [14, 64],
    [114, 64],
  ]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(64 + (x - 64) * 0.8, 64 + (y - 64) * 0.8);
    c.stroke();
  }
  c.fillStyle = '#ff3b5c';
  c.beginPath();
  c.arc(64, 64, 7, 0, Math.PI * 2);
  c.fill();
});

/** The scope's lens: tinted glass with fine crosshairs */
const lensTex = canvasTex(128, 128, (c) => {
  const g = c.createRadialGradient(64, 64, 10, 64, 64, 64);
  g.addColorStop(0, '#2a6a8a');
  g.addColorStop(1, '#0a1a2a');
  c.fillStyle = g;
  c.beginPath();
  c.arc(64, 64, 63, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#ff3b5c';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(64, 8);
  c.lineTo(64, 120);
  c.moveTo(8, 64);
  c.lineTo(120, 64);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.beginPath();
  c.ellipse(44, 40, 18, 10, -0.6, 0, Math.PI * 2);
  c.fill();
});

export interface Gun {
  id: WeaponId;
  group: THREE.Group;
  /** The magazine, positioned relative to the gun (moved during reloads) */
  mag: THREE.Group;
  /** Every mesh, for render tweaks (first-person depth) */
  meshes: THREE.Mesh[];
  setSkin(id: SkinId): void;
  /** 0..1 extra brightness on the gun (muzzle flash light) */
  setGlow(k: number): void;
  /** Free its geometry (materials are its own too) */
  dispose(): void;
}

/** Any material with a colour and an emissive colour (toon, or the first-person flat shading) */
export type Tintable = THREE.Material & { color: THREE.Color; emissive: THREE.Color };

/**
 * A gun with its own materials, so its finish and glow can change.
 * `sight` adds the glass, the glowing reticle or the scope lens (only worth it up close).
 */
export function buildGun(id: WeaponId, skin: SkinId, opts: { sight?: boolean; shadows?: boolean; mat?: (color: string) => Tintable } = {}): Gun {
  const spec = SPECS[id];
  const make = opts.mat ?? ((c: string) => toon(c, { emissive: '#000000' }) as Tintable);
  const mats: Record<Key, Tintable> = { steel: make('#2b2a33'), furniture: make('#5a6b3a'), accent: make('#c9a04a'), ink: make(PAL.ink) };
  const neonAccent = lit(new THREE.MeshBasicMaterial({ map: neonTex, toneMapped: true }), 1, 1.8);
  const group = new THREE.Group();
  const mag = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const accents: THREE.Mesh[] = [];
  const add = (parent: THREE.Group, parts: Map<Key, THREE.BufferGeometry>) => {
    for (const [k, geo] of parts) {
      const m = new THREE.Mesh(geo, mats[k]);
      m.castShadow = !!opts.shadows;
      parent.add(m);
      meshes.push(m);
      if (k === 'accent') accents.push(m);
    }
  };
  add(group, byKey(spec.body()));
  add(mag, byKey(spec.mag()));
  group.add(mag);

  if (opts.sight) {
    const at = spec.sight.at;
    if (spec.sight.kind === 'holo') {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.056, 0.058),
        new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })
      );
      glass.position.set(0, at.y, at.z + 0.03);
      const reticle = new THREE.Mesh(
        new THREE.PlaneGeometry(0.032, 0.032),
        new THREE.MeshBasicMaterial({ map: reticleTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })
      );
      reticle.position.set(0, at.y, at.z + 0.029);
      reticle.renderOrder = 2;
      group.add(fx(glass), fx(reticle));
      meshes.push(glass, reticle);
    } else if (spec.sight.kind === 'scope') {
      const lensMat = new THREE.MeshBasicMaterial({ map: lensTex, side: THREE.DoubleSide });
      for (const z of [at.z - 0.001, 0.241]) {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(z < 0 ? 0.025 : 0.029, 20), lensMat);
        lens.position.set(0, at.y, z);
        group.add(lens);
        meshes.push(lens);
      }
    }
  }

  const setSkin = (s: SkinId) => {
    const c = SKIN_COLORS[s];
    mats.furniture.color.set(c.furniture);
    mats.steel.color.set(c.steel);
    mats.accent.color.set(c.accent);
    for (const m of accents) m.material = s === 'neon' ? neonAccent : mats.accent;
  };
  setSkin(skin);
  return {
    id,
    group,
    mag,
    meshes,
    setSkin,
    setGlow(k) {
      for (const m of Object.values(mats)) m.emissive.setRGB(k * 0.55, k * 0.42, k * 0.2);
    },
    dispose() {
      // Its own materials: the finish set, the neon accent, and the sight's glass, reticle or lens
      const own = new Set<THREE.Material>([...Object.values(mats), neonAccent]);
      for (const m of meshes) {
        m.geometry.dispose();
        own.add(m.material as THREE.Material);
      }
      unlit(neonAccent);
      for (const m of own) m.dispose();
    },
  };
}

