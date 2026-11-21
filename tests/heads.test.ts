// The characters' heads (docs/characters-plan.md): SlimeWhale's head on Degen's body. Degen's own head, the hats,
// the shades, the face gear and the hood up are off while it's on (whatever the outfit says), only on single
// figures; the eyes and lips seated on the face, the ink on them, the buzz clear of the head; the neck as Degen's,
// the jaw clear of every top's collar as the head turns and nods; the figure inside its budget. Worn from the look
// (Phase 2): `character` cleaned and kept apart from what's saved, the whole look in one tap, the character screen's rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { gloveColour, headless, items, lookOutfit, PLAYER, useHeads, type Detail, type Outfit } from '../src/scripts/city3d/wardrobe';
import { CHARACTERS, CHARACTER_LOOKS, DEFAULT_LOOK, PALETTE, cleanLook, type CharacterId, type Look } from '../src/scripts/net/profile-data';
import { SKIN_TONES } from '../src/scripts/city3d/crowdlook';
import { describe as describeLook } from '../src/scripts/city3d/lookrows';
import { DEGEN_HEAD, HEAD_ROWS, headGeometry, headModel, type HeadDef } from '../src/scripts/city3d/body';
import { CHARACTER_IDS, characterChain, characterGloves, characterParts, characterPendant, setHeadModel, SMILEX, SMILEX_HEAD, inSmilexBlock, smilex, SLIME, SLIME_EYE_R, SLIME_EYE_Y, SLIME_HEAD, SLIME_MOUTH_Y, slimeEyes, slimeWhale } from '../src/scripts/city3d/heads';
import { newPose, poseSkeleton, weigh, type Influence } from '../src/scripts/city3d/skeleton';
import { dress, inside, posed, shells, type Worn } from './dress';

const SLIMEWHALE: Outfit = {
  ...PLAYER,
  kind: 'hoodie',
  top: '#1f2436',
  character: 'slimewhale',
  skin: '#efc4ae',
  hair: '#8c7b6b',
  // (all of these are left off on his head)
  cap: '#d8312f',
  chain: true,
  hood: true,
  faceGear: 'gasmask',
  face: true,
  shades: true,
  headShape: 'big',
};
const ids = (q: Detail, o: Outfit) =>
  items(q, true)
    .filter((i) => i.when(o))
    .map((i) => i.id);
setHeadModel(headModel);
const part = (q: 2 | 3) => slimeWhale(q);
const each = (gs: THREE.BufferGeometry | THREE.BufferGeometry[], f: (v: THREE.Vector3) => void) => {
  const v = new THREE.Vector3();
  for (const g of Array.isArray(gs) ? gs : [gs]) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) f(v.fromBufferAttribute(p, i));
  }
};

test('heads: before their chunk is in, a character is Degen as he is (never a figure with no head)', () => {
  const worn = ids(3, SLIMEWHALE);
  assert.ok(worn.includes('head') && !worn.some((id) => id.startsWith('character-')));
  useHeads({ ids: CHARACTER_IDS, parts: characterParts, pendant: characterPendant, chain: characterChain, gloves: characterGloves });
});

test('heads: every character has its item; only Degen wears his own head', () => {
  for (const id of CHARACTER_IDS) assert.ok(items(3, true).some((i) => i.id === `character-${id}`), id);
  for (const q of [3, 2, 1, 0] as Detail[]) {
    const degen = ids(q, PLAYER);
    assert.ok(degen.includes('head') && !degen.some((id) => id.startsWith('character-')), `detail ${q}: Degen as he is`);
  }
});

test("heads: SlimeWhale's head on, nothing of Degen's head or over a head", () => {
  for (const q of [3, 2] as Detail[]) {
    const on = ids(q, SLIMEWHALE);
    assert.ok(on.includes('character-slimewhale'), `detail ${q}: his head`);
    for (const id of on) {
      assert.ok(!['head', 'mask', 'features', 'hood', 'cap', 'capPatch'].includes(id), `detail ${q}: ${id} worn on his head`);
      assert.ok(!/^(hair-|shades-|face-|chain-)/.test(id), `detail ${q}: ${id} worn on his head`);
    }
    // (the clothes stay: the hoodie, its hood down)
    assert.ok(on.includes('hoodie'), `detail ${q}: the hoodie`);
    // (as with the same outfit without the head's things: the head changes nothing below the neck)
    const plain = ids(q, { ...PLAYER, kind: 'hoodie', character: 'slimewhale' });
    assert.deepEqual(on, plain, `detail ${q}: the same as an outfit that asked for none of them`);
  }
  // (what's saved is left alone: the outfit itself keeps its cap and chain)
  const h = headless(SLIMEWHALE);
  assert.equal(SLIMEWHALE.cap, '#d8312f');
  assert.equal(h.cap, undefined);
  assert.equal(h.character, 'slimewhale');
});

