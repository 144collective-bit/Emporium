/*
 * The guns in the Armoury's store, as cartoon shapes: the free starters (the
 * assault rifle, also carried by the Armoury's soldiers, the Buzz SMG, the
 * Street Sweeper shotgun and the Long Shot marksman rifle) and the ones it
 * sells for Dorras (the Hand Cannon revolver, the Tri-Tap bullpup carbine and
 * the Belt Feeder machine gun). Each comes in the finishes ("skins") Degen
 * unlocks with his score.
 *
 * Their shapes are gunshapes.ts's (DOM-free, at three levels of detail: the
 * first-person gun the finest, the one in a figure's hands the middle, the
 * soldiers' parade rifle the plainest); here they get their materials and
 * finishes. Each gun's `mag` is what comes out on a reload (a magazine, the
 * revolver's cylinder, the Belt Feeder's belt box). No real-world makes or
 * markings.
 */
import * as THREE from 'three';
import { fx, lit, liveTex, PAL, toon, unlit } from './kit';
import type { SkinId } from '../net/profile-data';
import type { WeaponId } from './combat-sim';
import { byKey, gunParts, gunShape, rifleGeometry, type GunDetail, type Key } from './gunshapes';

/** Finishes and their unlock scores live with the profile data (the game server checks them too) */
export { SKINS, type SkinId } from '../net/profile-data';
const SKIN_COLORS: Record<SkinId, { furniture: string; accent: string; steel: string }> = {
  olive: { furniture: '#5a6b3a', accent: '#c9a04a', steel: '#34333f' },
  ink: { furniture: '#24212f', accent: '#8f8aa8', steel: '#16141d' },
  neon: { furniture: '#2c2350', accent: '#ffffff', steel: '#2a2440' },
};

/** Where shots leave each gun, its sight and where the hands go (gunfit.ts), as gunshapes.ts carries them */
export const gunSpec = (id: WeaponId) => gunShape(id);
export { rifleGeometry, type GunDetail };

/* ----- Finishes and sights ----- */

const neonTex = liveTex(256, 16, (c) => {
  const g = c.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#ff2fb9');
  g.addColorStop(0.5, '#8f3dff');
  g.addColorStop(1, '#00eaff');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 16);
});

/** The red-dot reticle: a gradient ring and a centre dot */
export const reticleTex = liveTex(128, 128, (c) => {
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
const lensTex = liveTex(128, 128, (c) => {
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
 * `sight` adds the glass, the glowing reticle or the scope lens (only worth it up close);
 * `detail` is gunshapes.ts's level (2 the first-person gun, 1 in a figure's hands, the default).
 */
export function buildGun(id: WeaponId, skin: SkinId, opts: { sight?: boolean; shadows?: boolean; mat?: (color: string) => Tintable; detail?: GunDetail } = {}): Gun {
  const spec = gunShape(id);
  const parts = gunParts(id, opts.detail ?? 1);
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
  add(group, byKey(parts.body));
  add(mag, byKey(parts.mag));
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

