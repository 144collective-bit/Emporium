// The underground's south line as data (southline.ts, docs/south-plan.md Phase 4d; the owner's calls, 2026-11-18 and
// -19): The Trenches, the Circus, Lot 9, Aldwyn's Green and the High Road in that order, a line bending no tighter
// than a tube train takes, a straight island platform at each station, deep under everything else below ground; at
// each a ticket hall a flight down, an escalator down to the platform, a way in from the street on clear ground (the
// change at The Trenches a few steps from the raised station; the Circus's from its plaza; the High Road's inside its
// station building); walked from the street to the platform, the walls stopping you at its edges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESC_RUN, HALL_Y, LINE, LINE_LENGTH, LINE_PASSAGES, LINE_S, MIN_R, PLAT_HALF, PLAT_LEN, PLAT_Y, SOUTH_STATIONS, STAIR_RUN, TUNNEL_TOP, lineAt, sOn, stationOf,
} from '../src/scripts/city3d/southline';
import { GROUND_Y, acrossOf, alongOf, floorOf, inPassage, pointOf, underworld, type Passage } from '../src/scripts/city3d/underground';
import { CHURCHYARD, CIRCUS, FOOTPATHS, PATH_HALF, SOUTH_STREETS, type Pt } from '../src/scripts/city3d/south';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { ENDS_LAMPS } from '../src/scripts/city3d/endswood';
import { YARD_TREES } from '../src/scripts/city3d/southyard';
import { PLAZA, SUBWAYS } from '../src/scripts/city3d/circus';
import { UNDERPASSES } from '../src/scripts/city3d/underpasses';
import { FOOTPATH as LOT9_PATH, LOT9_PASSAGE } from '../src/scripts/city3d/lot9';
import { CHURCH_PATH } from '../src/scripts/city3d/aldwyns';
import { BASE_Y } from '../src/scripts/city3d/home';
import { SLAB_Y as HOME_SLAB } from '../src/scripts/city3d/endswood';
import { STATIONS as RAISED } from '../src/scripts/city3d/metro';
import { SHOPS } from '../src/scripts/city3d/highroad';
import { southLift } from '../src/scripts/city3d/southground';

const STREETS = [...SOUTH_STREETS.map((s) => ({ id: s.id, pts: s.pts as Pt[], half: s.half })), ...PLAN.streets.map((s) => ({ id: s.id, pts: s.pts as Pt[], half: s.half }))];

test('five stations in order: The Trenches, the Circus, Lot 9, Aldwyn\'s Green, the High Road', () => {
  assert.deepEqual(SOUTH_STATIONS.map((s) => s.id), ['trenches', 'circus', 'lot9', 'aldwyns', 'highroad']);
  assert.deepEqual(SOUTH_STATIONS.map((s) => s.name), ['The Trenches', 'Circus', 'Lot 9', "Aldwyn's Green", 'High Road']);
  // (along the line in that order, their platforms apart)
  SOUTH_STATIONS.forEach((s, i) => i && assert.ok(s.p0 > SOUTH_STATIONS[i - 1].p1 + 20, `${s.id} after ${SOUTH_STATIONS[i - 1].id}`));
  assert.ok(SOUTH_STATIONS[0].p0 >= 0 && SOUTH_STATIONS[4].p1 <= LINE_LENGTH + 1e-6);
});

test('the line runs on without a gap and bends no tighter than a tube train takes', () => {
  for (let i = 1; i < LINE.length; i++) {
    const d = Math.hypot(LINE[i][0] - LINE[i - 1][0], LINE[i][1] - LINE[i - 1][1]);
    assert.ok(d > 1e-6 && d < 1.3, `a step of ${d.toFixed(2)} at ${i}`);
  }
  for (let i = 2; i < LINE.length - 2; i++) {
    const [a, b, c] = [LINE[i - 2], LINE[i], LINE[i + 2]];
    const [ab, bc, ac] = [Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]), Math.hypot(c[0] - a[0], c[1] - a[1])];
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
    if (area > 1e-9) assert.ok((ab * bc * ac) / (4 * area) >= MIN_R, `too tight at ${LINE_S[i].toFixed(0)} along`);
  }
  // (lineAt and sOn agree with each other)
  for (const s of [5, 100, 300, LINE_LENGTH - 5]) assert.ok(Math.abs(sOn(lineAt(s).at) - s) < 0.05);
});

test('each platform is straight and on the line, its tunnel deep under everything else below ground', () => {
  for (const st of SOUTH_STATIONS) {
    for (let s = st.platform.a0; s <= st.platform.a1; s += 1) assert.ok(distTo(LINE, pointOf(st.platform, s)) < 0.05, `${st.id}: its platform off the line`);
    assert.ok(Math.abs(st.platform.a1 - st.platform.a0 - PLAT_LEN) < 1e-9);
    assert.equal(st.platform.floor, PLAT_Y);
  }
  const others: Passage[] = [LOT9_PASSAGE, ...SUBWAYS, ...UNDERPASSES];
  const lowest = Math.min(...others.map((p) => p.floor), PLAZA.floor, HOME_SLAB + BASE_Y);
  assert.ok(TUNNEL_TOP < lowest - 1.5, `the tunnels' top ${TUNNEL_TOP} under the lowest floor ${lowest}`);
});

