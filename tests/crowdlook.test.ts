// The crowd's outfits by district and role (the polish plan's Phase 8, crowdlook.ts): seeded and stable, no two
// neighbours alike, every kind one the crowd's meshes carry (phones one more than they had), each district its
// own cloth, the roles' rules (joggers in track, kids bright, the Docks' workers in hi-vis, bouncers in black),
// and the districts found where they stand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROWD_KINDS, CROWD_KINDS_LIGHT, HI_VIS, STYLES, cityOutfit, districtAt, roleOf, seeded, type District, type Role } from '../src/scripts/city3d/crowdlook';
import { items, type Detail, type Outfit, type OutfitKind } from '../src/scripts/city3d/wardrobe';
import { TRENCH_RECT } from '../src/scripts/city3d/trenches';
import { UPTOWN_RECT } from '../src/scripts/city3d/uptown';
import { NORTH_RECT } from '../src/scripts/city3d/uptownnorth';
import { WESTLAKE_RECT } from '../src/scripts/city3d/westlake';
import { DOCKS_RECT } from '../src/scripts/city3d/docks';
import { YARDS_RECT } from '../src/scripts/city3d/southfield';
import { CREST_RECT } from '../src/scripts/city3d/crestmont';
import { STRIP_RECT } from '../src/scripts/city3d/strip';
import { SUN_BLOCKS } from '../src/scripts/city3d/sunridge';
import { LOT9_RECT } from '../src/scripts/city3d/lot9';
import { MALL_AREA } from '../src/scripts/city3d/mall';
import { SITE } from '../src/scripts/city3d/airfield';
import { KART_AREA } from '../src/scripts/city3d/kartfacility';
import { SOUTH_ROW } from '../src/scripts/city3d/layout';

const DISTRICTS = Object.keys(STYLES) as District[];
const ROLES: Role[] = ['walk', 'idle', 'jog', 'kid', 'worker', 'guard', 'shopper', 'cyclist', 'boater'];
const HEX = /^#[0-9a-f]{6}$/;
const mid = (r: readonly number[]): [number, number] => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

test('an outfit is the same every time from its seed, and a crowd of seeds is a crowd of different outfits', () => {
  for (const d of DISTRICTS) {
    const a = cityOutfit(seeded(0.37), { district: d });
    const b = cityOutfit(seeded(0.37), { district: d });
    assert.deepEqual(a, b, d);
    const seen = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const o = cityOutfit(seeded((i + 0.5) / 120), { district: d });
      seen.add(JSON.stringify({ ...o, build: 0, height: 0 }));
    }
    // (120 people: well over 100 looks among them, build and height aside)
    assert.ok(seen.size > 100, `${d}: ${seen.size} different outfits in 120`);
  }
});

test('every outfit is one the crowd can draw: a kind it carries, hex colours, one hat, a build and height near one', () => {
  for (const kinds of [CROWD_KINDS, CROWD_KINDS_LIGHT, ['hoodie'] as OutfitKind[]])
    for (const district of DISTRICTS)
      for (const role of ROLES)
        for (let i = 0; i < 40; i++) {
          const o = cityOutfit(seeded(i / 40 + 0.01), { district, role, kinds });
          assert.ok(kinds.includes(o.kind), `${district} ${role}: ${o.kind} is a kind the crowd carries (${kinds.join(', ')})`);
          for (const c of [o.top, o.bottom, o.shoes, o.tie, o.cap, o.beanie, o.bucket, o.lens, o.backpack, o.crossbody, o.headphones]) if (c !== undefined) assert.match(c, HEX, `${district} ${role}: ${c}`);
          assert.ok([o.cap, o.beanie, o.bucket, o.hood].filter(Boolean).length <= 1, `${district} ${role}: one hat`);
          assert.ok(!(o.hood && o.kind !== 'hoodie'), 'only a hoodie has a hood');
          assert.ok(!(o.tie && o.kind !== 'suit'), 'only a suit has a tie');
          assert.ok(o.build! > 0.9 && o.build! < 1.15 && o.height! > 0.94 && o.height! < 1.06, 'a build and height near one');
        }
  // The phones' crowd carries exactly one kind more than the two it had
  assert.equal(CROWD_KINDS_LIGHT.length, 3);
  assert.ok(CROWD_KINDS_LIGHT.every((k) => CROWD_KINDS.includes(k)));
});

