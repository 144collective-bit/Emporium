// Degen on his feet (character Phase 2, locomotion.ts): the leg IK reaches what it's asked to,
// a planted foot never slides at any speed, turning, strafing or backing up, on flat ground and up
// stairs; the gait follows the speed; standing still he settles and steps round when he turns;
// jumps land with the clip their fall calls for; and nothing pops from one frame to the next.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LAND_CROUCH, LAND_ROLL, LANDINGS, LEG_REACH, createLocomotion, gait, placeRoot, reachLeg, type LocoInput } from '../src/scripts/city3d/locomotion';
import { HIP_Y, LEG_X, makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';

const SCALE = 0.85;
const DT = 1 / 60;

test('the leg IK puts the ankle where it is asked, knee forward', () => {
  const sk = makeSkeleton();
  const p = newPose();
  const want = new THREE.Vector3();
  const got = new THREE.Vector3();
  for (const side of [-0.05, 0, 0.04])
    for (const [x, y, z] of [
      [0, -0.5, 0],
      [0.03, -0.45, 0.2],
      [-0.02, -0.4, -0.25],
      [0.05, -0.3, 0.1],
      [0.0, -0.52, 0.05],
    ])
      for (const i of [0, 1] as const) {
        const s = i === 0 ? -1 : 1;
        p.side = side;
        want.set(x, y, z);
        reachLeg(p.legs[i], s, want, side);
        p.legs[i].foot = 0;
        poseSkeleton(sk, p);
        sk.root.updateMatrixWorld(true);
        // The ankle in the hips' space, from the hip joint
        const hips = sk.bones.hips;
        const foot = i === 0 ? sk.bones.footL : sk.bones.footR;
        got.setFromMatrixPosition(foot.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(hips.matrixWorld).invert());
        got.x -= s * LEG_X;
        assert.ok(got.distanceTo(want) < 1e-4, `leg ${i} to ${want.toArray()}: ${got.toArray()}`);
        // The knee bends forward, never back
        assert.ok(p.legs[i].bend >= 0);
      }
  assert.ok(LEG_REACH < HIP_Y);
});

test('the gait: faster is more steps a second, less time on the ground, a deeper lean', () => {
  let prev = gait(0);
  for (let w = 0.5; w <= 11; w += 0.5) {
    const g = gait(w);
    assert.ok(g.cadence >= prev.cadence && g.duty <= prev.duty && g.lean >= prev.lean);
    prev = g;
  }
  // A walk has both feet down at once, a run has both up
  assert.ok(gait(1.5).duty > 0.5 && gait(10).duty < 0.5);
});

/** Drive the locomotion: the body moves by `move(t)` (velocity and facing), over `ground` */
function drive(move: (t: number) => { vx: number; vz: number; face: number; grounded?: boolean; vy?: number }, seconds: number, ground: LocoInput['ground'] = () => 0, onFrame?: (t: number, loco: ReturnType<typeof createLocomotion>, sk: ReturnType<typeof makeSkeleton>, input: LocoInput) => void) {
  const loco = createLocomotion();
  const sk = makeSkeleton();
  let x = 0;
  let y = 0;
  let z = 0;
  // Speeds ease to what's asked as walk.ts eases them (a sudden stop takes a few frames)
  let vx = 0;
  let vz = 0;
  for (let t = 0; t < seconds; t += DT) {
    const want = move(t);
    const k = t === 0 ? 1 : 1 - Math.exp(-11 * DT);
    vx += (want.vx - vx) * k;
    vz += (want.vz - vz) * k;
    const m = { ...want, vx, vz };
    x += m.vx * DT;
    z += m.vz * DT;
    // (stepping up eases up, as in walk.ts; down it follows the ground)
    if (m.grounded === false) y += (m.vy ?? 0) * DT;
    else {
      const gy = ground(x, z, y + 0.3);
      y = gy > y + 0.05 ? y + (gy - y) * (1 - Math.exp(-20 * DT)) : gy;
    }
    const input: LocoInput = { dt: DT, t, x, y, z, vx: m.vx, vz: m.vz, face: m.face, grounded: m.grounded ?? true, vy: m.vy ?? 0, scale: SCALE, ground };
    loco.update(input);
    poseSkeleton(sk, loco.pose);
    placeRoot(sk.root, x, y, z, m.face, SCALE, loco.root);
    sk.root.updateMatrixWorld(true);
    onFrame?.(t, loco, sk, input);
  }
  return loco;
}

/** Across every stance, how far the ball of each foot moves while it's down (after the heel, before the toe-off) */
function slide(move: Parameters<typeof drive>[0], seconds: number, ground?: LocoInput['ground']) {
  let worst = 0;
  let stances = 0;
  const at: (THREE.Vector3 | null)[] = [null, null];
  const ball = new THREE.Vector3();
  drive(
    move,
    seconds,
    ground,
    (t, loco, sk) => {
      if (t < 1) return;
      for (let i = 0; i < 2; i++) {
        const f = loco.feet[i];
        const toe = i === 0 ? sk.bones.toeL : sk.bones.toeR;
        ball.setFromMatrixPosition(toe.matrixWorld);
        const flat = f.stance && loco.stepping && f.u > 0.2 && f.u < 0.97;
        if (!flat) {
          if (at[i]) stances++;
          at[i] = null;
          continue;
        }
        if (!at[i]) at[i] = ball.clone();
        else worst = Math.max(worst, Math.hypot(ball.x - at[i]!.x, ball.z - at[i]!.z), Math.abs(ball.y - at[i]!.y));
      }
    }
  );
  return { worst, stances };
}

test('a planted foot never slides: walking, jogging and running, turning, strafing and backing up', () => {
  for (const v of [0.6, 1.2, 2.4, 3.6, 5.4]) {
    const straight = slide(() => ({ vx: 0, vz: v, face: 0 }), 4);
    assert.ok(straight.stances >= 3, `steps at ${v}`);
    assert.ok(straight.worst < 0.004, `straight at ${v}: ${straight.worst.toFixed(4)}`);
    // Round a bend, turning as he goes
    const bend = slide((t) => ({ vx: Math.sin(t * 0.8) * v, vz: Math.cos(t * 0.8) * v, face: t * 0.8 }), 4);
    assert.ok(bend.worst < 0.006, `bend at ${v}: ${bend.worst.toFixed(4)}`);
  }
  // Aiming: facing one way, moving another
  for (const [vx, vz] of [
    [1.7, 0],
    [-1.7, 0],
    [0, -1.7],
    [1.2, -1.2],
  ]) {
    const r = slide(() => ({ vx, vz, face: 0 }), 4);
    assert.ok(r.stances >= 3 && r.worst < 0.004, `strafing ${vx},${vz}: ${r.worst.toFixed(4)}`);
  }
});

test('up and down stairs and slopes every foot lands where it steps and stays there', () => {
  // A flight of stairs (0.15 up every 0.3), and a steep ramp like Liberty Bridge's stairs (3.6 up over 2.6)
  const stairs = (_x: number, z: number) => Math.max(0, Math.min(14, Math.floor(z / 0.3))) * 0.15;
  const ramp = (_x: number, z: number) => Math.max(0, Math.min(3.6, (z - 1) * (3.6 / 2.6)));
  for (const [name, ground, v] of [
    ['stairs up', stairs, 2.4],
    ['stairs down', (x: number, z: number) => stairs(x, 8 - z), 2.4],
    ['ramp up', ramp, 2.4],
    ['ramp down', (x: number, z: number) => ramp(x, 6 - z), 2.4],
  ] as const) {
    const r = slide(() => ({ vx: 0, vz: v, face: 0 }), 3.4, ground);
    assert.ok(r.stances >= 3 && r.worst < 0.004, `${name}: ${r.worst.toFixed(4)}`);
  }
  // And the feet stand on the treads, never in them
  drive(
    () => ({ vx: 0, vz: 1.8, face: 0 }),
    4,
    stairs,
    (_t, loco) => {
      for (const f of loco.feet) if (f.stance) assert.ok(Math.abs(f.plant.y - stairs(f.plant.x, f.plant.z)) < 1e-9);
    }
  );
});

test('standing: he stops and settles, and steps round to face a new way', () => {
  // Walk, then stop: the walk stops and both feet end up under him
  const loco = drive((t) => ({ vx: 0, vz: t < 2 ? 2.4 : 0, face: 0 }), 4);
  assert.equal(loco.stepping, false);
  for (const f of loco.feet) assert.ok(f.stance);
  // Turned half round on the spot: he steps round, then stands again facing the new way
  let stepped = false;
  const turned = drive(
    (t) => ({ vx: 0, vz: 0, face: t < 1 ? 0 : Math.min(Math.PI, (t - 1) * 6) }),
    4,
    undefined,
    (_t, l) => (stepped ||= l.stepping)
  );
  assert.ok(stepped);
  assert.equal(turned.stepping, false);
  for (const f of turned.feet) assert.ok(Math.abs(Math.atan2(Math.sin(f.yaw - Math.PI), Math.cos(f.yaw - Math.PI))) < 0.4);
});

test('landings: soft from a hop, a crouch from a drop, a roll from a big one on the run', () => {
  assert.ok(LAND_CROUCH < LAND_ROLL);
  for (const c of Object.values(LANDINGS)) {
    // Every clip starts and ends at rest, so it can cut in and out
    for (const tr of Object.values(c.tracks)) {
      assert.equal(tr[0][1], 0);
      assert.ok(tr[tr.length - 1][0] <= c.length);
    }
  }
  assert.equal(LANDINGS.roll.tracks.pitch!.at(-1)![1], Math.PI * 2, 'the roll comes right over');
  // Fall onto the ground at a speed and see which clip plays (the roll needs a run-up)
  const fall = (vy: number, vz: number) => {
    let kind = '';
    drive(
      (t) => (t < 1 ? { vx: 0, vz, face: 0 } : t < 1.4 ? { vx: 0, vz, face: 0, grounded: false, vy } : { vx: 0, vz, face: 0 }),
      2,
      undefined,
      (t, loco) => {
        if (t > 1.4 && !kind && loco.landed) kind = loco.landed;
      }
    );
    return kind;
  };
  assert.equal(fall(-3.9, 0), 'soft');
  assert.equal(fall(-7, 0), 'crouch');
  assert.equal(fall(-12, 3), 'roll');
});

test('nothing pops: from a stand to a run and back, a jump and a landing, every joint moves smoothly', () => {
  const prev = newPose();
  let first = true;
  // Walking and jogging, and sprinting (where a knee takes a touchdown in a few frames)
  const worst = [0, 0];
  const where = ['', ''];
  drive(
    (t) => {
      const v = t < 0.5 ? 0 : t < 2 ? 2.4 : t < 3.5 ? 5.4 : t < 4 ? 2.4 : 0;
      if (t > 5 && t < 5.5) return { vx: 0, vz: 0, face: 0, grounded: false, vy: 3.9 - (t - 5) * 11.5 };
      return { vx: 0, vz: v, face: t > 6 ? Math.min(1.5, (t - 6) * 3) : 0 };
    },
    8,
    undefined,
    (t, loco, _sk, input) => {
      const p = loco.pose;
      // (by the gait he's in: it follows the speed over a few steps)
      const k = Math.hypot(input.vx, input.vz) > 2.6 || loco.gait.cadence > 4.2 ? 1 : 0;
      if (!first) {
        const pairs: [number, number, string][] = [
          [p.bob, prev.bob, 'bob'],
          [p.lean, prev.lean, 'lean'],
          [p.side, prev.side, 'side'],
        ];
        for (let i = 0; i < 2; i++)
          for (const k of ['fwd', 'out', 'bend'] as const) {
            pairs.push([p.legs[i][k], prev.legs[i][k], `leg${i}.${k}`]);
            pairs.push([p.arms[i][k], prev.arms[i][k], `arm${i}.${k}`]);
          }
        for (const [a, b, name] of pairs)
          if (Math.abs(a - b) > worst[k]) {
            worst[k] = Math.abs(a - b);
            where[k] = `${name} at ${t.toFixed(2)}`;
          }
      }
      first = false;
      prev.bob = p.bob;
      prev.lean = p.lean;
      prev.side = p.side;
      for (let i = 0; i < 2; i++)
        for (const k of ['fwd', 'out', 'bend'] as const) {
          prev.legs[i][k] = p.legs[i][k];
          prev.arms[i][k] = p.arms[i][k];
        }
    }
  );
  // At 60 frames a second no joint turns more than 0.3 radians in a frame walking or jogging (a
  // knee reaching for the ground), or 0.6 sprinting (a jump, a flip or a snap is far more)
  assert.ok(worst[0] < 0.3, `walking ${worst[0].toFixed(3)} (${where[0]})`);
  assert.ok(worst[1] < 0.6, `sprinting ${worst[1].toFixed(3)} (${where[1]})`);
});
