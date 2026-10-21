/*
 * The fight rules (docs/fight-plan.md, Phase 1): hand-to-hand fighting with
 * punches and kicks. DOM-free, seeded and on a fixed 60 Hz tick, like
 * combat-sim.ts and kart-sim.ts, so the game server can run it for
 * player-versus-player and the browser predicts the same thing.
 *
 * - Fighters have health, stamina, a guard and one move at a time. A move
 *   runs start-up, active and recovery frames (`MOVES`); its strike lands
 *   on an active frame when the target is in reach and inside its arc.
 * - Chains: punch again inside a move's recovery and the next move in the
 *   chain starts (jab, cross, hook, uppercut); a kick after a cross or a
 *   hook is the roundhouse. Hit stun is a little longer than the next
 *   move's start-up, so a chain lands if the first hit does. A blocked hit
 *   breaks the chain (the attacker's recovery runs longer).
 * - Block (hold): damage to a fifth, no stun, stamina pays. A block begun
 *   in the last `T.parryWindow` frames before the hit is a parry: the
 *   attacker staggers instead.
 * - Dodge: a short step, invulnerable through its active frames.
 * - Stamina drains per move and per blocked hit, refills while guarding or
 *   idle; at zero a fighter can only walk and block until a quarter is back.
 * - Knockdown on an uppercut, on a hit while staggered, or at no health
 *   (a knock-out); 3 s on the ground, invulnerable, then up with full
 *   stamina. In a spar a knock-out ends nothing (up with full health, the
 *   knock-out counted); in a bout it ends the round.
 * - Bots: `bot: { skill }` on a fighter gives it a brain (`think()`): a
 *   seeded state machine that closes in, probes, chains, blocks, dodges and
 *   backs off. It never throws from out of reach and never leaves the arena.
 * - Bouts: rounds on a clock with a bell, a rest between them, the round to
 *   the fighter with more health when time runs out; first to two rounds.
 *
 * Facing: a fighter's `yaw` faces along (sin yaw, cos yaw), the way a Degen
 * figure faces with `group.rotation.y = yaw` (character.ts). Lengths are
 * tiles (about 1.8 m). The view (fight.ts, the ?fight harness) reads
 * `move`, `phase`, `frame`, `hurt`, `down`, `getup` and `blocking` to pick
 * and time its clips (fight-anim.ts).
 */

export type MoveId = 'jab' | 'cross' | 'hook' | 'uppercut' | 'frontKick' | 'roundhouse' | 'dodge';
export type StyleId = 'brawler' | 'kickboxer' | 'street';
export type MoveKind = 'punch' | 'kick' | 'dodge';
export type Limb = 'armL' | 'armR' | 'legL' | 'legR';
export type Phase = 'startup' | 'active' | 'recovery';

export interface MoveSpec {
  id: MoveId;
  name: string;
  kind: MoveKind;
  /** The striking limb (the clip animates it; the strike point is in front of the fighter either way) */
  limb: Limb;
  /** Frames at 60 Hz */
  startup: number;
  active: number;
  recovery: number;
  /** How far in front of the fighter's centre the strike reaches (tiles), and the half-angle it covers (radians) */
  reach: number;
  arc: number;
  damage: number;
  /** Frames the target can't act after a clean hit */
  stun: number;
  /** How far the target is pushed back (tiles) */
  knockback: number;
  stamina: number;
  /** The step the fighter takes into the move over its start-up and active frames (tiles) */
  lunge: number;
  /** A heavy hit staggers (a longer stun, and a hit while staggered knocks down) */
  heavy: boolean;
  /** Knocks the target down on a hit */
  knockdown: boolean;
  /** What another punch chains into from this move's recovery, and what a kick does */
  next?: MoveId;
  kick?: MoveId;
}

