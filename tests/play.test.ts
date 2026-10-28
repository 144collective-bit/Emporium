// Kids at play (the animation revamp's Phase 6 step 4, play.ts): runners round the courts and the cage, the
// shooters, the keepers and the kids on the swings, each a function of the time inside its court; The Block's
// two on two.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KID, KID_RUN, LOOP_IN, PLAY_PEOPLE, RUN, frameOf, hoopOf, loopOf, swingsOf } from '../src/scripts/city3d/play';
import { AMENITIES } from '../src/scripts/city3d/commons';
import { THE_BLOCK } from '../src/scripts/city3d/projects';
import { moment } from '../src/scripts/city3d/parklife';
import type { Rect } from '../src/scripts/city3d/downtown';

const TIMES = Array.from({ length: 120 }, (_, i) => i * 0.37 + 0.05);
const inRect = (x: number, z: number, [x0, z0, x1, z1]: Rect, m = 0) => x >= x0 + m && x <= x1 - m && z >= z0 + m && z <= z1 - m;
const of = (prefix: string) => PLAY_PEOPLE.filter((p) => p.id.startsWith(prefix));

test('a loop: closed, inside its rectangle by the inset, the same point a lap later', () => {
  const rect: Rect = [10, 20, 18, 26];
  const loop = loopOf(rect, LOOP_IN);
  assert.ok(loop.len > 2 * (8 - 2 * LOOP_IN) && loop.len < 2 * (8 - 2 * LOOP_IN) + 2 * (6 - 2 * LOOP_IN) + 0.01);
  for (let s = 0; s < loop.len; s += 0.1) {
    const p = loop.at(s);
    assert.ok(inRect(p.x, p.z, rect, LOOP_IN - 1e-6), `on the loop at ${s}: ${p.x}, ${p.z}`);
    assert.ok(Math.abs(Math.hypot(p.dx, p.dz) - 1) < 1e-6, 'a unit heading');
    const q = loop.at(s + loop.len);
    assert.ok(Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.z - q.z) < 1e-9, 'a lap brings you back');
  }
});

test('everyone has their own id; kids are kids, The Block\'s players grown-ups', () => {
  assert.equal(new Set(PLAY_PEOPLE.map((p) => p.id)).size, PLAY_PEOPLE.length);
  for (const p of PLAY_PEOPLE) assert.ok(p.id.startsWith('block-') ? p.scale === undefined || p.id.includes('swing') : p.scale === KID, p.id);
  assert.ok(PLAY_PEOPLE.some((p) => p.trim) && PLAY_PEOPLE.some((p) => !p.trim), 'some trimmed on phones, not all');
});

test('the courts and the cage: runners round the inside, moving at their pace the way they face, never through each other; a shooter at the free-throw spot, keepers in the goalmouths', () => {
  const m = moment();
  let courts = 0;
  let cages = 0;
  for (const a of AMENITIES) {
    if (a.kind !== 'halfcourt' && a.kind !== 'soccer') continue;
    a.kind === 'halfcourt' ? courts++ : cages++;
    const runners = of(`${a.id}-run-`);
    assert.equal(runners.length, a.kind === 'halfcourt' ? 2 : 3, `${a.id}: runners`);
    for (const t of TIMES) {
      const spots = runners.map((r) => {
        const o = r.at(t, m);
        assert.equal(o.clip, 'jog');
        assert.equal(o.speed, KID_RUN);
        assert.ok(inRect(o.x, o.z, a.rect, 0.5), `${r.id} at ${t}: ${o.x}, ${o.z} off the court ${a.rect}`);
        // Heading the way they go: the facing against the step over the next tenth of a second
        const [x, z, ry] = [o.x, o.z, o.ry];
        const n = r.at(t + 0.1, m);
        const [dx, dz] = [n.x - x, n.z - z];
        const d = Math.hypot(dx, dz);
        assert.ok(Math.abs(d - KID_RUN * 0.1) < KID_RUN * 0.1 * 0.05, `${r.id}: ${d} in a tenth of a second`);
        assert.ok((Math.sin(ry) * dx + Math.cos(ry) * dz) / d > 0.95, `${r.id}: facing the way they run`);
        return [x, z] as const;
      });
      for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) assert.ok(Math.hypot(spots[i][0] - spots[j][0], spots[i][1] - spots[j][1]) > 0.8, `${a.id}: runners through each other at ${t}`);
    }
    if (a.kind === 'halfcourt') {
      const [s] = of(`${a.id}-shoot`);
      const o = { ...s.at(0, m) };
      const f = frameOf(a);
      const { hu, dir } = hoopOf(a);
      const [hx, hz] = f.at(hu, f.D / 2);
      assert.equal(o.clip, 'shoot');
      assert.ok(inRect(o.x, o.z, a.rect, 0.5), 'the shooter on the court');
      const d = Math.hypot(hx - o.x, hz - o.z);
      assert.ok(d > 2.5 && d < 4, `${a.id}: the shooter ${d.toFixed(2)} from the hoop`);
      assert.ok((Math.sin(o.ry) * (hx - o.x) + Math.cos(o.ry) * (hz - o.z)) / d > 0.99, 'facing the hoop');
      assert.ok(dir === 1 || dir === -1);
      // The runners keep clear of the shooter
      for (const t of TIMES) for (const r of of(`${a.id}-run-`)) { const q = r.at(t, m); assert.ok(Math.hypot(q.x - o.x, q.z - o.z) > 0.7, `${a.id}: a runner through the shooter at ${t}`); }
    } else {
      const keepers = of(`${a.id}-keeper-`);
      assert.equal(keepers.length, 2);
      const f = frameOf(a);
      for (const k of keepers) {
        const o = { ...k.at(0, m) };
        assert.equal(o.clip, 'look');
        assert.ok(inRect(o.x, o.z, a.rect, 0.5));
        const [cx, cz] = f.at(f.L / 2, f.D / 2);
        assert.ok(Math.hypot(cx - o.x, cz - o.z) > f.L / 2 - 1.5, 'in a goalmouth');
        assert.ok((Math.sin(o.ry) * (cx - o.x) + Math.cos(o.ry) * (cz - o.z)) > 0.9 * Math.hypot(cx - o.x, cz - o.z), 'facing the play');
      }
    }
  }
  assert.ok(courts >= 3 && cages >= 1, `${courts} courts, ${cages} cages`);
});

