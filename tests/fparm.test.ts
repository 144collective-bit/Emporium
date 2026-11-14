// Degen's arms in first person with empty hands (fparm.ts, the owner's call 2026-11: premium, jointed, not
// deformed): the elbow's reach, the fist's shape and the sleeves' pieces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ARM, CREASE, FIST, WRIST, aimPiece, cuffGeometry, fistGeometry, merge, paint, paintFist, sleeveGeometry, sleeveRadius, solveArm, stripeGeometry } from '../src/scripts/city3d/fparm';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e;

test('in reach, the hand lands on the target and both bones keep their lengths', () => {
  const s = V(0.2, -0.27, 0.06);
  const t = V(0.12, -0.12, -0.33);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, t, V(0.45, -1, 0.15), e, h);
  assert.ok(h.distanceTo(t) < 1e-6, 'on the target');
  assert.ok(near(s.distanceTo(e), ARM.upper), 'upper arm');
  assert.ok(near(e.distanceTo(h), ARM.fore), 'forearm');
});

test('the elbow swings towards the pole: down in the guard, up and out for a hook', () => {
  const s = V(0.2, -0.27, 0.06);
  const t = V(0.12, -0.12, -0.33);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, t, V(0, -1, 0), e, h);
  const mid = s.clone().add(h).multiplyScalar(0.5);
  assert.ok(e.y < mid.y, 'down');
  solveArm(s, t, V(1, 0.5, 0), e, h);
  assert.ok(e.x > mid.x, 'out');
});

test('out of reach, the arm goes straight towards the target and no further; never folded through itself', () => {
  const s = V(0, 0, 0);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, V(0, 0, -2), V(0, -1, 0), e, h);
  assert.ok(h.length() <= ARM.upper + ARM.fore + 1e-9 && h.length() > (ARM.upper + ARM.fore) * 0.99);
  assert.ok(h.x === 0 && h.y === 0 && h.z < 0, 'straight at it');
  solveArm(s, V(0, 0, -0.001), V(0, -1, 0), e, h);
  assert.ok(h.length() >= Math.abs(ARM.upper - ARM.fore), 'not through itself');
  assert.ok(Number.isFinite(e.x + e.y + e.z));
});

test('a piece is turned along its bone, its +z as near the face asked as it can be', () => {
  const q = new THREE.Quaternion();
  aimPiece(V(0, 0, 0), V(0, 1, -1), V(0, 0, 1), q);
  const y = V(0, 1, 0).applyQuaternion(q);
  const z = V(0, 0, 1).applyQuaternion(q);
  assert.ok(y.distanceTo(V(0, 1, -1).normalize()) < 1e-6);
  assert.ok(near(y.dot(z), 0) && z.z > 0 && z.y > 0, 'square to the bone, facing as near as it can');
  // (a face along the bone itself still gives a turn)
  aimPiece(V(0, 0, 0), V(0, 0, 1), V(0, 0, 1), q);
  assert.ok(Number.isFinite(q.x + q.y + q.z + q.w));
});

test('the fist: closed, its size, the knuckles out front, the thumb on its side, nothing left over', () => {
  for (const thumb of [-1, 1] as const) {
    const g = fistGeometry(thumb);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const size = b.getSize(new THREE.Vector3());
    assert.ok(size.x > FIST.width * 0.9 && size.x < FIST.width * 1.2, `wide ${size.x}`);
    assert.ok(b.max.y > FIST.length * 0.85 && b.max.y < FIST.length * 1.1, `long ${b.max.y}`);
    assert.ok(size.z > FIST.depth * 0.8 && size.z < FIST.depth * 1.2, `deep ${size.z}`);
    // (the thumb, the furthest under the palm, is on its own side)
    const pos = g.attributes.position as THREE.BufferAttribute;
    let lowX = 0;
    let lowZ = Infinity;
    for (let i = 0; i < pos.count; i++)
      if (pos.getZ(i) < lowZ && pos.getY(i) > 0.06) {
        lowZ = pos.getZ(i);
        lowX = pos.getX(i);
      }
    assert.ok(lowX * thumb > -0.01, `thumb on side ${thumb}`);
    // (its crease shade rides in `tint` until it's painted: paintFist())
    assert.deepEqual(Object.keys(g.attributes).sort(), ['normal', 'position', 'tint']);
  }
});

