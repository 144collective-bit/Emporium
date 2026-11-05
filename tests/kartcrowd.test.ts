// The kart park's live crowd and podium ceremony (kartcrowd.ts, docs/kart-west-plan.md Phase 4): fans cheer as karts
// pass and when you overtake, the marshals' flags (green, yellow, blue, chequered), the top three on the podium's steps,
// the ceremony's beats and camera (in front of the podium, clear of everything solid), and the confetti falling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CEREMONY, CONFETTI, FAN_REACH, GREEN_SECONDS, MARSHAL_S, WAVE, YELLOW, ceremonyAt, ceremonyCam, confettiAt, excited, marshalFlags, podiumSpot, type Seen } from '../src/scripts/city3d/kartcrowd';
import { CIRCUIT, CIRCUIT_SOLIDS, COURSES } from '../src/scripts/city3d/kartcircuit';
import { FACILITY_SOLIDS, PLAZA, PODIUM, worldRect } from '../src/scripts/city3d/kartfacility';
import { KART_PARK, frame, toLocal } from '../src/scripts/city3d/kartpark';
import { MARSHALS } from '../src/scripts/city3d/kartside';

const kart = (s: number, o: Partial<Seen> = {}): Seen => {
  const f = frame(CIRCUIT, s);
  return { x: f.x, z: f.z, s, progress: s, lap: 0, speed: 10, ...o };
};

test('fans cheer as a kart goes by, when you overtake near them, and all through the ceremony', () => {
  const k = kart(40);
  assert.ok(excited(k.x + FAN_REACH - 1, k.z, [k], null, false));
  assert.ok(!excited(k.x + FAN_REACH + 1, k.z, [k], null, false));
  assert.ok(!excited(k.x + 1, k.z, [{ ...k, speed: 0 }], null, false), 'not for a kart standing still');
  assert.ok(excited(k.x + 20, k.z, [], { t: 1, x: k.x, z: k.z }, false) && !excited(k.x + WAVE.reach + 1, k.z, [], { t: 1, x: k.x, z: k.z }, false));
  assert.ok(!excited(k.x + 5, k.z, [], { t: 0, x: k.x, z: k.z }, false), 'the wave dies away');
  assert.ok(excited(0, 0, [], null, true));
});

test('the marshals: green after the start, yellow up the track from a spin, blue for a kart being lapped, the chequered flag at the line', () => {
  const c = COURSES.circuit;
  assert.equal(MARSHAL_S.length, MARSHALS.length);
  const karts = [kart(50)];
  assert.ok(marshalFlags(c, -1, karts, [], 3, 0).every((f) => f === 'none'), 'nothing before the start');
  assert.ok(marshalFlags(c, 1, karts, [], 3, 0).every((f) => f === 'green'), 'green round the circuit');
  assert.ok(marshalFlags(c, GREEN_SECONDS + 1, karts, [], 3, 0).every((f) => f === 'none'), 'then nothing');
  // A spin: yellow at the posts just up the track from it, for a while, nowhere else
  const spinS = MARSHAL_S[2] - 10;
  const flags = marshalFlags(c, 20, karts, [{ s: spinS, at: 19 }], 3, 0);
  assert.equal(flags[2], 'yellow');
  for (let i = 0; i < flags.length; i++) {
    const ahead = (((MARSHAL_S[i] - spinS) % c.L) + c.L) % c.L;
    if (ahead > YELLOW.ahead && c.L - ahead > YELLOW.behind) assert.notEqual(flags[i], 'yellow', `post ${i}`);
  }
  assert.ok(marshalFlags(c, 20 + YELLOW.seconds, karts, [{ s: spinS, at: 19 }], 3, 0).every((f) => f !== 'yellow'), 'the yellow comes in');
  // Blue: a kart a lap down by a post, a faster one a lap up just behind it
  const s0 = MARSHAL_S[3];
  const blue = marshalFlags(c, 60, [kart(s0, { speed: 6 }), kart(s0 - 3, { progress: s0 - 3 + c.L, speed: 9, lap: 1 })], [], 3, 1);
  assert.equal(blue[3], 'blue');
  // The chequered flag at the post nearest the line once the leader's on the last lap, and only there
  const last = marshalFlags(c, 90, karts, [], 3, 2);
  assert.equal(last.filter((f) => f === 'chequered').length, 1);
  // Both ways round
  assert.ok(marshalFlags(COURSES['circuit-reverse'], 1, karts, [], 3, 0).every((f) => f === 'green'));
});

