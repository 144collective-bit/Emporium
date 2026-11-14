import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIPS } from '../src/scripts/city3d/fight-anim';
import { blocked, pickClip, type FighterFigure } from '../src/scripts/city3d/fight-figure';
import { T, createFightSim } from '../src/scripts/city3d/fight-sim';

test('a blow on the block plays blockHit, then back to the block', () => {
  const sim = createFightSim({ seed: 1, fighters: [{ id: 'a', name: 'A', style: 'brawler', x: 0, z: 0, yaw: 0 }, { id: 'b', name: 'B', style: 'brawler', x: 0, z: 3, yaw: Math.PI }] });
  for (let i = 0; i < 10; i++) sim.step(T.tick, { a: { x: 0, z: 0, punch: false, kick: false, dodge: false, block: true } });
  const f = sim.fighter('a')!;
  // (pickClip reads only these of the figure)
  const fg = { manual: null, jolt: -1, seed: 0 } as unknown as FighterFigure;
  assert.equal(pickClip(f, fg, 0).id, 'block');
  blocked(fg);
  assert.equal(pickClip(f, fg, 0).id, 'blockHit');
  fg.jolt = CLIPS.blockHit.frames;
  assert.equal(pickClip(f, fg, 0).id, 'block');
});
