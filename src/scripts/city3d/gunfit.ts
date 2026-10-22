/*
 * How each gun fits Degen's hands (DOM-free, so the tests can check the hands
 * land on every gun): where the hands, sight and muzzle are, how he carries
 * it, where it's put away, and its reload as a keyed clip that both views
 * play (the third-person hold in stance.ts and the first-person hands in
 * viewmodel.ts), so the hands, the magazine and the sounds keep one timing.
 *
 * Gun space is guns.ts's: metres at the character's scale, barrel along +z,
 * the pistol grip at the origin.
 */
import * as THREE from 'three';
import type { WeaponId } from './combat-sim';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** How a reload goes: a box magazine, shells one at a time, a revolver's cylinder, a belt box */
export type ReloadKind = 'mag' | 'shells' | 'cylinder' | 'box';

export interface Fit {
  muzzle: THREE.Vector3;
  sight: { kind: 'holo' | 'irons' | 'scope'; at: THREE.Vector3; ads: number };
  /** First person: where the left hand holds the front, and where it reaches for the magazine (relative to that) */
  fore: THREE.Vector3;
  magAt: THREE.Vector3;
  /** Third person: the middle of the front hand's palm (under the handguard, round a foregrip or pump), close in for his short arms */
  hold: THREE.Vector3;
  /** 'long': two hands, shouldered, slung on his back when put away; 'pistol': on his hip, carried in one hand, both on the grip to shoot */
  carry: 'long' | 'pistol';
  reload: ReloadKind;
  /** How hard a shot shoves his shoulders back (third person) */
  kick: number;
}

export const FIT: Record<WeaponId, Fit> = {
  rifle: {
    muzzle: v(0, 0.05, 0.535),
    sight: { kind: 'holo', at: v(0, 0.152, 0.075), ads: 0.36 },
    fore: v(0.008, 0.016, 0.28),
    magAt: v(-0.008, -0.075, -0.15),
    hold: v(0, -0.015, 0.22),
    carry: 'long',
    reload: 'mag',
    kick: 1,
  },
  smg: {
    muzzle: v(0, 0.05, 0.365),
    sight: { kind: 'holo', at: v(0, 0.13, 0.03), ads: 0.34 },
    fore: v(0.004, -0.01, 0.2),
    magAt: v(-0.004, -0.06, -0.11),
    hold: v(0, -0.03, 0.2),
    carry: 'long',
    reload: 'mag',
    kick: 0.7,
  },
  shotgun: {
    muzzle: v(0, 0.066, 0.545),
    sight: { kind: 'irons', at: v(0, 0.1, 0), ads: 0.3 },
    fore: v(0.006, 0.0, 0.3),
    // The loading port under the receiver
    magAt: v(-0.006, -0.06, -0.19),
    hold: v(0, -0.022, 0.255),
    carry: 'long',
    reload: 'shells',
    kick: 1.6,
  },
  dmr: {
    muzzle: v(0, 0.05, 0.78),
    sight: { kind: 'scope', at: v(0, 0.13, -0.106), ads: 0.26 },
    fore: v(0.008, 0.016, 0.36),
    magAt: v(-0.008, -0.075, -0.23),
    hold: v(0, -0.013, 0.27),
    carry: 'long',
    reload: 'mag',
    kick: 1.3,
  },
  revolver: {
    muzzle: v(0, 0.055, 0.35),
    sight: { kind: 'irons', at: v(0, 0.094, -0.04), ads: 0.3 },
    fore: v(0.034, -0.035, 0.035),
    // The cylinder
    magAt: v(-0.03, 0.08, 0.01),
    hold: v(0.03, -0.045, 0.02),
    carry: 'pistol',
    reload: 'cylinder',
    kick: 1.4,
  },
  burst: {
    muzzle: v(0, 0.05, 0.32),
    sight: { kind: 'holo', at: v(0, 0.172, 0.0), ads: 0.34 },
    fore: v(0.008, 0.012, 0.17),
    // A bullpup: the magazine is behind the grip
    magAt: v(-0.01, -0.08, -0.3),
    hold: v(0, -0.012, 0.15),
    carry: 'long',
    reload: 'mag',
    kick: 0.9,
  },
  lmg: {
    muzzle: v(0, 0.058, 0.63),
    sight: { kind: 'irons', at: v(0, 0.115, -0.12), ads: 0.3 },
    fore: v(0.008, 0.014, 0.26),
    // The belt box on its side
    magAt: v(-0.008, -0.05, -0.12),
    hold: v(0, -0.014, 0.23),
    carry: 'long',
    reload: 'box',
    kick: 1.1,
  },
};

