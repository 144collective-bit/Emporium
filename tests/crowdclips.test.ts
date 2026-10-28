// The crowd's moves baked into bone matrices (character rebuild Phase 5): every clip's rows are finite and
// in their place, the loops have no seam, the walk keeps a planted foot planted when played at its stride,
// and the salute runs from attention to the hand at the brow. The animation revamp's Phase 5: the walks, the
// jog and the idles come from the crowd pack (the captured takes), the rows' layout the same with or without
// it, and a walk keeps its feet planted at every scale the city uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CLIP_DEFS, CLIP_IDS, CLIP_ROWS, CROWD_BONES, CROWD_ROWS, JOG_STRIDE, MARCH_STRIDE, SEATED, WALK_STRIDE, bakeCrowdClips, crowdCaptured, crowdFrame, idleFor, seated, secondsOf, setCrowdCapture, strideOf, walkFor, type CrowdClip } from '../src/scripts/city3d/crowdclips';
import { BONE_INDEX, makeSkeleton } from '../src/scripts/city3d/skeleton';
import { PHONE } from '../src/scripts/city3d/pedestrians';
import { CAST, GUARD_LOOK, HAND_OVER, MOVE, SHOT, keyed } from '../src/scripts/city3d/acts';
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


/** A row's frames as the joints' positions */
const framesOf = (id: keyof typeof CLIP_ROWS) => Array.from({ length: CLIP_DEFS[id].frames }, (_, f) => CLIP_ROWS[id] + f);
const span = (rows: number[], bone: number, axis: 'x' | 'y' | 'z') => {
  const v = rows.map((r) => joint(r, bone)[axis]);
  return [Math.min(...v), Math.max(...v)] as const;
};

