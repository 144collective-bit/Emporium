// Player profiles (profile-data.ts): the look validator the site and the game server share,
// with the premium wardrobe and the colour packs, and its migration of older saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAGS, DEFAULT_LOOK, HATS, HELD, KINDS, PACKS, PACK_IDS, PALETTE, cleanLook, guestName, isGuestName, packOf } from '../src/scripts/net/profile-data';

test('garbage becomes the default look', () => {
  assert.deepEqual(cleanLook(null), DEFAULT_LOOK);
  assert.deepEqual(cleanLook(undefined), DEFAULT_LOOK);
  assert.deepEqual(cleanLook('suit'), DEFAULT_LOOK);
  assert.deepEqual(cleanLook(42), DEFAULT_LOOK);
  assert.deepEqual(cleanLook([]), DEFAULT_LOOK);
  const bad = cleanLook({
    kind: 'cape',
    top: 'red',
    bottom: '#123456',
    tie: 7,
    shoes: null,
    hat: 'fez',
    hatColor: '#000000',
    hood: 'yes',
    lens: '#fff',
    bag: 'suitcase',
    bagColor: 'blue',
    held: 'sword',
    headphones: 'on',
    chain: 'no',
    necklace: 1,
    watch: 'yes',
  });
  // (a chain field that's there but isn't `true` is off: only a missing one means Degen's own)
  assert.deepEqual(bad, { ...DEFAULT_LOOK, chain: false });
  assert.equal(cleanLook({ kind: 'cape' }).chain, true);
  // The default look has no premium pieces on
  assert.equal(DEFAULT_LOOK.watch, false);
  assert.equal(DEFAULT_LOOK.kind, 'suit');
});

test('the default look is itself valid and comes back unchanged', () => {
  assert.deepEqual(cleanLook(DEFAULT_LOOK), DEFAULT_LOOK);
  assert.deepEqual(cleanLook(JSON.parse(JSON.stringify(DEFAULT_LOOK))), DEFAULT_LOOK);
});

test('the premium wardrobe is accepted: kinds, hats, bags, held things and the watch', () => {
  for (const kind of KINDS) assert.equal(cleanLook({ ...DEFAULT_LOOK, kind }).kind, kind);
  assert.ok(KINDS.includes('varsity') && KINDS.includes('puffer'));
  for (const hat of HATS) assert.equal(cleanLook({ ...DEFAULT_LOOK, hat }).hat, hat);
  for (const hat of ['cowboy', 'tophat', 'halo'] as const) assert.ok(HATS.includes(hat));
  for (const bag of BAGS) assert.equal(cleanLook({ ...DEFAULT_LOOK, bag }).bag, bag);
  for (const bag of ['duffel', 'wings'] as const) assert.ok(BAGS.includes(bag));
  for (const held of HELD) assert.equal(cleanLook({ ...DEFAULT_LOOK, held }).held, held);
  for (const held of ['phone', 'briefcase'] as const) assert.ok(HELD.includes(held));
  assert.equal(cleanLook({ ...DEFAULT_LOOK, watch: true }).watch, true);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, watch: false }).watch, false);
  // The watch is a plain boolean: anything else is off
  assert.equal(cleanLook({ ...DEFAULT_LOOK, watch: 1 }).watch, false);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, watch: 'true' }).watch, false);
  // A look without the field (saved before the watch existed) doesn't wear one
  const { watch: _w, ...older } = DEFAULT_LOOK;
  void _w;
  assert.equal(cleanLook(older).watch, false);
});

test('the colour packs pass for tops and bottoms, and only there', () => {
  assert.deepEqual(PACK_IDS, ['gold', 'holo']);
  for (const id of PACK_IDS) {
    assert.ok(PACKS[id].length >= 4, `${id} pack has colours`);
    for (const c of PACKS[id]) {
      assert.equal(cleanLook({ ...DEFAULT_LOOK, top: c }).top, c);
      assert.equal(cleanLook({ ...DEFAULT_LOOK, bottom: c }).bottom, c);
      assert.equal(packOf(c), id);
      // Pack colours are not shades, ties, kicks, hats or bag colours
      assert.equal(cleanLook({ ...DEFAULT_LOOK, tie: c }).tie, DEFAULT_LOOK.tie);
      assert.equal(cleanLook({ ...DEFAULT_LOOK, shoes: c }).shoes, DEFAULT_LOOK.shoes);
      assert.equal(cleanLook({ ...DEFAULT_LOOK, hatColor: c }).hatColor, DEFAULT_LOOK.hatColor);
      assert.equal(cleanLook({ ...DEFAULT_LOOK, bagColor: c }).bagColor, DEFAULT_LOOK.bagColor);
      assert.equal(cleanLook({ ...DEFAULT_LOOK, lens: c }).lens, DEFAULT_LOOK.lens);
    }
  }
  // The free colours are free: no pack
  for (const c of [...PALETTE.top, ...PALETTE.bottom]) assert.equal(packOf(c), null);
  // The packs don't overlap each other or the free lists
  const all = [...PALETTE.top, ...PALETTE.bottom, ...PALETTE.gold, ...PALETTE.holo].map((c) => c.toLowerCase());
  for (const c of PALETTE.gold) assert.ok(!PALETTE.holo.includes(c));
  for (const c of [...PALETTE.gold, ...PALETTE.holo]) assert.equal(all.filter((x) => x === c.toLowerCase()).length, 1, `${c} listed once`);
});

