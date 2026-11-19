// The whole wardrobe, any look (docs/wardrobe-plan.md Phase 1): random looks, in any colour, cleaned as the game
// server cleans them, dressed on the single figure at the desktop's and the phone's detail. Every one builds, every
// point is a number, nothing retired is worn, nothing is in his hand, the colours go on as picked (held under white)
// and the figure stays inside its budget of triangles (`BUDGET`; WARDROBE_REPORT=1 prints the most).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAGS, BOTTOMS, CUT_IDS, EYE_IDS, FACE_IDS, HATS, PALETTE, KINDS, coversEyes, MARK_IDS, PATTERN_IDS, SHOE_STYLES, SLOT_IDS, cleanLook, safeColour, type Look } from '../src/scripts/net/profile-data';
import { bottomsOf, lookOutfit, shoesOf } from '../src/scripts/city3d/wardrobe';
import { dress } from './dress';

/** A seeded generator (the same looks every run) */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random look as a player could send it: any colour (some brighter than white allows), any piece, sometimes none */
function randomLook(r: () => number): Record<string, unknown> {
  const pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const hex = () => '#' + Array.from({ length: 3 }, () => Math.floor(r() * 256).toString(16).padStart(2, '0')).join('');
  return {
    kind: pick(KINDS),
    top: hex(),
    bottoms: pick(BOTTOMS),
    bottom: hex(),
    tie: hex(),
    shirt: hex(),
    shoeStyle: pick(SHOE_STYLES),
    shoes: r() < 0.1 ? '#ffffff' : hex(),
    hat: r() < 0.2 ? null : pick(HATS),
    hatColor: hex(),
    hood: r() < 0.3,
    eyewear: pick(EYE_IDS),
    faceGear: r() < 0.4 ? pick(FACE_IDS) : null,
    // (the faces plan's: unmasked about half the time, any cut, tone and hair from the palettes, the shades on or off)
    face: r() < 0.5,
    cut: pick(CUT_IDS),
    tone: pick(PALETTE.tone),
    hair: pick(PALETTE.hair),
    shades: r() < 0.5,
    gear: hex(),
    frame: hex(),
    lens: hex(),
    bag: r() < 0.3 ? null : pick(BAGS),
    bagColor: hex(),
    headphones: r() < 0.5 ? null : hex(),
    chain: r() < 0.5,
    necklace: r() < 0.5,
    watch: r() < 0.5,
    mark: r() < 0.3 ? null : pick(MARK_IDS),
    markAt: pick(SLOT_IDS),
    ink: hex(),
    hatMark: pick(MARK_IDS),
    shoeMark: r() < 0.5 ? null : pick(MARK_IDS),
    pattern: pick(PATTERN_IDS),
    // (a look from before the wardrobe plan could still carry these: they're dropped)
    held: pick(['coffee', 'boombox', 'phone', 'briefcase', null]),
  };
}

const RETIRED = ['crown', 'cowboy', 'tophat', 'halo', 'coffee', 'boombox', 'phone', 'briefcase', 'shopping'];
/**
 * A single figure's most triangles, whatever he wears: the worst of these looks measured 38.9k on the desktop and 17.7k
 * on phones (19 November 2026, with the coach jacket, the vest, the tee and the shorts in the draw: the puffer's
 * quilting seams left open at their hidden ends to stay under it), each held here with a little room, so a new piece
 * that would make him heavier says so
 */
const BUDGET = { 3: 40_000, 2: 18_000 } as const;
const LOOKS = 60;