test('heads: never on the crowd', () => {
  for (const q of [1, 0] as Detail[]) assert.ok(!ids(q, SLIMEWHALE).some((id) => id.startsWith('character-')), `detail ${q}`);
});

test("heads: Degen's head is built as it was", () => {
  // (the head's builder takes any rows now: Degen's own still makes the same head)
  for (const q of [3, 2]) {
    const g = headGeometry(30, q);
    assert.equal(g.attributes.position.count % 30, 2, `detail ${q}: whole rings, closed at both ends`);
    let top = -Infinity;
    each(g, (v) => (top = Math.max(top, v.y)));
    assert.ok(Math.abs(top - HEAD_ROWS[HEAD_ROWS.length - 1][0]) < 1e-6, `detail ${q}: the crown where it was`);
  }
});

test('heads: the neck as Degen’s, down into the collar', () => {
  for (let k = 0; k < 3; k++) assert.deepEqual(SLIME.rowAt(HEAD_ROWS[k][0]), HEAD_ROWS[k], `row ${k}`);
});

test('heads: the three eyes sit on the face, bulging out of it', () => {
  const eyes = slimeEyes();
  assert.equal(eyes.length, 3);
  for (const { centre } of eyes) {
    // (sunk a little: the dome's middle inside the head, its front well out)
    assert.ok(SLIME.inside(centre.x * 0.9, centre.y, centre.z), `the eye at ${centre.x.toFixed(3)}: seated`);
    assert.ok(centre.z + SLIME_EYE_R * 0.5 > SLIME.front(centre.x, centre.y) + 0.01, `the eye at ${centre.x.toFixed(3)}: bulging`);
  }
  // (in a row across the brow, wider together than the face: they bulge past its sides as in the art)
  assert.ok(Math.abs(eyes[0].centre.y - SLIME_EYE_Y) < 1e-9 && Math.abs(eyes[2].centre.y - SLIME_EYE_Y) < 1e-9);
  assert.ok(eyes[2].centre.x + SLIME_EYE_R > SLIME.rowAt(SLIME_EYE_Y)[1]);
});

test('heads: the lips stand off the face, touching it; the ink on the face and features, never inside the head', () => {
  for (const q of [3, 2] as const) {
    const p = part(q);
    // (the lime: the eyes' domes sunk into the brow, the lips' back no deeper than their own thickness, touching it)
    let touch = Infinity;
    each(p.lime, (v) => {
      const off = v.z - SLIME.front(v.x, v.y);
      const lips = Math.abs(v.y - SLIME_MOUTH_Y) < 0.02;
      assert.ok(off > (lips ? -0.015 : -0.03), `detail ${q}: lime ${(off * 1000).toFixed(1)} mm into the face`);
      if (lips) touch = Math.min(touch, off);
    });
    assert.ok(touch < 0.001, `detail ${q}: the lips touch the face (${(touch * 1000).toFixed(1)} mm off)`);
    each(p.ink, (v) => assert.ok(!SLIME.inside(v.x, v.y, v.z - 0.0005), `detail ${q}: ink inside the head at ${v.toArray().map((n) => n.toFixed(3))}`));
  }
});

test('heads: the buzz clear of the head, on the crown, not a hat', () => {
  for (const q of [3, 2] as const) {
    let top = -Infinity;
    let low = Infinity;
    each(part(q).hair, (v) => {
      assert.ok(!SLIME.inside(v.x, v.y, v.z), `detail ${q}: hair inside the head at ${v.toArray().map((n) => n.toFixed(3))}`);
      top = Math.max(top, v.y);
      low = Math.min(low, v.y);
    });
    assert.ok(top > SLIME.top && top < SLIME.top + 0.006, `detail ${q}: close over the crown (${top.toFixed(4)})`);
    assert.ok(low > 0.06, `detail ${q}: down to the nape, no lower`);
  }
});

