// The Neon Mile's life (docs/strip-plan.md Phase 5): its people standing about on its lots and sidewalks, clear of
// everything solid and of the water; its own cars (strip.ts); its sound (ambience.ts: the crowd, the casinos' chimes
// by their doors, the fountain show's music by the lake).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRIP_IDLE } from '../src/scripts/city3d/striplife';
import { STRIP_LEAD, STRIP_MIX, STRIP_PAINTS, inStrip } from '../src/scripts/city3d/strip';
import { RESORTS, resortOf } from '../src/scripts/city3d/resorts';
import { PLAN, onSlab } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { CARS } from '../src/scripts/city3d/carspec';
import { ambienceAt } from '../src/scripts/city3d/ambience';

test('the people standing about: on the Strip, on a slab, clear of everything solid and of the water, not on top of each other', () => {
  assert.ok(STRIP_IDLE.length > 40);
  const water = RESORTS.flatMap((r) => r.water);
  STRIP_IDLE.forEach((p, i) => {
    assert.ok(inStrip(p.x, p.z) && onSlab(PLAN, [p.x, p.z]), `person ${i} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)} off the lots`);
    for (const b of SOLIDS) assert.ok(!(p.x > b[0] - 0.3 && p.x < b[2] + 0.3 && p.z > b[1] - 0.3 && p.z < b[3] + 0.3), `person ${i} in ${b}`);
    for (const w of water) assert.ok(!(p.x > w[0] - 0.4 && p.x < w[2] + 0.4 && p.z > w[1] - 0.4 && p.z < w[3] + 0.4), `person ${i} in the water`);
    for (let j = 0; j < i; j++) assert.ok(Math.hypot(p.x - STRIP_IDLE[j].x, p.z - STRIP_IDLE[j].z) > 0.6, `people ${j} and ${i} on top of each other`);
  });
  // Valets and doormen at every resort
  for (const r of RESORTS) {
    const near = (x: number, z: number, d: number) => STRIP_IDLE.filter((p) => Math.hypot(p.x - x, p.z - z) < d).length;
    assert.ok(near(r.door.x, r.door.z, 2) >= 2, `${r.id}'s doormen`);
    const [px0, pz0, px1, pz1] = r.porte.rect;
    assert.ok(STRIP_IDLE.filter((p) => p.x > px0 && p.x < px1 && p.z > pz0 && p.z < pz1).length >= 2, `${r.id}'s valets`);
  }
  // A crowd at the fountains and at the volcano, facing them
  const lake = resortOf('gondolier')!.water[0];
  assert.ok(STRIP_IDLE.filter((p) => p.x > lake[0] && p.x < lake[2] && Math.abs(p.z - lake[3] - 0.9) < 0.3).length >= 10);
});

test('its own cars: the party bus first, limos, taxis and supercars, every one a model', () => {
  assert.equal(STRIP_LEAD, 'partybus');
  for (const id of [STRIP_LEAD, ...STRIP_MIX]) assert.ok(CARS[id], id);
  assert.ok(STRIP_MIX.filter((m) => m === 'limo').length >= 2);
  assert.ok(STRIP_PAINTS.sedan, 'its taxis');
  // The new models in a lane, the limo long, the party bus as long as the city bus
  assert.ok(CARS.limo.L > CARS.exec.L + 1 && CARS.limo.W <= 1.5);
  assert.equal(CARS.partybus.L, CARS.bus.L);
});

test('its sound: the crowd on the Strip, the chimes by the casino doors, the show by the lake', () => {
  const r = resortOf('dragonspire')!;
  const lake = resortOf('gondolier')!.water[0];
  assert.ok(ambienceAt(190, 30).strip > 0.9);
  assert.ok(ambienceAt(0, 30).strip < 0.05);
  assert.ok(ambienceAt(r.door.x, r.door.z).casino > 0.9);
  assert.ok(ambienceAt(r.door.x, r.door.z + 40).casino < 0.05);
  assert.ok(ambienceAt((lake[0] + lake[2]) / 2, lake[3] + 1).show > 0.9);
  assert.ok(ambienceAt(240, 0).show < 0.1);
});
