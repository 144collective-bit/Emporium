// The unmasked faces (docs/faces-plan.md): the face's ink on the face, never in it; the hair clear of the head and
// the hair left at the nape under every hat; the balaclava and shades (and the chain on them) only on the masked;
// the crowd unmasked but for its share and its bouncers, seeded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HAIR_CUTS, items, lookOutfit, PLAYER, type Detail, type Outfit } from '../src/scripts/city3d/wardrobe';
import { CUT_IDS, DEFAULT_LOOK, PALETTE, cleanLook, type Look } from '../src/scripts/net/profile-data';
import { headFront, headGeometry, headRow, inHead, HEAD_TOP } from '../src/scripts/city3d/body';
import { HAIR_COLORS, HAIR_DYES, MASKED_SHARE, SKIN_TONES, cityOutfit, seeded } from '../src/scripts/city3d/crowdlook';

const LEVELS: Detail[] = [3, 2, 1, 0];
const FACE: Outfit = { ...PLAYER, cap: undefined, chain: true, face: true, skin: '#8f5a3a', hair: '#2b1d14' };
const HATS: Partial<Outfit>[] = [{ cap: '#d8312f' }, { cap: '#d8312f', capBack: true }, { beanie: '#3355ff' }, { bucket: '#3355ff' }, { cowboy: '#a06838' }, { tophat: '#222222' }, { crown: true }];
const worn = (q: Detail, o: Outfit) => items(q, true).filter((i) => i.when(o));
const ids = (q: Detail, o: Outfit) => worn(q, o).map((i) => i.id);
const each = (g: THREE.BufferGeometry, f: (v: THREE.Vector3) => void) => {
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) f(v.fromBufferAttribute(p, i));
};

test('faces: the mask, the shades and their chain only on the masked; the face and the hair only unmasked', () => {
  for (const q of LEVELS) {
    const masked = ids(q, PLAYER);
    assert.ok(masked.includes('head') && masked.includes('mask') && masked.includes('shades'), `detail ${q}: the balaclava and shades`);
    assert.ok(!masked.some((id) => id === 'features' || id.startsWith('hair-')), `detail ${q}: no face under the balaclava`);
    const bare = ids(q, FACE);
    assert.ok(bare.includes('head') && !bare.includes('mask') && !bare.includes('shades'), `detail ${q}: no balaclava, no shades`);
    assert.ok(!bare.some((id) => id.startsWith('chain-')), `detail ${q}: no chain without the shades`);
    assert.equal(bare.includes('features'), q > 0, `detail ${q}: the face's ink (not on the far crowd)`);
    assert.deepEqual(
      bare.filter((id) => id.startsWith('hair-')),
      ['hair-crop'],
      `detail ${q}: a crop when no cut's said`
    );
    assert.ok(!ids(q, { ...FACE, hair: undefined }).some((id) => id.startsWith('hair-')), `detail ${q}: bald`);
    assert.ok(!ids(q, { ...FACE, kind: 'hoodie', hood: true }).some((id) => id.startsWith('hair-')), `detail ${q}: under the hood`);
    for (const h of HATS) assert.deepEqual(ids(q, { ...FACE, ...h }).filter((id) => id.startsWith('hair-')), ['hair-nape'], `detail ${q}: under ${Object.keys(h)[0]}`);
    assert.ok(ids(q, { ...FACE, halo: true }).includes('hair-crop'), `detail ${q}: the halo floats over the hair`);
  }
});

test('faces: the eyes, brows and mouth lie on the face, just off it', () => {
  for (const q of [3, 2, 1] as Detail[]) {
    const it = worn(q, FACE).find((i) => i.id === 'features')!;
    for (const p of it.pieces)
      each(p.geo, (v) => {
        assert.ok(!inHead(v.x, v.y, v.z), `detail ${q}: ink inside the head at ${v.toArray().map((n) => n.toFixed(3))}`);
        const off = v.z - headFront(v.x, v.y);
        assert.ok(off > 0 && off < 0.0075, `detail ${q}: ink ${(off * 1000).toFixed(1)} mm off the face`);
      });
  }
});

test('faces: every cut clear of the head, the edge on the scalp, the top over the crown', () => {
  for (const q of LEVELS)
    for (const cut of HAIR_CUTS) {
      // (the far crowd's every cut the crop)
      const it = worn(q, { ...FACE, cut }).find((i) => i.id === `hair-${q === 0 ? 'crop' : cut}`)!;
      let top = 0;
      each(it.pieces[0].geo, (v) => {
        if (cut !== 'bun') assert.ok(!inHead(v.x, v.y, v.z - 1e-4 * Math.sign(v.z)), `detail ${q} ${cut}: hair inside the head at ${v.toArray().map((n) => n.toFixed(3))}`);
        top = Math.max(top, v.y);
      });
      assert.ok(top > HEAD_TOP, `detail ${q} ${cut}: over the crown`);
      assert.ok(top < HEAD_TOP + 0.04, `detail ${q} ${cut}: not a tower`);
    }
});

const ray = new THREE.Raycaster();
const side = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const hit = (m: THREE.Mesh, o: THREE.Vector3, d: THREE.Vector3, last: boolean) => {
  ray.set(o, d);
  const h = ray.intersectObject(m);
  return h.length ? h[last ? h.length - 1 : 0].distance : NaN;
};

