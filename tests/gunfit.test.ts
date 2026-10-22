// Guns in Degen's hands (Phase 3 of the character rebuild): every gun's hand spots are reachable and the
// hands land on them, ready, relaxed and aiming, through every reload, drawing and putting away; the reload
// clips start and end at rest and never jump.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeSkeleton, newPose, poseSkeleton, PALM_Y, PALM_Z, type Pose } from '../src/scripts/city3d/skeleton';
import { FIT, GRIP, RELOAD_CUES, newReloadFrame, reloadAt } from '../src/scripts/city3d/gunfit';
import { holdGun, newStance, STOWED, type HoldState } from '../src/scripts/city3d/stance';
import { WEAPONS, type WeaponId } from '../src/scripts/city3d/combat-sim';

const IDS = Object.keys(WEAPONS) as WeaponId[];
const sk = makeSkeleton();
const inv = new THREE.Matrix4();
/** Each palm's middle in the torso frame, after posing */
function palms(p: Pose) {
  poseSkeleton(sk, p);
  sk.root.updateMatrixWorld(true);
  inv.copy(sk.torso.matrixWorld).invert();
  return [sk.bones.foreL, sk.bones.foreR].map((b) => new THREE.Vector3(0, -PALM_Y, PALM_Z).applyMatrix4(b.matrixWorld).applyMatrix4(inv));
}
function hold(id: WeaponId, s: Partial<HoldState>, body: Partial<Pose> = {}) {
  const p = Object.assign(newPose(), body);
  const pivot = new THREE.Object3D();
  const mag = new THREE.Object3D();
  const st = newStance();
  holdGun(p, st, pivot, { id, mag }, { aim: 0, pitch: 0, recoil: 0, reload: 0, dt: 0, ...s });
  return { p, pivot, mag, st, on: (v: THREE.Vector3) => v.clone().applyMatrix4(pivot.matrix) };
}

test('every gun has its fit: hands, sight, muzzle, how it is carried and reloaded', () => {
  for (const id of IDS) {
    const f = FIT[id];
    assert.ok(f, id);
    assert.ok(f.muzzle.z > f.hold.z && f.hold.z > GRIP.z, `${id}: grip, then the front hand, then the muzzle`);
    assert.ok(['mag', 'shells', 'cylinder', 'box'].includes(f.reload) && f.kick > 0);
  }
  assert.equal(FIT.revolver.carry, 'pistol');
  assert.equal(FIT.shotgun.reload, 'shells');
  assert.equal(FIT.lmg.reload, 'box');
});

test('both hands land on every gun: grip and front spot, ready, relaxed and aiming, up and down, under recoil', () => {
  for (const id of IDS)
    for (const aim of [0, 0.5, 1])
      for (const ready of [0, 0.5, 1])
        for (const pitch of [-0.6, 0, 0.6])
          for (const recoil of [0, 0.04])
            for (const body of [{}, { lean: 0.15, twist: 0.3 }]) {
              const h = hold(id, { aim, ready, pitch, recoil }, body);
              const [g, f] = palms(h.p);
              const at = `${id} aim ${aim} ready ${ready} pitch ${pitch} recoil ${recoil}`;
              assert.ok(g.distanceTo(h.on(GRIP)) < 2e-3, `${at}: grip off by ${g.distanceTo(h.on(GRIP))}`);
              const two = FIT[id].carry === 'long' || Math.max(aim, ready) >= 0.8;
              if (two) assert.ok(f.distanceTo(h.on(FIT[id].hold)) < 2e-3, `${at}: front hand off by ${f.distanceTo(h.on(FIT[id].hold))}`);
              assert.ok(h.st.turn <= 1.1 + 1e-9, `${at}: turned ${h.st.turn}`);
              // Hands closed round it
              assert.ok(h.p.grip![0] > 0.8 && (!two || h.p.grip![1] > 0.6));
            }
});

test('aiming bends the spine a share of the way and keeps the head and the gun on the look', () => {
  for (const pitch of [-0.5, 0.5]) {
    const h = hold('rifle', { aim: 1, pitch });
    assert.ok(Math.sign(h.p.lean) === Math.sign(pitch) && Math.abs(h.p.lean) > 0.1, `lean ${h.p.lean}`);
    assert.ok(Math.abs(h.p.lean + h.p.headPitch) < 1e-9, 'the head takes it back out');
    // The barrel points where he looks, whatever the spine took
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(h.pivot.quaternion);
    const chest = new THREE.Quaternion().setFromEuler(new THREE.Euler(h.p.lean, 0, 0));
    dir.applyQuaternion(chest);
    assert.ok(Math.abs(Math.asin(-dir.y) - pitch) < 0.2, `pitch ${pitch}: aims ${Math.asin(-dir.y)}`);
  }
  // Recoil shoves the chest and the shooting shoulder back
  const kicked = hold('shotgun', { aim: 1, recoil: 0.04 });
  assert.ok(kicked.p.lean < -0.1 && (kicked.p.arms[0].reach ?? 0) < -0.1);
});

