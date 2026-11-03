// The cockpits (cockpits.ts, docs/firstperson-plan.md Phase 6): the pilot seated with his hands on the controls and
// his feet on the pedals however they move, within 1.5 and 2 cm; his head inside the cabin (under the Sky Hopper's
// wing); his knees clear of the stick, the yoke's column and the lever; from his eyes the horizon clear over the nose
// and the panel's gauges in view; the controls moving the right way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COCKPITS, PILOT_SCALE, atRest, controlsOf, feetOf, handsOf, inHole, pilotPose, pilotRoot, sectionAt, topAt, type Controls } from '../src/scripts/city3d/cockpits';
import { PANELS, inBody } from '../src/scripts/city3d/airframe';
import { eyeOf } from '../src/scripts/city3d/fpbody';
import { PLAYER_AIRCRAFT, type PlaneId } from '../src/scripts/city3d/myplane';
import { makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';

const CM = 180;
const sk = makeSkeleton();
type Bone = 'handL' | 'handR' | 'footL' | 'footR' | 'hips' | 'head' | 'shinL' | 'shinR';
/** The pilot posed in his seat, facing the nose */
function posed(id: PlaneId, c: Controls) {
  const p = newPose();
  pilotPose(p, id, c);
  poseSkeleton(sk, p);
  sk.root.position.copy(pilotRoot(id));
  sk.root.rotation.set(0, Math.PI / 2, 0);
  sk.root.scale.setScalar(PILOT_SCALE);
  sk.root.updateMatrixWorld(true);
  return (b: Bone) => sk.bones[b].getWorldPosition(new THREE.Vector3());
}
const INPUTS: Controls[] = [];
for (const turn of [0, 1, -1]) for (const climb of [0, 1, -1]) for (const power of [0, 1]) INPUTS.push({ turn, climb, fore: climb, power, gear: 1 });

test('his hands on the controls and his feet on the pedals, however they move', () => {
  for (const id of PLAYER_AIRCRAFT)
    for (const c of INPUTS) {
      const at = posed(id, c);
      const [right, left] = handsOf(id, c);
      // (arm 0, the bone `handL` on the rig's -x, is his right hand)
      const r = at('handL').distanceTo(right);
      const l = at('handR').distanceTo(left);
      const tag = `${id} turn ${c.turn} climb ${c.climb} power ${c.power}`;
      assert.ok(r < 0.015, `${tag}: his right hand on its control (${(r * CM).toFixed(1)} cm)`);
      assert.ok(l < 0.015, `${tag}: his left hand on its control (${(l * CM).toFixed(1)} cm)`);
      const [fr, fl] = feetOf(id, c);
      const a = at('footL').distanceTo(fr);
      const b = at('footR').distanceTo(fl);
      assert.ok(a < 0.025 && b < 0.025, `${tag}: his feet on the pedals (${(a * CM).toFixed(1)}, ${(b * CM).toFixed(1)} cm)`);
    }
});

test('seated, his head inside the cabin, his knees clear of the controls', () => {
  for (const id of PLAYER_AIRCRAFT) {
    const k = COCKPITS[id];
    const at = posed(id, atRest());
    const hips = at('hips');
    assert.ok(Math.abs(hips.x - k.seat[0]) < 0.03 && Math.abs(hips.y - k.seat[1]) < 0.04, `${id}: hips on the seat (${hips.x.toFixed(3)}, ${hips.y.toFixed(3)})`);
    // (the head's top a tenth of a tile over its bone)
    const head = at('head');
    const top = head.y + 0.16 * PILOT_SCALE;
    assert.ok(inBody(k.body, head.x, top, 0, -0.04), `${id}: his head under the roof (${top.toFixed(3)} under ${topAt(k.body, head.x).toFixed(3)})`);
    if (id === 'prop') {
      const w = PANELS.prop!.wing;
      assert.ok(top < w.y - w.thick / 2 - 0.005, `the Sky Hopper: his head under the wing (${top.toFixed(3)})`);
    }
    assert.ok(k.floor < k.well.y && k.well.y < k.pedals.at[1] + 0.02, `${id}: the pedals on the well, over the floor`);
    for (const c of INPUTS) {
      const pose = posed(id, c);
      const { grip, hub, knob } = controlsOf(id, c);
      for (const s of ['shinL', 'shinR'] as const) {
        const knee = pose(s);
        // (the yoke's column runs forward from its hub; the stick and cyclic stand between his knees)
        if (hub) assert.ok(knee.y < hub.y - 0.08, `${id}: the ${s} knee under the yoke's column`);
        else {
          const shaft = new THREE.Line3(new THREE.Vector3(...COCKPITS[id].stick.at), grip);
          const d = shaft.closestPointToPoint(knee, true, new THREE.Vector3()).distanceTo(knee);
          assert.ok(d > 0.07, `${id}: the ${s} knee clear of the stick (${d.toFixed(3)})`);
        }
        assert.ok(knee.distanceTo(knob) > 0.08, `${id}: the ${s} knee clear of the lever (${knee.distanceTo(knob).toFixed(3)})`);
      }
    }
  }
});

test('from his eyes: the horizon clear over the nose, the panel in view', () => {
  for (const id of PLAYER_AIRCRAFT) {
    const k = COCKPITS[id];
    posed(id, atRest());
    const eye = new THREE.Vector3();
    eyeOf(sk.bones, PILOT_SCALE, eye, new THREE.Vector3(), new THREE.Vector3());
    // Past the windscreen the body (the cowl, the nose) stays under his eyes' level
    const screen = Math.max(...k.holes.filter((h) => inHole([h], (h.x0 + h.x1) / 2, 0.25)).map((h) => h.x1));
    for (let x = screen; x < k.body[0][0]; x += 0.05) assert.ok(topAt(k.body, x) < eye.y - 0.02, `${id}: the nose under the horizon at x ${x.toFixed(2)}`);
    const half = ((k.view.fov / 2) * Math.PI) / 180;
    for (const g of k.gauges) {
      const a = Math.atan2(g.y - eye.y, k.panel.x - eye.x);
      assert.ok(a > -k.view.down - half + 0.05 && a < -k.view.down + half - 0.05, `${id}: the ${g.kind} gauge in view (${((a * 180) / Math.PI).toFixed(1)} deg)`);
    }
    // The panel's glare shield under the windscreen's foot, the gauges on the panel's face
    for (const g of k.gauges) assert.ok(g.y + (g.h ?? 2 * g.r) / 2 < k.panel.y1 && g.y - (g.h ?? 2 * g.r) / 2 > k.panel.y0, `${id}: the ${g.kind} gauge on the panel`);
    const [r, cy, sy] = sectionAt(k.body, k.panel.x);
    for (const g of k.gauges) {
      const half = (g.w ?? 2 * g.r) / 2;
      const edge = r * Math.sqrt(Math.max(0, 1 - ((g.y - cy) / (r * sy)) ** 2));
      assert.ok(Math.abs(g.z) + half < Math.min(edge, k.panel.half ?? Infinity) - 0.02, `${id}: the ${g.kind} gauge inside the panel's width`);
    }
    // The windscreen open straight ahead of his eyes
    const ahead = Math.atan2(eye.y - cy, 0) / (Math.PI * 2);
    assert.ok(inHole(k.holes, k.panel.x + 0.15, 0.25) || inHole(k.holes, k.panel.x + 0.15, ahead), `${id}: the windscreen ahead`);
  }
});

test('the controls move the right way', () => {
  for (const id of PLAYER_AIRCRAFT) {
    const at = (c: Partial<Controls>) => controlsOf(id, { ...atRest(), ...c });
    const rest = at({});
    if (COCKPITS[id].stick.kind === 'yoke') {
      assert.ok(at({ climb: 1 }).hub!.x < rest.hub!.x, `${id}: the yoke back to climb`);
      assert.ok(at({ turn: 1 }).grip.y > rest.grip.y, `${id}: turned right, the left horn comes up`);
    } else if (COCKPITS[id].stick.kind === 'stick') {
      assert.ok(at({ climb: 1 }).grip.x < rest.grip.x, `${id}: the stick back to climb`);
      assert.ok(at({ turn: 1 }).grip.z > rest.grip.z, `${id}: over to the right for a right turn`);
    } else {
      assert.ok(at({ fore: 1 }).grip.x > rest.grip.x, `${id}: the cyclic forward to go forward`);
      assert.ok(at({ turn: 1 }).grip.z > rest.grip.z, `${id}: over to the right`);
    }
    if (COCKPITS[id].lever.kind === 'quadrant') assert.ok(at({ power: 1 }).knob.x > at({ power: 0 }).knob.x + 0.05, `${id}: the throttle forward for power`);
    else assert.ok(at({ climb: 1 }).knob.y > at({ climb: -1 }).knob.y + 0.05, `${id}: the collective up to climb`);
    const [r0] = feetOf(id, atRest());
    assert.ok(feetOf(id, { ...atRest(), turn: 1 })[0].x > r0.x, `${id}: the right pedal forward for a right turn`);
  }
});

test('the windows: each inside the lined stretch', () => {
  for (const id of PLAYER_AIRCRAFT) {
    const k = COCKPITS[id];
    for (const h of k.holes) assert.ok(h.x0 >= k.liner[0] && h.x1 <= k.liner[1] && h.a1 > h.a0, `${id}: a window in the lining`);
  }
});
