// The crowd's moves baked into bone matrices (character rebuild Phase 5): every clip's rows are finite and
// in their place, the loops have no seam, the walk keeps a planted foot planted when played at its stride,
// and the salute runs from attention to the hand at the brow. The animation revamp's Phase 5: the walks, the
// jog and the idles come from the crowd pack (the captured takes), the rows' layout the same with or without
// it, and a walk keeps its feet planted at every scale the city uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CLIP_DEFS, CLIP_IDS, CLIP_ROWS, CROWD_BONES, CROWD_ROWS, JOG_STRIDE, MARCH_STRIDE, WALK_STRIDE, bakeCrowdClips, crowdCaptured, crowdFrame, idleFor, secondsOf, setCrowdCapture, strideOf, walkFor, type CrowdClip } from '../src/scripts/city3d/crowdclips';
import { BONE_INDEX, makeSkeleton } from '../src/scripts/city3d/skeleton';
import { PHONE } from '../src/scripts/city3d/pedestrians';
import { decodeMocap } from '../src/scripts/city3d/mocap';

// (the stand-ins first: the recorded walk and the formula idle, as a visitor sees them until the pack is in)
const fallback = bakeCrowdClips().slice();
const FALLBACK_STRIDES = { walk: strideOf('walk'), walk2: strideOf('walk2'), jog: strideOf('jog') };
setCrowdCapture(decodeMocap(readFileSync('src/data/mocap/clips-crowd.bin')));
const data = bakeCrowdClips();
const mat = (row: number, bone: number) => new THREE.Matrix4().fromArray(data, (row * CROWD_BONES + bone) * 16);
/** Where a bone's joint is in a row (the bind pose's joint carried by the row's matrix) */
const sk = makeSkeleton();
sk.root.updateMatrixWorld(true);
const rest = sk.list.map((b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
const joint = (row: number, bone: number) => rest[bone].clone().applyMatrix4(mat(row, bone));
/** How far apart two rows are: the most any joint moves between them */
const gap = (a: number, b: number) => Math.max(...rest.map((_, i) => joint(a, i).distanceTo(joint(b, i))));

test('the clips sit one after another in the texture, every number finite', () => {
  assert.equal(data.length, CROWD_ROWS * CROWD_BONES * 16);
  let row = 0;
  for (const id of CLIP_IDS) {
    assert.equal(CLIP_ROWS[id], row, id);
    row += CLIP_DEFS[id].frames;
  }
  assert.equal(row, CROWD_ROWS);
  assert.ok(data.every(Number.isFinite));
  // A pose of rest is no rotation at all: the hips' matrix is a translation (the bob) only
  const hips = mat(CLIP_ROWS.idle, BONE_INDEX.hips);
  const q = new THREE.Quaternion();
  hips.decompose(new THREE.Vector3(), q, new THREE.Vector3());
  assert.ok(q.angleTo(new THREE.Quaternion()) < 0.1);
});

test('the loops have no seam: the last frame runs into the first like any two frames', () => {
  for (const id of CLIP_IDS) {
    const d = CLIP_DEFS[id];
    if (!d.loop) continue;
    const r = CLIP_ROWS[id];
    let most = 0;
    for (let f = 0; f + 1 < d.frames; f++) most = Math.max(most, gap(r + f, r + f + 1));
    const seam = gap(r + d.frames - 1, r);
    assert.ok(seam <= most * 1.5 + 1e-3, `${id}: the seam moves ${seam.toFixed(4)}, frames at most ${most.toFixed(4)}`);
  }
});

test('crowdFrame: rows and blend for a loop (wrapping) and for the salute (held at its ends)', () => {
  const w = CLIP_DEFS.walk.frames;
  assert.deepEqual(crowdFrame('walk', 0), [CLIP_ROWS.walk, CLIP_ROWS.walk + 1, 0]);
  const [a, b, k] = crowdFrame('walk', 1 - 0.25 / w);
  assert.equal(a, CLIP_ROWS.walk + w - 1);
  assert.equal(b, CLIP_ROWS.walk);
  assert.ok(Math.abs(k - 0.75) < 1e-9);
  assert.deepEqual(crowdFrame('walk', 2.5), crowdFrame('walk', 0.5));
  const s = CLIP_DEFS.salute.frames;
  assert.deepEqual(crowdFrame('salute', -1), [CLIP_ROWS.salute, CLIP_ROWS.salute + 1, 0]);
  assert.deepEqual(crowdFrame('salute', 1), [CLIP_ROWS.salute + s - 2, CLIP_ROWS.salute + s - 1, 1]);
});

/**
 * A foot's stance in a cycle (`ys`: the ankle's height each frame, cyclic): the longest run of frames down near
 * the lowest, less the landing and the lift-off (a captured heel comes down still moving); how many frames it
 * stands and the most the ankle moves along the ground between two of them (`slide(f)`: frame f to f + 1)
 */
function stance(ys: number[], slide: (f: number) => number, margin = 1) {
  const n = ys.length;
  const low = Math.min(...ys);
  const down = ys.map((y) => y <= low + 0.012);
  // (a run that wraps: start from a frame that's up)
  const start = down.indexOf(false);
  if (start < 0) return { planted: n, worst: Math.max(...ys.map((_, f) => slide(f))) };
  let best: number[] = [];
  let run: number[] = [];
  for (let k = 1; k <= n; k++) {
    const f = (start + k) % n;
    if (down[f]) run.push(f);
    else {
      if (run.length > best.length) best = run;
      run = [];
    }
  }
  if (run.length > best.length) best = run;
  const inside = best.slice(margin, -margin);
  let worst = 0;
  for (let i = 0; i + 1 < inside.length; i++) worst = Math.max(worst, slide(inside[i]));
  return { planted: best.length, worst };
}

test('played at its stride, the walk keeps a planted foot planted (and so do the jog and the march)', () => {
  for (const [id, stride] of [
    ['walk', strideOf('walk')],
    ['walk2', strideOf('walk2')],
    ['jog', strideOf('jog')],
    ['march', MARCH_STRIDE],
    ['hurry', strideOf('hurry')],
    ['phonewalk', strideOf('phonewalk')],
  ] as [CrowdClip, number][]) {
    assert.ok(stride > 0.2 && stride < (id === 'jog' ? 3 : 1.5), `${id} stride ${stride}`);
    const n = CLIP_DEFS[id].frames;
    const r = CLIP_ROWS[id];
    for (const foot of [BONE_INDEX.footL, BONE_INDEX.footR]) {
      // Where the ankle is on the ground as the body moves forward a stride a cycle
      const at = Array.from({ length: n }, (_, f) => joint(r + f, foot).add(new THREE.Vector3(0, 0, (f / n) * stride)));
      const slide = (f: number) => {
        const a = at[f % n];
        const b = at[(f + 1) % n].clone();
        if ((f + 1) % n === 0) b.z += stride;
        return Math.hypot(b.x - a.x, b.z - a.z);
      };
      const { planted, worst } = stance(at.map((p) => p.y), slide);
      assert.ok(worst < 0.012, `${id} foot ${foot} slides ${worst.toFixed(4)} planted`);
      // (a jogging foot is down for less of its cycle)
      assert.ok(planted >= n * (id === 'jog' ? 0.12 : 0.2), `${id}: planted for ${planted} of ${n} frames`);
    }
  }
});

test('the salute goes from attention to the free hand up at the brow', () => {
  const r = CLIP_ROWS.salute;
  const n = CLIP_DEFS.salute.frames;
  const hand = (row: number) => joint(row, BONE_INDEX.handR);
  const head = joint(r + n - 1, BONE_INDEX.head);
  assert.ok(hand(r).y < 0.7, 'down at the side');
  assert.ok(hand(r + n - 1).distanceTo(head) < 0.2, 'at the brow');
});

test('the crowd pack: the walks, the jog and the idles come from the capture, in the same rows as their stand-ins', () => {
  assert.ok(crowdCaptured());
  assert.equal(data.length, fallback.length, 'the layout is fixed whatever the capture holds');
  // The captured walks are the capture's own cycles, not the recording's
  assert.ok(Math.abs(strideOf('walk') - 0.796) < 0.02 && Math.abs(strideOf('walk2') - 0.795) < 0.02, `the walks' strides ${strideOf('walk')} ${strideOf('walk2')}`);
  assert.ok(strideOf('walk') !== FALLBACK_STRIDES.walk, 'not the recording');
  assert.ok(Math.abs(strideOf('jog') - 1.574) < 0.03, `the run's stride ${strideOf('jog')}`);
  assert.equal(strideOf('march'), MARCH_STRIDE, 'the march is the recording still');
  assert.equal(WALK_STRIDE, FALLBACK_STRIDES.walk);
  assert.equal(JOG_STRIDE, FALLBACK_STRIDES.jog);
  for (const id of ['walk', 'walk2', 'jog', 'idle', 'idle2', 'idle3'] as CrowdClip[]) {
    const r = CLIP_ROWS[id];
    let moved = 0;
    for (let f = 0; f < CLIP_DEFS[id].frames; f++) moved = Math.max(moved, Math.abs(data[(r + f) * CROWD_BONES * 16 + 12] - fallback[(r + f) * CROWD_BONES * 16 + 12]), Math.abs(data[(r + f) * CROWD_BONES * 16 + 13] - fallback[(r + f) * CROWD_BONES * 16 + 13]));
    assert.ok(moved > 1e-3 || id.startsWith('idle'), `${id} is from the capture`);
  }
  // Two different walks, three different idles: a person is given their own
  assert.notEqual(gap(CLIP_ROWS.walk, CLIP_ROWS.walk2), 0);
  assert.ok(gap(CLIP_ROWS.idle, CLIP_ROWS.idle2) > 0.01 && gap(CLIP_ROWS.idle2, CLIP_ROWS.idle3) > 0.01);
  assert.deepEqual([walkFor(0.1), walkFor(0.9)], ['walk', 'walk2']);
  assert.deepEqual([idleFor(0.1), idleFor(0.5), idleFor(0.9)], ['idle', 'idle2', 'idle3']);
  // Each idle plays at its own length (its loop less the crossfaded tail), the formula loops as before
  assert.ok(secondsOf('idle') > 6.5 && secondsOf('idle') < 8, `idle ${secondsOf('idle')} s`);
  assert.ok(secondsOf('idle2') > 4.5 && secondsOf('idle2') < 6, `idle2 ${secondsOf('idle2')} s`);
  assert.ok(secondsOf('idle3') > 3 && secondsOf('idle3') < 4.5, `idle3 ${secondsOf('idle3')} s`);
  assert.equal(secondsOf('look'), 24);
  // The captured idles stand: hips about a person's height over the feet, both feet on the ground
  for (const id of ['idle', 'idle2', 'idle3'] as CrowdClip[]) {
    const r = CLIP_ROWS[id];
    for (let f = 0; f < CLIP_DEFS[id].frames; f += 7) {
      const hips = joint(r + f, BONE_INDEX.hips);
      assert.ok(hips.y > 0.55 && hips.y < 0.66, `${id} frame ${f}: hips at ${hips.y.toFixed(2)}`);
      for (const foot of [BONE_INDEX.footL, BONE_INDEX.footR]) {
        const y = joint(r + f, foot).y;
        assert.ok(y > -0.02 && y < 0.12, `${id} frame ${f}: a foot at ${y.toFixed(2)}`);
      }
    }
  }
});

test('the scale rule: a person at any scale plays a walk at v / (stride · scale), and their planted foot stays put', () => {
  for (const scale of [1, 0.85, 0.66, 0.5]) {
    for (const [id, v] of [
      ['walk', 0.55 * scale],
      ['walk2', 0.7 * scale],
      ['jog', 1.7 * scale],
    ] as [CrowdClip, number][]) {
      const stride = strideOf(id);
      const n = CLIP_DEFS[id].frames;
      const r = CLIP_ROWS[id];
      const dt = 1 / 60;
      for (const foot of [BONE_INDEX.footL, BONE_INDEX.footR]) {
        // Walking along +z at v for one cycle, the clip played by the rule, each frame's ankle in the world
        const world: THREE.Vector3[] = [];
        const T = (stride * scale) / v;
        for (let t = 0; t <= T + 1e-9; t += dt) {
          const u = ((t * v) / (stride * scale)) % 1;
          const f = u * n;
          const a = Math.floor(f) % n;
          const b = (a + 1) % n;
          const pa = joint(r + a, foot).multiplyScalar(scale);
          const pb = joint(r + b, foot).multiplyScalar(scale);
          world.push(pa.lerp(pb, f - Math.floor(f)).add(new THREE.Vector3(0, 0, t * v)));
        }
        // (one cycle exactly: the last sample is the first a stride on)
        world.pop();
        const { planted, worst } = stance(
          world.map((p) => p.y / scale),
          (f) => {
            const a = world[f % world.length];
            const b = world[(f + 1) % world.length].clone();
            if ((f + 1) % world.length === 0) b.z += stride * scale;
            return Math.hypot(b.x - a.x, b.z - a.z);
          },
          // (the landing and the lift-off: a clip frame's worth of samples each end)
          Math.ceil(world.length / n),
        );
        // (the capture's planted ankle creeps a little, as the test above allows at its frames: here two samples a frame)
        assert.ok(worst < 0.0065 * scale + 1e-4, `${id} at scale ${scale}: the foot slides ${(worst * 100).toFixed(2)} cm a frame`);
        assert.ok(planted > world.length * 0.1, `${id} at scale ${scale}: planted ${planted} of ${world.length}`);
      }
    }
  }
});

test('the kerb wait: the captured idle with a look both ways over it; the hurry: the walk with the head down and the arms in', () => {
  // The wait row stands like the idle it's keyed over (the same hips), the head turned left then right about the chest
  const w = CLIP_ROWS.wait;
  const i2 = CLIP_ROWS.idle2;
  const n = CLIP_DEFS.wait.frames;
  assert.equal(n, CLIP_DEFS.idle2.frames);
  assert.ok(Math.abs(secondsOf('wait') - secondsOf('idle2')) < 1e-9);
  const yawAt = (row: number) => {
    const chest = new THREE.Quaternion().setFromRotationMatrix(mat(row, BONE_INDEX.chest));
    const head = new THREE.Quaternion().setFromRotationMatrix(mat(row, BONE_INDEX.head));
    const rel = chest.invert().multiply(head);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rel);
    return Math.atan2(fwd.x, fwd.z);
  };
  let left = 0;
  let right = 0;
  for (let f = 0; f < n; f++) {
    const hips = joint(w + f, BONE_INDEX.hips);
    assert.ok(hips.distanceTo(joint(i2 + f, BONE_INDEX.hips)) < 1e-6, `frame ${f}: the hips are the idle's`);
    for (const foot of [BONE_INDEX.footL, BONE_INDEX.footR]) assert.ok(joint(w + f, foot).distanceTo(joint(i2 + f, foot)) < 1e-6, `frame ${f}: the feet are the idle's`);
    const y = yawAt(w + f) - yawAt(i2 + f);
    if (y > 0.7) left++;
    if (y < -0.7) right++;
  }
  assert.ok(left >= 4 && right >= 4, `the head turned both ways: ${left} left, ${right} right of ${n}`);
  assert.ok(Math.abs(yawAt(w) - yawAt(i2)) < 0.05 && Math.abs(yawAt(w + n - 1) - yawAt(i2 + n - 1)) < 0.05, 'ahead at the loop');
  // The hurry: the walk's legs and stride, the head lower and the hands up in front of the chest
  const h = CLIP_ROWS.hurry;
  const wk = CLIP_ROWS.walk;
  assert.equal(strideOf('hurry'), strideOf('walk'));
  for (let f = 0; f < CLIP_DEFS.hurry.frames; f += 5) {
    for (const foot of [BONE_INDEX.footL, BONE_INDEX.footR]) assert.ok(joint(h + f, foot).distanceTo(joint(wk + f, foot)) < 1e-6, `frame ${f}: the feet are the walk's`);
    // (the head pitched down about the hips (the rig faces +z), the chest forward of them)
    const pitchDown = (row: number) => {
      const hips = new THREE.Quaternion().setFromRotationMatrix(mat(row, BONE_INDEX.hips));
      const head = new THREE.Quaternion().setFromRotationMatrix(mat(row, BONE_INDEX.head));
      return Math.asin(-new THREE.Vector3(0, 0, 1).applyQuaternion(hips.invert().multiply(head)).y);
    };
    assert.ok(pitchDown(h + f) > pitchDown(wk + f) + 0.25, `frame ${f}: the head down (${pitchDown(h + f).toFixed(2)} vs ${pitchDown(wk + f).toFixed(2)})`);
    assert.ok(joint(h + f, BONE_INDEX.chest).z - joint(h + f, BONE_INDEX.hips).z > joint(wk + f, BONE_INDEX.chest).z - joint(wk + f, BONE_INDEX.hips).z + 0.01, `frame ${f}: the chest forward`);
    for (const hand of [BONE_INDEX.handL, BONE_INDEX.handR]) {
      const hp = joint(h + f, hand);
      assert.ok(hp.y > joint(wk + f, hand).y + 0.1 && hp.y > joint(h + f, BONE_INDEX.hips).y, `frame ${f}: a hand up at the chest (${hp.y.toFixed(2)})`);
    }
  }
});

/** The head's pitch down about the chest (the rig faces +z), and its yaw to the left */
const headAt = (row: number) => {
  const chest = new THREE.Quaternion().setFromRotationMatrix(mat(row, BONE_INDEX.chest));
  const head = new THREE.Quaternion().setFromRotationMatrix(mat(row, BONE_INDEX.head));
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(chest.invert().multiply(head));
  return { down: Math.asin(-fwd.y), yaw: Math.atan2(fwd.x, fwd.z) };
};

test('the phone: standing (over the third idle) and walking (over the walk), the right hand at the chest, the head down at it, the other arm the take\'s', () => {
  const phoneRow = (id: 'phone' | 'phonewalk', over: 'idle3' | 'walk', pitch: number) => {
    const r = CLIP_ROWS[id];
    const o = CLIP_ROWS[over];
    const n = CLIP_DEFS[id].frames;
    assert.equal(n, CLIP_DEFS[over].frames);
    assert.ok(Math.abs(secondsOf(id) - secondsOf(over)) < 1e-9);
    const downs: number[] = [];
    for (let f = 0; f < n; f++) {
      // The take under it: the hips, the feet and the left hand where the take has them
      for (const b of [BONE_INDEX.hips, BONE_INDEX.footL, BONE_INDEX.footR, BONE_INDEX.handL]) assert.ok(joint(r + f, b).distanceTo(joint(o + f, b)) < 1e-6, `${id} frame ${f}: bone ${b} is the take's`);
      // The right hand in front of the chest, between the chest and the chin, in from the shoulder
      const hand = joint(r + f, BONE_INDEX.handR);
      const chest = joint(r + f, BONE_INDEX.chest);
      const head = joint(r + f, BONE_INDEX.head);
      assert.ok(hand.z > chest.z + 0.12 && hand.z < chest.z + 0.3, `${id} frame ${f}: the hand in front of the chest (${(hand.z - chest.z).toFixed(2)})`);
      assert.ok(hand.y > chest.y - 0.02 && hand.y < head.y - 0.04, `${id} frame ${f}: the hand between the chest and the chin (${hand.y.toFixed(2)}, chest ${chest.y.toFixed(2)}, head ${head.y.toFixed(2)})`);
      assert.ok(Math.abs(hand.x - chest.x) < 0.1, `${id} frame ${f}: the hand in from the shoulder`);
      assert.ok(hand.y > joint(o + f, BONE_INDEX.handR).y + 0.2, `${id} frame ${f}: the hand up from where the take has it`);
      downs.push(headAt(r + f).down);
    }
    // The head down at the phone by the rule's pitch (in place of the take's, which looks about), more than the take's ever is
    const most = Math.max(...downs);
    assert.ok(Math.abs(most - pitch) < 0.05, `${id}: the head down ${most.toFixed(2)}, the rule's ${pitch}`);
    for (let f = 0; f < n; f++) assert.ok(most > headAt(o + f).down + 0.15, `${id}: further down than the take's head at frame ${f}`);
    return downs;
  };
  const standing = phoneRow('phone', 'idle3', -PHONE.headPitch);
  // Standing: a glance up (and a touch to the left) partway through, down again by the loop
  const least = Math.min(...standing);
  const most = Math.max(...standing);
  assert.ok(least < most - 0.4, `a glance up: from ${most.toFixed(2)} down to ${least.toFixed(2)}`);
  assert.ok(standing[0] > most - 0.05 && standing[standing.length - 1] > most - 0.08, 'reading at both ends of the loop');
  const upAt = standing.indexOf(least);
  assert.ok(headAt(CLIP_ROWS.phone + upAt).yaw > 0.15, 'the glance turns a little to the left');
  const walking = phoneRow('phonewalk', 'walk', -PHONE.walkPitch);
  assert.ok(Math.max(...walking) - Math.min(...walking) < 0.1, 'walking, no glance: the head stays on the phone');
  assert.equal(strideOf('phonewalk'), strideOf('walk'));
});