export const MOVES: Record<MoveId, MoveSpec> = {
  jab: { id: 'jab', name: 'Jab', kind: 'punch', limb: 'armL', startup: 6, active: 3, recovery: 8, reach: 1.1, arc: 0.6, damage: 8, stun: 12, knockback: 0.15, stamina: 8, lunge: 0.25, heavy: false, knockdown: false, next: 'cross' },
  cross: { id: 'cross', name: 'Cross', kind: 'punch', limb: 'armR', startup: 8, active: 3, recovery: 12, reach: 1.2, arc: 0.55, damage: 12, stun: 14, knockback: 0.25, stamina: 10, lunge: 0.35, heavy: false, knockdown: false, next: 'hook', kick: 'roundhouse' },
  hook: { id: 'hook', name: 'Hook', kind: 'punch', limb: 'armL', startup: 10, active: 4, recovery: 16, reach: 1.0, arc: 0.8, damage: 16, stun: 20, knockback: 0.3, stamina: 12, lunge: 0.2, heavy: true, knockdown: false, next: 'uppercut', kick: 'roundhouse' },
  uppercut: { id: 'uppercut', name: 'Uppercut', kind: 'punch', limb: 'armR', startup: 12, active: 4, recovery: 24, reach: 0.9, arc: 0.5, damage: 24, stun: 30, knockback: 0.4, stamina: 18, lunge: 0.15, heavy: true, knockdown: true },
  frontKick: { id: 'frontKick', name: 'Front kick', kind: 'kick', limb: 'legR', startup: 10, active: 4, recovery: 16, reach: 1.5, arc: 0.45, damage: 14, stun: 16, knockback: 0.7, stamina: 14, lunge: 0.3, heavy: false, knockdown: false, kick: 'roundhouse' },
  roundhouse: { id: 'roundhouse', name: 'Roundhouse', kind: 'kick', limb: 'legR', startup: 14, active: 5, recovery: 22, reach: 1.4, arc: 0.95, damage: 22, stun: 24, knockback: 0.45, stamina: 20, lunge: 0.2, heavy: true, knockdown: false },
  dodge: { id: 'dodge', name: 'Dodge', kind: 'dodge', limb: 'legL', startup: 4, active: 10, recovery: 8, reach: 0, arc: 0, damage: 0, stun: 0, knockback: 0, stamina: 16, lunge: 0, heavy: false, knockdown: false },
};
export const MOVE_IDS = Object.keys(MOVES) as MoveId[];
export const moveFrames = (m: MoveId) => MOVES[m].startup + MOVES[m].active + MOVES[m].recovery;