test('faces: the hair at the nape stays inside every hat, and the head inside it', () => {
  for (const q of LEVELS) {
    const head = new THREE.Mesh(headGeometry(64, q), side);
    for (const h of HATS) {
      const o = { ...FACE, ...h };
      const list = worn(q, o);
      const nape = new THREE.Mesh(list.find((i) => i.id === 'hair-nape')!.pieces[0].geo, side);
      const hats = list.filter((i) => i.pieces[0]?.joint === 'head' && !['head', 'features', 'hair-nape'].includes(i.id));
      assert.ok(hats.length, `detail ${q}: a hat`);
      const hatMesh = hats.flatMap((i) => i.pieces.filter((p) => !p.detail).map((p) => new THREE.Mesh(p.geo, side)));
      for (let y = 0.07; y < 0.162; y += 0.004) {
        const r = headRow(y);
        const o3 = new THREE.Vector3(0, y, r.zc + (r.front - r.back) / 2);
        for (let k = 0; k < 36; k++) {
          const a = (k / 36) * Math.PI * 2;
          const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          const n = hit(nape, o3, d, true);
          if (!Number.isFinite(n)) continue;
          assert.ok(n - hit(head, o3, d, true) > -0.0003, `detail ${q}: the head through the nape at ${y.toFixed(3)}`);
          for (const m of hatMesh) {
            const g = hit(m, o3, d, false);
            if (Number.isFinite(g)) assert.ok(g > n, `detail ${q} ${Object.keys(h)[0]}: the nape through the hat at ${y.toFixed(3)}`);
          }
        }
      }
    }
  }
});

test('faces: the crowd unmasked but for its share and the bouncers, seeded, in its own tones', () => {
  const n = 400;
  let bare = 0;
  for (let i = 0; i < n; i++) {
    const a = cityOutfit(seeded((i + 0.5) / n), { district: 'town' });
    assert.deepEqual(a, cityOutfit(seeded((i + 0.5) / n), { district: 'town' }), 'the same face every visit');
    if (!a.face) continue;
    bare++;
    assert.ok(SKIN_TONES.includes(a.skin!), a.skin);
    if (a.hair) assert.match(a.hair, /^#[0-9a-f]{6}$/);
  }
  assert.ok(Math.abs(bare / n - (1 - MASKED_SHARE)) < 0.06, `${bare} of ${n} unmasked`);
  for (let i = 0; i < 40; i++) assert.ok(!cityOutfit(seeded(i / 40), { role: 'guard' }).face, 'the bouncers in the balaclava');
});

test('faces: the look keeps the face, cleaned; looks saved before faces stay in the balaclava', () => {
  const old = { ...DEFAULT_LOOK } as Record<string, unknown>;
  for (const k of ['face', 'tone', 'hair', 'cut', 'shades']) delete old[k];
  const was = cleanLook(old);
  assert.equal(was.face, false);
  assert.equal(was.shades, false);
  assert.ok(ids(2, lookOutfit(was)).includes('mask'), 'the balaclava');
  const mine: Look = { ...DEFAULT_LOOK, face: true, tone: PALETTE.tone[6], hair: PALETTE.hair[8], cut: 'curls', shades: true };
  assert.deepEqual(cleanLook(mine), mine);
  for (const c of CUT_IDS) assert.equal(cleanLook({ ...mine, cut: c }).cut, c);
  // Anything else falls back: no colour or cut of a player's own
  const bad = cleanLook({ ...mine, face: 'yes', tone: '#ff00ff', hair: 'red', cut: 'mohawk', shades: 1 });
  assert.deepEqual([bad.face, bad.tone, bad.hair, bad.cut, bad.shades], [false, DEFAULT_LOOK.tone, DEFAULT_LOOK.hair, DEFAULT_LOOK.cut, false]);
});

test('faces: the look on the figure: the cut, bald, the shades and their chain only with them on, the tone on the hands', () => {
  const face: Look = { ...DEFAULT_LOOK, hat: null, face: true, tone: PALETTE.tone[5], hair: PALETTE.hair[1], cut: 'bun', shades: false, chain: true };
  const o = lookOutfit(face);
  assert.equal(o.skin, PALETTE.tone[5]);
  const on = ids(3, o);
  assert.ok(on.includes('hair-bun') && on.includes('features') && !on.includes('mask') && !on.includes('shades'));
  assert.ok(!on.some((id) => id.startsWith('chain-')), 'no chain without the shades');
  const shaded = ids(3, lookOutfit({ ...face, shades: true }));
  assert.ok(shaded.includes('shades') && shaded.includes('chain-suit') && !shaded.includes('mask'));
  assert.ok(!ids(3, lookOutfit({ ...face, cut: 'bald' })).some((id) => id.startsWith('hair-')), 'bald');
  const masked = ids(3, lookOutfit({ ...face, face: false }));
  assert.ok(masked.includes('mask') && masked.includes('shades') && !masked.includes('features') && !masked.some((id) => id.startsWith('hair-')), 'the balaclava, shades and all');
  // (the hands take the tone either way: the hands item's pieces are coloured by `skin`)
  assert.ok(worn(3, o).find((i) => i.id === 'fingers')!.pieces.every((p) => p.color === 'skin'));
});

test("faces: the crowd's skin tones and hair are the players' own", () => {
  for (const c of [...SKIN_TONES]) assert.ok(PALETTE.tone.includes(c), c);
  for (const c of [...HAIR_COLORS, ...HAIR_DYES]) assert.ok(PALETTE.hair.includes(c), c);
});