test("each station's escalator comes down from its hall's end on to its platform, about thirty degrees", () => {
  for (const st of SOUTH_STATIONS) {
    const e = st.escalator;
    const [top, bottom] = floorOf(e, e.a0) > floorOf(e, e.a1) ? [e.a0, e.a1] : [e.a1, e.a0];
    assert.equal(floorOf(e, top), HALL_Y, `${st.id}: its top at the hall's level`);
    assert.equal(floorOf(e, bottom), PLAT_Y, `${st.id}: its foot at the platform's`);
    const inside1 = (p: Passage, s: number) => s > p.a0 && s < p.a1;
    const hallS = (s: number) => alongOf(st.hall, ...pointOf(e, s));
    const platS = (s: number) => alongOf(st.platform, ...pointOf(e, s));
    assert.ok(inside1(st.hall, hallS(top + Math.sign(bottom - top) * -0.2)), `${st.id}: its top in the hall`);
    assert.ok(inside1(st.platform, platS(bottom - Math.sign(bottom - top) * 0.5)), `${st.id}: its foot on the platform`);
    const angle = (Math.atan2(HALL_Y - PLAT_Y, ESC_RUN) * 180) / Math.PI;
    assert.ok(angle > 25 && angle < 32, `${st.id}: ${angle.toFixed(1)} degrees`);
  }
});

test('each way in: stairs down from clear ground at street level (or the plaza, or the station building) into its hall', () => {
  for (const st of SOUTH_STATIONS) {
    const w = st.way;
    assert.ok(inPassage(st.hall, ...pointOf(w, w.a1 - 0.5)), `${st.id}: its way ends in its hall`);
    assert.equal(floorOf(w, w.a1), HALL_Y);
    if (st.entrance.kind === 'plaza') {
      // (level out of the Circus's plaza, between its subways, clear of them)
      assert.equal(floorOf(w, w.a0), PLAZA.floor);
      assert.ok(Math.hypot(...([pointOf(w, w.a0)[0] - CIRCUS.x, pointOf(w, w.a0)[1] - CIRCUS.z] as Pt)) < PLAZA.tiers!.r0);
      for (let s = w.a0 + 2; s <= w.a1; s += 0.5) for (const u of [-w.half, 0, w.half]) assert.ok(!SUBWAYS.some((p) => inPassage(p, ...pointOf(w, s, u))), `${st.id}: its way into a subway`);
      continue;
    }
    const top = pointOf(w, w.a0);
    const b = SHOPS.find((q) => q.kind === 'station')!;
    const level = st.entrance.kind === 'building' ? b.base : GROUND_Y + southLift(...top);
    assert.ok(Math.abs(floorOf(w, w.a0) - level) < 1e-9, `${st.id}: from the ground's (or its building's floor's) height at its top`);
    const slope = (Math.atan2(GROUND_Y - HALL_Y, STAIR_RUN) * 180) / Math.PI;
    assert.ok(slope < 28, `${st.id}: its stairs ${slope.toFixed(1)} degrees`);
    // (the ground about as high all round its opening: it stays level with the ground it opens through)
    const lifts = st.entrance.kind === 'building' ? [0] : [-1.5, 0, 1.5].flatMap((u) => [w.a0, w.ramp0].map((s) => southLift(...pointOf(w, s, u))));
    assert.ok(Math.max(...lifts) - Math.min(...lifts) < 0.15, `${st.id}: its stairs on ground near enough level`);
    if (st.entrance.kind === 'building') {
      // (inside the building: within its frontage and depth)
      for (const s of [w.a0, w.ramp0]) {
        const [x, z] = pointOf(w, s);
        const back = -((x - b.at[0]) * b.face[0] + (z - b.at[1]) * b.face[1]);
        const along = (x - b.at[0]) * -b.face[1] + (z - b.at[1]) * b.face[0];
        assert.ok(back > 0.3 && back < b.d - 0.3 && Math.abs(along) < b.w / 2 - 0.3, `${st.id}: its stairs inside the station building`);
      }
      continue;
    }
    // (the stairs' opening clear at street level)
    for (let s = w.a0 - 0.3; s <= w.ramp0 + 0.3; s += 0.3)
      for (const u of [-1.6, -0.8, 0, 0.8, 1.6]) {
        const p = pointOf(w, s, u);
        for (const r of STREETS) assert.ok(distTo(r.pts, p) > r.half + 0.8 + 0.1, `${st.id}: its stairs on ${r.id}`);
        for (const b of SOLIDS) assert.ok(!(p[0] > b[0] - 0.15 && p[0] < b[2] + 0.15 && p[1] > b[1] - 0.15 && p[1] < b[3] + 0.15), `${st.id}: its stairs into a solid ${b.map((v) => v.toFixed(1))}`);
        for (const [x, z] of ENDS_LAMPS) assert.ok(Math.hypot(x - p[0], z - p[1]) > 0.6, `${st.id}: a lamp`);
        for (const [x, z] of YARD_TREES) assert.ok(Math.hypot(x - p[0], z - p[1]) > 1.4, `${st.id}: a tree`);
        for (const f of FOOTPATHS) assert.ok(distTo(f.pts, p) > PATH_HALF, `${st.id}: across ${f.id}`);
        assert.ok(!inside(CHURCHYARD, p) && distTo(CHURCH_PATH, p) > 0.9 && distTo(LOT9_PATH, p) > 1.1, `${st.id}: in the churchyard or on a path`);
      }
  }
});