test('every palette colour is a lower-case six-digit hex', () => {
  for (const [name, list] of Object.entries(PALETTE)) for (const c of list) assert.match(c, /^#[0-9a-f]{6}$/, `${name}: ${c}`);
});

test('hood and tie follow the fit', () => {
  assert.equal(cleanLook({ ...DEFAULT_LOOK, kind: 'suit', hood: true }).hood, false);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, kind: 'hoodie', hood: true }).hood, true);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, kind: 'varsity', hood: true }).hood, false);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, kind: 'puffer', hood: true }).hood, false);
  // The tie is kept on the look whatever the fit (the suit shows it)
  assert.equal(cleanLook({ ...DEFAULT_LOOK, kind: 'puffer', tie: '#e219e5' }).tie, '#e219e5');
});

test('null means none for the hat, bag, held thing and headphones', () => {
  const l = cleanLook({ ...DEFAULT_LOOK, hat: null, bag: null, held: null, headphones: null });
  assert.equal(l.hat, null);
  assert.equal(l.bag, null);
  assert.equal(l.held, null);
  assert.equal(l.headphones, null);
  // Unknown values fall back: the default hat and held thing, no bag
  const u = cleanLook({ ...DEFAULT_LOOK, hat: 'fez', bag: 'suitcase', held: 'sword', headphones: 'on' });
  assert.equal(u.hat, DEFAULT_LOOK.hat);
  assert.equal(u.bag, null);
  assert.equal(u.held, DEFAULT_LOOK.held);
  assert.equal(u.headphones, null);
});

test('looks saved in older formats are upgraded', () => {
  // Before hats had a field of their own: `cap` was the cap colour (null for no cap) and `beanie` a beanie colour
  const capped = cleanLook({ kind: 'hoodie', top: '#e219e5', bottom: '#4a4a5a', cap: '#16141f' });
  assert.equal(capped.hat, 'cap');
  assert.equal(capped.hatColor, '#16141f');
  const beanie = cleanLook({ kind: 'suit', beanie: '#00a8d8' });
  assert.equal(beanie.hat, 'beanie');
  assert.equal(beanie.hatColor, '#00a8d8');
  assert.equal(cleanLook({ kind: 'suit', cap: null }).hat, null);
  // Before bags had a field: `backpack` / `crossbody` were colours
  const pack = cleanLook({ kind: 'suit', backpack: '#d8312f' });
  assert.equal(pack.bag, 'backpack');
  assert.equal(pack.bagColor, '#d8312f');
  const cross = cleanLook({ kind: 'suit', crossbody: '#8f3dff' });
  assert.equal(cross.bag, 'crossbody');
  assert.equal(cross.bagColor, '#8f3dff');
  // Before `held`: `gummy: false` meant an empty hand
  assert.equal(cleanLook({ kind: 'suit', gummy: false }).held, null);
  assert.equal(cleanLook({ kind: 'suit' }).held, 'gummy');
  // Older looks never had a watch
  assert.equal(capped.watch, false);
  // The fields a newer look carries win over the old ones
  const both = cleanLook({ kind: 'suit', cap: '#16141f', hat: 'bucket', hatColor: '#1f9d6a', backpack: '#d8312f', bag: 'duffel', bagColor: '#ff6ad5' });
  assert.equal(both.hat, 'bucket');
  assert.equal(both.hatColor, '#1f9d6a');
  assert.equal(both.bag, 'duffel');
  assert.equal(both.bagColor, '#ff6ad5');
});

test('guest names come from the word lists only', () => {
  let k = 0;
  const r = () => ((k += 0.37) % 1);
  for (let i = 0; i < 20; i++) assert.ok(isGuestName(guestName(r)));
  assert.equal(isGuestName('Neon Degen 042'), true);
  assert.equal(isGuestName('Evil Degen 042'), false);
  assert.equal(isGuestName('Neon Degen 42'), false);
  assert.equal(isGuestName(42), false);
});