for (const q of [3, 2] as const) {
  test(`any look builds on the single figure (detail ${q}): numbers only, nothing retired, nothing in the hand, inside the budget`, () => {
    const r = seeded(0x5e7 + q);
    let most = 0;
    for (let n = 0; n < LOOKS; n++) {
      const raw = randomLook(r);
      const look: Look = cleanLook(raw);
      // (cleaned once is clean: the server and the browser agree)
      assert.deepEqual(cleanLook(look), look);
      for (const k of ['top', 'bottom', 'tie', 'shirt', 'frame', 'gear', 'shoes', 'hatColor', 'lens', 'bagColor', 'ink'] as const) assert.equal(look[k], safeColour(raw[k]), k);
      const o = lookOutfit(look);
      assert.equal(o.held, undefined, 'nothing in his hand');
      // (the separates as picked: one bottoms, one pair of shoes; coveralls bring their own legs)
      const legs = look.kind === 'coveralls' ? null : look.bottoms;
      assert.deepEqual([bottomsOf(o), shoesOf(o)], [legs, look.shoeStyle]);
      const d = dress(o, q);
      const ids = new Set(d.worn.map((w) => w.item));
      assert.equal(ids.has('trousers'), legs === 'trousers');
      assert.equal(ids.has('joggers'), legs === 'joggers' || legs === 'trackpants');
      assert.equal(ids.has('cargoPants'), legs === 'cargo');
      assert.equal(ids.has('trackStripes'), legs === 'trackpants');
      assert.equal(ids.has('shorts'), legs === 'shorts');
      assert.equal(ids.has('denim'), legs === 'denim');
      assert.equal(ids.has('runners'), look.shoeStyle === 'runner');
      assert.equal(ids.has('slides'), look.shoeStyle === 'slide');
      assert.equal(ids.has('workPants'), legs === 'work');
      assert.equal(ids.has('workBoots'), look.shoeStyle === 'boot');
      assert.equal(ids.has('chinos'), legs === 'chinos');
      assert.equal(ids.has('loafers'), look.shoeStyle === 'loafer');
      assert.equal(ids.has('derbies'), look.shoeStyle === 'derby');
      assert.equal(ids.has('dressShoes'), look.shoeStyle === 'dress');
      assert.equal(ids.has('sneakers'), look.shoeStyle === 'sneaker');
      // (one pair of shades, the look's, unless face gear is worn in their place; the face gear if any)
      assert.deepEqual([...ids].filter((id) => id.startsWith('shades-')), coversEyes(look.faceGear) || (look.face && !look.shades) ? [] : [`shades-${look.eyewear}`]);
      assert.deepEqual([...ids].filter((id) => id.startsWith('face-')), look.faceGear ? [`face-${look.faceGear}`] : []);
      let tris = 0;
      for (const w of d.worn) {
        assert.ok(!RETIRED.includes(w.item) && !w.item.startsWith('wings-'), `${w.item} is retired`);
        assert.equal(w.rest.length % 9, 0, `${w.item}: whole triangles`);
        for (const x of w.rest) assert.ok(Number.isFinite(x), `${w.item}: a point that isn't a number`);
        tris += w.rest.length / 9;
      }
      most = Math.max(most, tris);
      assert.ok(tris <= BUDGET[q], `look ${n} (${look.kind}, ${look.hat}, ${look.bag}): ${tris} triangles`);
      // (the colours he wears are the look's, so a picked colour shows as picked)
      assert.equal(o.top, look.top);
      assert.equal(o.bottom, look.bottom);
      assert.equal(o.shoes, look.shoes);
      assert.equal(o.lens, look.lens);
    }
    if (process.env.WARDROBE_REPORT) console.log(`detail ${q}: at most ${most} triangles over ${LOOKS} looks`);
  });
}

/*
 * The dark-outfit fix (docs/wardrobe-plan.md Phase 5): a detail's shade (ribbing, a pocket, a seam, a lapel) is the
 * old linear multiply on every mid and light colour, exactly; on near-black cloth a darker shade lifts it toward grey
 * and a lighter one lifts it more, so a black fit still shows its seams.
 */
test('details on near-black cloth show; on every other colour they shade as they always did', async () => {
  const THREE = await import('three');
  const { shadeRGB, DARK } = await import('../src/scripts/city3d/wardrobe');
  const seen = (hex: string) => new THREE.Color(hex).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
  const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // As before on mid and light colours: the colour's light times the shade
  for (const hex of ['#d0463e', '#3f73c8', '#f3f2f7', '#c8b58a', '#1f9d6a', '#8f3dff', '#ffd23f', '#1d2550', '#2a2350', '#3a2418', '#4a4a5a'])
    for (const s of [0.55, 0.72, 0.8, 0.88, 1.2, 1.45]) {
      const c = seen(hex);
      const was = new THREE.Color(hex).multiplyScalar(s).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
      const now = shadeRGB(c.r, c.g, c.b, s);
      for (const [a, b] of [[now[0], Math.min(1, was.r)], [now[1], Math.min(1, was.g)], [now[2], Math.min(1, was.b)]]) assert.ok(Math.abs(a - b) < 1 / 255, `${hex} at ${s}: ${a} for ${b}`);
    }
  // On near-black (Degen's own black, the frames' black, the darkest swatches) a detail stands clear of its cloth
  for (const hex of ['#16141f', '#0d0c14', '#1b1830', '#000000', '#14121f']) {
    const c = seen(hex);
    const cloth = lum([c.r, c.g, c.b]);
    assert.ok(cloth < DARK.at, hex);
    for (const s of [0.55, 0.72, 0.8, 0.88]) assert.ok(lum(shadeRGB(c.r, c.g, c.b, s)) - cloth > 0.03, `${hex} at ${s}: a darker detail shows lighter`);
    for (const s of [1.2, 1.45]) assert.ok(lum(shadeRGB(c.r, c.g, c.b, s)) - cloth > 0.02, `${hex} at ${s}: a lighter detail shows`);
    // (the more a detail was meant to stand off, the more it does)
    assert.ok(lum(shadeRGB(c.r, c.g, c.b, 0.55)) > lum(shadeRGB(c.r, c.g, c.b, 0.88)));
  }
  // (the dark-but-not-black swatches keep the old darkening, which shows on them: navy's ribbing a tenth darker or more)
  for (const hex of ['#1d2550', '#2a2350', '#3a2418']) {
    const c = seen(hex);
    assert.ok(lum([c.r, c.g, c.b]) - lum(shadeRGB(c.r, c.g, c.b, 0.8)) > 0.012, hex);
  }
  // Never past white
  for (const v of shadeRGB(0.95, 0.95, 0.95, 1.45)) assert.ok(v <= 1);
});
