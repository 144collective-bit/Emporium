// Motion matching (animation Phase 1, motionmatch.ts): the database holds every clip and its mirror,
// a frame finds itself, a straight run's trajectory finds running and a still one finds standing,
// and a search is quick.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeMocap } from '../src/scripts/city3d/mocap';
import { AHEAD, FEATURES, buildDatabase, search, setTrajectory } from '../src/scripts/city3d/motionmatch';
import { MOCAP_FPS } from '../src/scripts/city3d/mocap';

const data = decodeMocap(readFileSync('src/data/mocap/clips.bin'));
const db = buildDatabase(data);

test('the database: every clip and its mirror image, features scaled round zero', () => {
  assert.equal(db.clips.length, data.clips.length * 2);
  assert.equal(db.count, data.clips.reduce((n, c) => n + c.frames, 0) * 2);
  for (let k = 0; k < FEATURES; k++) {
    let m = 0;
    for (let g = 0; g < db.count; g++) m += db.feat[g * FEATURES + k] / db.count;
    assert.ok(Math.abs(m) < 1e-3, `feature ${k} averages ${m.toFixed(5)}`);
  }
});

test('a frame\'s own features find it', () => {
  for (let g = 0; g < db.count; g += 97) {
    if (!db.open[g]) continue;
    const q = db.feat.slice(g * FEATURES, (g + 1) * FEATURES);
    const r = search(db, q);
    assert.ok(r.cost < 1e-9, `frame ${g}: ${r.cost}`);
  }
});

// A query: a pose (the database frame `pose`) with a trajectory in his frame (rig numbers a second)
const query = (pose: number, vz: number) => {
  const q = db.feat.slice(pose * FEATURES, (pose + 1) * FEATURES);
  setTrajectory(
    db,
    q,
    AHEAD.map((k) => ({ x: 0, z: (vz * k) / MOCAP_FPS, face: 0 })),
  );
  return q;
};
const at = (name: string, f: number) => db.start[db.clips.findIndex((c) => c.name === name)] + f;

test('running straight on finds running; standing still finds standing', () => {
  const runSpeed = db.speed[at('run-loop', 30)];
  const run = search(db, query(at('run-loop', 30), runSpeed));
  assert.ok(db.speed[run.g] > runSpeed * 0.85, `a running frame (${db.clips[db.clipOf[run.g]].name} at ${db.speed[run.g].toFixed(2)})`);
  const still = search(db, query(at('run-stop', 50), 0));
  assert.ok(db.speed[still.g] < 0.3, `a standing frame (${db.clips[db.clipOf[still.g]].name} at ${db.speed[still.g].toFixed(2)})`);
  // ...and from standing, a run ahead finds a start
  const start = search(db, query(at('run-stop', 50), runSpeed));
  const c = db.clips[db.clipOf[start.g]];
  const f = db.frameOf[start.g];
  const later = db.start[db.clipOf[start.g]] + Math.min(c.frames - 1, f + 15);
  assert.ok(db.speed[later] > db.speed[start.g], `speeding up from ${c.name} ${f}`);
});

test('a search is quick (the whole database, a few thousand frames)', () => {
  const q = query(at('walk', 40), 1);
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) search(db, q);
  const ms = (performance.now() - t0) / 50;
  assert.ok(ms < 2, `${ms.toFixed(3)} ms a search`);
});
