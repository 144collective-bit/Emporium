/*
 * The assault rifle: one cartoon shape for everyone who carries it (Degen in
 * third person, his first-person hands, the Armoury's soldiers), with a holo
 * red-dot sight and a few finishes ("skins") Degen unlocks with his score.
 *
 * Units are metres at the character's scale: barrel along +z, the pistol grip
 * at the origin. No real-world makes or markings.
 */
import * as THREE from 'three';
import { PAL, canvasTex, fx, lit, toon } from './kit';

export type SkinId = 'olive' | 'ink' | 'neon';
export const SKINS: { id: SkinId; name: string; need: number }[] = [
  { id: 'olive', name: 'Field Olive', need: 0 },
  { id: 'ink', name: 'Black Ink', need: 2500 },
  { id: 'neon', name: 'Pulse Neon', need: 10000 },
];
const SKIN_COLORS: Record<SkinId, { furniture: string; accent: string; steel: string }> = {
  olive: { furniture: '#5a6b3a', accent: '#c9a04a', steel: '#34333f' },
  ink: { furniture: '#24212f', accent: '#8f8aa8', steel: '#16141d' },
  neon: { furniture: '#2c2350', accent: '#ffffff', steel: '#2a2440' },
};

/** Where shots leave the barrel, and the middle of the red-dot window */
export const MUZZLE = new THREE.Vector3(0, 0.05, 0.535);
export const SIGHT = new THREE.Vector3(0, 0.152, 0.075);

type Key = 'steel' | 'furniture' | 'accent' | 'ink';

const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  return g.translate(x, y, z);
};
const tube = (r: number, len: number, x: number, y: number, z: number, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2).translate(x, y, z);

/** The rifle body, by material. The magazine is separate so it can come out on a reload. */
function bodyParts(): [THREE.BufferGeometry, Key][] {
  const p: [THREE.BufferGeometry, Key][] = [
    // Receiver, ejection port, charging handle
    [box(0.058, 0.05, 0.3, 0, 0.055, 0.04), 'steel'],
    [box(0.052, 0.046, 0.2, 0, 0.012, 0.03), 'steel'],
    [box(0.0605, 0.02, 0.055, 0, 0.06, 0.07), 'ink'],
    [box(0.05, 0.012, 0.022, 0, 0.078, -0.1), 'ink'],
    // Top rail with teeth
    [box(0.03, 0.012, 0.26, 0, 0.086, 0.06), 'ink'],
    // Handguard with an accent stripe down each side, gas block, barrel, muzzle brake
    [box(0.066, 0.066, 0.2, 0, 0.05, 0.28), 'furniture'],
    [box(0.0685, 0.012, 0.17, 0, 0.034, 0.28), 'accent'],
    [box(0.03, 0.03, 0.03, 0, 0.074, 0.395), 'steel'],
    [tube(0.014, 0.12, 0, 0.05, 0.44), 'steel'],
    [box(0.036, 0.036, 0.05, 0, 0.05, 0.505), 'steel'],
    [box(0.038, 0.008, 0.012, 0, 0.05, 0.5), 'ink'],
    // Pistol grip, trigger guard and trigger
    [box(0.04, 0.1, 0.05, 0, -0.045, -0.02, 0.3), 'furniture'],
    [box(0.008, 0.008, 0.07, 0, -0.022, 0.045), 'steel'],
    [box(0.006, 0.026, 0.006, 0, -0.008, 0.05), 'ink'],
    // Buffer tube, stock, cheek riser, butt pad
    [tube(0.016, 0.12, 0, 0.05, -0.15), 'steel'],
    [box(0.05, 0.085, 0.15, 0, 0.03, -0.24), 'furniture'],
    [box(0.03, 0.02, 0.1, 0, 0.08, -0.22), 'furniture'],
    [box(0.0515, 0.012, 0.13, 0, 0.0, -0.24), 'accent'],
    [box(0.054, 0.1, 0.02, 0, 0.025, -0.325), 'ink'],
    // Holo sight on a riser (so the stock stays out of the way when aiming): base, side walls, hood with an accent strip
    [box(0.04, 0.012, 0.07, 0, 0.098, SIGHT.z), 'ink'],
    [box(0.03, 0.022, 0.05, 0, 0.113, SIGHT.z), 'steel'],
    [box(0.044, 0.008, 0.07, 0, 0.125, SIGHT.z), 'ink'],
    [box(0.006, 0.058, 0.07, 0.031, 0.154, SIGHT.z), 'steel'],
    [box(0.006, 0.058, 0.07, -0.031, 0.154, SIGHT.z), 'steel'],
    [box(0.068, 0.008, 0.07, 0, 0.187, SIGHT.z), 'steel'],
    [box(0.024, 0.0085, 0.05, 0, 0.1875, SIGHT.z), 'accent'],
  ];
  for (let i = 0; i < 11; i++) p.push([box(0.034, 0.006, 0.008, 0, 0.094, -0.06 + i * 0.024), 'ink']);
  return p;
}

