// The characters' heads (docs/characters-plan.md): SlimeWhale's head on Degen's body. Degen's own head, the hats,
// the shades, the face gear and the hood up are off while it's on (whatever the outfit says), only on single
// figures; the eyes and lips seated on the face, the ink on them, the buzz clear of the head; the neck as Degen's,
// the jaw clear of every top's collar as the head turns and nods; the figure inside its budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { headless, items, PLAYER, useHeads, type Detail, type Outfit } from '../src/scripts/city3d/wardrobe';
import { DEGEN_HEAD, HEAD_ROWS, headGeometry, headModel } from '../src/scripts/city3d/body';
import { CHARACTER_IDS, characterParts, setHeadModel, SLIME, SLIME_EYE_R, SLIME_EYE_Y, SLIME_HEAD, SLIME_MOUTH_Y, slimeEyes, slimeWhale } from '../src/scripts/city3d/heads';
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
  useHeads({ ids: CHARACTER_IDS, parts: characterParts });
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
const slimeSkull = (w: Worn) => w.item === 'character-slimewhale' && w.piece.color === 'skin' && !w.piece.shade;

test("heads: SlimeWhale's jaw clear of every top's collar as he turns and nods", () => {
  for (const kind of ['hoodie', 'tee', 'track', 'puffer', 'suit', 'shell'] as const)
    for (const { name, n } of through({ ...SLIMEWHALE, kind }, slimeSkull, (w) => w.piece.shell === 'top')) assert.equal(n, 0, `${kind}, ${name}: ${n} points of his jaw inside the collar`);
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

test("heads: SlimeWhale's jaw in the hood down no deeper than Degen's chin goes", () => {
  // (a deep nod tucks Degen's own chin into the rolled hood: SlimeWhale's square jaw may do as much, no more)
  const degen = hoodReach({ ...PLAYER, kind: 'hoodie', cap: undefined, face: true }, headModel(DEGEN_HEAD), DEGEN_HEAD.features);
  const slime = hoodReach({ ...SLIMEWHALE, kind: 'hoodie' }, SLIME, SLIME_HEAD.features);
  if (process.env.HEADS_REPORT) console.log(slime.map((s, i) => `${s.name} ${s.high.toFixed(3)} / ${degen[i].high.toFixed(3)}`).join("; "));
  slime.forEach(({ name, high }, i) => assert.ok(high <= degen[i].high + 0.002, `${name}: his jaw in the hood ${(high * 1000).toFixed(0)} mm up his head, Degen's chin ${(degen[i].high * 1000).toFixed(0)} mm`));
});

test('heads: SlimeWhale inside the figure’s budget', () => {
  const BUDGET = { 3: 40_000, 2: 18_000 } as const;
  for (const q of [3, 2] as const)
    for (const kind of ['hoodie', 'puffer', 'suit'] as const) {
      const d = dress({ ...SLIMEWHALE, kind, backpack: '#3a7', watch: true, necklace: true, headphones: '#222' }, q);
      const tris = d.worn.reduce((n, w) => n + w.rest.length / 9, 0);
      assert.ok(tris <= BUDGET[q], `detail ${q}, ${kind}: ${tris} triangles`);
    }
});