test('the workers standing (the revamp\'s Phase 6 step 3): serving, cooking, fishing and the bouncer, over the captured idles', () => {
  // Over a take: the hips and feet the take's, the head and both arms keyed
  const over = (id: 'serve' | 'cook' | 'fish' | 'guard', take: 'idle' | 'idle2' | 'idle3') => {
    assert.equal(CLIP_DEFS[id].frames, CLIP_DEFS[take].frames);
    for (let f = 0; f < CLIP_DEFS[id].frames; f += 4) for (const b of [BONE_INDEX.hips, BONE_INDEX.footL, BONE_INDEX.footR]) assert.ok(joint(CLIP_ROWS[id] + f, b).distanceTo(joint(CLIP_ROWS[take] + f, b)) < 1e-6, `${id} frame ${f}: the take's body`);
    return framesOf(id);
  };
  const rel = (row: number, bone: number) => joint(row, bone).sub(joint(row, BONE_INDEX.hips));
  // Serving: both hands on the counter at waist height in front; the right goes out further once a loop, the head comes up
  const serve = over('serve', 'idle3');
  for (const r of serve) for (const h of [BONE_INDEX.handL, BONE_INDEX.handR]) assert.ok(rel(r, h).z > 0.2 && Math.abs(rel(r, h).y) < 0.2, `serve: a hand at the counter`);
  const [outMin, outMax] = span(serve, BONE_INDEX.handR, 'z');
  assert.ok(outMax > outMin + 0.07, `serve: the hand goes out (${outMin.toFixed(2)} to ${outMax.toFixed(2)})`);
  assert.ok(keyed(HAND_OVER, 0) === 0 && keyed(HAND_OVER, 1.9) === 1 && keyed(HAND_OVER, 3.5) === 0);
  // Cooking: both hands low in front, the right working (moving about), the head down
  const cook = over('cook', 'idle3');
  // (the take's chest leans and straightens under them, so the hands ride up and down a little)
  for (const r of cook) for (const h of [BONE_INDEX.handL, BONE_INDEX.handR]) assert.ok(rel(r, h).z > 0.2 && Math.abs(rel(r, h).y) < 0.16, `cook: the hands at the counter (${rel(r, h).y.toFixed(2)})`);
  const [lx0, lx1] = span(cook, BONE_INDEX.handL, 'x');
  const [rx0, rx1] = span(cook, BONE_INDEX.handR, 'x');
  assert.ok(lx1 - lx0 < 0.03 && rx1 - rx0 > 0.04, `cook: the left hand steady (${(lx1 - lx0).toFixed(3)}), the right working (${(rx1 - rx0).toFixed(3)})`);
  assert.ok(cook.every((r) => headAt(r).down > 0.25), 'cook: the head down at the work');
  // Fishing: the rod held out (one hand forward, one at the hip), a cast: both hands up over the shoulder, then forward
  const fish = over('fish', 'idle');
  const restRow = fish[0];
  // (the take stands leant back a little, so the rod hand sits a touch higher and further out than keyed)
  assert.ok(rel(restRow, BONE_INDEX.handL).z > 0.25 && rel(restRow, BONE_INDEX.handR).z < 0.3 && rel(restRow, BONE_INDEX.handR).y < rel(restRow, BONE_INDEX.handL).y - 0.15, 'fish: holding the rod');
  const [, upL] = span(fish, BONE_INDEX.handL, 'y');
  const [, upR] = span(fish, BONE_INDEX.handR, 'y');
  const head = rel(restRow, BONE_INDEX.head).y;
  assert.ok(upL > head && upR > head - 0.06, `fish: the hands up over the shoulder in the cast (${upL.toFixed(2)}, ${upR.toFixed(2)}, the head ${head.toFixed(2)})`);
  const backRow = fish.find((r) => rel(r, BONE_INDEX.handR).z < -0.05);
  assert.ok(backRow !== undefined, 'fish: the hands go back');
  // (whipped forward: the hands still up but out in front, not behind)
  const foreRow = fish.slice(fish.indexOf(backRow!) + 1).reduce((a, b) => (rel(b, BONE_INDEX.handL).z > rel(a, BONE_INDEX.handL).z ? b : a));
  assert.ok(rel(foreRow, BONE_INDEX.handL).y > 0.38 && rel(foreRow, BONE_INDEX.handL).z > 0.2, 'fish: then whipped forward');
  assert.ok(headAt(backRow!).down < headAt(restRow).down - 0.15 && headAt(foreRow!).down > headAt(restRow).down, 'fish: the head follows the rod');
  assert.ok(keyed(CAST, 3.6) === 1 && keyed(CAST, 4.2) === 2 && keyed(CAST, 6) === 3);
  // (and the hands come straight home from the cast, not back over the shoulder again)
  const after = fish.filter((_, i) => i > fish.indexOf(foreRow!));
  assert.ok(after.every((r) => rel(r, BONE_INDEX.handR).z > -0.02), 'fish: home from the cast');
  // The bouncer: arms folded (each hand across on the other side at the chest), a look each way
  const guard = over('guard', 'idle2');
  for (const r of guard) {
    const l = rel(r, BONE_INDEX.handL);
    const rr = rel(r, BONE_INDEX.handR);
    assert.ok(l.x > 0.06 && rr.x < -0.06 && l.y > 0.1 && rr.y > 0.1 && l.y < 0.3, 'guard: the arms folded across the chest');
  }
  const yaws = guard.map((r) => headAt(r).yaw);
  assert.ok(Math.max(...yaws) > 0.4 && Math.min(...yaws) < -0.3, `guard: a look each way (${Math.min(...yaws).toFixed(2)} to ${Math.max(...yaws).toFixed(2)})`);
  assert.equal(GUARD_LOOK[GUARD_LOOK.length - 1][1], 0);
});