const POSES: [string, Partial<ReturnType<typeof newPose>>][] = [
  ['rest', {}],
  ['nod down', { headPitch: 0.45 }],
  ['nod', { headPitch: 0.3 }],
  ['look up', { headPitch: -0.4 }],
  ['turn', { headYaw: 0.9 }],
  ['turn and nod', { headYaw: -0.7, headPitch: 0.3 }],
];
/**
 * For each pose, how many of a head's points (above the neck tube, which is meant to run inside the collar) are inside
 * the shells `of` picks, and how high up the head (in its bone's space) the highest of them is
 */
function through(o: Outfit, head: (w: Worn) => boolean, of: (w: Worn) => boolean) {
  const d = dress(o, 2);
  const h = d.worn.find(head)!;
  const sh = d.worn.filter(of);
  const toHead = d.inv.get('head')!;
  const v = new THREE.Vector3();
  const above: number[] = [];
  const y = new Map<number, number>();
  for (let i = 0; i < h.rest.length; i += 3) {
    const hy = v.set(h.rest[i], h.rest[i + 1], h.rest[i + 2]).applyMatrix4(toHead).y;
    if (hy >= 0.012) above.push(i), y.set(i, hy);
  }
  return POSES.map(([name, p]) => {
    poseSkeleton(d.sk, { ...newPose(), ...p });
    d.sk.root.updateMatrixWorld(true);
    const s = shells(sh.map((w) => posed(d, w)));
    const at = posed(d, h);
    const hit = above.filter((i) => inside(s, at[i], at[i + 1], at[i + 2]));
    return { name, n: hit.length, high: Math.max(0, ...hit.map((i) => y.get(i)!)) };
  });
}
/** Every character: its outfit for the checks, its head as functions, and its head's own piece (the first of its item) */
const CHARS: { id: CharacterId; name: string; outfit: Outfit; model: () => ReturnType<typeof headModel>; def: HeadDef }[] = [
  { id: 'slimewhale', name: 'SlimeWhale', outfit: SLIMEWHALE, model: () => SLIME, def: SLIME_HEAD },
  { id: 'smilex', name: 'Smilex', outfit: { ...PLAYER, kind: 'bomber', top: '#6b4428', bottoms: 'denim', bottom: '#3f5f8f', shoeStyle: 'sneaker', shoes: '#c9c7cf', necklace: true, character: 'smilex', cap: undefined }, model: () => SMILEX, def: SMILEX_HEAD },
];
const skullOf = (id: CharacterId) => {
  const first = items(2, true).find((i) => i.id === `character-${id}`)!.pieces[0];
  return (w: Worn) => w.piece === first;
};

test("heads: every character's head clear of every top's collar as he turns and nods", () => {
  assert.deepEqual(
    CHARS.map((c) => c.id),
    CHARACTER_IDS
  );
  for (const c of CHARS)
    for (const kind of ['hoodie', 'tee', 'track', 'puffer', 'suit', 'shell', 'bomber'] as const)
      for (const { name, n } of through({ ...c.outfit, kind }, skullOf(c.id), (w) => w.piece.shell === 'top')) assert.equal(n, 0, `${c.name}, ${kind}, ${name}: ${n} points of his head inside the collar`);
});

/**
 * How high up a head (in its bone's space) its surface goes inside the hood rolled down, for each pose: the head's
 * surface sampled on one fine grid (every 2 mm up, every 5 degrees round) for any head alike, weighted as its mesh is
 */
function hoodReach(o: Outfit, m: ReturnType<typeof headModel>, features: (x: number, y: number) => number) {
  const d = dress(o, 2);
  const restHead = d.sk.j.head.matrixWorld.clone();
  const rest: number[] = [];
  const skin: Influence[] = [];
  const hy: number[] = [];
  const v = new THREE.Vector3();
  for (let y = 0.012; y <= 0.08; y += 0.002) {
    const [, hw, fr, back, zc, n] = m.rowAt(y);
    const e = 2 / n;
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** e * hw;
      const w = Math.abs(s) ** e;
      v.set(x, y, s >= 0 ? zc + fr * w + features(x, y) * w ** 4 : zc - back * w).applyMatrix4(restHead);
      rest.push(v.x, v.y, v.z);
      skin.push(weigh('head', v.x, v.y, v.z));
      hy.push(y);
    }
  }
  const pts: Worn = { piece: d.worn[0].piece, item: 'surface', rest: Float32Array.from(rest), skin };
  const roll = d.worn.filter((w) => w.item === 'hoodDown');
  return POSES.map(([name, p]) => {
    poseSkeleton(d.sk, { ...newPose(), ...p });
    d.sk.root.updateMatrixWorld(true);
    const sh = shells(roll.map((w) => posed(d, w)));
    const at = posed(d, pts);
    let high = 0;
    for (let i = 0; i < hy.length; i++) if (inside(sh, at[i * 3], at[i * 3 + 1], at[i * 3 + 2])) high = Math.max(high, hy[i]);
    return { name, high };
  });
}

