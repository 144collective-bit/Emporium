// Your kart's look (docs/kart-west-plan.md Phase 6, mykart.ts): all free, cleaned from anything (a save from before
// it gets the stock look), changed a part at a time and kept in the save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOOK, KART_DECALS, LOOK_COLOURS, cleanKartLook } from '../src/scripts/city3d/mykart';
import { cleanSave, newSave, setKartLook } from '../src/scripts/city3d/tycoon';

test('a look is cleaned from anything: numbers 1-99, known decals and colours, none where none is allowed', () => {
  assert.deepEqual(cleanKartLook(undefined), DEFAULT_LOOK);
  assert.deepEqual(cleanKartLook('junk'), DEFAULT_LOOK);
  assert.equal(cleanKartLook({ number: 140 }).number, 99);
  assert.equal(cleanKartLook({ number: -3 }).number, 1);
  assert.equal(cleanKartLook({ number: 12.6 }).number, 13);
  assert.equal(cleanKartLook({ decal: 'logo-of-a-brand' }).decal, DEFAULT_LOOK.decal);
  for (const d of KART_DECALS) assert.equal(cleanKartLook({ decal: d }).decal, d);
  assert.equal(cleanKartLook({ rim: '#123456' }).rim, DEFAULT_LOOK.rim, 'only the palette');
  assert.equal(cleanKartLook({ rim: LOOK_COLOURS[3] }).rim, LOOK_COLOURS[3]);
  assert.equal(cleanKartLook({ glow: null }).glow, null);
  assert.equal(cleanKartLook({ glow: LOOK_COLOURS[6] }).glow, LOOK_COLOURS[6]);
  assert.equal(cleanKartLook({ tyreStripe: null, helmet: null }).helmet, DEFAULT_LOOK.helmet, 'the helmet is always some colour');
});

test('the save keeps it: changed a part at a time for free, an old save gets the stock look, a broken one is mended', () => {
  const s = newSave(0);
  const dorras = s.dorras;
  assert.deepEqual(s.karts.look, DEFAULT_LOOK);
  setKartLook(s, { number: 42, decal: 'flames', glow: LOOK_COLOURS[9] });
  setKartLook(s, { suit: LOOK_COLOURS[2] });
  assert.equal(s.karts.look.number, 42);
  assert.equal(s.karts.look.decal, 'flames');
  assert.equal(s.karts.look.glow, LOOK_COLOURS[9]);
  assert.equal(s.karts.look.suit, LOOK_COLOURS[2]);
  assert.equal(s.dorras, dorras, 'free');
  // Through a save and back
  const back = cleanSave(JSON.parse(JSON.stringify(s)), 0);
  assert.deepEqual(back.karts.look, s.karts.look);
  // From before the look
  const old = JSON.parse(JSON.stringify(s));
  delete old.karts.look;
  assert.deepEqual(cleanSave(old, 0).karts.look, DEFAULT_LOOK);
  old.karts.look = { number: 'seven', decal: 3 };
  assert.deepEqual(cleanSave(old, 0).karts.look, DEFAULT_LOOK);
});