/** The middle of the shooting hand's palm on the pistol grip: every gun's grip is at its origin */
export const GRIP = v(-0.012, -0.05, -0.025);

/* ---------- Reloads ---------- */

/** One moment of a reload, for both views */
export interface ReloadFrame {
  /** 0..1: how far the front hand has left its rest for `at` (a point on the gun; add `mag` to it, the hand follows the magazine) */
  hand: number;
  at: THREE.Vector3;
  /** 0..1: how far it has gone on to the pouch on his belt (each view knows where that is) */
  away: number;
  /** The magazine (shells: the round in hand; the cylinder; the belt box): moved from its place in gun space, turned about the barrel, or hidden */
  mag: THREE.Vector3;
  magRoll: number;
  magShown: boolean;
  /** The gun itself: rolled onto its side (+ turns its top towards the front hand), muzzle up (+), pulled in (metres) */
  roll: number;
  pitch: number;
  pull: number;
  /** 0..1: the bolt, pump or cover worked */
  bolt: number;
  /** The front hand's own spot slid back along the barrel (racking the pump), metres */
  slide: number;
  /** The magazine (the belt box) is in the front hand: it rides with it, to the pouch and back */
  carried: boolean;
}
export const newReloadFrame = (): ReloadFrame => ({ hand: 0, at: new THREE.Vector3(), away: 0, mag: new THREE.Vector3(), magRoll: 0, magShown: true, roll: 0, pitch: 0, pull: 0, bolt: 0, slide: 0, carried: false });

/** The sounds along each reload (fractions of the reload's time) */
export type ReloadCue = 'magout' | 'magin' | 'bolt';
export const RELOAD_CUES: Record<ReloadKind, [number, ReloadCue][]> = {
  mag: [
    [0.17, 'magout'],
    [0.66, 'magin'],
    [0.84, 'bolt'],
  ],
  shells: [
    [0.25, 'magin'],
    [0.42, 'magin'],
    [0.59, 'magin'],
    [0.76, 'magin'],
    [0.89, 'bolt'],
  ],
  cylinder: [
    [0.12, 'magout'],
    [0.26, 'magout'],
    [0.62, 'magin'],
    [0.76, 'bolt'],
  ],
  box: [
    [0.1, 'bolt'],
    [0.26, 'magout'],
    [0.64, 'magin'],
    [0.86, 'bolt'],
  ],
};

const ease = (x: number) => x * x * (3 - 2 * x);
/** 0 before `a`, eased up to 1 at `b` */
const seg = (r: number, a: number, b: number) => ease(THREE.MathUtils.clamp((r - a) / (b - a), 0, 1));
/** Up between a and b, held, down between c and d */
const span = (r: number, a: number, b: number, c: number, d: number) => seg(r, a, b) * (1 - seg(r, c, d));
const bump = (r: number, a: number, b: number) => (r > a && r < b ? Math.sin(((r - a) / (b - a)) * Math.PI) : 0);
const tv = new THREE.Vector3();

/**
 * Where everything is `r` (0..1) of the way through gun `id`'s reload. Every
 * clip starts and ends at rest, so a reload cut short (a swap, holstering)
 * just eases back.
 */
