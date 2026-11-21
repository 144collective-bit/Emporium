// The aircraft far off on phones (aircraft.ts, docs/phone-far-plan.md Phase 2): each model in one piece, its livery
// where the near livery is, its lights glowing; each aircraft near or far by its own distance, as the places are
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aircraftModel, aircraftNear, type ModelKind } from '../src/scripts/city3d/aircraft';
import { farGeometry } from '../src/scripts/city3d/aircraftfar';
import { FAR_MARGIN } from '../src/scripts/city3d/tiles';

const KINDS: ModelKind[] = ['jet', 'freighter', 'prop', 'heli', 'bizjet'];

test('each model far off is one piece: its body, livery, lights, surfaces and blades, without its gear or titles', () => {
  for (const kind of KINDS) {
    const model = aircraftModel(kind);
    const geo = farGeometry(model);
    for (const a of ['position', 'normal', 'color', 'accent', 'glow', 'glowLit']) assert.ok(geo.attributes[a], `${kind}: no ${a}`);
    const count = (role: string) => model.parts.filter((p) => p.role === role).reduce((n, p) => n + p.geo.attributes.position.count, 0);
    const blades = model.spinners.reduce((n, s) => n + s.blades.attributes.position.count, 0);
    const frames = model.frames.length * 36;
    const want = count('body') + count('accent') + count('neon') + count('strobe') + blades + frames;
    assert.equal(geo.attributes.position.count, want, `${kind}: ${geo.attributes.position.count} vertices, not ${want}`);
    // (the livery's vertices take the aircraft's colour; the lights glow, brighter at night)
    const accent = geo.attributes.accent.array as Float32Array;
    const lit = geo.attributes.glowLit.array as Float32Array;
    let livery = 0;
    let lights = 0;
    for (let i = 0; i < accent.length; i++) {
      livery += accent[i];
      if (lit[i * 2 + 1] > lit[i * 2]) lights++;
    }
    assert.ok(livery >= count('accent'), `${kind}: livery on ${livery} vertices`);
    assert.equal(lights, count('neon') + count('strobe'), `${kind}: ${lights} glowing vertices`);
    // (made once a model)
    assert.equal(farGeometry(model), geo);
  }
});

test('the far piece leaves the near parts as they were', () => {
  const model = aircraftModel('prop');
  farGeometry(model);
  for (const p of model.parts) assert.ok(!p.geo.attributes.accent && !p.geo.attributes.glow, `${p.role} part touched`);
});

test('an aircraft is near within the tier\'s far of the camera, and stays near a little past it', () => {
  const eye = { x: 0, y: 0, z: 0, far: 90 };
  assert.equal(aircraftNear(100, 0, 0, 10, false, eye), true);
  assert.equal(aircraftNear(101, 0, 0, 10, false, eye), false);
  // (no flicker on the line: once near, near till past the margin)
  assert.equal(aircraftNear(100 + FAR_MARGIN - 0.5, 0, 0, 10, true, eye), true);
  assert.equal(aircraftNear(100 + FAR_MARGIN + 0.5, 0, 0, 10, true, eye), false);
  // (before the first frame there's no far: everything near)
  assert.equal(aircraftNear(5000, 0, 0, 10, false, { x: 0, y: 0, z: 0, far: Infinity }), true);
});
