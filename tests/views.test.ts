// The cameras (views.ts, docs/views-plan.md Phases 1 and 2): near, far and first person in every vehicle, near the one
// each had before, far further back; the ring near and far only; on a ride, its own camera near, far and the
// passenger's eye from it, looking round freely.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHASE,
  chaseDistance,
  FIRST_NAME,
  nextView,
  RACE_FAR,
  RIDE_CAM,
  RIDE_FIRST,
  RIDE_LOOK,
  RING_FAR,
  RING_ORDER,
  rideLook,
  rideView,
  START_VIEW,
  startRide,
  VIEW_ORDER,
  viewName,
  type P3,
  type RideKind,
  type ViewId,
  type ViewKind,
} from '../src/scripts/city3d/views';

const KINDS: ViewKind[] = ['car', 'bike', 'kart', 'boat', 'plane'];

test('every vehicle starts near and steps near, far, first person, then back', () => {
  assert.equal(START_VIEW, 'near');
  assert.deepEqual([...VIEW_ORDER], ['near', 'far', 'first']);
  let v: ViewId = START_VIEW;
  const seen: ViewId[] = [v];
  for (let i = 0; i < 3; i++) seen.push((v = nextView(v)));
  assert.deepEqual(seen, ['near', 'far', 'first', 'near']);
});

test('near is the chase camera each vehicle had before the plan', () => {
  // the car's, the bike's and the kart's (drive.ts), the boat's and the aircraft's, at a few speeds
  for (const k of ['car', 'bike', 'kart'] as const) {
    for (const [L, v] of [[4.2, 0], [4.2, 30], [1.2, 12]]) assert.equal(chaseDistance(CHASE[k].near, L, v), 3.6 + L * 0.95 + v * 0.1);
    assert.equal(CHASE[k].near.pitch, 0.26);
    assert.equal(CHASE[k].near.fov, 58);
  }
  for (const v of [0, 4, 20]) assert.equal(chaseDistance(CHASE.boat.near, 0, v), 5 + Math.min(4, v * 0.45));
  assert.equal(CHASE.boat.near.fov, undefined);
  for (const [L, v] of [[3, 0], [8, 40], [8, 200]]) assert.equal(chaseDistance(CHASE.plane.near, L, v), 4.5 + L * 1.15 + Math.min(14, v * 0.18));
  assert.equal(CHASE.plane.near.pitch, 0.2);
});

test('far is further back and looks down more than near, at every speed', () => {
  for (const k of KINDS) {
    const { near, far } = CHASE[k];
    assert.ok(far.pitch > near.pitch, k);
    for (const L of [1, 4, 12]) for (const v of [0, 5, 20, 80]) assert.ok(chaseDistance(far, L, v) > chaseDistance(near, L, v) * 1.4, `${k} ${L} ${v}`);
    // reversing pulls back the same as going forward
    assert.equal(chaseDistance(far, 4, -6), chaseDistance(far, 4, 6));
  }
});

test('every view has a name for the toast', () => {
  for (const k of KINDS) {
    assert.equal(viewName(k, 'near'), 'Near');
    assert.equal(viewName(k, 'far'), 'Far');
    assert.ok(FIRST_NAME[k].length > 0);
    assert.equal(viewName(k, 'first'), FIRST_NAME[k]);
  }
});

test('the ring steps near and far only, and its far and a race\'s far stand further back', () => {
  assert.deepEqual([...RING_ORDER], ['near', 'far']);
  assert.equal(nextView('near', RING_ORDER), 'far');
  assert.equal(nextView('far', RING_ORDER), 'near');
  assert.ok(RING_FAR.back > 1.4 && RING_FAR.up > 1.5);
  // (the Fight Club's far is held under its shed's roof, inside its posts: 3.4 + ropes inside the shed's 4.4)
  assert.ok(3.4 + RING_FAR.ropes < 4.4);
  assert.ok(RACE_FAR.scale > 1.4 && RACE_FAR.pitch > 0.3);
  assert.equal(viewName('ring', 'near'), 'Near');
  assert.equal(viewName('ring', 'far'), 'Far');
  assert.equal(viewName('foot', 'first'), 'First person');
  assert.equal(viewName('foot', 'near'), 'Over the shoulder');
});