export function reloadAt(id: WeaponId, r: number, out = newReloadFrame()): ReloadFrame {
  const f = FIT[id];
  out.hand = out.away = out.magRoll = out.roll = out.pitch = out.pull = out.bolt = out.slide = 0;
  out.mag.set(0, 0, 0);
  out.magShown = true;
  out.carried = false;
  out.at.copy(f.fore).add(f.magAt);
  if (!(r > 0 && r < 1)) return out;
  switch (f.reload) {
    case 'mag': {
      // Tilt it over, hand to the magazine, pull it out and stow it, a fresh one from the pouch, seat it, work the bolt
      out.roll = 0.5 * span(r, 0.02, 0.12, 0.86, 0.98);
      out.pitch = 0.18 * span(r, 0.02, 0.12, 0.86, 0.98);
      out.pull = 0.04 * span(r, 0.02, 0.14, 0.86, 0.98);
      out.hand = span(r, 0.04, 0.14, 0.9, 0.98);
      const drop = span(r, 0.14, 0.24, 0.6, 0.7);
      out.away = span(r, 0.24, 0.4, 0.44, 0.6);
      out.mag.set(0.03, -0.11, 0.02).multiplyScalar(drop);
      out.carried = r > 0.14 && r < 0.7;
      out.magShown = !(r > 0.38 && r < 0.46);
      // Then up to the charging handle on top at the back
      out.at.lerp(tv.set(0.03, 0.085, -0.08), seg(r, 0.72, 0.8));
      out.bolt = bump(r, 0.82, 0.92);
      break;
    }
    case 'shells': {
      // Rolled over to show the port; four shells from the belt one by one; then the pump
      out.roll = 0.75 * span(r, 0.02, 0.12, 0.78, 0.86);
      out.pitch = 0.12 * span(r, 0.02, 0.12, 0.78, 0.86);
      out.pull = 0.05 * span(r, 0.02, 0.12, 0.8, 0.9);
      const loop = THREE.MathUtils.clamp((r - 0.1) / 0.68, 0, 1) * 4;
      const k = Math.min(3, Math.floor(loop));
      const u = loop - k;
      // Each shell: from the port to the pouch, back with a shell and pushed in
      const inLoop = r > 0.1 && r < 0.78;
      out.hand = inLoop ? 1 : span(r, 0.04, 0.1, 0.78, 0.86);
      out.away = inLoop ? span(u, 0, 0.35, 0.45, 0.85) : 0;
      // Then back on the pump to rack it, back and forward
      out.bolt = bump(r, 0.86, 0.97);
      out.slide = -0.07 * out.bolt;
      break;
    }
    case 'cylinder': {
      // The cylinder swings out, the muzzle comes up and the empties fall, a speed loader from the pouch, it swings shut
      const open = span(r, 0.06, 0.14, 0.68, 0.76);
      out.roll = 0.6 * span(r, 0.04, 0.14, 0.76, 0.9);
      out.pitch = 0.9 * span(r, 0.14, 0.22, 0.3, 0.4) - 0.35 * span(r, 0.42, 0.5, 0.66, 0.74);
      out.pull = 0.05 * span(r, 0.04, 0.14, 0.8, 0.92);
      out.mag.set(0.04 * open, -0.012 * open, 0);
      out.magRoll = 0.9 * open;
      out.hand = span(r, 0.04, 0.1, 0.84, 0.94);
      out.away = span(r, 0.3, 0.42, 0.46, 0.58);
      out.bolt = bump(r, 0.7, 0.8);
      break;
    }
    case 'box': {
      // Cover up, the old box off and stowed, a new one hung on, the belt laid in, cover shut, charge
      out.roll = 0.35 * span(r, 0.02, 0.12, 0.88, 0.98);
      out.pitch = 0.2 * span(r, 0.02, 0.12, 0.88, 0.98);
      out.pull = 0.05 * span(r, 0.02, 0.14, 0.86, 0.98);
      // The cover on top first
      const cover = span(r, 0.04, 0.1, 0.16, 0.22);
      out.at.lerp(tv.set(0.0, 0.1, 0.02), cover);
      out.hand = Math.max(span(r, 0.04, 0.1, 0.84, 0.94), 0);
      const drop = span(r, 0.22, 0.3, 0.58, 0.66);
      out.away = span(r, 0.28, 0.42, 0.46, 0.6);
      out.mag.set(0.04, -0.13, 0.03).multiplyScalar(drop);
      out.carried = r > 0.22 && r < 0.66;
      out.magShown = !(r > 0.4 && r < 0.48);
      out.at.lerp(tv.set(0.0, 0.1, 0.02), span(r, 0.68, 0.74, 0.8, 0.86));
      out.bolt = Math.max(bump(r, 0.06, 0.2), bump(r, 0.72, 0.9));
      break;
    }
  }
  return out;
}
