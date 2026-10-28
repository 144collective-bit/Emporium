/*
 * Fists on the street (docs/inventory-plan.md Phase 2): the Fight Club's moves
 * out of the ring, on the walker. DOM-free, tested in tests/brawl.test.ts; the
 * view is brawl.ts, the hits are combat-sim.ts's `melee()`.
 *
 * - One fighter of the fight's rules (fight-sim.ts): its moves, their frames,
 *   chains, the block, the dodge and stamina, in the player's style (the
 *   save's `fight.style`). Walking is walk mode's own: each tick the fighter
 *   is put where Degen stands, facing his way, and gets no walking input, so
 *   the sim only times the moves; what it moves him itself (a strike's step
 *   in, a dodge's slide) comes back as `dx, dz` for walk mode to move him by
 *   through its collisions.
 * - A move strikes on its first active frame (the frame the ring lands a hit
 *   on): `strike` events, one a move, for the view to test with `melee()`.
 * - Empty hands are the fists (the controls round): the guard comes up with
 *   any move or block and stays `BRAWL.guard` seconds after the last, then
 *   drops; sprinting drops it at once and nothing is thrown while sprinting
 *   (the owner's call: Shift still sprints).
 * - Punches, the block and the guard are the upper body's (over the walk:
 *   `upper`); kicks and the dodge take him whole, standing (`rooted`).
 */
import { createFightSim, MOVES, NO_INPUT, T, type FighterInput, type MoveId, type StyleId } from './fight-sim';
import type { ClipId } from './fight-anim';

export const BRAWL = {
  /** Seconds the guard stays up after the last move or block */
  guard: 4,
  /** Slower than this (tiles a second), Space dodges; faster, it jumps */
  still: 0.3,
  /** Blocking, he walks no faster than this (tiles a second, the walk's own pace) */
  blockSpeed: 0.78,
  /** A swing makes anyone within this much of his reach step aside (tiles) */
  crowd: 0.5,
};

export interface BrawlInput {
  /** Pressed this frame (punch, kick, dodge) or held (block) */
  punch: boolean;
  kick: boolean;
  block: boolean;
  dodge: boolean;
  sprinting: boolean;
  /** Which way a dodge steps (world axes; none: back) */
  dx: number;
  dz: number;
}
export const NO_BRAWL: BrawlInput = { punch: false, kick: false, block: false, dodge: false, sprinting: false, dx: 0, dz: 0 };

export type BrawlEvent =
  | { kind: 'swing'; move: MoveId }
  /** A move's first active frame: where it lands is `melee()`'s to say */
  | { kind: 'strike'; move: MoveId }
  | { kind: 'dodge' }
  | { kind: 'tired' };

export function createBrawl(style: StyleId, seed = 7) {
  const sim = createFightSim({ seed, fighters: [{ id: 'me', name: 'Degen', style, x: 0, z: 0, yaw: 0 }] });
  const f = sim.fighter('me')!;
  let guardT = 0;
  let struckFor = -1;
  let ticks = 0;
  let acc = 0;

  function cancel() {
    f.move = null;
    f.phase = null;
    f.frame = 0;
    f.queued = null;
    f.buffer = null;
    f.blocking = false;
    f.vx = f.vz = 0;
    guardT = 0;
  }

  return {
    fighter: f,
    get stamina() {
      return f.stamina / T.stamina;
    },
    /** The guard is up (a move, the block, or one lately) */
    get up() {
      return guardT > 0 || !!f.move || f.blocking;
    },
    get blocking() {
      return f.blocking;
    },
    /** A move in progress, and which */
    get move() {
      return f.move;
    },
    /** A kick or the dodge: it takes him whole, standing */
    get rooted() {
      return !!f.move && MOVES[f.move].kind !== 'punch';
    },
    /** The clip the fight's animations play for him now, and its frame (fight-anim.ts) */
    clip(): { id: ClipId; frame: number } {
      if (f.move) return { id: f.move, frame: f.frame };
      if (f.blocking) return { id: 'block', frame: f.blockFrames };
      return { id: 'guard', frame: ticks };
    },
    /**
     * Advance by `dt` seconds with Degen at (x, z) facing `yaw`: the events of those ticks, and how far the
     * moves themselves took him (a strike's step in, a dodge's slide)
     */
    step(dt: number, x: number, z: number, yaw: number, inp: BrawlInput) {
      const events: BrawlEvent[] = [];
      let dx = 0;
      let dz = 0;
      if (inp.sprinting) {
        // (sprinting: nothing thrown, the guard down; a move already going plays out)
        guardT = 0;
        f.blocking = false;
      }
      const pressed = !inp.sprinting && (inp.punch || inp.kick || inp.dodge || inp.block);
      if (pressed) guardT = BRAWL.guard;
      else if (!f.move && !f.blocking) guardT = Math.max(0, guardT - dt);
      // A press is kept by the fight's own buffer: hand it in on the first tick only
      let first: FighterInput = inp.sprinting
        ? { ...NO_INPUT, face: yaw }
        : { x: inp.dodge ? inp.dx : 0, z: inp.dodge ? inp.dz : 0, face: yaw, punch: inp.punch, kick: inp.kick, block: inp.block, dodge: inp.dodge };
      acc += Math.min(dt, 0.1);
      while (acc >= T.tick) {
        acc -= T.tick;
        ticks++;
        // (where walk mode has him, facing his way: the sim only times the moves)
        f.x = x + dx;
        f.z = z + dz;
        f.yaw = yaw;
        const wasX = f.x;
        const wasZ = f.z;
        for (const e of sim.step(T.tick, { me: first })) {
          if (e.kind === 'swing') events.push({ kind: 'swing', move: e.move });
          else if (e.kind === 'dodge') events.push({ kind: 'dodge' });
          else if (e.kind === 'tired') events.push({ kind: 'tired' });
        }
        first = { ...NO_INPUT, face: yaw, block: !inp.sprinting && inp.block };
        // What the move moved him (a step in, a dodge's slide); his own walking is walk mode's
        if (f.move || Math.hypot(f.vx, f.vz) > 0.02) {
          dx += f.x - wasX;
          dz += f.z - wasZ;
        }
        if (f.move && f.move !== 'dodge' && f.phase === 'active' && struckFor !== f.moveAt) {
          struckFor = f.moveAt;
          events.push({ kind: 'strike', move: f.move });
        }
      }
      return { events, dx, dz };
    },
    /** Hands no longer empty (a gun drawn, a thing held out, a vehicle, a menu): everything stops, the guard down */
    cancel,
  };
}
export type Brawl = ReturnType<typeof createBrawl>;