test('the top three stand on the podium\'s steps, the winner highest, facing the plaza', () => {
  for (const place of [1, 2, 3] as const) {
    const p = podiumSpot(place);
    const st = PODIUM.steps.find((s) => s.place === place)!;
    const [u, v] = toLocal([p.x, p.z]);
    assert.ok(u > st.u0 + 0.5 && u < st.u1 - 0.5 && v > PODIUM.v0 + 0.8 && v < PODIUM.v1 - 0.8 && p.y === st.h);
    // Facing +z: kart.ts's yaw (+x forward, z = -sin yaw)
    assert.ok(-Math.sin(p.yaw) > 0.99);
  }
  assert.ok(podiumSpot(1).y > podiumSpot(2).y && podiumSpot(2).y > podiumSpot(3).y);
});

test('the ceremony: the trophy up, then the confetti; the camera in front of the podium, clear of everything solid, looking at it', () => {
  assert.equal(ceremonyAt(0).trophy, 0);
  assert.ok(ceremonyAt(CEREMONY.trophy + 1).trophy === 1 && !ceremonyAt(CEREMONY.confetti - 0.1).confetti && ceremonyAt(CEREMONY.confetti).confetti);
  assert.ok(!ceremonyAt(CEREMONY.seconds - 0.1).done && ceremonyAt(CEREMONY.seconds).done);
  const w = podiumSpot(1);
  const solids = [...FACILITY_SOLIDS, ...CIRCUIT_SOLIDS];
  for (let t = 0; t <= CEREMONY.seconds; t += 0.1) {
    const { eye, at } = ceremonyCam(t, false);
    assert.ok(eye[2] > w.z + 2 && eye[1] > 1.5 && eye[1] < 8, `the camera behind the podium or low at ${t.toFixed(1)}`);
    assert.ok(eye[0] > KART_PARK.x0 && eye[0] < KART_PARK.x1 && eye[2] < KART_PARK.z1, 'out of the park');
    for (const b of solids) assert.ok(!(eye[0] > b[0] - 0.3 && eye[0] < b[2] + 0.3 && eye[2] > b[1] - 0.3 && eye[2] < b[3] + 0.3 && eye[1] < b[4] + 0.3), `the camera in something at ${t.toFixed(1)}`);
    assert.ok(Math.hypot(at[0] - w.x, at[2] - w.z) < 1.5, 'looking at the winner');
  }
  assert.deepEqual(ceremonyCam(3, true), ceremonyCam(0, false), 'still under reduced motion');
});

test('the confetti flies up and out from the backdrop over the podium and the plaza, and lands', () => {
  const [px0, pz0, px1, pz1] = worldRect(PLAZA);
  let landed = 0;
  for (let i = 0; i < CONFETTI; i++) {
    let last: [number, number, number] | null = null;
    for (let t = 0; t < 12; t += 0.05) {
      const p = confettiAt(i, t);
      if (!p) break;
      assert.ok(p[1] > 0 && p[1] < 12);
      last = p;
    }
    assert.ok(last, 'it was fired');
    assert.equal(confettiAt(i, 12), null, 'down within twelve seconds');
    if (last![0] > px0 && last![0] < px1 && last![2] > pz0 && last![2] < pz1) landed++;
  }
  assert.ok(landed > CONFETTI * 0.9, `${landed} of ${CONFETTI} on the plaza`);
});
