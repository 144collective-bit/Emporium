/*
 * Degen's footsteps (docs/sound-plan.md Phase 1; DOM-free, tested in
 * tests/footsteps.test.ts): when a foot lands, on what, and how hard, as
 * events sound.ts plays (`step()`). Nothing here makes a sound.
 *
 * - **A step** is a foot coming down: the motion capture's foot locking onto
 *   the ground (animator.ts `feet[i].locked` going on), or the procedural
 *   walk's foot going into its stance (locomotion.ts `feet[i].stance`), so
 *   every step lands when a foot does, at any speed and in any clip.
 * - **The gait** (creep, walk, jog, sprint) is by his speed against the
 *   walk's (movesim.ts `GAITS`), and crouched is a creep; how hard the foot
 *   comes down (`weight`) is by the gait, softer crouched.
 * - **A landing** after a jump, a vault or a drop is its own sound, heavier
 *   the harder he comes down (the fall's speed); the feet locking with it
 *   don't step as well.
 * - **A scuff** when he pulls up sharply from a run, or turns on the spot.
 * - **A slide** (crouch at a sprint) scrapes once as it starts.
 * - **The surface** under the foot (`surfaceAt()`): the street's asphalt,
 *   a block's paving, the open ground's cover (ground.ts `coverAt()`: grass,
 *   dirt, gravel), and what walk mode stands on (groundheight.ts's layers:
 *   the waterfront's and the park's boards, the bridges' metal, the mall's
 *   tile, the tunnels' concrete, his house's floorboards).
 * - **Wet** when it rains, out of doors; now and then a splash in a puddle
 *   on hard ground.
 * - Each event carries which take to play (`take`, never the same twice in a
 *   row on one surface) and a small detune, from a seeded generator, so a
 *   run of steps never sounds like one sound repeated.
 */
import type { Cover } from './palette';
import { coverAt } from './ground';
import { GROUND_LAYERS, baseAt, type GroundCtx } from './groundheight';
import { PLAN, raised, type Street } from './streetplan';
import { onDeck } from './waterfront';
import { inHouse } from './home';
import { GAITS } from './movesim';
import { LAND_ROLL } from './locomotion';

export type Surface = 'asphalt' | 'paving' | 'concrete' | 'gravel' | 'dirt' | 'grass' | 'wood' | 'metal' | 'tile';
export const SURFACES = ['asphalt', 'paving', 'concrete', 'gravel', 'dirt', 'grass', 'wood', 'metal', 'tile'] as const satisfies readonly Surface[];
export type Gait = 'creep' | 'walk' | 'jog' | 'sprint';
export type StepKind = 'step' | 'land' | 'scuff' | 'slide';

/** A footstep for sound.ts to play */
export interface Step {
  kind: StepKind;
  /** Which foot (0 left, 1 right; a landing's and a slide's are both, given as 0) */
  foot: 0 | 1;
  surface: Surface;
  gait: Gait;
  /** How hard it comes down, 0-1 */
  weight: number;
  /** Rain on it, 0-1 (0 indoors and under cover) */
  wet: number;
  /** A splash in a puddle (wet, hard ground) */
  splash: boolean;
  /** Which of the surface's takes, 0 to `STEPS.takes - 1`, never the last one played on it */
  take: number;
  /** A small detune, -1 to 1 (sound.ts scales it to a few per cent) */
  detune: number;
}