test('the workers seated: eating, chess, lounging, rowing and pedalling, each on its own loop, the hips where the sit row has them', () => {
  for (const id of ['eat', 'chess', 'lounge', 'row', 'pedal'] as const) {
    assert.ok(seated(id) && SEATED.has(id));
    assert.ok(secondsOf(id) < 24 && secondsOf(id) === CLIP_DEFS[id].seconds, `${id}: its own loop`);
    for (const r of framesOf(id)) assert.ok(Math.abs(joint(r, BONE_INDEX.hips).y - joint(CLIP_ROWS.sit, BONE_INDEX.hips).y) < 0.01, `${id}: the hips at the seat`);
  }
  assert.ok(!seated('serve') && !seated('look'));
  const rel = (row: number, bone: number) => joint(row, bone).sub(joint(row, BONE_INDEX.hips));
  /** How far forward of the hips the head's joint is: the spine's lean */
  const leanAt = (r: number) => rel(r, BONE_INDEX.head).z;
  const sitLean = leanAt(CLIP_ROWS.sit);
  // Eating: the hands on the table in front; the right rises to the mouth once in a while, the head coming down to it
  const eat = framesOf('eat');
  const mouthOf = (r: number) => {
    const head = new THREE.Quaternion().setFromRotationMatrix(mat(r, BONE_INDEX.head));
    return joint(r, BONE_INDEX.head).add(new THREE.Vector3(0, 0.03, 0.075).applyQuaternion(head));
  };
  const bites = eat.filter((r) => joint(r, BONE_INDEX.handR).distanceTo(mouthOf(r)) < 0.06);
  assert.ok(bites.length >= 3 && bites.length < eat.length / 3, `eat: ${bites.length} frames with the hand at the mouth of ${eat.length}`);
  for (const r of eat) assert.ok(rel(r, BONE_INDEX.handL).z > 0.2 && rel(r, BONE_INDEX.handL).y > 0.1, 'eat: the left hand on the table');
  assert.ok(headAt(bites[0]).down > headAt(eat[0]).down + 0.12, 'eat: the head down to the bite');
  // Chess: leant in over the board, the chin on the left hand, the right out over the board once a loop
  const chess = framesOf('chess');
  for (const r of chess) {
    assert.ok(leanAt(r) > sitLean + 0.04, `chess: leaning in (${leanAt(r).toFixed(3)} vs ${sitLean.toFixed(3)})`);
    assert.ok(joint(r, BONE_INDEX.handL).distanceTo(mouthOf(r)) < 0.12, 'chess: the chin on the hand');
  }
  const [near, far] = span(chess, BONE_INDEX.handR, 'z');
  assert.ok(far > near + 0.12, `chess: a piece moved (${near.toFixed(2)} to ${far.toFixed(2)})`);
  assert.ok(keyed(MOVE, 6.6) === 1 && keyed(MOVE, 0) === 0);
  // Lounging: leant back with the legs out further than a sitter's, the head nodding
  const lounge = framesOf('lounge');
  const sitFoot = rel(CLIP_ROWS.sit, BONE_INDEX.footL).z;
  for (const r of lounge) {
    assert.ok(leanAt(r) < sitLean - 0.04, `lounge: leant back (${leanAt(r).toFixed(3)})`);
    assert.ok(rel(r, BONE_INDEX.footL).z > sitFoot + 0.08, 'lounge: the legs out');
  }
  const [nodMin, nodMax] = [Math.min(...lounge.map((r) => headAt(r).down)), Math.max(...lounge.map((r) => headAt(r).down))];
  assert.ok(nodMax - nodMin > 0.04, `lounge: the head nods (${(nodMax - nodMin).toFixed(3)})`);
  // Rowing: the hands out to the catch and back to the chest, the body rocking with them
  const row = framesOf('row');
  const [pullIn, reach] = span(row, BONE_INDEX.handR, 'z');
  assert.ok(reach > pullIn + 0.25, `row: a stroke of ${(reach - pullIn).toFixed(2)}`);
  const catchRow = row.reduce((a, b) => (rel(b, BONE_INDEX.handR).z > rel(a, BONE_INDEX.handR).z ? b : a));
  const finishRow = row.reduce((a, b) => (rel(b, BONE_INDEX.handR).z < rel(a, BONE_INDEX.handR).z ? b : a));
  assert.ok(leanAt(catchRow) > leanAt(finishRow) + 0.08, 'row: forward at the catch, back at the finish');
  for (const r of row) assert.ok(Math.abs(rel(r, BONE_INDEX.handL).x + rel(r, BONE_INDEX.handR).x) < 0.03, 'row: both hands together');
  // Pedalling: the hands on the bar, the feet going round in turn
  const pedal = framesOf('pedal');
  for (const r of pedal) for (const h of [BONE_INDEX.handL, BONE_INDEX.handR]) assert.ok(rel(r, h).z > 0.2 && rel(r, h).y > 0.05, 'pedal: the hands on the bar');
  const diff = pedal.map((r) => rel(r, BONE_INDEX.footL).z - rel(r, BONE_INDEX.footR).z);
  assert.ok(Math.max(...diff) > 0.1 && Math.min(...diff) < -0.1, `pedal: the feet in turn (${Math.min(...diff).toFixed(2)} to ${Math.max(...diff).toFixed(2)})`);
});

