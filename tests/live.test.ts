// Live settings (the command center's Phase 1): the city reads its public config into gates, banners and
// maintenance, and anything missing or wrong leaves the city as it is in the code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_FEATURES, LIVE_PLACES, NO_LIVE, TEXT_MAX, DEFAULT_MAINTENANCE, bannersAt, cleanText, closedLine, featureGate, placeGate, readLive, sameLive } from '../src/scripts/city3d/live';
import { PLACES } from '../src/scripts/city3d/places';

const cfg = (settings: Record<string, unknown>) => ({ v: 1, at: '2026-10-23T00:00:00Z', settings });

test('every place with a pin can be switched, and nothing else', () => {
  const spots = PLACES.filter((p) => p.kind === 'spot').map((p) => p.spot).sort();
  assert.deepEqual(LIVE_PLACES.map((p) => p.id).sort(), spots);
  assert.equal(new Set(LIVE_FEATURES.map((f) => f.id)).size, LIVE_FEATURES.length);
});

test('no config, an empty one or a broken one is the city as it is: everything open, no banners, no cover', () => {
  for (const raw of [undefined, null, 'nonsense', 42, [], {}, { settings: [] }, cfg({})]) {
    const live = readLive(raw);
    assert.ok(sameLive(live, NO_LIVE), JSON.stringify(raw));
    for (const p of LIVE_PLACES) assert.equal(placeGate(live, p.id).open, true);
    for (const f of LIVE_FEATURES) assert.equal(featureGate(live, f.id).open, true);
  }
});

test('places and features close, with a note, and open again', () => {
  const live = readLive(cfg({ 'place.karts': { open: false, note: 'Back Saturday' }, 'place.club': { open: true }, 'feature.fly': { open: false } }));
  assert.deepEqual(placeGate(live, 'karts'), { open: false, note: 'Back Saturday' });
  assert.equal(placeGate(live, 'club').open, true);
  assert.equal(placeGate(live, 'vault').open, true);
  assert.equal(featureGate(live, 'fly').open, false);
  assert.equal(featureGate(live, 'drive').open, true);
  assert.equal(closedLine('Flying', featureGate(live, 'fly')), 'Flying is closed for now. Back soon.');
  assert.equal(closedLine('Kart park', placeGate(live, 'karts')), 'Back Saturday');
});

test('unknown keys and bad values are left out', () => {
  const live = readLive(
    cfg({
      'place.moon': { open: false },
      'place.karts': { open: 'no' },
      'feature.teleport': { open: false },
      'feature.drive': false,
      'banner.Bad Id': { text: 'x' },
      'banner.empty': { text: '   ' },
      'banner.notext': { place: 'karts' },
      maintenance: { on: 'yes' },
      'launch.details': { anything: 1 },
    })
  );
  assert.ok(sameLive(live, NO_LIVE));
});

test('text is one plain line, never longer than its limit', () => {
  assert.equal(cleanText('  two\n\tlines  ', 50), 'two lines');
  assert.equal(cleanText('a\u202eb\u200bc', 50), 'a b c');
  assert.equal(cleanText({}, 50), '');
  const live = readLive(cfg({ 'banner.long': { text: 'x'.repeat(500) }, 'place.vault': { open: false, note: 'y'.repeat(500) }, maintenance: { on: true, message: 'z'.repeat(999) } }));
  assert.equal(live.banners[0].text.length, TEXT_MAX.banner);
  assert.equal(placeGate(live, 'vault').note.length, TEXT_MAX.note);
  assert.equal(live.maintenance!.message.length, TEXT_MAX.maintenance);
});

test('banners show inside their window, in key order, and point only at real places', () => {
  const live = readLive(
    cfg({
      'banner.b': { text: 'Kart cup this weekend', place: 'karts', from: '2026-10-24T00:00:00Z', until: '2026-10-26T00:00:00Z' },
      'banner.a': { text: 'Always on', place: 'nowhere' },
    })
  );
  assert.deepEqual(live.banners.map((b) => b.id), ['a', 'b']);
  assert.equal(live.banners[0].place, null);
  assert.equal(live.banners[1].place, 'karts');
  assert.deepEqual(bannersAt(live, Date.parse('2026-10-23T12:00:00Z')).map((b) => b.id), ['a']);
  assert.deepEqual(bannersAt(live, Date.parse('2026-10-25T12:00:00Z')).map((b) => b.id), ['a', 'b']);
  assert.deepEqual(bannersAt(live, Date.parse('2026-10-26T00:00:00Z')).map((b) => b.id), ['a']);
});

test('maintenance covers the city only while on, with its message or the default', () => {
  assert.equal(readLive(cfg({ maintenance: { on: false, message: 'x' } })).maintenance, null);
  assert.deepEqual(readLive(cfg({ maintenance: { on: true } })).maintenance, { message: DEFAULT_MAINTENANCE, eta: null });
  const m = readLive(cfg({ maintenance: { on: true, message: 'Big update', eta: '2026-10-23T20:00:00Z' } })).maintenance!;
  assert.equal(m.message, 'Big update');
  assert.equal(m.eta, Date.parse('2026-10-23T20:00:00Z'));
});