/** The numbers (seconds, tiles a second) */
export const STEPS = {
  /** No two steps of one foot closer than this, nor of the two feet closer than `pair` */
  gap: 0.16,
  pair: 0.07,
  /** Under this speed a foot coming down is the idle's weight shifting: no step */
  idle: 0.08,
  /** A landing sounds from this fall speed; the feet locking with it are quiet for `afterLand` */
  land: 1.2,
  afterLand: 0.14,
  /** A scuff: pulled up from at least `stopFrom` of the run to under `stopTo` of the walk inside `stopIn`; or turning on the spot faster than `turn` (radians a second) under `turnUnder`; never closer than `scuffGap` */
  stopFrom: 0.9,
  stopTo: 0.8,
  stopIn: 0.4,
  turn: 5,
  turnUnder: 0.5,
  scuffGap: 0.5,
  /** Takes of each sound to pick between */
  takes: 4,
  /** The chance of a splash on hard ground in full rain */
  splash: 0.3,
  /** Under this much rain the ground's dry */
  dryUnder: 0.15,
  /** How hard each gait comes down, and a crouch's share of it */
  weight: { creep: 0.3, walk: 0.5, jog: 0.75, sprint: 1 } as Record<Gait, number>,
  crouched: 0.55,
};

/** Each cover of the open ground as a surface (palette.ts `COVER`: a new cover fails the typecheck here until it has one) */
export const COVER_SURFACE: Record<Cover, Surface> = {
  rough: 'grass',
  meadow: 'grass',
  dryGrass: 'grass',
  bank: 'grass',
  lawn: 'grass',
  pad: 'grass',
  planted: 'grass',
  median: 'grass',
  garden: 'grass',
  island: 'grass',
  dry: 'grass',
  worn: 'grass',
  wornLawn: 'grass',
  dirt: 'dirt',
  bare: 'dirt',
  wash: 'dirt',
  gravel: 'gravel',
  paving: 'paving',
  concrete: 'concrete',
};

/**
 * What each ground layer is underfoot (groundheight.ts `GROUND_LAYERS`), where it's the one that answers; `land` is the
 * open ground's own (the street's asphalt or the cover), `slab` a block's paving
 */
export const LAYER_SURFACE: Record<string, Surface | 'land' | 'slab'> = {
  home: 'wood',
  tunnel: 'concrete',
  sky: 'concrete',
  visitors: 'concrete',
  recbridge: 'wood',
  south: 'land',
  verge: 'land',
  hills: 'land',
  rolls: 'land',
  harbour: 'concrete',
  swing: 'metal',
  viaduct: 'concrete',
  departures: 'concrete',
  liberty: 'metal',
  link: 'tile',
  mall: 'tile',
  court: 'tile',
  shore: 'land',
  turntable: 'metal',
  jetty: 'wood',
  terrace: 'paving',
  skydeck: 'tile',
  civic: 'paving',
  circuit: 'asphalt',
  banks: 'land',
};

/** Under a roof: no rain on it */
const INDOOR_LAYERS = new Set(['home', 'tunnel', 'link', 'mall', 'court']);
/** Hard ground, where a puddle splashes */
const HARD = new Set<Surface>(['asphalt', 'paving', 'concrete', 'tile', 'metal', 'wood']);

/** The streets at street level in cells of `CELL` tiles (made the first time a step asks) */
const CELL = 24;
let cells: Map<string, Street[]> | null = null;
function streetCells() {
  if (cells) return cells;
  cells = new Map();
  for (const s of PLAN.streets) {
    if (raised(s)) continue;
    const xs = s.pts.map((p) => p[0]);
    const zs = s.pts.map((p) => p[1]);
    for (let i = Math.floor((Math.min(...xs) - s.half) / CELL); i <= Math.floor((Math.max(...xs) + s.half) / CELL); i++)
      for (let j = Math.floor((Math.min(...zs) - s.half) / CELL); j <= Math.floor((Math.max(...zs) + s.half) / CELL); j++) {
        const k = `${i},${j}`;
        const list = cells.get(k);
        if (list) list.push(s);
        else cells.set(k, [s]);
      }
  }
  return cells;
}

/** Whether x, z is on a street's paved width (asphalt), at street level */
export function onStreet(x: number, z: number) {
  const list = streetCells().get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
  if (!list) return false;
  for (const s of list) {
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1];
      const b = s.pts[i];
      const vx = b[0] - a[0];
      const vz = b[1] - a[1];
      const l2 = vx * vx + vz * vz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)) : 0;
      if (Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)) <= s.half) return true;
    }
  }
  return false;
}

