/*
 * How each gun feels (docs/weapons-plan.md Phase 1): DOM-free, shared by the
 * rules (combat-sim.ts, and so the game server) and the view (combat.ts,
 * walk.ts). Tested in tests/gunfeel.test.ts.
 *
 * - **Recoil patterns** (`RECOIL`, `recoilAt()`): every shot of a string (the
 *   shots fired close together, `STRING_GAP`) kicks the view up and to the
 *   side by a set amount for its place in the string, the same every time, so
 *   a spray can be learnt and pulled against. Full-auto guns climb over their
 *   first shots (`climb` by `peak`) and then sway side to side; the one-shot
 *   guns kick up hard with a small set wobble. The gun's `kick` (catalog.ts's
 *   grip mod softens it) scales it all. When the string ends the view comes
 *   back `recover` of the way it was kicked, less whatever you pulled back
 *   yourself (walk.ts).
 * - **Aiming takes a moment** (`ADS`): seconds from the hip to fully down the
 *   sight; the shot cone eases from the hip's to the aim's over it, and the
 *   first-person hands come up at the same pace.
 * - **Moving costs accuracy** (`MOVE_SPREAD`, `moveSpread()`): past a walk the
 *   cone opens with speed up to a run, less when aiming; in the air it opens
 *   by `air` more.
 * - **The shotgun loads one shell at a time** (`SHELLS`): opening up, a shell
 *   every `shell` seconds until it's full or the spare shells run out, then
 *   the pump; a pull of the trigger with a shell in stops the reload and fires
 *   after the pump (`stop`).
 */
import type { WeaponId } from './combat-sim';

/** Seconds without a shot after which the next one starts a new string (on top of the gun's own time between shots) */
export const STRING_GAP = 0.3;

export interface Recoil {
  /** How much more the kick climbs by the `peak`th shot of a string (0: never) */
  climb: number;
  /** Shots to reach the full climb; after it the climb eases back to `settle` of it */
  peak: number;
  settle: number;
  /** A steady pull to one side (+ right) and the sway either side, both as shares of the kick */
  bias: number;
  sway: number;
  /** Shots a full sway takes (left, right and back) */
  swayEvery: number;
  /** Share of the kick the view takes back after the string (what you didn't pull back yourself) */
  recover: number;
}

export const RECOIL: Record<WeaponId, Recoil> = {
  // An all-rounder: climbs a little, drifts right, then sways gently
  rifle: { climb: 0.7, peak: 8, settle: 0.6, bias: 0.12, sway: 0.45, swayEvery: 9, recover: 0.7 },
  // Jittery: barely climbs, flicks side to side fast
  smg: { climb: 0.35, peak: 10, settle: 0.7, bias: -0.08, sway: 0.75, swayEvery: 5, recover: 0.75 },
  // Kicks hard every pull, straight up with a small wobble
  shotgun: { climb: 0, peak: 1, settle: 1, bias: 0, sway: 0.18, swayEvery: 2, recover: 0.85 },
  dmr: { climb: 0, peak: 1, settle: 1, bias: 0.05, sway: 0.12, swayEvery: 2, recover: 0.9 },
  revolver: { climb: 0, peak: 1, settle: 1, bias: 0.08, sway: 0.2, swayEvery: 2, recover: 0.85 },
  // Each burst climbs a step; between bursts it settles
  burst: { climb: 0.5, peak: 3, settle: 1, bias: 0.1, sway: 0.25, swayEvery: 6, recover: 0.8 },
  // A long, heavy climb, then a slow wide sway along the belt
  lmg: { climb: 0.9, peak: 14, settle: 0.55, bias: 0.18, sway: 0.4, swayEvery: 16, recover: 0.6 },
};

const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * The kick of shot `n` (0 the first) of a string for gun `id` whose kick is `kick` (the modded gun's): `up`
 * (radians, the view up) and `side` (radians, + to the right). The same for the same shot every time.
 */
export function recoilAt(id: WeaponId, kick: number, n: number, out = { up: 0, side: 0 }) {
  const R = RECOIL[id];
  const i = Math.max(0, Math.floor(n));
  const rise = R.climb * smooth(Math.min(1, i / R.peak));
  // Past the peak the climb eases back to `settle` of it over as many shots again
  const past = i > R.peak ? smooth(Math.min(1, (i - R.peak) / R.peak)) : 0;
  out.up = kick * (1 + rise * (1 - past * (1 - R.settle)));
  // The sway starts small and grows over the first few shots, so the first shot goes nearly straight up
  const grow = Math.min(1, (i + 1) / 4);
  out.side = kick * (R.bias * Math.min(1, i / 3) + R.sway * grow * Math.sin((i / R.swayEvery) * Math.PI * 2 + 0.6));
  return out;
}

/** Seconds from the hip to fully down the sight */
export const ADS: Record<WeaponId, number> = { smg: 0.16, revolver: 0.18, rifle: 0.22, burst: 0.24, shotgun: 0.24, dmr: 0.32, lmg: 0.4 };

/**
 * How much moving opens a gun's cone (radians): `move` at a run (and past it), `air` in the air. Light guns
 * forgive it, heavy ones don't.
 */
export const MOVE_SPREAD: Record<WeaponId, { move: number; air: number }> = {
  smg: { move: 0.008, air: 0.02 },
  revolver: { move: 0.012, air: 0.03 },
  rifle: { move: 0.016, air: 0.035 },
  burst: { move: 0.014, air: 0.035 },
  shotgun: { move: 0.01, air: 0.025 },
  dmr: { move: 0.03, air: 0.06 },
  lmg: { move: 0.03, air: 0.06 },
};
/** Speeds (tiles a second) where moving starts to cost (a walk, movesim.ts GAITS.walk) and costs it all (a run, GAITS.run) */
export const MOVE_FREE = 0.61;
export const MOVE_FULL = 2.17;
/** Aiming, moving costs this share of it */
export const MOVE_AIMED = 0.5;

/** What moving at `speed` (tiles a second), in the air or not, adds to gun `id`'s cone; `ads` 0..1 down the sight */
export function moveSpread(id: WeaponId, speed: number, air: boolean, ads: number) {
  const M = MOVE_SPREAD[id];
  const run = Math.min(1, Math.max(0, (speed - MOVE_FREE) / (MOVE_FULL - MOVE_FREE)));
  return (M.move * run + (air ? M.air : 0)) * (1 - (1 - MOVE_AIMED) * ads);
}

/** Guns that load a shell at a time: seconds to open up, for each shell, for the pump at the end, and after a stopped reload before the shot */
export const SHELLS: Partial<Record<WeaponId, { open: number; shell: number; close: number; stop: number }>> = {
  shotgun: { open: 0.3, shell: 0.42, close: 0.35, stop: 0.2 },
};

/** Seconds a shell-at-a-time reload of `n` shells takes */
export function shellsTime(id: WeaponId, n: number) {
  const S = SHELLS[id];
  return S ? S.open + S.shell * n + S.close : 0;
}
