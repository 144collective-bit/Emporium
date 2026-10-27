/*
 * The multiplayer wire protocol: JSON messages over one WebSocket, shared by
 * the site and the game server. Positions travel as small arrays rounded to
 * centimetres to keep snapshots light. No DOM, no scene code.
 */
import { MOD_LEVELS, type GunMods } from '../city3d/catalog';
import { WEAPON_IDS, type WeaponId } from '../city3d/combat-sim';
import { WORLD_BOUNDS } from '../city3d/layout';
import type { EmoteId, Look, PublicProfile, SkinId } from './profile-data';

export const PROTOCOL = 4;
export const ROOM_SIZE = 16;
/** How often a browser sends its controls, and how often the room sends positions */
export const INPUT_HZ = 20;
export const SNAP_HZ = 15;
/** Remote players are drawn this far in the past, so there's always a snapshot either side */
export const INTERP_DELAY = 0.11;
/** The playable world: x0, z0, x1, z1 (layout.ts, how far you can walk or drive) */
export const WORLD = WORLD_BOUNDS;
/** Where shots may start: within this distance of the shooter (the shoulder camera's longest reach) */
export const SHOT_REACH = 18;

/**
 * Per-player state bits in inputs and snapshots (`assist`: firing from a touch screen; `warp`: this
 * move is a jump, fast travel or the end of a ride or a race, not a step). The way they're getting
 * about (`MODES`) rides in the bits from `MODE_SHIFT` up.
 */
export const FLAG = { armed: 1, aim: 2, fire: 4, run: 8, air: 16, reload: 32, assist: 64, warp: 128 } as const;

/** How a player is getting about: on foot, in their car, in a kart, flying, in a taxi or on the metro, in the ring */
export const MODES = ['walk', 'drive', 'kart', 'fly', 'ride', 'fight'] as const;
export type Mode = (typeof MODES)[number];
export const MODE_SHIFT = 8;
export const modeBits = (m: Mode) => MODES.indexOf(m) << MODE_SHIFT;
export const modeOf = (fl: number): Mode => MODES[(fl >> MODE_SHIFT) & 7] ?? 'walk';
/**
 * Fastest anyone can really move each way (tiles a second), with headroom for lag: a sprint
 * and a jump; the quickest car fully tuned (drive-sim.ts `tune()`, 16 and its mods); a Neon
 * kart on a boost (kart-sim.ts); a ride (the taxi's 12, the metro's straight ride between
 * stations); the Neon Dart diving (flight-sim.ts, 34 and a dive's 15%).
 */
export const SPEEDS: Record<Mode, number> = { walk: 9, drive: 30, kart: 30, ride: 40, fly: 50, fight: 9 };
/** A jump (FLAG.warp) is taken at most this often (ms) */
export const WARP_GAP = 1000;

/**
 * Could a player have gone from `a` to `b` in `dt` seconds the way `fl` says they're moving (a jump
 * aside)? With a message's worth of slack on top (two can arrive together), at least 0.75.
 */
export const moveOk = (a: { x: number; z: number }, b: { x: number; z: number }, dt: number, fl: number) => {
  const v = SPEEDS[modeOf(fl)];
  return Math.hypot(b.x - a.x, b.z - a.z) <= v * dt + Math.max(0.75, v / INPUT_HZ);
};
/** Inside the playable world (and not under it or far over it) */
export const inWorld = (x: number, y: number, z: number) => x >= WORLD[0] && x <= WORLD[2] && z >= WORLD[1] && z <= WORLD[3] && y > -1 && y < 40;

/** The Armoury's mods a browser says its guns carry (the save is the browser's), tidied: whole levels, 0 to MOD_LEVELS */
export function cleanMods(raw: unknown): Partial<Record<WeaponId, GunMods>> {
  const out: Partial<Record<WeaponId, GunMods>> = {};
  if (!raw || typeof raw !== 'object') return out;
  const lv = (n: unknown) => (typeof n === 'number' && Number.isInteger(n) ? Math.min(MOD_LEVELS, Math.max(0, n)) : 0);
  for (const id of WEAPON_IDS) {
    const m = (raw as Record<string, unknown>)[id];
    if (m && typeof m === 'object') {
      const g = m as Record<string, unknown>;
      out[id] = { barrel: lv(g.barrel), mag: lv(g.mag), grip: lv(g.grip) };
    }
  }
  return out;
}
/** A loadout a browser sends (docs/inventory-plan.md): up to two guns, known ones, never one twice; null if there's none */
export function cleanKit(raw: unknown): WeaponId[] | null {
  if (!Array.isArray(raw)) return null;
  const out: WeaponId[] = [];
  for (const w of raw.slice(0, 2)) if (typeof w === 'string' && (WEAPON_IDS as string[]).includes(w) && !out.includes(w as WeaponId)) out.push(w as WeaponId);
  return out.length ? out : null;
}
/** Height of the ground the city stands on (SLAB in world.ts) */
export const GROUND = 0.15;
/** How close you must be to a gun store counter (the Armoury's, Trench Arms' hatch) to gear up */
export const RACK_REACH = 2.5;

