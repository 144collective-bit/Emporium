// Your car (mycar.ts): five models with handling numbers, twelve paints, and cars
// from the browser (or a server, later) made safe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAR_PAINTS, DEFAULT_CAR, DRIVE, PLAYER_CARS, cleanCar, paintHex } from '../src/scripts/city3d/mycar';

test('eight player cars, the bus left out, each with 0-1 handling and copy', () => {
  assert.deepEqual([...PLAYER_CARS], ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'muscle', 'suv', 'super']);
  for (const id of PLAYER_CARS) {
    const d = DRIVE[id];
    for (const k of ['speed', 'accel', 'grip'] as const) assert.ok(d[k] >= 0 && d[k] <= 1, `${id} ${k}`);
    assert.ok(d.kind && d.blurb);
  }
});

test('twelve paints, each its own id and colour', () => {
  assert.equal(CAR_PAINTS.length, 12);
  assert.equal(new Set(CAR_PAINTS.map((p) => p.id)).size, 12);
  assert.equal(new Set(CAR_PAINTS.map((p) => p.hex)).size, 12);
  for (const p of CAR_PAINTS) assert.match(p.hex, /^#[0-9a-f]{6}$/);
  assert.equal(paintHex('red'), '#e23b3b');
});

test('cleanCar keeps good cars and falls back for anything else', () => {
  assert.deepEqual(cleanCar({ model: 'coupe', paint: 'pink' }), { model: 'coupe', paint: 'pink' });
  assert.deepEqual(cleanCar({ model: 'bus', paint: 'pink' }), { model: DEFAULT_CAR.model, paint: 'pink' });
  assert.deepEqual(cleanCar({ model: 'van', paint: '#ff0000' }), { model: 'van', paint: DEFAULT_CAR.paint });
  for (const junk of [null, undefined, 'hatch', 7, [], { model: { x: 1 } }]) assert.deepEqual(cleanCar(junk), DEFAULT_CAR);
  // Only the two fields come back
  assert.deepEqual(Object.keys(cleanCar({ model: 'van', paint: 'red', price: 5 })).sort(), ['model', 'paint']);
});