test("heads: every character's head in the hood down no deeper than Degen's chin goes", () => {
  // (a deep nod tucks Degen's own chin into the rolled hood: a character's head may do as much, no more)
  const degen = hoodReach({ ...PLAYER, kind: 'hoodie', cap: undefined, face: true }, headModel(DEGEN_HEAD), DEGEN_HEAD.features);
  for (const c of CHARS) {
    const his = hoodReach({ ...c.outfit, kind: 'hoodie' }, c.model(), c.def.features);
    if (process.env.HEADS_REPORT) console.log(c.name, his.map((s, i) => `${s.name} ${s.high.toFixed(3)} / ${degen[i].high.toFixed(3)}`).join('; '));
    his.forEach(({ name, high }, i) => assert.ok(high <= degen[i].high + 0.002, `${c.name}, ${name}: in the hood ${(high * 1000).toFixed(0)} mm up his head, Degen's chin ${(degen[i].high * 1000).toFixed(0)} mm`));
  }
});

test('heads: every character inside the figure’s budget', () => {
  const BUDGET = { 3: 40_000, 2: 18_000 } as const;
  for (const c of CHARS)
    for (const q of [3, 2] as const)
      for (const kind of ['hoodie', 'puffer', 'suit', 'bomber'] as const) {
        const d = dress({ ...c.outfit, kind, backpack: '#3a7', watch: true, necklace: true, headphones: '#222' }, q);
        const tris = d.worn.reduce((n, w) => n + w.rest.length / 9, 0);
        assert.ok(tris <= BUDGET[q], `${c.name}, detail ${q}, ${kind}: ${tris} triangles`);
      }
});

/* ----- Smilex (Phase 1 for him: in the lab) ----- */

const SMILEX_OUTFIT = CHARS[1].outfit;

test("heads: Smilex's hexagon: flat top and bottom, pointed sides, his neck Degen's", () => {
  const M = SMILEX;
  for (let k = 0; k < 3; k++) assert.deepEqual(M.rowAt(HEAD_ROWS[k][0]), HEAD_ROWS[k], `row ${k}`);
  const hw = (y: number) => M.rowAt(y)[1];
  // (widest at the middle, the sides straight: half as wide at the flats, linear between)
  const mid = SMILEX_HEAD.rows.reduce((a, r) => (r[1] > a[1] ? r : a))[0];
  assert.ok(hw(mid) > 0.12 && hw(mid) < 0.15, `${hw(mid)}`);
  const q1 = mid - 0.05;
  const q2 = mid - 0.1;
  assert.ok(Math.abs(hw(mid) - hw(q1) - (hw(q1) - hw(q2))) < 0.002, 'straight sides');
  // (his head above the collar like Degen's: nothing below the neck tube wider than the neck)
  assert.ok(hw(-0.008) < 0.05);
});

test("heads: Smilex's smile and eyes on the flat of his face, never inside his head", () => {
  for (const q of [3, 2] as const) {
    const s = smilex(q);
    let n = 0;
    each(s.ink, (v) => {
      n++;
      assert.ok(!SMILEX.inside(v.x, v.y, v.z - 0.0004), `detail ${q}: ink inside the head at ${v.toArray().map((x) => x.toFixed(3))}`);
      assert.ok(v.z - SMILEX.front(v.x, v.y) < 0.004, `detail ${q}: ink off his face`);
      // (the border runs just inside the face's edge; nothing round onto the sides)
      assert.ok(Math.abs(v.x) < SMILEX.rowAt(v.y)[1] * 0.92, `detail ${q}: ink round the edge at x ${v.x.toFixed(3)}`);
    });
    assert.ok(n > 0);
  }
});