function magParts(): [THREE.BufferGeometry, Key][] {
  return [
    [box(0.036, 0.08, 0.06, 0, -0.03, 0.12, -0.12), 'steel'],
    [box(0.036, 0.07, 0.058, 0, -0.094, 0.133, -0.32), 'steel'],
    [box(0.042, 0.012, 0.066, 0, -0.131, 0.146, -0.32), 'accent'],
  ];
}

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
const byKey = (parts: [THREE.BufferGeometry, Key][]) => {
  const out = new Map<Key, THREE.BufferGeometry>();
  for (const k of ['steel', 'furniture', 'accent', 'ink'] as Key[]) {
    const g = parts.filter(([, pk]) => pk === k).map(([g]) => g);
    if (g.length) out.set(k, mergeAll(g));
  }
  return out;
};

/** The whole rifle as one shape (instanced crowds: the soldiers carry the same gun). */
export function rifleGeometry() {
  return mergeAll([...bodyParts(), ...magParts()].map(([g]) => g));
}

/* ----- Finishes ----- */

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

export interface Rifle {
  group: THREE.Group;
  /** The magazine, positioned relative to the rifle (moved during reloads) */
  mag: THREE.Group;
  /** Every mesh, for render tweaks (first-person depth) */
  meshes: THREE.Mesh[];
  setSkin(id: SkinId): void;
  /** 0..1 extra brightness on the rifle (muzzle flash light) */
  setGlow(k: number): void;
}

/**
 * A rifle with its own materials, so its finish and glow can change.
 * `sight` adds the glass and the glowing reticle (only worth it up close).
 */
/** Any material with a colour and an emissive colour (toon, or the first-person flat shading) */
export type Tintable = THREE.Material & { color: THREE.Color; emissive: THREE.Color };

export function buildRifle(skin: SkinId, opts: { sight?: boolean; shadows?: boolean; mat?: (color: string) => Tintable } = {}): Rifle {
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
  add(group, byKey(bodyParts()));
  add(mag, byKey(magParts()));
  group.add(mag);

  if (opts.sight) {
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.056, 0.058),
      new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })
    );
    glass.position.set(0, SIGHT.y, SIGHT.z + 0.03);
    const reticle = new THREE.Mesh(
      new THREE.PlaneGeometry(0.032, 0.032),
      new THREE.MeshBasicMaterial({ map: reticleTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })
    );
    reticle.position.set(0, SIGHT.y, SIGHT.z + 0.029);
    reticle.renderOrder = 2;
    group.add(fx(glass), fx(reticle));
    meshes.push(glass, reticle);
  }

  const setSkin = (id: SkinId) => {
    const c = SKIN_COLORS[id];
    mats.furniture.color.set(c.furniture);
    mats.steel.color.set(c.steel);
    mats.accent.color.set(c.accent);
    for (const m of accents) m.material = id === 'neon' ? neonAccent : mats.accent;
  };
  setSkin(skin);
  return {
    group,
    mag,
    meshes,
    setSkin,
    setGlow(k) {
      for (const m of Object.values(mats)) m.emissive.setRGB(k * 0.55, k * 0.42, k * 0.2);
    },
  };
}
