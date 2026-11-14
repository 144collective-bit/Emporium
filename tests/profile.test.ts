// Player profiles (profile-data.ts): the look validator the site and the game server share, any colour held
// under white (`safeColour()`), the retired pieces dropped (docs/wardrobe-plan.md Phase 1), and its migration of
// older saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAGS, BRIGHTEST, DEFAULT_LOOK, HATS, KINDS, PALETTE, cleanLook, guestName, isGuestName, safeColour } from '../src/scripts/net/profile-data';

/** A colour's brightness as `safeColour()` weighs it */
const lumOf = (c: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

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
    headphones: 'on',
    chain: 'no',
    necklace: 1,
    watch: 'yes',
  });
  // (a chain field that's there but isn't `true` is off: only a missing one means Degen's own; any well-formed colour is
  // kept, so the bottom and the hat keep theirs)
  assert.deepEqual(bad, { ...DEFAULT_LOOK, bottom: '#123456', hatColor: '#000000', chain: false });
  assert.equal(cleanLook({ kind: 'cape' }).chain, true);
  // The default look has no watch on
  assert.equal(DEFAULT_LOOK.watch, false);
  assert.equal(DEFAULT_LOOK.kind, 'suit');
});

test('the default look is itself valid and comes back unchanged', () => {
  assert.deepEqual(cleanLook(DEFAULT_LOOK), DEFAULT_LOOK);
  assert.deepEqual(cleanLook(JSON.parse(JSON.stringify(DEFAULT_LOOK))), DEFAULT_LOOK);
});

test('every fit, hat and bag is accepted, and the watch', () => {
  for (const kind of KINDS) assert.equal(cleanLook({ ...DEFAULT_LOOK, kind }).kind, kind);
  assert.deepEqual(KINDS, ['suit', 'hoodie', 'track', 'varsity', 'puffer']);
  for (const hat of HATS) assert.equal(cleanLook({ ...DEFAULT_LOOK, hat }).hat, hat);
  for (const bag of BAGS) assert.equal(cleanLook({ ...DEFAULT_LOOK, bag }).bag, bag);
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

test('the retired pieces are gone, and looks that wore them lose them (the wardrobe plan, Phase 1)', () => {
  assert.deepEqual(HATS, ['cap', 'backcap', 'beanie', 'bucket']);
  assert.deepEqual(BAGS, ['backpack', 'crossbody', 'board', 'duffel']);
  // A retired hat comes back bare-headed (not the default cap: he took his hat off for it)
  for (const hat of ['crown', 'cowboy', 'tophat', 'halo']) assert.equal(cleanLook({ ...DEFAULT_LOOK, hat }).hat, null, hat);
  // The wings come back as no bag
  assert.equal(cleanLook({ ...DEFAULT_LOOK, bag: 'wings' }).bag, null);
  // Nothing in the hand: a look that held something has no such field any more
  for (const held of ['coffee', 'boombox', 'phone', 'briefcase', 'gummy']) assert.equal('held' in cleanLook({ ...DEFAULT_LOOK, held }), false, held);
  assert.equal('held' in DEFAULT_LOOK, false);
  // The gold and holo pack colours stay as the colours they were
  for (const c of ['#e2b04a', '#8c5a2b', '#b9f3ff', '#ffc6f2']) {
    assert.equal(cleanLook({ ...DEFAULT_LOOK, top: c }).top, c);
    assert.equal(cleanLook({ ...DEFAULT_LOOK, bottom: c }).bottom, c);
  }
  assert.equal('gold' in PALETTE || 'holo' in PALETTE, false);
});

test('any colour goes on every piece, held a shade under white (the wardrobe plan, Phase 1)', () => {
  const keys = ['top', 'bottom', 'tie', 'shoes', 'hatColor', 'lens', 'bagColor', 'ink'] as const;
  for (const c of ['#123456', '#00ff00', '#ff00ff', '#000000', '#7f7f7f', '#3a2418'])
    for (const k of keys) assert.equal(cleanLook({ ...DEFAULT_LOOK, [k]: c })[k], c, `${k} ${c}`);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, headphones: '#123456' }).headphones, '#123456');
  // Upper case comes back lower case
  assert.equal(cleanLook({ ...DEFAULT_LOOK, top: '#ABCDEF' }).top, '#abcdef');
  // Not a colour: the default (headphones: none)
  for (const v of ['red', '#fff', '#12345', '#1234567', '#gggggg', 'rgb(1,2,3)', 7, null, {}, ' #123456'])
    for (const k of keys) assert.equal(cleanLook({ ...DEFAULT_LOOK, [k]: v })[k], DEFAULT_LOOK[k], `${k} ${String(v)}`);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, headphones: '#fff' }).headphones, null);
  // Pure white and the brightest colours are dimmed to the palette's white, their hue kept
  const white = safeColour('#ffffff')!;
  assert.ok(lumOf(white) <= BRIGHTEST + 1e-9);
  assert.ok(lumOf(white) > BRIGHTEST - 3, 'still white');
  assert.equal(white.slice(1, 3), white.slice(3, 5));
  for (const c of ['#ffffff', '#fffffe', '#f8fff8', '#ffffaa', '#eeffff']) {
    const out = safeColour(c)!;
    assert.match(out, /^#[0-9a-f]{6}$/);
    assert.ok(lumOf(out) <= BRIGHTEST + 1e-9, `${c} -> ${out}`);
    assert.equal(cleanLook({ ...DEFAULT_LOOK, top: c }).top, out);
  }
  // Every swatch the fitting room offers passes as it is
  for (const list of Object.values(PALETTE)) for (const c of list) assert.equal(safeColour(c), c, c);
  // Safe twice is the same as once
  for (const c of ['#ffffff', '#123456', '#ffe0f0']) assert.equal(safeColour(safeColour(c)), safeColour(c));
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

test('null means none for the hat, bag and headphones', () => {
  const l = cleanLook({ ...DEFAULT_LOOK, hat: null, bag: null, headphones: null });
  assert.equal(l.hat, null);
  assert.equal(l.bag, null);
  assert.equal(l.headphones, null);
  // Unknown values fall back: the default hat, no bag
  const u = cleanLook({ ...DEFAULT_LOOK, hat: 'fez', bag: 'suitcase', headphones: 'on' });
  assert.equal(u.hat, DEFAULT_LOOK.hat);
  assert.equal(u.bag, null);
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