test('the smooth fist: one shape, every face out, creases drawn in where the fingers and thumb meet', () => {
  for (const thumb of [-1, 1] as const) {
    const g = fistGeometry(thumb);
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const t = g.attributes.tint as THREE.BufferAttribute;
    // Every face turned the way the surface faces (none inside out, the mirrored hand included)
    let wrong = 0;
    const [a, b, c, e1, e2] = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i);
      b.fromBufferAttribute(p, i + 1);
      c.fromBufferAttribute(p, i + 2);
      const f = e1.subVectors(b, a).cross(e2.subVectors(c, a));
      const nn = V(n.getX(i) + n.getX(i + 1) + n.getX(i + 2), n.getY(i) + n.getY(i + 1) + n.getY(i + 2), n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2));
      if (f.dot(nn) < 0) wrong++;
    }
    assert.equal(wrong, 0, 'faces inside out');
    // Creases: some of it deep in one, most of it clear of any
    let deep = 0;
    for (let i = 0; i < t.count; i++) {
      assert.ok(t.getX(i) >= 0 && t.getX(i) <= 1);
      if (t.getX(i) > CREASE.full * 0.8) deep++;
    }
    assert.ok(deep > t.count * 0.01 && deep < t.count * 0.25, `creases ${deep / t.count}`);
    // Painted: the skin, darker in the creases, never lighter
    const painted = paintFist(g.clone(), '#e8c49a');
    const skin = new THREE.Color('#e8c49a');
    const pt = painted.attributes.tint as THREE.BufferAttribute;
    let darkest = 1;
    for (let i = 0; i < pt.count; i++) {
      assert.ok(pt.getX(i) <= skin.r + 1e-6);
      darkest = Math.min(darkest, pt.getX(i) / skin.r);
    }
    assert.ok(near(darkest, 1 - CREASE.dark, 0.02), `darkest ${darkest}`);
  }
});

test('the sleeves and cuffs: their lengths, round both ends; painted pieces merge into one draw', () => {
  const s = sleeveGeometry(0.058, 0.052, ARM.upper);
  s.computeBoundingBox();
  assert.ok(near(s.boundingBox!.min.y, -0.058, 1e-4) && near(s.boundingBox!.max.y, ARM.upper + 0.052, 1e-4));
  const open = sleeveGeometry(0.05, 0.045, 0.2, false);
  open.computeBoundingBox();
  assert.ok(near(open.boundingBox!.max.y, 0.2, 1e-6), 'open-ended for a cuff');
  const c = cuffGeometry(0.04, 0.037, 0.2, 0.25, 3);
  c.computeBoundingBox();
  assert.ok(c.boundingBox!.min.y >= 0.2 - 0.003 && c.boundingBox!.max.y <= 0.25 + 0.003);
  const st = stripeGeometry(Math.PI / 2, 0.058, 0.052, ARM.upper, 0.03, ARM.upper - 0.01);
  st.computeBoundingBox();
  assert.ok(st.boundingBox!.min.z > 0.05, 'a stripe at +z sits out on +z');
  // (on the sleeve all the way along: never sunk into it, never more than a few millimetres off it)
  const sp = st.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const out = Math.hypot(sp.getX(i), sp.getZ(i)) - sleeveRadius(0.058, 0.052, ARM.upper, sp.getY(i));
    assert.ok(out > 0 && out < 0.006, `stripe ${out} off the sleeve at ${sp.getY(i)}`);
  }
  const g = merge([paint(s, '#ff0000'), paint(fistGeometry(-1).translate(0, ARM.fore, 0), '#00ff00')]);
  const tint = g.attributes.tint as THREE.BufferAttribute;
  assert.equal(tint.count, g.attributes.position.count);
  assert.ok(tint.getX(0) > 0.9 && tint.getY(0) < 0.1);
  assert.ok(tint.getY(tint.count - 1) > 0.9);
});

// His body's arms read from the eye (the owner's call, 2026-11: "use his real body's clips")
import { makeSkeleton, newPose, poseSkeleton, UPPER_ARM } from '../src/scripts/city3d/skeleton';
import { BODY_TO_ARM, EYE, FP_FIX, KNUCKLES, blendArm, bodyArm, eyeFrame, newLaidArm, pumpArm, pumpSwing, type BodyJoints } from '../src/scripts/city3d/fparm';

