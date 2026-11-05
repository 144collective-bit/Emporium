// One key for one job (keymap.ts, docs/views-plan.md Phase 3): a job's key and button are the same in every mode
// it's in, no two jobs share one in a mode unless one takes it over by context, and every mode has its camera and a
// way out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYMAP, MODE_IDS, bindsOf, cardBinds, type Binding, type Job } from '../src/scripts/city3d/keymap';

test('a job is the same key and the same button in every mode it is in', () => {
  const first = new Map<Job, { mode: string; b: Binding }>();
  const keyOf = new Map<Job, { mode: string; key: string }>();
  const padOf = new Map<Job, { mode: string; pad: string }>();
  for (const id of MODE_IDS)
    for (const b of KEYMAP[id].binds) {
      if (!first.has(b.job)) first.set(b.job, { mode: id, b });
      const k = b.keys[0];
      if (k) {
        const seen = keyOf.get(b.job);
        if (seen) assert.equal(k, seen.key, `${b.job}: ${id} says ${k}, ${seen.mode} says ${seen.key}`);
        else keyOf.set(b.job, { mode: id, key: k });
      }
      const p = b.pad[0];
      if (p) {
        const seen = padOf.get(b.job);
        if (seen) assert.equal(p, seen.pad, `${b.job}: ${id} says ${p}, ${seen.mode} says ${seen.pad}`);
        else padOf.set(b.job, { mode: id, pad: p });
      }
    }
});

test('no two jobs share a key or a button in a mode, unless one takes it over by context', () => {
  for (const id of MODE_IDS) {
    const binds = bindsOf(id);
    for (const [kind, of] of [['key', (b: Binding) => b.keys], ['button', (b: Binding) => b.pad]] as const) {
      const owner = new Map<string, Binding>();
      for (const b of binds)
        for (const k of of(b)) {
          const o = owner.get(k);
          if (o && o.job !== b.job) {
            const ok = b.shares?.includes(o.job) || o.shares?.includes(b.job);
            assert.ok(ok, `${id}: the ${kind} ${k} is both ${o.job} and ${b.job}`);
          } else owner.set(k, b);
        }
    }
  }
});

test('the shared jobs are where they should be', () => {
  const has = (id: (typeof MODE_IDS)[number], job: Job) => bindsOf(id).find((b) => b.job === job);
  // the camera everywhere: V, the right stick pressed, the touch View button
  for (const id of MODE_IDS) {
    const c = has(id, 'camera');
    assert.ok(c, `${id} has no camera`);
    assert.deepEqual([c!.keys[0], c!.pad[0], c!.touch], ['V', 'R3', 'View']);
  }
  // in and out with F / Y on foot and in every vehicle; the horn wherever there is one
  for (const id of ['foot', 'car', 'bike', 'boat', 'plane'] as const) assert.deepEqual([has(id, 'interact')!.keys[0], has(id, 'interact')!.pad[0]], ['F', 'Y']);
  for (const id of ['car', 'bike', 'boat'] as const) assert.deepEqual([has(id, 'horn')!.keys[0], has(id, 'horn')!.pad[0]], ['H', 'L3']);
  // a way out of every mode: the menu, quitting or skipping
  for (const id of MODE_IDS) assert.ok(has(id, 'menu') || has(id, 'quit') || has(id, 'skip'), `${id} has no way out`);
  // the ring's fists are the street's
  for (const job of ['punch', 'kick', 'block', 'dodge'] as Job[]) {
    const [a, b] = [has('fists', job)!, has('ring', job)!];
    assert.deepEqual([a.keys[0], a.pad[0]], [b.keys[0], b.pad[0]], job);
  }
  // sprint is the left stick pressed with a gun out too (LB is the fists' block and the gun's peek)
  assert.equal(has('armed', 'sprint')!.pad[0], 'L3');
});

test('every binding says what it does and how', () => {
  for (const id of MODE_IDS) {
    assert.ok(KEYMAP[id].name.length > 0);
    for (const b of KEYMAP[id].binds) {
      assert.ok(b.label.length > 0, `${id} ${b.job}`);
      assert.ok(b.keys.length || b.pad.length || b.touch, `${id} ${b.job} has no way to do it`);
    }
  }
});

test('the control card (Phase 4) is short, has its mode\'s own jobs and a way to move or steer, and shows on every input', () => {
  for (const id of MODE_IDS) {
    const rows = cardBinds(id);
    assert.ok(rows.length >= 3 && rows.length <= 14, `${id}: ${rows.length} rows`);
    // nothing twice
    assert.equal(new Set(rows.map((b) => b.job)).size, rows.length, id);
    for (const b of KEYMAP[id].binds) if (b.job !== 'walk' && b.job !== 'emotes') assert.ok(rows.includes(b), `${id} ${b.job}`);
    if (id !== 'ride') assert.ok(rows.some((b) => b.job === 'move' || b.job === 'steer'), id);
    // every input has rows to show
    assert.ok(rows.filter((b) => b.keys.length).length >= 3, id);
    assert.ok(rows.filter((b) => b.pad.length).length >= 3, id);
    assert.ok(rows.filter((b) => b.touch).length >= 2, id);
  }
  // laid on on foot: the mode's own jobs first, then on foot's main ones
  const fists = cardBinds('fists');
  assert.equal(fists[0].job, 'punch');
  assert.ok(fists.some((b) => b.job === 'interact') && !fists.some((b) => b.job === 'emotes'));
});