test("heads: Smilex's block edges inked: thin lines on the block's rounded edges, none floating or sunk, joined at the corners", () => {
  for (const q of [3, 2] as const) {
    const edges = smilex(q).edges;
    // (18 lines round the face, round the back and down the corners' walls, 12 over the rounded edges, 24 balls)
    assert.equal(edges.length, 6 * 5 + 24, `detail ${q}`);
    const mid = SMILEX_HEAD.rows.reduce((a, r) => (r[1] > a[1] ? r : a));
    const c = new THREE.Vector3(0, mid[0], mid[4]);
    const d = new THREE.Vector3();
    let thick = 0;
    each(edges, (v) => {
      // (a step in towards the block's middle is inside it, a step out isn't: the lines hug its edges)
      d.subVectors(v, c).normalize();
      const inP = v.clone().addScaledVector(d, -0.009);
      const outP = v.clone().addScaledVector(d, 0.009);
      assert.ok(inSmilexBlock(inP.x, inP.y, inP.z), `detail ${q}: an edge line floating at ${v.toArray().map((n) => n.toFixed(3))}`);
      assert.ok(!inSmilexBlock(outP.x, outP.y, outP.z), `detail ${q}: an edge line sunk at ${v.toArray().map((n) => n.toFixed(3))}`);
    });
    // (thin: every line's radius under 3 mm)
    for (const g of edges) {
      g.computeBoundingBox();
      const s3 = g.boundingBox!.getSize(new THREE.Vector3());
      thick = Math.max(thick, Math.min(s3.x, s3.y, s3.z));
    }
    assert.ok(thick < 0.006, `detail ${q}: ${thick}`);
  }
  // (every line ends on a ball: the corners meet exactly)
  const e = smilex(3).edges;
  const balls = e.filter((g) => g.type === 'SphereGeometry').map((g) => {
    g.computeBoundingBox();
    return g.boundingBox!.getCenter(new THREE.Vector3());
  });
  for (const g of e.filter((g2) => g2.type === 'CylinderGeometry')) {
    const p = g.attributes.position;
    // (the tube's two ends, its first and last rings: each ring's middle is a ball's middle)
    // (a ring repeats its first point at the seam: left out of the average)
    const ring = (from: number) => {
      const m = new THREE.Vector3();
      const n = ((p.count / 2) | 0) - 1;
      for (let i = from; i < from + n; i++) m.add(new THREE.Vector3().fromBufferAttribute(p, i));
      return m.divideScalar(n);
    };
    for (const end of [ring(0), ring(p.count - ((p.count / 2) | 0))]) assert.ok(balls.some((b) => b.distanceTo(end) < 1e-4), `a line end off its corner at ${end.toArray().map((n) => n.toFixed(4))}`);
  }
});

test("heads: Smilex's eyes and smile stay in front of his face as he nods and turns (never buried in the block)", () => {
  const d = dress(SMILEX_OUTFIT, 3);
  const item = items(3, true).find((i) => i.id === 'character-smilex')!;
  const block = d.worn.find((w) => w.piece === item.pieces[0])!;
  const ink = d.worn.find((w) => w.piece === item.pieces[2])!;
  for (const [name, p] of POSES) {
    poseSkeleton(d.sk, { ...newPose(), ...p });
    d.sk.root.updateMatrixWorld(true);
    const sh = shells([posed(d, block)]);
    const at = posed(d, ink);
    let buried = 0;
    for (let i = 0; i < at.length; i += 3) if (inside(sh, at[i], at[i + 1], at[i + 2])) buried++;
    assert.equal(buried, 0, `${name}: ${buried} points of his face's ink inside the block`);
  }
});

test("heads: Smilex's chain is curb links along the necklace's path, his gloves stitched", () => {
  const d = dress(SMILEX_OUTFIT, 3);
  const gold = d.worn.find((w) => w.item === 'necklace-smilex-bomber' && w.piece.color === '#e2b04a' && w.rest.length / 9 > 1500)!;
  assert.ok(gold, 'the chain');
  const plain = dress({ ...SMILEX_OUTFIT, character: undefined }, 3).worn.find((w) => w.item === 'necklace-bomber')!;
  assert.ok(gold.rest.length > plain.rest.length, 'links, not the cord');
  const lines = d.worn.filter((w) => w.item === 'gloves-smilex' && w.piece.color === '#16141f');
  assert.equal(lines.length, 2, 'stitch lines on both gloves');
});