/** How many of `n` outfits in a district pass `f` */
const share = (district: District, f: (o: Outfit) => boolean, role: Role = 'walk', n = 400) => {
  let k = 0;
  for (let i = 0; i < n; i++) if (f(cityOutfit(seeded((i + 0.3) / n), { district, role }))) k++;
  return k / n;
};

test('each district dresses its own way', () => {
  // Uptown: mostly suits and coats, hardly a cap; The Trenches: hoodies and track, hoods and beanies
  assert.ok(share('uptown', (o) => o.kind === 'suit' || o.kind === 'puffer') > 0.8, 'Uptown in suits and coats');
  assert.ok(share('uptown', (o) => !!o.cap) < 0.15, 'Uptown bare-headed');
  assert.ok(share('trenches', (o) => o.kind === 'hoodie' || o.kind === 'track') > 0.75, 'The Trenches in hoodies and track');
  assert.ok(share('trenches', (o) => !!o.hood || !!o.beanie) > 0.3, 'The Trenches in hoods and beanies');
  // The park in track and hoodies; the Neon Mile's lenses never the default green; Crestmont's suits pale with the collar open
  assert.ok(share('park', (o) => o.kind === 'track' || o.kind === 'hoodie') > 0.7, 'the park casual');
  assert.equal(share('strip', (o) => o.lens === '#22d07a'), 0, "the Neon Mile's lenses are its own");
  assert.ok(share('crest', (o) => o.kind === 'suit' && !o.tie) > 0.2, "Crestmont's collars open");
  assert.ok(share('crest', (o) => STYLES.crest.suits.includes(o.top) || STYLES.crest.tops.includes(o.top)) > 0.95, 'Crestmont in its own cloth');
  // The cove casual and pale; Lot 9 worn; the kart park in track
  assert.ok(share('beach', (o) => o.shoes === '#f3f2f7') > 0.4, 'white shoes at the cove');
  assert.ok(share('lot9', (o) => STYLES.lot9.tops.includes(o.top) || STYLES.lot9.suits.includes(o.top)) > 0.95, 'Lot 9 in its own cloth');
  assert.ok(share('karts', (o) => o.kind === 'track') > 0.4, 'the kart park in track');
  // The town as it was: suits and hoodies about half and half, the odd track suit or puffer
  const suits = share('town', (o) => o.kind === 'suit');
  assert.ok(suits > 0.35 && suits < 0.55, `the town's suits ${suits}`);
});

