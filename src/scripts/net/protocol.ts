/*
 * The multiplayer wire protocol: JSON messages over one WebSocket, shared by
 * the site and the game server. Positions travel as small arrays rounded to
 * centimetres to keep snapshots light. No DOM, no scene code.
 */
import type { WeaponId } from '../city3d/combat-sim';
import type { EmoteId, Look, PublicProfile, SkinId } from './profile-data';

export const PROTOCOL = 2;
export const ROOM_SIZE = 16;
/** How often a browser sends its controls, and how often the room sends positions */
export const INPUT_HZ = 20;
export const SNAP_HZ = 15;
/** Remote players are drawn this far in the past, so there's always a snapshot either side */
export const INTERP_DELAY = 0.11;
/** Fastest anyone can really move (m/s), with headroom for jumps and lag */
export const MAX_SPEED = 9;
/** The playable world, edge to edge */
export const WORLD: [number, number] = [-70, 101];
/** Where shots may start: within this distance of the shooter (the shoulder camera's longest reach) */
export const SHOT_REACH = 18;

/** Per-player state bits in inputs and snapshots (`assist`: firing from a touch screen) */
export const FLAG = { armed: 1, aim: 2, fire: 4, run: 8, air: 16, reload: 32, assist: 64 } as const;
/** Height of the ground the city stands on (SLAB in world.ts) */
export const GROUND = 0.15;
/** How close you must be to the Armoury's gun store counter to gear up */
export const RACK_REACH = 2.5;

export type V3 = [number, number, number];
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const v3 = (v: { x: number; y: number; z: number }): V3 => [r2(v.x), r2(v.y), r2(v.z)];

/* ---------- Browser to server ---------- */

export type ClientMsg =
  /** First message: the browser's secret guest token (only its hash is stored), and the wallet login's session token if logged in */
  | { t: 'hello'; v: number; token: string; auth?: string; local?: { total: number; skin: SkinId } }
  /** Controls, ~20 a second: position, facing, camera pitch, speed, flags, and the shot ray */
  | { t: 'in'; p: V3; f: number; k: number; s: number; fl: number; o: V3; d: V3; pt: number }
  /** Take a gun at the Armoury's store counter (refills every gun) */
  | { t: 'equip'; w: WeaponId }
  /** Swap to another unlocked gun in the field (once geared up at the counter) */
  | { t: 'swap'; w: WeaponId }
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
