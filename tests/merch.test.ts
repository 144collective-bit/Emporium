// The merch (character rebuild Phase 4): the marks, where they go, their inks and the all-over prints are
// ordinary Look values that cleanLook() checks (the game server too) and fills in for looks saved before them;
// the premium ones are on sale at Drop 001 for Dorras with a level, and the free ones aren't.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOOK, MARK_IDS, PALETTE, PATTERN_IDS, SLOT_IDS, cleanLook } from '../src/scripts/net/profile-data';
import { WARDROBE_CATALOG, markItem, patternItem, wardrobeEntry } from '../src/scripts/city3d/catalog';

test('the default look is Degen as in the art: the diamond on his cap, nothing else', () => {
  assert.equal(DEFAULT_LOOK.hatMark, 'diamond');
  assert.equal(DEFAULT_LOOK.mark, null);
  assert.equal(DEFAULT_LOOK.shoeMark, null);
  assert.equal(DEFAULT_LOOK.pattern, 'plain');
  assert.deepEqual(cleanLook(DEFAULT_LOOK), DEFAULT_LOOK);
});

test('a look saved before the merch gets the defaults; every merch value round-trips', () => {
  const { mark, markAt, ink, hatMark, shoeMark, pattern, ...old } = DEFAULT_LOOK;
  void mark, markAt, ink, hatMark, shoeMark, pattern;
  assert.deepEqual(cleanLook(old), DEFAULT_LOOK);
  for (const m of MARK_IDS)
    for (const at of SLOT_IDS)
      for (const p of PATTERN_IDS) {
        const l = { ...DEFAULT_LOOK, mark: m, markAt: at, hatMark: m, shoeMark: m, pattern: p, ink: PALETTE.ink[3] };
        assert.deepEqual(cleanLook(l), l);
      }
});

test('anything else is turned away: unknown marks, places, inks and prints', () => {
  const l = cleanLook({ ...DEFAULT_LOOK, mark: 'swoosh', markAt: 'forehead', ink: '#123456', hatMark: '<b>', shoeMark: 7, pattern: 'leopard' });
  assert.equal(l.mark, null);
  assert.equal(l.markAt, 'chest');
  assert.equal(l.ink, DEFAULT_LOOK.ink);
  assert.equal(l.hatMark, 'diamond');
  assert.equal(l.shoeMark, null);
  assert.equal(l.pattern, 'plain');
  // Taking a mark off stays off
  assert.equal(cleanLook({ ...DEFAULT_LOOK, mark: 'bolt', shoeMark: null }).shoeMark, null);
});

test('the premium marks and prints are on sale with a price and a level; the free ones are not', () => {
  for (const m of MARK_IDS) {
    const id = markItem(m);
    if (m === 'diamond' || m === 'seven') assert.equal(id, null);
    else {
      const w = wardrobeEntry(id!);
      assert.ok(w && w.tab === 'merch' && w.price > 0 && w.level >= 1, m);
    }
  }
  for (const p of PATTERN_IDS) {
    const id = patternItem(p);
    if (p === 'plain') assert.equal(id, null);
    else assert.ok(wardrobeEntry(id!)?.tab === 'merch', p);
  }
  // Nothing on the merch tab that isn't a mark or a print
  for (const w of WARDROBE_CATALOG.filter((w) => w.tab === 'merch'))
    assert.ok(MARK_IDS.some((m) => markItem(m) === w.id) || PATTERN_IDS.some((p) => patternItem(p) === w.id), w.id);
});

test('every mark has its art, and the logo atlas has a cell for each', async () => {
  const { MARK_ART, ATLAS_COLS, ATLAS_ROWS } = await import('../src/scripts/city3d/marks');
  assert.ok(MARK_IDS.length <= ATLAS_COLS * ATLAS_ROWS);
  for (const id of MARK_IDS) {
    const a = MARK_ART[id];
    assert.ok(a && (a.fill || a.stroke), id);
    // SVG path data only: moves, lines, curves, arcs and numbers
    for (const d of [a.fill, a.stroke, a.dark, a.line]) if (d) assert.match(d, /^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/, id);
  }
});