test('relaxed: a long gun carried low across the body, the revolver in one hand at his side', () => {
  const ready = hold('rifle', { ready: 1 });
  const low = hold('rifle', { ready: 0 });
  const muzzle = (h: ReturnType<typeof hold>) => h.on(FIT.rifle.muzzle);
  assert.ok(muzzle(low).y < muzzle(ready).y - 0.1, 'muzzle down');
  assert.ok(muzzle(low).x > muzzle(ready).x + 0.05, 'across his body');
  const pistol = hold('revolver', { ready: 0 });
  const walking = newPose().arms[1];
  assert.deepEqual([pistol.p.arms[1].fwd, pistol.p.arms[1].bend], [walking.fwd, walking.bend], 'the front hand left free');
  assert.ok(pistol.on(GRIP).y < 0.05 && pistol.on(GRIP).x < -0.15, 'gun hand down at his side');
});

test('reloads: the front hand goes to the magazine, the pouch and back, and the clips start and end at rest', () => {
  const f = newReloadFrame();
  for (const id of IDS) {
    for (const r of [0, 1]) {
      reloadAt(id, r, f);
      assert.ok(f.hand === 0 && f.away === 0 && f.roll === 0 && f.mag.length() === 0 && f.magShown && !f.carried, `${id} at ${r}`);
    }
    // Smooth: nothing jumps between two moments a frame apart (a reload is at least 1.4 s)
    const a = newReloadFrame();
    const b = newReloadFrame();
    let went = 0;
    for (let r = 0; r <= 1; r += 0.002) {
      reloadAt(id, r, a);
      reloadAt(id, Math.min(1, r + 0.002), b);
      // (the bolt snaps, a little quicker)
      for (const k of ['hand', 'away', 'roll', 'pitch', 'pull', 'bolt', 'magRoll'] as const) assert.ok(Math.abs(a[k] - b[k]) < (k === 'bolt' ? 0.1 : 0.06), `${id} ${k} jumps at ${r.toFixed(3)}`);
      assert.ok(a.mag.distanceTo(b.mag) < 0.006 && a.at.distanceTo(b.at) * Math.max(a.hand, b.hand) < 0.01, `${id} jumps at ${r.toFixed(3)}`);
      // The magazine is only taken in hand or given back where the hand is on it
      if (a.carried !== b.carried) assert.ok(a.hand > 0.99 && a.away < 0.01 && a.mag.length() < 0.004, `${id} hand-over at ${r.toFixed(3)}`);
      went = Math.max(went, a.away);
    }
    assert.ok(went > 0.99, `${id}: to the pouch`);
    const cues = RELOAD_CUES[FIT[id].reload];
    assert.ok(cues.every(([t], i) => t > 0 && t < 1 && (i === 0 || t > cues[i - 1][0])));
  }
});

test('through a reload the third-person hands follow the clip: on the magazine, the magazine riding in the hand', () => {
  for (const id of IDS)
    for (let r = 0.02; r < 1; r += 0.04) {
      const h = hold(id, { reload: r, aim: 0.5 });
      const [g, fr] = palms(h.p);
      assert.ok(g.distanceTo(h.on(GRIP)) < 2e-3, `${id} at ${r}: grip`);
      const f = reloadAt(id, r);
      if (f.hand > 0.999 && f.away < 1e-3) {
        const want = h.on(f.at.clone().add(f.mag));
        assert.ok(fr.distanceTo(want) < 2e-3, `${id} at ${r.toFixed(2)}: front hand off by ${fr.distanceTo(want)}`);
      }
      // The magazine in hand sits where the hand holds it
      if (f.carried) {
        const magCentre = h.on(h.mag.position.clone().add(FIT[id].fore).add(FIT[id].magAt));
        assert.ok(magCentre.distanceTo(fr) < 2e-3, `${id} at ${r.toFixed(2)}: magazine left the hand`);
      }
    }
});

test('drawing: the hand goes to where it is put away, then the gun comes round to both hands', () => {
  for (const id of IDS) {
    const away = STOWED[FIT[id].carry];
    const put = hold(id, { draw: 0 });
    assert.ok(put.pivot.position.distanceTo(away.pos) < 1e-9 && put.pivot.quaternion.angleTo(away.q) < 1e-6, `${id} put away`);
    // Away, his arms are his own (the walk's), and his hands open
    assert.deepEqual(put.p.arms.map((a) => a.fwd), newPose().arms.map((a) => a.fwd));
    assert.equal(put.p.grip, undefined, 'his hands keep their own grip');
    // A third of the way, his hand is on it where it's put away
    const reach = hold(id, { draw: 0.35 });
    const [g] = palms(reach.p);
    assert.ok(g.distanceTo(reach.on(GRIP)) < 2e-3 && reach.pivot.position.distanceTo(away.pos) < 1e-9, `${id}: hand on it, put away`);
    // Then it swings round, the hand on it all the way
    let last = reach.pivot.position.clone();
    for (let d = 0.4; d <= 1.0001; d += 0.05) {
      const h = hold(id, { draw: d });
      const [gg] = palms(h.p);
      assert.ok(gg.distanceTo(h.on(GRIP)) < 2e-3, `${id} draw ${d}`);
      assert.ok(h.pivot.position.distanceTo(last) < 0.07, `${id} draw ${d}: no jump`);
      last = h.pivot.position.clone();
    }
  }
});