/** The styles: which moves a fighter has (bought at the ring in Phase 3; the Brawler is everyone's) */
export interface StyleSpec {
  id: StyleId;
  name: string;
  moves: MoveId[];
  /** A block timed just before the hit staggers the attacker */
  parry: boolean;
  /** How far a dodge steps */
  dodge: number;
}
export const STYLES: Record<StyleId, StyleSpec> = {
  brawler: { id: 'brawler', name: 'Brawler', moves: ['jab', 'cross', 'hook', 'frontKick', 'dodge'], parry: false, dodge: 1.2 },
  kickboxer: { id: 'kickboxer', name: 'Kickboxer', moves: ['jab', 'cross', 'hook', 'frontKick', 'roundhouse', 'dodge'], parry: false, dodge: 1.2 },
  street: { id: 'street', name: 'Street', moves: ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundhouse', 'dodge'], parry: true, dodge: 1.6 },
};

export const T = {
  tick: 1 / 60,
  health: 100,
  stamina: 100,
  /** Stamina back per second: free, and while blocking; the slow crawl back from empty */
  regen: 22,
  regenBlocking: 9,
  regenEmpty: 12,
  /** Empty until this much is back */
  emptyUntil: 25,
  /** A block keeps this share of the damage, and pays this much stamina a hit */
  blockCut: 0.2,
  blockCost: 6,
  /** A block begun within this many frames before the hit parries it; the attacker's stagger */
  parryWindow: 6,
  parryStun: 30,
  /** The stun of a heavy hit's stagger (replaces the move's own) */
  staggerStun: 36,
  /** On the ground after a knockdown, after a knock-out, then the get-up */
  downFrames: 180,
  koFrames: 240,
  getupFrames: 40,
  /** Walking, and while blocking (tiles a second) */
  walk: 3.2,
  blockWalk: 1.4,
  /** A fighter's body circle, and how close two can stand */
  radius: 0.35,
  /** Moves turn the fighter onto a target this close and within this angle */
  lockReach: 3,
  lockArc: 1.05,
  /** Health back in a spar: after this many frames without a hit, this much a second */
  healDelay: 180,
  heal: 8,
  /** A blocked hit adds this to the attacker's recovery (the chain breaks) */
  blockedRecovery: 8,
  /** Knockback eases out this fast (per second) */
  slide: 7,
  /** Bouts: the bell's pause, the rest between rounds, the count after a knock-out */
  bell: 120,
  rest: 180,
};

export interface FighterInput {
  /** Walk direction, world axes (-1..1 each) */
  x: number;
  z: number;
  /** Face this way (radians); undefined keeps the facing (bots face their target) */
  face?: number;
  punch: boolean;
  kick: boolean;
  block: boolean;
  dodge: boolean;
}
export const NO_INPUT: FighterInput = { x: 0, z: 0, punch: false, kick: false, block: false, dodge: false };

export interface Brain {
  skill: number;
  /** Frames until the next attack */
  cool: number;
  /** Where it's going: in, pressing a chain, away, or sideways */
  plan: 'approach' | 'press' | 'retreat' | 'circle';
  planT: number;
  /** Frames to go before it answers the opponent's move */
  react: number;
  /** The decision made about the opponent's current move: block, dodge, take it; keyed by the move's start frame */
  answer: 'block' | 'dodge' | 'none';
  answerFor: number;
  /** Frames left holding the block */
  blockT: number;
  /** Which way it circles */
  side: 1 | -1;
}

export interface Fighter {
  id: string;
  name: string;
  style: StyleId;
  x: number;
  z: number;
  yaw: number;
  /** Knockback and dodge velocity (tiles a second) */
  vx: number;
  vz: number;
  health: number;
  stamina: number;
  /** Out of stamina until a quarter is back */
  empty: boolean;
  /** The move in progress, its phase and the frame within the whole move (0 on its first frame) */
  move: MoveId | null;
  phase: Phase | null;
  frame: number;
  /** Landed (or was blocked) on this move already */
  struck: boolean;
  /** The next move queued from a chain input during recovery */
  queued: MoveId | null;
  /** Extra recovery after a blocked hit */
  extraRecovery: number;
  /** Frames left of hit stun, and what kind of hit (for the reaction clip); `hurtFrame` counts up from the hit */
  stun: number;
  hurt: 'head' | 'body' | 'stagger' | null;
  hurtFrame: number;
  /** On the ground: frames left; then getting up: frames left */
  down: number;
  downTotal: number;
  getup: number;
  /** Was the fall a knock-out? */
  ko: boolean;
  blocking: boolean;
  /** Frames since the block began (the parry window) */
  blockFrames: number;
  /** Frames of invulnerability (a dodge, the ground, the spawn) */
  invuln: number;
  /** Walking speed this frame (for the walk clip) and direction relative to the facing */
  moving: number;
  /** Frames since the last hit taken (healing in a spar) */
  sinceHit: number;
  /** The chain so far (landed hits in a row), and the best this fight */
  chain: number;
  bestChain: number;
  /** Tallies */
  hits: number;
  taken: number;
  kos: number;
  knockdowns: number;
  rounds: number;
  bot: Brain | null;
  /** The fighter it faces (bots pick the nearest; players through the view's lock-on) */
  target: string | null;
}

export type FightEvent =
  | { kind: 'swing'; who: string; move: MoveId }
  | { kind: 'hit'; who: string; target: string; move: MoveId; damage: number; heavy: boolean; x: number; y: number; z: number }
  | { kind: 'block'; who: string; target: string; move: MoveId; x: number; y: number; z: number }
  | { kind: 'parry'; who: string; target: string }
  | { kind: 'stagger'; who: string }
  | { kind: 'knockdown'; who: string; by: string; ko: boolean }
  | { kind: 'getup'; who: string }
  | { kind: 'dodge'; who: string }
  | { kind: 'chain'; who: string; n: number }
  | { kind: 'tired'; who: string }
  | { kind: 'bell'; round: number }
  | { kind: 'round'; round: number; winner: string | null }
  | { kind: 'bout'; winner: string | null };

export interface FighterSetup {
  id: string;
  name: string;
  style: StyleId;
  x: number;
  z: number;
  yaw: number;
  bot?: { skill: number };
}
export interface FightSetup {
  seed: number;
  fighters: FighterSetup[];
  /** A bout: rounds on a clock (first to two); null is an open spar */
  bout?: { rounds: number; seconds: number } | null;
  /** The ring: nobody leaves this circle */
  arena?: { x: number; z: number; r: number } | null;
}

export type BoutPhase = 'bell' | 'fight' | 'rest' | 'over';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const forward = (yaw: number): [number, number] => [Math.sin(yaw), Math.cos(yaw)];
/** The facing that looks from (x, z) at (tx, tz) */
export const yawTo = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);

