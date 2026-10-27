// The clothes don't clip (docs/clothing-plan.md): in every outfit, through the poses the game plays
// (keyed poses, the emotes, the fight's clips, and the animator running, sprinting and crouching on the
// motion capture), the trousers stay inside the top over the hips, and the top stays outside them.
// CLOTHING_REPORT=1 prints the worst of each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { PLAYER, SOLDIER, type Outfit, type OutfitKind } from '../src/scripts/city3d/wardrobe';
import { newPose, poseSkeleton, type Pose } from '../src/scripts/city3d/skeleton';
import { airPose, idlePose, sitPose, slidePose, walkPose } from '../src/scripts/city3d/poses';
import { EMOTE_IDS, emotePose, emoteSeconds } from '../src/scripts/city3d/emotes';
import { CLIP_IDS, CLIPS, newFightPose, sampleClip } from '../src/scripts/city3d/fight-anim';
import { applyTo, createAnimator } from '../src/scripts/city3d/animator';
import { decodeMocap } from '../src/scripts/city3d/mocap';
import { GAITS, newMove, stepMove } from '../src/scripts/city3d/movesim';
import { atRest, dress, layers, type Dressed } from './dress';

/** How far one layer may show through another: a few millimetres (Degen is about 1.3 tall, 1.8 m) */
const TOL = 0.002;
const report = !!process.env.CLOTHING_REPORT;

const OUTFITS: Outfit[] = (['suit', 'hoodie', 'track', 'varsity', 'puffer'] as OutfitKind[]).map((kind) => ({ ...PLAYER, kind })).concat([SOLDIER]);

/* ---------- The poses ---------- */

type Poser = (p: Pose) => void;
const keyed: [string, Poser][] = [
  ['stand', () => {}],
  ['idle', (p) => idlePose(p, 2)],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((k): [string, Poser] => [`walk ${k}`, (p) => walkPose(p, (k / 8) * Math.PI * 2, 1, 0)]),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((k): [string, Poser] => [`run ${k}`, (p) => walkPose(p, (k / 8) * Math.PI * 2, 1, 1)]),
  ['sit', (p) => sitPose(p, 0)],
  ['slide', (p) => slidePose(p, 1)],
  ['air', (p) => airPose(p, 1)],
  // A deep crouch, a high knee, a lunge, a kick, a twist and a side bend (the extremes the animator reaches)
  [
    'crouch',
    (p) => {
      p.bob = -0.25;
      p.lean = 0.45;
      for (const l of p.legs) Object.assign(l, { fwd: 1.25, out: 0.12, bend: 2.0 });
    },
  ],
  ['high knee', (p) => Object.assign(p.legs[1], { fwd: 1.45, bend: 1.6 })],
  [
    'lunge',
    (p) => {
      Object.assign(p.legs[0], { fwd: 0.9, bend: 1.0 });
      Object.assign(p.legs[1], { fwd: -0.55, bend: 0.4 });
      p.bob = -0.08;
    },
  ],
  ['kick', (p) => Object.assign(p.legs[1], { fwd: 1.3, bend: 0.2, out: 0.1 })],
  ['side step', (p) => Object.assign(p.legs[1], { out: 0.6 })],
  ['twist', (p) => ((p.twist = 0.7), (p.turn = -0.3))],
  ['side bend', (p) => ((p.side = 0.2), (p.sway = 0.04))],
  ['lean back', (p) => (p.lean = -0.4)],
];
for (const id of EMOTE_IDS) for (const t of [0.4, 0.9, 1.5, 2.2, 3.1]) if (t < emoteSeconds(id)) keyed.push([`${id} ${t}`, (p) => emotePose(p, id, t, 1, true)]);
for (const id of CLIP_IDS) {
  const n = CLIPS[id].frames;
  for (const f of [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1])
    keyed.push([
      `fight ${id} ${f}`,
      (p) => {
        const fp = sampleClip(id, f, newFightPose());
        Object.assign(p, fp, { arms: fp.arms, legs: fp.legs });
      },
    ]);
}

/** The animator through a program, the bones every quarter second */
const data = decodeMocap(readFileSync('src/data/mocap/clips.bin'));
type Prog = { go: (t: number) => [number, number]; seconds: number; crouch?: number };
const PROGS: Record<string, Prog> = {
  walk: { go: () => [0, GAITS.walk], seconds: 4 },
  run: { go: () => [0, GAITS.run], seconds: 4 },
  sprint: { go: () => [0, GAITS.sprint], seconds: 4 },
  'run and stop': { go: (t) => (t % 3 < 1.6 ? [0, GAITS.run] : [0, 0]), seconds: 6 },
  'crouch walk': { go: () => [0, 0.55], seconds: 5, crouch: 1 },
  'crouch still': { go: (t) => (t < 0.5 ? [0, 0.55] : [0, 0]), seconds: 4, crouch: 1 },
};

function each(d: Dressed, fn: (name: string) => void) {
  const sk = d.sk;
  for (const [name, pose] of keyed) {
    const p = newPose();
    pose(p);
    poseSkeleton(sk, p);
    sk.root.updateMatrixWorld(true);
    fn(name);
  }
  const DT = 1 / 60;
  for (const [name, pr] of Object.entries(PROGS)) {
    const an = createAnimator(data);
    const mv = newMove(0);
    let x = 0;
    let z = 0;
    for (let i = 0; i < pr.seconds * 60; i++) {
      const [gx, gz] = pr.go(i * DT);
      stepMove(mv, gx, gz, true, DT);
      x += mv.vx * DT;
      z += mv.vz * DT;
      const sprint = THREE.MathUtils.clamp((Math.hypot(mv.vx, mv.vz) - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1);
      an.update({ dt: DT, x, y: 0, z, move: mv, gx, gz, scale: 1, ground: () => 0, feet: () => 0, sprint, crouch: pr.crouch ?? 0 });
      if (i < 30 || i % 15) continue;
      poseSkeleton(sk, newPose());
      applyTo(sk, an.rot, an.hips);
      sk.root.updateMatrixWorld(true);
      fn(`${name} ${(i * DT).toFixed(2)}s`);
    }
  }
}

for (const o of OUTFITS)
  test(`clothes: the ${o.kind}'s trousers stay under the top`, () => {
    const d = dress(o);
    const rest = atRest(d, 'bottom', 'top');
    assert.ok(
      rest.covered.flat().some(Boolean),
      'some of the trousers are under the top at rest'
    );
    const bad: string[] = [];
    let worst = { out: 0, sunk: 0 };
    each(d, (name) => {
      const r = layers(d, 'bottom', 'top', TOL, rest);
      worst = { out: Math.max(worst.out, r.out), sunk: Math.max(worst.sunk, r.sunk) };
      const where = (p?: number[]) => (p ? ` at ${p.map((k) => k.toFixed(3)).join(',')}` : '');
      if (r.outN || r.sunkN) bad.push(`${name}: ${r.outN} out (${(r.out * 1000).toFixed(1)}${where(r.outAt)}), ${r.sunkN} sunk (${(r.sunk * 1000).toFixed(1)}${where(r.sunkAt)})`);
    });
    if (report) console.log(`${o.kind}: worst out ${(worst.out * 1000).toFixed(1)}, sunk ${(worst.sunk * 1000).toFixed(1)} (thousandths)\n  ${bad.join('\n  ')}`);
    assert.deepEqual(bad, [], `${o.kind}: the trousers come through the top`);
  });