test("the change at The Trenches: its stairs a few steps from the raised metro's station door", () => {
  const st = stationOf('trenches');
  const door = RAISED.find((s) => s.id === 'trenches')!.door;
  const top = pointOf(st.way, st.way.a0);
  assert.ok(Math.hypot(top[0] - door.x, top[1] - door.z) < 16);
});

test("halls and ways keep apart from the other passages down there (the Circus's way between its subways)", () => {
  for (const st of SOUTH_STATIONS)
    for (const piece of [st.hall, st.way])
      for (let s = piece.a0; s <= piece.a1; s += 0.5)
        for (const u of [-piece.half, 0, piece.half]) {
          const p = pointOf(piece, s, u);
          for (const o of [LOT9_PASSAGE, ...UNDERPASSES, ...(st.id === 'circus' ? [] : SUBWAYS)]) assert.ok(!inPassage(o, ...p), `${piece.id} into ${o.id}`);
        }
});

test('walked: down the stairs to the hall, down the escalator to the platform; its edges stop you, as its walls do', () => {
  const U = underworld([...LINE_PASSAGES, ...SUBWAYS], [PLAZA]);
  for (const st of SOUTH_STATIONS) {
    const w = st.way;
    // (down the way in: from its start's level to the hall's)
    const start = floorOf(w, w.a0 + 0.01);
    assert.ok(Math.abs(U.y(...pointOf(w, w.a0 + 0.01), start + 0.1)! - start) < 0.01, `${st.id}: at the top of its way in`);
    const mid = (w.a0 + w.ramp0) / 2;
    if (w.ramp0 > w.a0) assert.ok(Math.abs(U.y(...pointOf(w, mid), floorOf(w, mid) + 0.05)! - floorOf(w, mid)) < 1e-9, `${st.id}: half way down its stairs`);
    const hm = pointOf(st.hall, (st.hall.a0 + st.hall.a1) / 2);
    assert.equal(U.y(...hm, HALL_Y), HALL_Y, `${st.id}: in its hall`);
    // (down the escalator, its floor from each step's height; on the platform)
    const e = st.escalator;
    const em = (e.a0 + e.a1) / 2;
    assert.ok(Math.abs(U.y(...pointOf(e, em), floorOf(e, em) + 0.1)! - floorOf(e, em)) < 1e-9, `${st.id}: half way down its escalator`);
    const pm = pointOf(st.platform, (st.platform.a0 + st.platform.a1) / 2);
    assert.equal(U.y(...pm, PLAT_Y), PLAT_Y, `${st.id}: on its platform`);
    // (its edges and walls stop you down there; along it they don't)
    assert.ok(U.wall(...pointOf(st.platform, (st.platform.a0 + st.platform.a1) / 2, PLAT_HALF + 0.1), PLAT_Y, 0.3), `${st.id}: off its platform's edge`);
    assert.ok(!U.wall(...pm, PLAT_Y, 0.3));
    // (its wall on the side away from where its way comes in)
    const side = -Math.sign(acrossOf(st.hall, ...pointOf(w, w.a0))) || 1;
    assert.ok(U.wall(...pointOf(st.hall, (st.hall.a0 + st.hall.a1) / 2, side * (st.hall.half + 0.2)), HALL_Y, 0.3), `${st.id}: its hall's wall`);
  }
});

test("The Trenches' stairs open in The Block's plaza by the raised station's tower, clear of its playground and benches", async () => {
  const { THE_BLOCK } = await import('../src/scripts/city3d/projects');
  const w = stationOf('trenches').way;
  const inRect = (r: readonly number[], [x, z]: Pt, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  for (let s = w.a0 - 0.3; s <= w.ramp0 + 0.3; s += 0.3)
    for (const u of [-1.5, 0, 1.5]) {
      const p = pointOf(w, s, u);
      assert.ok(inRect(THE_BLOCK.plaza, p), 'in the plaza');
      assert.ok(!inRect(THE_BLOCK.playground, p, 0.5) && !inRect(THE_BLOCK.fence, p, 0.5), 'clear of the playground and the court');
      for (const [x, z] of THE_BLOCK.benches) assert.ok(Math.hypot(x - p[0], z - p[1]) > 1.2, 'clear of a bench');
    }
});
