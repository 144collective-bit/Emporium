/*
 * The rubric for the fight clips (the animation revamp's Phase 7,
 * docs/animation-revamp-plan.md): what a punch, a kick and a hit reaction
 * must do to read as a person's, as numbers, measured over each clip of
 * fight-anim.ts with its feet planted (fightfeet.ts). DOM-free; held by
 * tests/fightrubric.test.ts, which also holds every move's clip to its
 * frames in the sim (the strike on the first active frame).
 *
 * The rows (`fightRows()`):
 * - `slide`: a planted foot's ball stays put on the canvas (the walk's band,
 *   `BANDS.slide`, at the fighters' scale).
 * - `drive`: the hips swing into a strike (`FIGHT_BANDS.drive`: a little
 *   for the jab and the front kick, most for the rear hand, the hook and the
 *   roundhouse); the weight goes into every punch and kick.
 * - `lead`: the hips get half-way through their swing before the shoulders
 *   do (a strike's: the hips drive it), and in a hit reaction the struck
 *   part (the head, or the chest folding round a body shot) gets there
 *   before the hips (`FIGHT_BANDS.lead` frames at least).
 * - `heel`: the rear heel comes up as the rear hip drives through the cross
 *   and the uppercut, the toes staying on the canvas.
 * - `recover`: a one-shot clip that ends in the guard ends on it exactly.
 * - `hips`: a hit reaction moves the hips, not only the head and arms.
 */
import * as THREE from 'three';
import { BANDS, ADULT_SCALE, TILE_M, type Row } from './human';
import { CLIPS, newFightPose, sampleClip, type ClipId, type FightPose } from './fight-anim';
import { MOVES } from './fight-moves';
import { plantLegs, plantWeight } from './fightfeet';
import { makeSkeleton, poseSkeleton } from './skeleton';

export const FIGHT_BANDS = {
  /** The hips' swing (radians, the range of their turn over the clip) at least */
  drive: { jab: 0.12, cross: 0.4, hook: 0.45, uppercut: 0.4, frontKick: 0.15, roundhouse: 0.8 } as Partial<Record<ClipId, number>>,
  /** Frames the leading part is ahead at the half-way point at least */
  lead: 1,
  /** The rear heel up at the hit (metres at the fighters' scale) at least, and the toes' tip within this of the canvas */
  heel: 0.02,
  toes: 0.02,
  /** The last frame against the guard's first (radians, the biggest difference in any angle) */
  recover: 0.01,
  /** A hit reaction's hips: turned or shifted at least this much (radians, or metres at the fighters' scale) */
  hipsTurn: 0.05,
  hipsShift: 0.02,
};

/** The strikes and what drives each (the leading part's way of moving and the one that follows it) */
const STRIKES: ClipId[] = ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundhouse'];
const REACTIONS: ClipId[] = ['hitHead', 'hitBody'];
/** The clips that end in the guard */
const TO_GUARD: ClipId[] = ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundhouse', 'dodge', 'hitHead', 'hitBody', 'stagger', 'getup', 'taunt'];

const sk = makeSkeleton();
const pose = newFightPose();
const v = new THREE.Vector3();

interface Sample {
  turn: number;
  shoulders: number;
  sway: number;
  head: number;
  lean: number;
  kick: number;
  balls: [THREE.Vector3, THREE.Vector3];
  ankles: [THREE.Vector3, THREE.Vector3];
  tips: [THREE.Vector3, THREE.Vector3];
  pose: FightPose;
}

/** Clip `id` frame by frame, planted, posed on the bones */
function frames(id: ClipId, mirror = false): Sample[] {
  const out: Sample[] = [];
  const at = (n: string) => sk.bones[n as keyof typeof sk.bones].getWorldPosition(new THREE.Vector3());
  for (let f = 0; f < CLIPS[id].frames; f++) {
    sampleClip(id, f, pose, { mirror });
    plantLegs(pose, id, f, { mirror });
    poseSkeleton(sk, pose);
    sk.root.updateMatrixWorld(true);
    // The toes' tip: forward of the ball along the toe bone
    const tip = (S: string) => sk.bones[`toe${S}` as 'toeL'].localToWorld(v.set(0, 0, 0.06)).clone();
    out.push({
      turn: pose.turn,
      shoulders: pose.turn + pose.twist,
      sway: pose.sway,
      head: Math.hypot(pose.headPitch, pose.headYaw),
      lean: pose.lean,
      kick: -pose.legs[1].bend,
      balls: [at('toeL'), at('toeR')],
      ankles: [at('footL'), at('footR')],
      tips: [tip('L'), tip('R')],
      pose: JSON.parse(JSON.stringify(pose)),
    });
  }
  return out;
}

/** The first frame from `a` on where `x` has gone half-way from frame `a` to frame `b` (fractional, between frames) */
function halfWay(s: Sample[], x: (q: Sample) => number, a: number, b: number): number {
  const x0 = x(s[a]);
  const x1 = x(s[b]);
  const mid = (x0 + x1) / 2;
  const up = x1 > x0;
  for (let f = a + 1; f <= b; f++) {
    const p = x(s[f - 1]);
    const q = x(s[f]);
    if (up ? q >= mid : q <= mid) return f - 1 + (q === p ? 1 : (mid - p) / (q - p));
  }
  return b;
}