/** The open ground's surface: the street's asphalt, else the cover that has most of it */
function landAt(x: number, z: number): Surface {
  if (onStreet(x, z)) return 'asphalt';
  const mix = coverAt(x, z);
  let best: Cover = 'rough';
  let most = -1;
  for (const c in mix) {
    const v = mix[c as Cover]!;
    if (v > most) {
      most = v;
      best = c as Cover;
    }
  }
  return COVER_SURFACE[best];
}

/**
 * What's underfoot at x, z for someone standing `yNow` high, and whether it's under a roof: groundheight.ts's layers
 * asked in their order as `groundAt()` asks them, the one whose height is the answer saying what it is
 */
export function surfaceAt(x: number, z: number, yNow = 0): { surface: Surface; indoor: boolean } {
  if (inHouse(x, z, yNow)) return { surface: 'wood', indoor: true };
  const b = baseAt(x, z);
  const g: GroundCtx = { ...b, leavesOpen: false };
  let base: string = b.slab ? 'slab' : b.open ? 'open' : onDeck(x, z) ? 'deck' : 'esplanade';
  let id: string | null = null;
  for (const L of GROUND_LAYERS) {
    const y = L.at(x, z, yNow, g);
    if (y === null) continue;
    if (L.how === 'take') {
      id = L.id;
      break;
    }
    if (L.how === 'over') {
      if (y >= g.base) id = L.id;
      break;
    }
    if (y > g.base) base = L.id;
    g.base = Math.max(g.base, y);
  }
  const which = id ?? base;
  const indoor = INDOOR_LAYERS.has(which);
  const kind = which === 'open' ? 'land' : which === 'slab' ? 'slab' : which === 'deck' ? 'wood' : which === 'esplanade' ? 'paving' : (LAYER_SURFACE[which] ?? 'land');
  // (the south's lifted ground and the like: a slab under it is paving, open ground the street or the land)
  const surface = kind === 'slab' ? 'paving' : kind === 'land' ? (b.slab ? 'paving' : landAt(x, z)) : kind;
  return { surface, indoor };
}

/** What walk mode tells the footsteps each frame */
export interface StepInput {
  dt: number;
  /** Where he stands, the ground under him */
  x: number;
  y: number;
  z: number;
  /** How fast he's going (tiles a second), the way he faces (world yaw) */
  speed: number;
  face: number;
  grounded: boolean;
  /** Up the fall's speed: the frame's vertical speed (negative coming down) */
  vy: number;
  /** How far into a crouch, 0-1; a slide under way */
  crouch: number;
  sliding: boolean;
  /** Each foot on the ground: the motion capture's locked feet, or the procedural walk's stance; null while neither is posing his legs (a vault, a moment) */
  feet: readonly boolean[] | null;
  /** The rain, 0-1 */
  rain: number;
}

