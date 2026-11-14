// The whole wardrobe, any look (docs/wardrobe-plan.md Phase 1): random looks, in any colour, cleaned as the game
// server cleans them, dressed on the single figure at the desktop's and the phone's detail. Every one builds, every
// point is a number, nothing retired is worn, nothing is in his hand, the colours go on as picked (held under white)
// and the figure stays inside its budget of triangles (`BUDGET`; WARDROBE_REPORT=1 prints the most).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAGS, HATS, KINDS, MARK_IDS, PATTERN_IDS, SLOT_IDS, cleanLook, safeColour, type Look } from '../src/scripts/net/profile-data';
import { lookOutfit } from '../src/scripts/city3d/wardrobe';
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
    bottom: hex(),
    tie: hex(),
    shoes: r() < 0.1 ? '#ffffff' : hex(),
    hat: r() < 0.2 ? null : pick(HATS),
    hatColor: hex(),
    hood: r() < 0.3,
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
 * A single figure's most triangles, whatever he wears: the worst of these looks measured 38.2k on the desktop and 16.8k
 * on phones (14 November 2026, with the merch and the suit's tailoring), each held here with a little room, so a new
 * piece that would make him heavier says so
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
      for (const k of ['top', 'bottom', 'tie', 'shoes', 'hatColor', 'lens', 'bagColor', 'ink'] as const) assert.equal(look[k], safeColour(raw[k]), k);
      const o = lookOutfit(look);
      assert.equal(o.held, undefined, 'nothing in his hand');
      const d = dress(o, q);
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