/** His skeleton posed (arms by `arms`), scaled `unit` and facing +z: its head and each arm's joints in the world */
function body(unit: number, arms?: (p: ReturnType<typeof newPose>) => void) {
  const sk = makeSkeleton();
  const p = newPose();
  arms?.(p);
  poseSkeleton(sk, p, [1, 1]);
  sk.root.scale.setScalar(unit);
  sk.root.updateMatrixWorld(true);
  const v = () => new THREE.Vector3();
  const side = (S: 'L' | 'R'): BodyJoints => ({
    shoulder: sk.bones[`arm${S}`].getWorldPosition(v()),
    elbow: sk.bones[`fore${S}`].getWorldPosition(v()),
    hand: sk.bones[`hand${S}`].getWorldPosition(v()),
    back: V(S === 'R' ? 1 : -1, 0, 0).applyQuaternion(sk.bones[`hand${S}`].getWorldQuaternion(new THREE.Quaternion())),
  });
  return { head: sk.bones.head.getWorldPosition(v()), L: side('L'), R: side('R') };
}

test('the eye: in his head, up and forward of the head bone, looking the way he faces', () => {
  const head = V(1, 2, 3);
  const m = eyeFrame(head, V(0, 0.3, 1), 0.66, new THREE.Matrix4());
  const at = new THREE.Vector3().setFromMatrixPosition(m);
  assert.ok(near(at.y - head.y, EYE.up * 0.66) && near(at.z - head.z, EYE.fwd * 0.66) && near(at.x, 1));
  // (-z the way he faces, level: a point ahead of him is ahead of the eye)
  const ahead = V(1, 2, 13).applyMatrix4(m.clone().invert());
  assert.ok(ahead.z < -9 && Math.abs(ahead.x) < 1e-6);
});

test('laid on his body: his arm lengths become the arm\'s, the elbow his own, the fist on his forearm', () => {
  for (const unit of [0.66, 1]) {
    const b = body(unit, (p) => {
      p.arms[0].fwd = p.arms[1].fwd = 0.8;
      p.arms[0].bend = p.arms[1].bend = 1.6;
    });
    const eye = eyeFrame(b.head, V(0, 0, 1), unit, new THREE.Matrix4());
    for (const j of [b.L, b.R]) {
      const l = bodyArm(j, eye, unit, newLaidArm());
      assert.ok(near(l.shoulder.distanceTo(l.elbow), ARM.upper, 1e-4), 'the upper arm');
      assert.ok(near(l.elbow.distanceTo(l.wrist), ARM.fore, 1e-4), 'the forearm');
      // (the elbow is his: his elbow read from the eye, in these metres)
      const mine = j.elbow.clone().applyMatrix4(eye.clone().invert()).multiplyScalar(BODY_TO_ARM / unit);
      assert.ok(mine.distanceTo(l.elbow) < 1e-6);
      assert.ok(near(l.face.length(), 1));
    }
    // (his two arms either side of the eye, both below it)
    const L = bodyArm(b.L, eye, unit, newLaidArm());
    const R = bodyArm(b.R, eye, unit, newLaidArm());
    assert.ok(L.shoulder.x * R.shoulder.x < 0 && L.shoulder.y < 0 && R.shoulder.y < 0);
  }
  assert.ok(near(BODY_TO_ARM * UPPER_ARM, ARM.upper));
});

test('the guard\'s first-person correction: the fists up, in and never at the eye; the arm keeps its lengths', () => {
  const unit = 0.66;
  // (a tight guard: the fists by his chin)
  const b = body(unit, (p) => {
    p.arms[0].fwd = p.arms[1].fwd = 0.45;
    p.arms[0].bend = p.arms[1].bend = 2.4;
  });
  const eye = eyeFrame(b.head, V(0, 0, 1), unit, new THREE.Matrix4());
  for (const j of [b.L, b.R]) {
    const raw = bodyArm(j, eye, unit, newLaidArm());
    const fixed = bodyArm(j, eye, unit, newLaidArm(), 1);
    assert.ok(fixed.wrist.y > raw.wrist.y, 'up');
    assert.ok(Math.abs(fixed.wrist.x) < Math.abs(raw.wrist.x), 'in');
    assert.ok(fixed.wrist.z <= -FP_FIX.near + 1e-3, 'not at the eye');
    assert.ok(near(fixed.shoulder.distanceTo(fixed.elbow), ARM.upper, 1e-4) && near(fixed.elbow.distanceTo(fixed.wrist), ARM.fore, 1e-4));
    // (none of it with the guard down)
    assert.ok(bodyArm(j, eye, unit, newLaidArm(), 0).wrist.distanceTo(raw.wrist) < 1e-9);
  }
});