const near = { want: { x: 10 - 7.5, y: 3.6, z: 5 }, at: { x: 13, y: 0.8, z: 5 } };
const centre: P3 = { x: 10, y: 0.8, z: 5 };
const eye: P3 = { x: 9.6, y: 0.9, z: 5.3 };
const flat = (a: P3, b: P3) => Math.hypot(a.x - b.x, a.z - b.z);
const close = (a: number, b: number, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('a ride starts near looking ahead, and its near is the ride\'s own camera', () => {
  RIDE_CAM.view = 'first';
  RIDE_CAM.yaw = 1;
  startRide();
  assert.deepEqual(RIDE_CAM, { view: 'near', yaw: 0, pitch: 0 });
  const v = rideView(near, centre, eye, [1, 0]);
  assert.equal(v.snap, false);
  for (const k of ['x', 'y', 'z'] as const) {
    close(v.want[k], near.want[k]);
    close(v.at[k], near.at[k]);
  }
});

test('far stands further out and higher; first person is at the eye, looking ahead, placed at once', () => {
  const far = rideView(near, centre, eye, [1, 0], { view: 'far', yaw: 0, pitch: 0 });
  assert.ok(flat(far.want, centre) > flat(near.want, centre) * 1.5);
  assert.ok(far.want.y > near.want.y);
  const first = rideView(near, centre, eye, [1, 0], { view: 'first', yaw: 0, pitch: 0 });
  assert.equal(first.snap, true);
  assert.deepEqual(first.want, eye);
  // ahead (+x here), a touch down
  assert.ok(first.at.x > eye.x + 9 && Math.abs(first.at.z - eye.z) < 1e-9 && first.at.y < eye.y);
  // facing -z: ahead is -z
  const north = rideView(near, centre, eye, [0, -1], { view: 'first', yaw: 0, pitch: 0 });
  assert.ok(north.at.z < eye.z - 9);
});

test('looking round orbits the vehicle at the same distance, and turns the eye in first person', () => {
  for (const view of ['near', 'far'] as ViewId[]) {
    const ahead = rideView(near, centre, eye, [1, 0], { view, yaw: 0, pitch: 0 });
    for (const yaw of [0.5, -1.2, 2.8]) {
      const v = rideView(near, centre, eye, [1, 0], { view, yaw, pitch: 0 });
      close(flat(v.want, centre), flat(ahead.want, centre));
      close(flat(v.at, centre), flat(ahead.at, centre));
      close(v.want.y, ahead.want.y);
    }
    // half way round: the camera in front, looking back at it
    const back = rideView(near, centre, eye, [1, 0], { view, yaw: Math.PI, pitch: 0 });
    assert.ok(back.want.x > centre.x && back.at.x < centre.x);
    // looking up lifts it (never under the vehicle)
    assert.ok(rideView(near, centre, eye, [1, 0], { view, yaw: 0, pitch: 0.4 }).want.y > ahead.want.y);
    assert.ok(rideView(near, centre, eye, [1, 0], { view, yaw: 0, pitch: -0.45 }).want.y >= centre.y + 0.6 - 1e-9);
  }
  // first person: a yaw to the left (positive) looks to the left of ahead (+x ahead: -z is left)
  const left = rideView(near, centre, eye, [1, 0], { view: 'first', yaw: Math.PI / 2, pitch: 0 });
  assert.ok(left.at.z < eye.z - 9);
});

test('looking round on a ride is held within its reach', () => {
  startRide();
  rideLook(-100, 100);
  assert.equal(RIDE_CAM.yaw, RIDE_LOOK.yaw);
  assert.equal(RIDE_CAM.pitch, RIDE_LOOK.up);
  rideLook(200, -200);
  assert.equal(RIDE_CAM.yaw, -RIDE_LOOK.yaw);
  assert.equal(RIDE_CAM.pitch, RIDE_LOOK.down);
  startRide();
});

test('every ride names its first person', () => {
  for (const k of ['taxi', 'metro', 'monorail', 'riverbus'] as RideKind[]) {
    assert.ok(RIDE_FIRST[k].length > 0);
    assert.equal(viewName(k, 'first'), RIDE_FIRST[k]);
    assert.equal(viewName(k, 'near'), 'Near');
  }
});