/** Small seeded random generator (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newFighter(s: FighterSetup): Fighter {
  return {
    id: s.id,
    name: s.name,
    style: s.style,
    x: s.x,
    z: s.z,
    yaw: s.yaw,
    vx: 0,
    vz: 0,
    health: T.health,
    stamina: T.stamina,
    empty: false,
    move: null,
    phase: null,
    frame: 0,
    struck: false,
    queued: null,
    extraRecovery: 0,
    stun: 0,
    hurt: null,
    hurtFrame: 0,
    down: 0,
    downTotal: 0,
    getup: 0,
    ko: false,
    blocking: false,
    blockFrames: 0,
    invuln: 0,
    moving: 0,
    sinceHit: 1e6,
    chain: 0,
    bestChain: 0,
    hits: 0,
    taken: 0,
    kos: 0,
    knockdowns: 0,
    rounds: 0,
    bot: s.bot ? { skill: clamp(s.bot.skill, 0, 1), cool: 30, plan: 'approach', planT: 0, react: 0, answer: 'none', answerFor: -1, blockT: 0, side: 1 } : null,
    target: null,
  };
}

/** Can this fighter act (walk, block, throw)? */
export const canAct = (f: Fighter) => f.down <= 0 && f.getup <= 0 && f.stun <= 0;
/** Which move a punch or a kick starts from here (null if none) */
export function nextMove(f: Fighter, kind: 'punch' | 'kick'): MoveId | null {
  const style = STYLES[f.style];
  const has = (m: MoveId | undefined) => (m && style.moves.includes(m) ? m : null);
  if (f.move && f.move !== 'dodge' && f.phase === 'recovery') {
    const m = MOVES[f.move];
    return kind === 'punch' ? has(m.next) : has(m.kick);
  }
  if (f.move) return null;
  return kind === 'punch' ? has('jab') : has('frontKick');
}