test("the roles' rules: joggers and cyclists in track, kids bright with the cap back, workers at the port in hi-vis, bouncers in black", () => {
  for (const d of DISTRICTS) {
    assert.equal(share(d, (o) => o.kind === 'track', 'jog'), 1, `${d}'s joggers in track`);
    assert.equal(share(d, (o) => o.kind === 'track', 'cyclist'), 1, `${d}'s cyclists in track`);
    assert.equal(share(d, (o) => (o.kind === 'track' || o.kind === 'hoodie') && !o.tie, 'kid'), 1, `${d}'s kids casual`);
    assert.ok(share(d, (o) => !!o.capBack, 'kid') > 0.15, `${d}'s kids with the cap back`);
    assert.equal(share(d, (o) => o.kind === 'suit' && o.top === '#16141f' && !o.cap && o.lens === '#2b2b36', 'guard'), 1, `${d}'s bouncers in black`);
  }
  for (const d of ['docks', 'yards'] as District[]) assert.equal(share(d, (o) => HI_VIS.includes(o.top), 'worker'), 1, `${d}'s workers in hi-vis`);
  assert.equal(share('town', (o) => HI_VIS.includes(o.top), 'worker'), 0, "the town's workers plain");
  // Phones carry no track: a jogger falls back to a hoodie, never a suit
  for (let i = 0; i < 20; i++) assert.equal(cityOutfit(seeded(i / 20), { role: 'jog', kinds: ['suit', 'hoodie'] }).kind, 'hoodie');
  // What life.ts knows becomes a role
  assert.equal(roleOf({ scale: 0.44 }), 'kid');
  assert.equal(roleOf({ act: 'cook' }), 'worker');
  assert.equal(roleOf({ act: 'guard' }), 'guard');
  assert.equal(roleOf({ clip: 'jog' }), 'jog');
  assert.equal(roleOf({ clip: 'row' }), 'boater');
  assert.equal(roleOf({ id: 'cyclist-3', clip: 'walk' }), 'cyclist');
  assert.equal(roleOf({ shopper: true }), 'shopper');
  assert.equal(roleOf({}), 'walk');
  assert.equal(roleOf({ act: 'look' }), 'idle');
});

test('a district is found where a person stands, the town everywhere else', () => {
  assert.equal(districtAt(30, 30), 'town');
  assert.equal(districtAt(...mid(TRENCH_RECT)), 'trenches');
  assert.equal(districtAt(...mid(UPTOWN_RECT)), 'uptown');
  assert.equal(districtAt(...mid(NORTH_RECT)), 'uptown');
  assert.equal(districtAt(...mid(WESTLAKE_RECT)), 'park');
  assert.equal(districtAt(...mid(DOCKS_RECT)), 'docks');
  assert.equal(districtAt(...mid(YARDS_RECT)), 'yards');
  assert.equal(districtAt(...mid(CREST_RECT)), 'crest');
  assert.equal(districtAt(...mid(STRIP_RECT)), 'strip');
  assert.equal(districtAt(...mid(LOT9_RECT)), 'lot9');
  assert.equal(districtAt(...mid(MALL_AREA)), 'mall');
  assert.equal(districtAt(...mid(SITE)), 'airport');
  assert.equal(districtAt(...mid(KART_AREA)), 'karts');
  assert.equal(districtAt(18, SOUTH_ROW + 6), 'beach');
  // (a Sunridge block's corner is in the suburb)
  const b = SUN_BLOCKS[0].poly;
  const cx = b.reduce((s, p) => s + p[0], 0) / b.length;
  const cz = b.reduce((s, p) => s + p[1], 0) / b.length;
  assert.equal(districtAt(cx, cz), 'suburb');
  assert.equal(districtAt(-1e5, -1e5), 'town', 'a spare slot out of the world');
});

test('the crowd stays a few draws a kind: the phones add one kind of meshes, the desktop two, over the suits and hoodies they had', () => {
  // Each (kind, level, material) is one instanced mesh (character.ts createCrowd()): count them for a crowd of each district
  const draws = (kinds: readonly OutfitKind[]) => {
    const seen = new Set<string>();
    for (const q of [1, 0] as Detail[])
      for (const district of DISTRICTS)
        for (const role of ROLES)
          for (let i = 0; i < 30; i++) {
            const o = cityOutfit(seeded(i / 30 + 0.02), { district, role, kinds });
            for (const it of items(q, true)) if (it.when(o)) for (const p of it.pieces) seen.add(`${q}|${o.kind}|${p.mat ?? ''}`);
          }
    return seen.size;
  };
  const was = draws(['suit', 'hoodie']);
  const light = draws(CROWD_KINDS_LIGHT);
  const full = draws(CROWD_KINDS);
  const perKind = was / 2;
  assert.ok(light - was <= perKind + 1, `phones: ${light} meshes where ${was} were (one kind more)`);
  assert.ok(full - was <= 2 * perKind + 2, `desktop: ${full} meshes where ${was} were (two kinds more)`);
});