export type V3 = [number, number, number];
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const v3 = (v: { x: number; y: number; z: number }): V3 => [r2(v.x), r2(v.y), r2(v.z)];

/* ---------- Browser to server ---------- */

export type ClientMsg =
  /** First message: the browser's secret guest token (only its hash is stored), and the wallet login's session token if logged in */
  | { t: 'hello'; v: number; token: string; auth?: string; local?: { total: number; skin: SkinId } }
  /** Controls, ~20 a second: position, facing, camera pitch, speed, flags (with the mode), and the shot ray */
  | { t: 'in'; p: V3; f: number; k: number; s: number; fl: number; o: V3; d: V3; pt: number }
  /**
   * Take a gun at a store counter, the Armoury's or Trench Arms' (refills every gun); `m`: the mods on each of
   * your guns; `l`: the loadout picked there (the two guns carried, the only ones a swap goes to)
   */
  | { t: 'equip'; w: WeaponId; m?: Partial<Record<WeaponId, GunMods>>; l?: WeaponId[] }
  /**
   * Draw a gun from your loadout anywhere (the hotbar): `l` the loadout you picked at a counter before, `w` the gun.
   * Not geared up yet (just joined), it gears you up with it, full; the loadout itself only changes at a counter.
   */
  | { t: 'kit'; l: WeaponId[]; w: WeaponId; m?: Partial<Record<WeaponId, GunMods>> }
  /** Swap to another gun in your loadout in the field (once geared up) */
  | { t: 'swap'; w: WeaponId; m?: Partial<Record<WeaponId, GunMods>> }
  | { t: 'arm'; on: boolean }
  | { t: 'reload' }
  | { t: 'emote'; e: EmoteId }
  /** A fixed phrase, by its index in PHRASES */
  | { t: 'say'; i: number }
  | { t: 'look'; look: Look }
  | { t: 'skin'; skin: SkinId }
  /** Pick a new guest name */
  | { t: 'rename' }
  | { t: 'ping'; c: number };

/* ---------- Server to browser ---------- */

export interface PlayerInfo {
  id: number;
  name: string;
  look: Look;
  skin: SkinId;
  rank: string;
  /** The gun they carry (or last took from the store) */
  weapon: WeaponId;
}
/** `wallet`: logged in with this wallet (wallet profiles only); `since`: when the profile was made (ms) */
export type OwnProfile = PublicProfile & { rank: string; wallet?: string; since?: number };

/** id, x, y, z, facing, camera pitch, speed, flags */
export type SnapRow = [number, number, number, number, number, number, number, number];
/** Your own state in each snapshot: mag, reserve, reloading (0/1), score, streak, armed (0/1), weapon */
export type MeRow = [number, number, number, number, number, number, number];
/** target id, health, 1 while knocked down */
export type TargetRow = [number, number, number];

/**
 * Combat events, compact:
 * shot     ['s', player, from xyz, to xyz, target or -1, weapon (WEAPON_IDS index), pellet]
 * hit      ['h', player, target, damage, at xyz, health left]
 * takedown ['k', player, target, at xyz, points, streak]
 * respawn  ['r', target]
 * empty    ['e', player]
 * reload   ['l', player, 0 started / 1 done]
 * armed    ['a', player, 0 / 1]
 */
export type NetEvent =
  | ['s', number, number, number, number, number, number, number, number, number, number]
  | ['h', number, number, number, number, number, number, number]
  | ['k', number, number, number, number, number, number, number]
  | ['r', number]
  | ['e', number]
  | ['l', number, number]
  | ['a', number, number];

export type ServerMsg =
  | { t: 'welcome'; you: number; room: string; profile: OwnProfile; players: PlayerInfo[]; pt: number }
  | { t: 'join'; p: PlayerInfo }
  | { t: 'leave'; id: number }
  /** A player's name, look, finish or rank changed */
  | { t: 'info'; p: PlayerInfo }
  /** Your own profile changed (score, rank, unlocks) */
  | { t: 'you'; profile: OwnProfile }
  /** Positions ~15 a second; `me` is your own state: mag, reserve, reloading (0/1), score, streak, armed, weapon (WEAPON_IDS index) */
  | { t: 'snap'; pt: number; p: SnapRow[]; tg: TargetRow[]; me: MeRow }
  | { t: 'ev'; e: NetEvent[] }
  | { t: 'emote'; id: number; e: EmoteId }
  | { t: 'say'; id: number; i: number }
  /** The server moved you back (you went somewhere impossible) */
  | { t: 'fix'; p: V3 }
  | { t: 'full' }
  | { t: 'error'; m: string }
  | { t: 'pong'; c: number };