test('the pump: the fists bob up and down in their corners, the elbow always bent, never locked out', () => {
  const knuckles = (a: ReturnType<typeof newLaidArm>) => a.wrist.clone().addScaledVector(a.wrist.clone().sub(a.elbow).normalize(), KNUCKLES);
  const inView = (w: THREE.Vector3) => w.z < -0.2 && Math.abs(w.y / w.z) < Math.tan((32.5 * Math.PI) / 180) && w.y < 0;
  for (const side of [1, -1]) {
    for (const [sprint, walk] of [
      [0, 0],
      [1, 0],
      [0, 1],
    ]) {
      let last: THREE.Vector3 | null = null;
      for (let k = -1; k <= 1.0001; k += 0.05) {
        const a = pumpArm(side, k, sprint, newLaidArm(), walk);
        // (the arm's lengths, and the elbow bent all the way: an arm that's never straight)
        assert.ok(near(a.shoulder.distanceTo(a.elbow), ARM.upper, 1e-4) && near(a.elbow.distanceTo(a.wrist), ARM.fore, 1e-4));
        const bend = (a.shoulder.clone().sub(a.elbow).angleTo(a.wrist.clone().sub(a.elbow)) * 180) / Math.PI;
        assert.ok(bend > 65 && bend < 115, `elbow ${bend.toFixed(0)}`);
        // (smooth: never a jump, never stopped against an edge)
        if (last) assert.ok(a.wrist.distanceTo(last) < 0.04 && a.wrist.distanceTo(last) > 1e-5, 'smooth');
        last = a.wrist.clone();
        // (the back of the fist out; the elbow below and behind the wrist, on its own side)
        assert.ok(a.face.x * side > 0 && a.elbow.y < a.wrist.y && a.elbow.z > a.wrist.z && a.elbow.x * side > 0);
      }
      const up = pumpArm(side, 1, sprint, newLaidArm(), walk);
      const down = pumpArm(side, -1, sprint, newLaidArm(), walk);
      // Mostly up and down: it rises far more than it travels forward and back
      assert.ok(up.wrist.y - down.wrist.y > 2 * Math.abs(up.wrist.z - down.wrist.z), 'up and down');
      // At the top, the fist in its own lower corner
      assert.ok(inView(knuckles(up)) && up.wrist.x * side > 0 && up.wrist.y < -0.1, `top ${knuckles(up).toArray().map((n) => n.toFixed(2))}`);
    }
    // Sprinting it bobs higher, walking lower
    assert.ok(pumpArm(side, 1, 1, newLaidArm()).wrist.y > pumpArm(side, 1, 0, newLaidArm()).wrist.y);
    assert.ok(pumpArm(side, 1, 0, newLaidArm(), 1).wrist.y < pumpArm(side, 1, 0, newLaidArm()).wrist.y);
  }
});

test('the pump\'s timing is his: each arm\'s swing from how far it is ahead of the other, and blending keeps the arm whole', () => {
  assert.equal(pumpSwing(0, 0.1), 0);
  assert.ok(pumpSwing(0.1, 0.1) > 0.5 && pumpSwing(-0.1, 0.1) < -0.5);
  assert.equal(pumpSwing(5, 0.1), 1);
  // (blended half way from his own arm to the pump, the arm keeps its lengths)
  // (his own arm from a shoulder elsewhere: the blend moves the shoulder too)
  const own = pumpArm(1, -1, 0, newLaidArm());
  own.shoulder.add(V(0, 0.03, 0.12));
  own.elbow.add(V(0, 0.03, 0.12));
  own.wrist.add(V(0, 0.03, 0.12));
  const pump = pumpArm(1, 1, 0, newLaidArm());
  const mid = blendArm(own, pump, 0.5);
  assert.ok(near(mid.shoulder.z, (0.06 + 0.12 + 0.06) / 2, 1e-6), 'the shoulder half way');
  assert.ok(near(mid.shoulder.distanceTo(mid.elbow), ARM.upper, 1e-4) && near(mid.elbow.distanceTo(mid.wrist), ARM.fore, 1e-4));
});