test('heads: Smilex wears white gloves and the PulseChain pendant; everyone else as before', () => {
  for (const q of [3, 2] as Detail[]) {
    const on = ids(q, SMILEX_OUTFIT);
    assert.ok(on.includes('character-smilex') && on.includes('gloves-smilex') && !on.includes('fingers'), `detail ${q}: ${on.join(' ')}`);
    assert.ok(on.includes('necklace-smilex-bomber') && !on.includes('necklace-bomber'), `detail ${q}: ${on.join(' ')}`);
    const degen = ids(q, { ...SMILEX_OUTFIT, character: undefined });
    assert.ok(degen.includes('fingers') && !degen.some((id) => id.startsWith('gloves-')) && degen.includes('necklace-bomber'), `detail ${q}: ${degen.join(' ')}`);
    // (SlimeWhale's own hands and the diamond)
    const slime = ids(q, { ...SLIMEWHALE, necklace: true });
    assert.ok(slime.includes('fingers') && slime.includes('necklace-hoodie'), `detail ${q}: ${slime.join(' ')}`);
  }
  // (no chain under the high collars, as Degen's: the puffer, the vest, the shell)
  assert.ok(!ids(3, { ...SMILEX_OUTFIT, kind: 'puffer' }).some((id) => id.startsWith('necklace-')));
});

test("heads: Smilex's pendant lies on his top, clear of it, centred on his chest", () => {
  for (const kind of ['bomber', 'hoodie', 'tee', 'suit', 'track'] as const) {
    const d = dress({ ...SMILEX_OUTFIT, kind }, 2);
    const top = shells(d.worn.filter((w) => w.piece.shell === 'top').map((w) => w.rest));
    const pend = d.worn.filter((w) => w.item === `necklace-smilex-${kind}` && w.piece.color !== '#e2b04a');
    assert.ok(pend.length >= 5, kind);
    let xs = 0;
    let n = 0;
    for (const w of pend)
      for (let i = 0; i < w.rest.length; i += 3) {
        assert.ok(!inside(top, w.rest[i], w.rest[i + 1], w.rest[i + 2]), `${kind}: the pendant inside the top`);
        xs += w.rest[i];
        n++;
      }
    assert.ok(Math.abs(xs / n) < 0.005, `${kind}: off centre`);
  }
});

/* ----- Phase 2: worn from the look ----- */

test('heads: every character the look offers has a head (the heads chunk may have one in the lab ahead of it)', () => {
  for (const c of CHARACTERS) assert.ok(CHARACTER_IDS.includes(c.id), c.id);
  // (made-up names, short enough for a card)
  for (const c of CHARACTERS) assert.ok(c.name.length <= 14, c.name);
});

test('heads: cleanLook keeps a character, and Degen for a look from before or one it doesn’t know', () => {
  assert.equal(cleanLook({}).character, null);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, character: undefined }).character, null);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, character: 'nobody' }).character, null);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, character: 42 }).character, null);
  assert.equal(cleanLook({ ...DEFAULT_LOOK, character: 'slimewhale' }).character, 'slimewhale');
  assert.equal(DEFAULT_LOOK.character, null);
  // (the hat, shades and chain under it stay saved: back as Degen, they're on again)
  const l = cleanLook({ ...DEFAULT_LOOK, character: 'slimewhale' });
  assert.equal(l.hat, DEFAULT_LOOK.hat);
  assert.equal(l.chain, DEFAULT_LOOK.chain);
  // (cleaned once is clean)
  assert.deepEqual(cleanLook(l), l);
});

test('heads: every character’s whole look survives cleaning as it is (its colours are swatches)', () => {
  for (const c of CHARACTERS) {
    const preset = CHARACTER_LOOKS[c.id];
    assert.equal(preset.character, c.id);
    const l = cleanLook({ ...DEFAULT_LOOK, ...preset });
    for (const [k, v] of Object.entries(preset)) assert.equal(l[k as keyof Look], v, `${c.id}: ${k}`);
    assert.ok(PALETTE.tone.includes(l.tone) && PALETTE.hair.includes(l.hair), c.id);
  }
});

test('heads: the crowd keeps its twelve skin tones (the players’ swatch for SlimeWhale re-seeds nobody)', () => {
  assert.deepEqual([...SKIN_TONES], ['#f7e0cc', '#f1d2b6', '#e8c39e', '#dcae86', '#d29f78', '#c99068', '#b07650', '#a06640', '#8f5a3a', '#6e4129', '#52301f', '#3f2418']);
  assert.ok(!SKIN_TONES.includes(CHARACTER_LOOKS.slimewhale.tone!));
});