test('the swings: a kid on each seat of every playground\'s swings, where commons3d hangs them, facing along the swing', () => {
  const m = moment();
  let n = 0;
  for (const a of AMENITIES) {
    if (a.kind !== 'playground') continue;
    const seats = swingsOf(a);
    const kids = of(`${a.id}-swing-`);
    assert.equal(kids.length, 2);
    kids.forEach((k, i) => {
      const o = { ...k.at(3, m) };
      assert.equal(o.clip, 'swing');
      assert.equal(k.scale, KID);
      assert.ok(Math.abs(o.x - seats[i].at[0]) < 1e-9 && Math.abs(o.z - seats[i].at[1]) < 1e-9, 'on the seat');
      assert.ok(inRect(o.x, o.z, a.rect, 0.3), 'on the playground');
      assert.ok(Math.abs(o.y - 0.65) < 1e-9, 'the seat\'s height');
      // The two seats hang side by side across the swing's travel
      const other = seats[1 - i].at;
      const dx = other[0] - o.x;
      const dz = other[1] - o.z;
      assert.ok(Math.abs(Math.sin(o.ry) * dx + Math.cos(o.ry) * dz) < 1e-6, 'facing across the bar');
      n++;
    });
  }
  assert.ok(n >= 4);
});

test('The Block: two on two on the court (grown-ups), the shooter at the north hoop, a kid on each swing', () => {
  const m = moment();
  const runners = of('block-run-');
  assert.equal(runners.length, 2);
  for (const t of TIMES) for (const r of runners) {
    const o = r.at(t, m);
    assert.ok(inRect(o.x, o.z, THE_BLOCK.court, 0.5), 'on the court');
    assert.equal(o.speed, RUN);
    assert.equal(r.scale, undefined);
  }
  const [s] = of('block-shoot');
  const o = { ...s.at(0, m) };
  assert.equal(o.clip, 'shoot');
  assert.ok(inRect(o.x, o.z, THE_BLOCK.court, 0.5) && o.z < (THE_BLOCK.court[1] + THE_BLOCK.court[3]) / 2, 'at the north end');
  assert.ok(Math.abs(Math.sin(o.ry)) < 1e-9 && Math.cos(o.ry) < 0, 'facing the north hoop');
  for (const t of TIMES) for (const r of runners) { const q = r.at(t, m); assert.ok(Math.hypot(q.x - o.x, q.z - o.z) > 0.7, 'a runner through the shooter'); }
  const swings = of('block-swing-');
  assert.equal(swings.length, 2);
  for (const k of swings) {
    const q = k.at(1, m);
    assert.ok(inRect(q.x, q.z, THE_BLOCK.playground, 0.3) && q.clip === 'swing' && k.scale === KID && Math.abs(q.y - 0.71) < 1e-9);
  }
});