export function createFightSim(setup: FightSetup) {
  const rand = rng(setup.seed);
  const fighters: Fighter[] = setup.fighters.map(newFighter);
  const byId = new Map(fighters.map((f) => [f.id, f]));
  const arena = setup.arena ?? null;
  const bout = setup.bout ?? null;
  let acc = 0;
  let ticks = 0;
  let events: FightEvent[] = [];
  /** The bout's state */
  let round = bout ? 1 : 0;
  let boutPhase: BoutPhase = bout ? 'bell' : 'fight';
  let boutT = bout ? T.bell : 0;
  let winner: string | null = null;

  const other = (f: Fighter) => {
    let best: Fighter | null = null;
    let bd = Infinity;
    for (const o of fighters) {
      if (o === f) continue;
      const d = Math.hypot(o.x - f.x, o.z - f.z);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  };

  /* ---------- Moves ---------- */

  function startMove(f: Fighter, id: MoveId) {
    const m = MOVES[id];
    f.move = id;
    f.phase = 'startup';
    f.frame = 0;
    f.struck = false;
    f.queued = null;
    f.extraRecovery = 0;
    f.blocking = false;
    f.stamina -= m.stamina;
    if (f.stamina <= 0) {
      f.stamina = 0;
      f.empty = true;
    }
    // Turn onto the target if it's close and roughly ahead
    const o = f.target ? byId.get(f.target) : other(f);
    if (o && id !== 'dodge') {
      const d = Math.hypot(o.x - f.x, o.z - f.z);
      const want = yawTo(f.x, f.z, o.x, o.z);
      if (d < T.lockReach && Math.abs(wrap(want - f.yaw)) < T.lockArc) f.yaw = want;
    }
    if (id === 'dodge') events.push({ kind: 'dodge', who: f.id });
    else events.push({ kind: 'swing', who: f.id, move: id });
  }

  /** The strike point of a move: in front of the fighter, at hand or foot height */
  function strikeAt(f: Fighter, m: MoveSpec): [number, number, number] {
    const [fx, fz] = forward(f.yaw);
    const r = m.reach * 0.85;
    return [f.x + fx * r, m.kind === 'kick' ? (m.id === 'roundhouse' ? 0.95 : 0.7) : m.id === 'uppercut' ? 1.0 : 1.05, f.z + fz * r];
  }

  /** The active frames: does the move land on anyone? */
  function strike(f: Fighter) {
    const m = MOVES[f.move!];
    if (m.kind === 'dodge' || f.struck) return;
    const [fx, fz] = forward(f.yaw);
    for (const o of fighters) {
      if (o === f || o.invuln > 0 || o.down > 0) continue;
      const dx = o.x - f.x;
      const dz = o.z - f.z;
      const d = Math.hypot(dx, dz);
      if (d > m.reach + T.radius) continue;
      const ang = Math.abs(wrap(Math.atan2(dx, dz) - f.yaw));
      if (ang > m.arc && d > T.radius * 2 + 0.05) continue;
      f.struck = true;
      const [px, py, pz] = strikeAt(f, m);
      // Facing the blow? A block only covers the front
      const [ox, oz] = forward(o.yaw);
      const facing = (-dx * ox - dz * oz) / Math.max(d, 1e-6) > 0.1;
      if (o.blocking && facing) {
        o.stamina = Math.max(0, o.stamina - T.blockCost);
        if (o.stamina === 0) o.empty = true;
        if (STYLES[o.style].parry && o.blockFrames <= T.parryWindow) {
          // A parry: the attacker staggers
          f.stun = T.parryStun;
          f.hurt = 'stagger';
          f.hurtFrame = 0;
          f.move = null;
          f.phase = null;
          f.chain = 0;
          events.push({ kind: 'parry', who: o.id, target: f.id });
          events.push({ kind: 'stagger', who: f.id });
          return;
        }
        o.health = Math.max(0, o.health - m.damage * T.blockCut);
        o.vx += fx * m.knockback * 2;
        o.vz += fz * m.knockback * 2;
        f.extraRecovery = T.blockedRecovery;
        f.chain = 0;
        events.push({ kind: 'block', who: o.id, target: f.id, move: m.id, x: px, y: py, z: pz });
        if (o.health <= 0) fall(o, f, true);
        return;
      }
      // A clean hit
      const staggered = o.hurt === 'stagger' && o.stun > 0;
      o.health = Math.max(0, o.health - m.damage);
      o.taken++;
      o.sinceHit = 0;
      o.blocking = false;
      o.move = null;
      o.phase = null;
      o.queued = null;
      o.vx += fx * m.knockback * 6;
      o.vz += fz * m.knockback * 6;
      f.hits++;
      f.chain++;
      if (f.chain > f.bestChain) f.bestChain = f.chain;
      events.push({ kind: 'hit', who: f.id, target: o.id, move: m.id, damage: m.damage, heavy: m.heavy, x: px, y: py, z: pz });
      if (f.chain >= 2) events.push({ kind: 'chain', who: f.id, n: f.chain });
      if (o.health <= 0) fall(o, f, true);
      else if (m.knockdown || staggered) fall(o, f, false);
      else {
        o.stun = m.heavy ? T.staggerStun : m.stun;
        o.hurt = m.heavy ? 'stagger' : m.kind === 'kick' || m.id === 'jab' ? 'body' : 'head';
        o.hurtFrame = 0;
        if (m.heavy) events.push({ kind: 'stagger', who: o.id });
      }
      return;
    }
  }

  function fall(o: Fighter, by: Fighter, ko: boolean) {
    o.down = ko ? T.koFrames : T.downFrames;
    o.downTotal = o.down;
    o.ko = ko;
    o.stun = 0;
    o.hurt = null;
    o.move = null;
    o.phase = null;
    o.blocking = false;
    o.invuln = o.down + T.getupFrames;
    o.knockdowns++;
    if (ko) by.kos++;
    events.push({ kind: 'knockdown', who: o.id, by: by.id, ko });
    if (ko && bout && boutPhase === 'fight') endRound(by.id);
  }

  /* ---------- Bots ---------- */

  function think(f: Fighter): FighterInput {
    const b = f.bot!;
    const o = other(f);
    const inp: FighterInput = { x: 0, z: 0, punch: false, kick: false, block: false, dodge: false };
    if (!o) return inp;
    f.target = o.id;
    const dx = o.x - f.x;
    const dz = o.z - f.z;
    const d = Math.hypot(dx, dz);
    const ux = d > 1e-6 ? dx / d : 0;
    const uz = d > 1e-6 ? dz / d : 1;
    inp.face = yawTo(f.x, f.z, o.x, o.z);
    if (b.cool > 0) b.cool--;
    if (b.planT > 0) b.planT--;
    if (b.react > 0) b.react--;
    if (b.blockT > 0) b.blockT--;
    const inReach = d <= MOVES.jab.reach + T.radius - 0.05;
    const kickReach = d <= MOVES.frontKick.reach + T.radius - 0.1;

    // The opponent's move coming: decide once per move, after the reaction time
    if (o.move && o.move !== 'dodge' && o.phase === 'startup' && o.down <= 0) {
      const key = ticks - o.frame;
      if (b.answerFor !== key) {
        b.answerFor = key;
        b.react = Math.round((1 - b.skill) * 14) + 2;
        const r = rand();
        b.answer = r < b.skill * 0.55 ? 'block' : r < b.skill * 0.55 + 0.12 && !f.empty ? 'dodge' : 'none';
      }
      if (b.react <= 0 && d < MOVES[o.move].reach + T.radius + 0.5 && Math.abs(wrap(yawTo(o.x, o.z, f.x, f.z) - o.yaw)) < 1.2) {
        if (b.answer === 'block') b.blockT = Math.max(b.blockT, MOVES[o.move].startup + MOVES[o.move].active + 4);
        else if (b.answer === 'dodge' && !f.move) {
          inp.dodge = true;
          inp.x = -ux;
          inp.z = -uz;
          b.answer = 'none';
          return inp;
        }
      }
    }
    if (b.blockT > 0 && !f.move) {
      inp.block = true;
      return inp;
    }

    // Pressing a chain
    if (f.move && f.move !== 'dodge' && f.phase === 'recovery') {
      const m = MOVES[f.move];
      if (f.chain > 0 && inReach && rand() < 0.35 + b.skill * 0.6) {
        if (m.kick && rand() < 0.3 && STYLES[f.style].moves.includes(m.kick)) inp.kick = true;
        else if (m.next && STYLES[f.style].moves.includes(m.next)) inp.punch = true;
      }
      return inp;
    }
    if (f.move) return inp;

    // Plans
    if (b.planT <= 0) {
      const r = rand();
      b.plan = r < 0.55 ? 'approach' : r < 0.8 ? 'circle' : 'retreat';
      b.planT = 30 + Math.floor(rand() * 60);
      b.side = rand() < 0.5 ? 1 : -1;
    }
    if (f.empty) b.plan = 'retreat';
    const want = b.plan === 'retreat' ? 2.4 : MOVES.jab.reach + T.radius - 0.25;
    if (d > want + 0.15) {
      inp.x = ux;
      inp.z = uz;
    } else if (d < want - 0.3) {
      inp.x = -ux;
      inp.z = -uz;
    }
    if (b.plan === 'circle') {
      inp.x += -uz * b.side * 0.8;
      inp.z += ux * b.side * 0.8;
    }
    // An attack, only from reach, only with the stamina for it
    if (b.cool <= 0 && !f.empty && b.plan !== 'retreat' && f.stamina >= 24) {
      if (kickReach && !inReach && rand() < 0.25 + b.skill * 0.3) {
        inp.kick = true;
        b.cool = 40 + Math.round((1 - b.skill) * 50);
      } else if (inReach) {
        if (rand() < 0.25) inp.kick = true;
        else inp.punch = true;
        b.cool = 40 + Math.round((1 - b.skill) * 50);
      }
    }
    return inp;
  }

  /* ---------- The tick ---------- */

  function act(f: Fighter, inp: FighterInput) {
    f.moving = 0;
    if (f.down > 0) {
      f.down--;
      if (f.down === 0) {
        f.getup = T.getupFrames;
        f.stamina = T.stamina;
        f.empty = false;
        if (f.ko && !bout) f.health = T.health;
        events.push({ kind: 'getup', who: f.id });
      }
      return;
    }
    if (f.getup > 0) {
      f.getup--;
      return;
    }
    if (f.stun > 0) {
      f.stun--;
      f.hurtFrame++;
      if (f.stun === 0) f.hurt = null;
      return;
    }
    f.hurt = null;
    if (inp.face !== undefined && !f.move) f.yaw = inp.face;

    // A move in progress
    if (f.move) {
      const m = MOVES[f.move];
      f.frame++;
      const total = m.startup + m.active + m.recovery + f.extraRecovery;
      if (f.frame < m.startup) f.phase = 'startup';
      else if (f.frame < m.startup + m.active) f.phase = 'active';
      else f.phase = 'recovery';
      if (f.frame < m.startup + m.active) {
        if (m.kind === 'dodge') {
          if (f.frame === m.startup) f.invuln = Math.max(f.invuln, m.active);
        } else {
          const [fx, fz] = forward(f.yaw);
          const step = m.lunge / (m.startup + m.active);
          f.x += fx * step;
          f.z += fz * step;
          if (f.phase === 'active') strike(f);
        }
      }
      // A chain input during recovery queues the next move
      if (f.phase === 'recovery' && f.extraRecovery === 0 && !f.queued && (inp.punch || inp.kick)) {
        const n = nextMove(f, inp.punch ? 'punch' : 'kick');
        if (n && !f.empty && f.stamina >= MOVES[n].stamina * 0.5) f.queued = n;
        else if (n) events.push({ kind: 'tired', who: f.id });
      }
      if (f.frame >= total) {
        const q = f.queued;
        f.move = null;
        f.phase = null;
        f.frame = 0;
        if (q) startMove(f, q);
        else if (m.kind !== 'dodge' && f.chain > 0 && !f.struck) f.chain = 0;
      }
      return;
    }

    // Free: block, dodge, a first move, or walk
    if (inp.block) {
      if (!f.blocking) f.blockFrames = 0;
      else f.blockFrames++;
      f.blocking = true;
    } else f.blocking = false;
    if (inp.dodge && !f.empty && f.stamina >= MOVES.dodge.stamina * 0.5 && STYLES[f.style].moves.includes('dodge')) {
      startMove(f, 'dodge');
      const len = Math.hypot(inp.x, inp.z);
      const [fx, fz] = forward(f.yaw);
      const dirx = len > 0.1 ? inp.x / len : -fx;
      const dirz = len > 0.1 ? inp.z / len : -fz;
      const speed = (STYLES[f.style].dodge / MOVES.dodge.active) * 60;
      f.vx = dirx * speed;
      f.vz = dirz * speed;
      return;
    }
    if ((inp.punch || inp.kick) && !f.blocking) {
      const n = nextMove(f, inp.punch ? 'punch' : 'kick');
      if (n) {
        if (f.empty || f.stamina < MOVES[n].stamina * 0.5) events.push({ kind: 'tired', who: f.id });
        else {
          startMove(f, n);
          return;
        }
      }
    }
    // Walking
    const len = Math.hypot(inp.x, inp.z);
    if (len > 0.1) {
      const sp = (f.blocking ? T.blockWalk : T.walk) * Math.min(1, len) * T.tick;
      f.x += (inp.x / len) * sp;
      f.z += (inp.z / len) * sp;
      f.moving = Math.min(1, len) * (f.blocking ? T.blockWalk / T.walk : 1);
    }
  }

  function endRound(w: string | null) {
    if (!bout || boutPhase !== 'fight') return;
    if (w) byId.get(w)!.rounds++;
    events.push({ kind: 'round', round, winner: w });
    const need = Math.ceil(bout.rounds / 2 + 0.01);
    const champ = fighters.find((f) => f.rounds >= need);
    if (champ || round >= bout.rounds) {
      winner = champ?.id ?? best();
      boutPhase = 'over';
      boutT = 0;
      events.push({ kind: 'bout', winner });
    } else {
      boutPhase = 'rest';
      boutT = T.rest;
    }
  }
  /** The bout's leader: rounds won, then health */
  function best(): string | null {
    const s = [...fighters].sort((a, b) => b.rounds - a.rounds || b.health - a.health);
    if (s.length > 1 && s[0].rounds === s[1].rounds && s[0].health === s[1].health) return null;
    return s[0]?.id ?? null;
  }

  function tickBout() {
    if (!bout) return;
    if (boutPhase === 'bell') {
      if (--boutT <= 0) {
        boutPhase = 'fight';
        boutT = bout.seconds * 60;
        events.push({ kind: 'bell', round });
      }
    } else if (boutPhase === 'fight') {
      if (--boutT <= 0) {
        const s = [...fighters].sort((a, b) => b.health - a.health);
        endRound(s.length > 1 && s[0].health === s[1].health ? null : (s[0]?.id ?? null));
      }
    } else if (boutPhase === 'rest') {
      if (--boutT <= 0) {
        round++;
        for (const f of fighters) {
          f.health = T.health;
          f.stamina = T.stamina;
          f.empty = false;
          f.move = null;
          f.phase = null;
          f.stun = 0;
          f.hurt = null;
          f.down = 0;
          f.getup = 0;
          f.blocking = false;
          f.chain = 0;
          f.vx = f.vz = 0;
        }
        boutPhase = 'bell';
        boutT = T.bell;
      }
    }
  }

  function tick(inputs: Record<string, FighterInput>) {
    ticks++;
    tickBout();
    const frozen = bout ? boutPhase !== 'fight' : false;
    for (const f of fighters) {
      // Timers and stamina
      if (f.invuln > 0) f.invuln--;
      f.sinceHit++;
      const rate = f.empty ? T.regenEmpty : f.blocking ? T.regenBlocking : f.move ? 0 : T.regen;
      f.stamina = Math.min(T.stamina, f.stamina + rate * T.tick);
      if (f.empty && f.stamina >= T.emptyUntil) f.empty = false;
      if (!bout && f.sinceHit > T.healDelay && f.down <= 0) f.health = Math.min(T.health, f.health + T.heal * T.tick);
      const inp = frozen ? NO_INPUT : f.bot ? think(f) : (inputs[f.id] ?? NO_INPUT);
      if (frozen && f.bot && inp.face === undefined) {
        const o = other(f);
        if (o) f.yaw = yawTo(f.x, f.z, o.x, o.z);
      }
      act(f, inp);
      // Knockback and the dodge's step
      f.x += f.vx * T.tick;
      f.z += f.vz * T.tick;
      const k = Math.exp(-T.slide * T.tick);
      f.vx *= k;
      f.vz *= k;
    }
    // Nobody stands inside anybody else, nobody leaves the ring
    for (let i = 0; i < fighters.length; i++)
      for (let j = i + 1; j < fighters.length; j++) {
        const a = fighters[i];
        const b = fighters[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const min = T.radius * 2;
        if (d < min) {
          const ux = d > 1e-6 ? dx / d : 1;
          const uz = d > 1e-6 ? dz / d : 0;
          const push = (min - d) / 2;
          a.x -= ux * push;
          a.z -= uz * push;
          b.x += ux * push;
          b.z += uz * push;
        }
      }
    if (arena)
      for (const f of fighters) {
        const dx = f.x - arena.x;
        const dz = f.z - arena.z;
        const d = Math.hypot(dx, dz);
        const max = arena.r - T.radius;
        if (d > max) {
          f.x = arena.x + (dx / d) * max;
          f.z = arena.z + (dz / d) * max;
        }
      }
  }

  return {
    fighters,
    fighter: (id: string) => byId.get(id) ?? null,
    get ticks() {
      return ticks;
    },
    get time() {
      return ticks * T.tick;
    },
    /** The bout: the round, its phase and the seconds left in it (0 in a spar) */
    get round() {
      return round;
    },
    get boutPhase() {
      return boutPhase;
    },
    get clock() {
      return boutPhase === 'fight' && bout ? boutT * T.tick : 0;
    },
    get over() {
      return boutPhase === 'over';
    },
    get winner() {
      return winner;
    },
    /** Advance by `dt` seconds (whole ticks; the rest is carried); returns the events of those ticks */
    step(dt: number, inputs: Record<string, FighterInput> = {}): FightEvent[] {
      events = [];
      acc += Math.min(dt, 0.1);
      let n = 0;
      while (acc >= T.tick && n < 8) {
        acc -= T.tick;
        n++;
        tick(inputs);
      }
      return events;
    },
  };
}
export type FightSim = ReturnType<typeof createFightSim>;
