// Your car (mycar.ts): eight models with handling numbers and cargo (five free
// starters and three the garage sells), twelve paints, and cars from the browser
// (or a server, later) made safe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARGO, CAR_PAINTS, DEFAULT_CAR, DRIVE, PLAYER_CARS, STOCK_LOOK, cleanCar, paintHex } from '../src/scripts/city3d/mycar';
import { CAR_CATALOG, STARTER_CARS } from '../src/scripts/city3d/catalog';

test('eight player cars, the bus left out, each with 0-1 handling, cargo and copy', () => {
  assert.deepEqual([...PLAYER_CARS], ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'muscle', 'suv', 'super']);
  for (const id of PLAYER_CARS) {
    const d = DRIVE[id];
    for (const k of ['speed', 'accel', 'grip'] as const) assert.ok(d[k] >= 0 && d[k] <= 1, `${id} ${k}`);
    assert.ok(d.kind && d.blurb);
    assert.ok(Number.isInteger(CARGO[id]) && CARGO[id] > 0, `${id} cargo`);
  }
});

test('the five starters are free and come first; the three for sale cost Dorras and need a level', () => {
  assert.deepEqual(STARTER_CARS, ['hatch', 'sedan', 'coupe', 'pickup', 'van']);
  for (const id of ['muscle', 'suv', 'super'] as const) {
    assert.ok(CAR_CATALOG[id].price > 0 && CAR_CATALOG[id].level > 1, id);
    assert.ok(CAR_CATALOG[id].pitch);
  }
  // Dearer cars are faster, so there's something to save for
  assert.ok(DRIVE.super.speed > DRIVE.muscle.speed && CAR_CATALOG.super.price > CAR_CATALOG.muscle.price);
});

test('twelve paints, each its own id and colour', () => {
  assert.equal(CAR_PAINTS.length, 12);
  assert.equal(new Set(CAR_PAINTS.map((p) => p.id)).size, 12);
  assert.equal(new Set(CAR_PAINTS.map((p) => p.hex)).size, 12);
  for (const p of CAR_PAINTS) assert.match(p.hex, /^#[0-9a-f]{6}$/);
  assert.equal(paintHex('red'), '#e23b3b');
});

test('cleanCar keeps good cars and falls back for anything else', () => {
  const look = STOCK_LOOK;
  assert.deepEqual(cleanCar({ model: 'coupe', paint: 'pink' }), { model: 'coupe', paint: 'pink', look });
  assert.deepEqual(cleanCar({ model: 'bus', paint: 'pink' }), { model: DEFAULT_CAR.model, paint: 'pink', look });
  assert.deepEqual(cleanCar({ model: 'van', paint: '#ff0000' }), { model: 'van', paint: DEFAULT_CAR.paint, look });
  for (const junk of [null, undefined, 'hatch', 7, [], { model: { x: 1 } }]) assert.deepEqual(cleanCar(junk), DEFAULT_CAR);
  // Only the three fields come back (the look: tests/carlook.test.ts)
  assert.deepEqual(Object.keys(cleanCar({ model: 'van', paint: 'red', price: 5 })).sort(), ['look', 'model', 'paint']);
});