test('the loose fist: the same size as the tight one, its fingers eased open', () => {
  for (const thumb of [-1, 1] as const) {
    const tight = fistGeometry(thumb);
    const loose = fistGeometry(thumb, 1);
    tight.computeBoundingBox();
    loose.computeBoundingBox();
    const a = tight.boundingBox!.getSize(V(0, 0, 0));
    const b = loose.boundingBox!.getSize(V(0, 0, 0));
    assert.ok(Math.abs(a.x - b.x) < 0.01 && b.y < a.y + 0.03, 'about the same size');
    assert.ok(loose.boundingBox!.max.y > tight.boundingBox!.max.y, 'the fingers further out');
  }
});

// A punch's feel in first person (the owner's call, 2026-11: subtle)
import { PUNCH_FEEL, punchEnvelope, softTop } from '../src/scripts/city3d/fparm';
import { MOVES as FIGHT_MOVES } from '../src/scripts/city3d/fight-sim';

test("a punch's feel: up over its start-up, held while it lands, eased back over its recovery; small and the right way", () => {
  for (const id of ['jab', 'cross', 'hook', 'uppercut'] as const) {
    const m = FIGHT_MOVES[id];
    assert.equal(punchEnvelope(0, m.startup, m.active, m.recovery), 0);
    assert.equal(punchEnvelope(m.startup, m.startup, m.active, m.recovery), 1);
    assert.equal(punchEnvelope(m.startup + m.active + m.recovery, m.startup, m.active, m.recovery), 0);
    let last = 0;
    for (let f = 0; f <= m.startup; f++) {
      const e = punchEnvelope(f, m.startup, m.active, m.recovery);
      assert.ok(e >= last && e >= 0 && e <= 1);
      last = e;
    }
    // (subtle: never more than about three degrees)
    assert.ok(Math.abs(PUNCH_FEEL.turn[id]) < 0.06 && Math.abs(PUNCH_FEEL.lean[id]) < 0.03);
  }
  // (a left hand turns him right, a right hand left: the jab and hook the left, with the left lead)
  assert.ok(PUNCH_FEEL.turn.jab < 0 && PUNCH_FEEL.turn.hook < 0 && PUNCH_FEEL.turn.cross > 0 && PUNCH_FEEL.turn.uppercut > 0);
  // (a hit holds the fight about three frames)
  assert.ok(PUNCH_FEEL.stop > 0.03 && PUNCH_FEEL.stop < 0.08);
});

test('the soft top: a fist well under it is left alone, one rising past it eases under it, never a hard edge', () => {
  assert.ok(Math.abs(softTop(-0.3, -0.03, 0.03) - -0.3) < 1e-4);
  assert.ok(softTop(0.2, -0.03, 0.03) <= -0.03 + 1e-9);
  let last = -Infinity;
  for (let y = -0.2; y < 0.3; y += 0.01) {
    const t = softTop(y, -0.03, 0.03);
    assert.ok(t > last && t < -0.03 + 1e-9, 'rising smoothly, never past it');
    last = t;
  }
});

test('the phone tier\'s fist: the same hand, coarser (about half the triangles)', () => {
  for (const thumb of [-1, 1] as const) {
    const hi = fistGeometry(thumb);
    const lo = fistGeometry(thumb, 0, true);
    hi.computeBoundingBox();
    lo.computeBoundingBox();
    const a = hi.boundingBox!.getSize(V(0, 0, 0));
    const b = lo.boundingBox!.getSize(V(0, 0, 0));
    assert.ok(a.distanceTo(b) < 0.006, `same size ${a.toArray()} ${b.toArray()}`);
    const ratio = lo.attributes.position.count / hi.attributes.position.count;
    assert.ok(ratio < 0.6, `fewer triangles ${ratio}`);
  }
});

test('the wrist: inside every cuff with room to spare (nothing flush), no narrower than the hand above it wants', () => {
  // (the suit's shirt cuff is the tightest: 33 mm at its rim, 12 mm short of the fist; fistsview.ts)
  const g = fistGeometry(1);
  const p = g.attributes.position as THREE.BufferAttribute;
  let widest = 0;
  let narrowest = Infinity;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > -0.016 && y < -0.008) widest = Math.max(widest, Math.hypot(p.getX(i), p.getZ(i) - WRIST.z));
  }
  for (const y of [0.0, 0.01]) {
    let w = 0;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y) < 0.002) w = Math.max(w, Math.abs(p.getX(i)));
    narrowest = Math.min(narrowest, w);
  }
  assert.ok(widest < 0.033 - 0.002, `inside the suit's cuff ${widest}`);
  assert.ok(narrowest > 0.026, `no neck ${narrowest}`);
});