/** The gait at a speed (crouched, a creep) */
export function gaitOf(speed: number, crouch = 0): Gait {
  if (crouch > 0.5) return 'creep';
  if (speed < (GAITS.walk + GAITS.run) / 2) return 'walk';
  if (speed < (GAITS.run + GAITS.sprint) / 2) return 'jog';
  return 'sprint';
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The footsteps: `update()` each frame on foot gives the steps that frame (none, usually; one as a foot comes down).
 * `surface` stands in for `surfaceAt()` (the tests'); `seed` the generator's.
 */
export function createFootsteps(opts: { seed?: number; surface?: (x: number, z: number, y: number) => { surface: Surface; indoor: boolean } } = {}) {
  const where = opts.surface ?? surfaceAt;
  let s = (opts.seed ?? 7) >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const last: Partial<Record<Surface, number>> = {};
  /** Each foot down last frame; whether there were feet to ask */
  const was = [false, false];
  let hadFeet = false;
  let wasGrounded = true;
  let wasSliding = false;
  let wasFace = 0;
  let started = false;
  let clock = 0;
  const footAt = [-Infinity, -Infinity];
  let anyAt = -Infinity;
  let landedAt = -Infinity;
  let scuffAt = -Infinity;
  let fastAt = -Infinity;

  const make = (kind: StepKind, foot: 0 | 1, inp: StepInput, weight: number): Step => {
    const { surface, indoor } = where(inp.x, inp.z, inp.y + 0.3);
    const wet = indoor || inp.rain < STEPS.dryUnder ? 0 : Math.min(1, inp.rain);
    let take = Math.floor(rand() * (STEPS.takes - 1));
    if (take >= (last[surface] ?? -1)) take++;
    take = Math.min(STEPS.takes - 1, take);
    last[surface] = take;
    const splash = wet > 0 && HARD.has(surface) && rand() < STEPS.splash * wet;
    return { kind, foot, surface, gait: gaitOf(inp.speed, inp.crouch), weight: Math.max(0, Math.min(1, weight)), wet, splash, take, detune: rand() * 2 - 1 };
  };

  const keep = (inp: StepInput) => {
    hadFeet = !!inp.feet;
    was[0] = !!inp.feet?.[0];
    was[1] = !!inp.feet?.[1];
    wasGrounded = inp.grounded;
    wasSliding = inp.sliding;
    wasFace = inp.face;
  };

  return {
    update(inp: StepInput): Step[] {
      const out: Step[] = [];
      clock += inp.dt;
      if (!started) {
        started = true;
        keep(inp);
        return out;
      }
      const gait = gaitOf(inp.speed, inp.crouch);
      // A landing: heavier the harder he comes down
      if (inp.grounded && !wasGrounded && -inp.vy > STEPS.land) {
        out.push(make('land', 0, inp, 0.3 + 0.7 * Math.min(1, (-inp.vy - STEPS.land) / (LAND_ROLL - STEPS.land))));
        landedAt = clock;
      }
      // A slide's scrape as it starts
      if (inp.sliding && !wasSliding && inp.grounded) out.push(make('slide', 0, inp, Math.min(1, inp.speed / GAITS.sprint)));
      // A foot coming down
      if (inp.feet && inp.grounded && !inp.sliding && inp.speed >= STEPS.idle && clock - landedAt > STEPS.afterLand) {
        for (let i = 0; i < inp.feet.length && i < 2; i++) {
          const down = inp.feet[i];
          if (down && hadFeet && !was[i] && clock - footAt[i] >= STEPS.gap && clock - anyAt >= STEPS.pair) {
            footAt[i] = anyAt = clock;
            out.push(make('step', i as 0 | 1, inp, STEPS.weight[gait] * (1 - (1 - STEPS.crouched) * inp.crouch)));
          }
        }
      }
      // A scuff: pulled up sharply from a run, or a quick turn on the spot
      if (inp.grounded && !inp.sliding) {
        if (inp.speed >= GAITS.run * STEPS.stopFrom) fastAt = clock;
        const turning = inp.dt > 0 && Math.abs(wrap(inp.face - wasFace)) / inp.dt > STEPS.turn && inp.speed < STEPS.turnUnder;
        const stopped = inp.speed < GAITS.walk * STEPS.stopTo && clock - fastAt < STEPS.stopIn;
        if ((turning || stopped) && clock - scuffAt >= STEPS.scuffGap && clock - landedAt > STEPS.afterLand) {
          scuffAt = clock;
          if (stopped) fastAt = -Infinity;
          out.push(make('scuff', 0, inp, stopped ? 0.8 : 0.4));
        }
      }
      keep(inp);
      return out;
    },
    /** Start again (walking starts, a teleport, out of a vehicle): nothing fires off the jump */
    reset() {
      started = false;
      fastAt = landedAt = scuffAt = anyAt = -Infinity;
      footAt[0] = footAt[1] = -Infinity;
    },
  };
}
export type Footsteps = ReturnType<typeof createFootsteps>;