test('heads: lookOutfit wears the character, its buzz in the look’s hair colour, nothing over its head', () => {
  const look = cleanLook({ ...DEFAULT_LOOK, ...CHARACTER_LOOKS.slimewhale, hat: 'cap', chain: true, faceGear: 'gasmask' });
  const o = lookOutfit(look);
  assert.equal(o.character, 'slimewhale');
  assert.equal(o.hair, look.hair);
  assert.equal(o.skin, look.tone);
  for (const q of [3, 2] as Detail[]) {
    const on = ids(q, o);
    assert.ok(on.includes('character-slimewhale') && on.includes('hoodie') && on.includes('joggers') && on.includes('sneakers'), `detail ${q}: ${on.join(' ')}`);
    assert.ok(!on.some((id) => /^(head|mask|features|cap|hair-|shades-|face-|chain-)/.test(id)), `detail ${q}: ${on.join(' ')}`);
  }
  // (back as Degen: his cap and gas mask again; without the mask, his shades and their chain)
  const back = ids(3, lookOutfit({ ...look, character: null }));
  assert.ok(back.includes('head') && back.includes('cap') && back.includes('face-gasmask'), back.join(' '));
  const bare = ids(3, lookOutfit({ ...look, character: null, faceGear: null }));
  assert.ok(bare.includes('shades-classic') && bare.some((id) => id.startsWith('chain-')), bare.join(' '));
});

test('heads: the character screen names him, nothing on his head or eyes', () => {
  const rows = new Map(describeLook(cleanLook({ ...DEFAULT_LOOK, ...CHARACTER_LOOKS.slimewhale, hat: 'cap', faceGear: 'gasmask' })).map(([k, v, c]) => [k, { v, c }]));
  assert.equal(rows.get('Face')!.v, 'SlimeWhale');
  assert.equal(rows.get('Face')!.c.length, 2);
  assert.equal(rows.get('Head')!.v, 'Nothing');
  assert.equal(rows.get('Eyewear')!.v, 'None');
  assert.equal(rows.get('Gear')!.v, 'Nothing');
  assert.ok(!rows.get('Extras')!.v.includes('Shades Chain'));
});

/* ----- Smilex, Phase 2: worn from the look ----- */

test('heads: Smilex worn from the look: his head, gloves, chain and pendant, the Sector 7 mark; nothing over his head', () => {
  assert.ok(CHARACTERS.some((c) => c.id === 'smilex'));
  const look = cleanLook({ ...DEFAULT_LOOK, ...CHARACTER_LOOKS.smilex, hat: 'cap', faceGear: 'gasmask', chain: true });
  assert.equal(look.character, 'smilex');
  assert.equal(look.mark, 'seven');
  const o = lookOutfit(look);
  assert.equal(o.character, 'smilex');
  assert.equal(gloveColour(o), characterGloves('smilex'));
  assert.equal(gloveColour(lookOutfit({ ...look, character: null })), null);
  assert.equal(gloveColour(lookOutfit({ ...look, character: 'slimewhale' })), null);
  for (const q of [3, 2] as Detail[]) {
    const on = ids(q, o);
    for (const id of ['character-smilex', 'gloves-smilex', 'necklace-smilex-bomber', 'bomber', 'denim', 'sneakers']) assert.ok(on.includes(id), `detail ${q}: ${id} in ${on.join(' ')}`);
    assert.ok(!on.some((id) => /^(head|mask|features|cap|fingers|hair-|shades-|face-|chain-)$|^(hair-|shades-|face-|chain-)/.test(id)), `detail ${q}: ${on.join(' ')}`);
    assert.ok(on.some((id) => id.startsWith('mark-')), `detail ${q}: the chest mark`);
  }
});

test('heads: the character screen names Smilex, his skin only (no hair)', () => {
  const rows = new Map(describeLook(cleanLook({ ...DEFAULT_LOOK, ...CHARACTER_LOOKS.smilex })).map(([k, v, c]) => [k, { v, c }]));
  assert.equal(rows.get('Face')!.v, 'Smilex');
  assert.equal(rows.get('Face')!.c.length, 1);
  assert.equal(rows.get('Head')!.v, 'Nothing');
  // (his necklace carries the PulseChain pendant, not the diamond)
  assert.ok(rows.get('Extras')!.v.includes('Gold Chain') && !rows.get('Extras')!.v.includes('Diamond'));
});