/** The biggest difference in any angle between two poses */
function poseGap(a: FightPose, b: FightPose): number {
  let g = 0;
  const n = (x: number, y: number) => (g = Math.max(g, Math.abs(x - y)));
  for (const k of ['bob', 'lean', 'twist', 'side', 'turn', 'sway', 'headYaw', 'headPitch'] as const) n(a[k] ?? 0, b[k] ?? 0);
  for (let i = 0; i < 2; i++)
    for (const l of [
      [a.arms[i], b.arms[i]],
      [a.legs[i], b.legs[i]],
    ])
      for (const k of ['fwd', 'out', 'bend'] as const) n(l[0][k], l[1][k]);
  return g;
}

const M = ADULT_SCALE * TILE_M;
const row = (id: string, name: string, n: number, ok: boolean, value: string): Row => ({ id, name, n, ok, value });

/** The rubric's rows for clip `id` (played as it's keyed, or mirrored) */
export function fightRows(id: ClipId, mirror = false): Row[] {
  const s = frames(id, mirror);
  const rows: Row[] = [];
  // Planted feet: the ball never moves while the leg is fully on the canvas
  for (const i of [0, 1] as const) {
    let worst = 0;
    let from: THREE.Vector3 | null = null;
    for (let f = 0; f < s.length; f++) {
      if (plantWeight(id, i, f) < 1) {
        from = null;
        continue;
      }
      from ??= s[f].balls[i];
      worst = Math.max(worst, Math.hypot(s[f].balls[i].x - from.x, s[f].balls[i].z - from.z, s[f].balls[i].y - from.y) * M);
    }
    rows.push(row(`slide${i ? 'R' : 'L'}`, `Planted ${i ? 'right' : 'left'} foot`, worst, worst <= BANDS.slide, `${(worst * 100).toFixed(1)} cm`));
  }
  if (STRIKES.includes(id)) {
    const m = MOVES[id as keyof typeof MOVES];
    const wind = Math.round(m.startup * 0.55);
    const hit = m.startup;
    const turns = s.map((q) => q.turn);
    const swing = Math.max(...turns) - Math.min(...turns);
    const want = FIGHT_BANDS.drive[id] ?? 0;
    rows.push(row('drive', 'Hips into it', swing, swing >= want, `${swing.toFixed(2)} rad (${want})`));
    // The hips half-way before what they drive: the shoulders for a punch, the kicking leg for a kick
    const hips = halfWay(s, (q) => q.turn, wind, hit);
    const driven = m.kind === 'kick' ? halfWay(s, (q) => q.kick, wind, hit) : halfWay(s, (q) => q.shoulders, wind, hit);
    const lead = driven - hips;
    rows.push(row('lead', m.kind === 'kick' ? 'Hips before the kick' : 'Hips before the shoulders', lead, lead >= FIGHT_BANDS.lead, `${lead.toFixed(1)} frames`));
    if (id === 'cross' || id === 'uppercut') {
      const up = (s[hit].ankles[1].y - s[0].ankles[1].y) * M;
      const toes = Math.abs(s[hit].tips[1].y) * M;
      rows.push(row('heel', 'Rear heel up', up, up >= FIGHT_BANDS.heel && toes <= FIGHT_BANDS.toes, `${(up * 100).toFixed(1)} cm, toes ${(toes * 100).toFixed(1)} cm up`));
    }
  }
  if (REACTIONS.includes(id)) {
    const peak = (x: (q: Sample) => number) => {
      let best = 0;
      for (let f = 1; f < s.length; f++) if (Math.abs(x(s[f]) - x(s[0])) > Math.abs(x(s[best]) - x(s[0]))) best = f;
      return best;
    };
    const part = id === 'hitHead' ? (q: Sample) => q.head : (q: Sample) => q.lean;
    const top = peak(part);
    const hipsTop = peak((q) => q.turn);
    const lead = halfWay(s, (q) => q.turn, 0, hipsTop) - halfWay(s, part, 0, top);
    rows.push(row('lead', id === 'hitHead' ? 'Head before the hips' : 'Chest before the hips', lead, lead >= FIGHT_BANDS.lead, `${lead.toFixed(1)} frames`));
    const turn = Math.max(...s.map((q) => Math.abs(q.turn - s[0].turn)));
    const shift = Math.max(...s.map((q) => Math.abs(q.sway - s[0].sway))) * M;
    rows.push(row('hips', 'Hips in the reaction', turn, turn >= FIGHT_BANDS.hipsTurn || shift >= FIGHT_BANDS.hipsShift, `${turn.toFixed(2)} rad, ${(shift * 100).toFixed(1)} cm`));
  }
  if (TO_GUARD.includes(id)) {
    const guard = plantLegs(sampleClip('guard', 0, newFightPose(), { mirror }), 'guard', 0, { mirror });
    const g = poseGap(s[s.length - 1].pose, guard);
    rows.push(row('recover', 'Back in the guard', g, g <= FIGHT_BANDS.recover, `${g.toFixed(3)} rad off`));
  }
  return rows;
}