test('kids at play (step 4): the set shot over the third idle, the swing seated with the legs pumping', () => {
  const rel = (row: number, bone: number) => joint(row, bone).sub(joint(row, BONE_INDEX.hips));
  // The shot: the take's body; the hands together at the chest, then up over the head and out, the chin up at the hoop
  const shoot = framesOf('shoot');
  assert.equal(CLIP_DEFS.shoot.frames, CLIP_DEFS.idle3.frames);
  for (let f = 0; f < shoot.length; f += 4) for (const b of [BONE_INDEX.hips, BONE_INDEX.footL, BONE_INDEX.footR]) assert.ok(joint(shoot[f], b).distanceTo(joint(CLIP_ROWS.idle3 + f, b)) < 1e-6, 'shoot: the take\'s body');
  const chest0 = rel(shoot[0], BONE_INDEX.handR);
  assert.ok(chest0.y > 0.1 && chest0.y < 0.3 && chest0.z > 0.12, `shoot: the ball at the chest to start (${chest0.y.toFixed(2)}, ${chest0.z.toFixed(2)})`);
  const top = shoot.reduce((a, b) => (rel(b, BONE_INDEX.handR).y > rel(a, BONE_INDEX.handR).y ? b : a));
  for (const h of [BONE_INDEX.handL, BONE_INDEX.handR]) assert.ok(rel(top, h).y > rel(top, BONE_INDEX.head).y + 0.05 && rel(top, h).z > 0.08, 'shoot: both hands up over the head and out');
  // (the take's chest turns a little under the keyed arms)
  assert.ok(Math.abs(rel(top, BONE_INDEX.handL).x + rel(top, BONE_INDEX.handR).x) < 0.1, 'shoot: the hands together on the ball');
  assert.ok(headAt(top).down < headAt(shoot[0]).down - 0.1 && headAt(top).down < -0.15, 'shoot: looking up at the hoop');
  assert.ok(keyed(SHOT, 1.37) === 1 && keyed(SHOT, 1.9) === 2 && keyed(SHOT, 3.5) === 0);
  // The swing: seated (the hips as the sit row's), the hands up on the chains either side, the legs out and back together
  const swing = framesOf('swing');
  assert.ok(seated('swing'));
  for (const r of swing) {
    assert.ok(Math.abs(joint(r, BONE_INDEX.hips).y - joint(CLIP_ROWS.sit, BONE_INDEX.hips).y) < 0.01, 'swing: the hips on the seat');
    for (const h of [BONE_INDEX.handL, BONE_INDEX.handR]) assert.ok(rel(r, h).y > 0.2 && Math.abs(Math.abs(rel(r, h).x) - 0.17) < 0.06, 'swing: the hands up on the chains');
    assert.ok(Math.abs(rel(r, BONE_INDEX.footL).z - rel(r, BONE_INDEX.footR).z) < 0.03, 'swing: the legs together');
  }
  const [back, fore] = span(swing, BONE_INDEX.footL, 'z');
  assert.ok(fore > back + 0.2, `swing: the legs kick out (${back.toFixed(2)} to ${fore.toFixed(2)})`);
});
