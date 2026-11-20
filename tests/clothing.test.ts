// The clothes don't clip (docs/clothing-plan.md, tests/clothing.ts): the bottoms over every shoe, the hood up over the
// hoodie and the headphones on each top's collar, through the poses the game plays. CLOTHING_REPORT=1 prints the worst of each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER } from '../src/scripts/city3d/wardrobe';
import { BOTTOMS, SHOE_STYLES } from '../src/scripts/net/profile-data';
import { distance, dress, inside, posed, shells } from './dress';
import { each, OUTFITS, report, TOL } from './clothing';

/*
 * The bottoms over the shoes (docs/wardrobe-plan.md Phases 2 and 5): every bottoms with every shoe. A leg is cut to go
 * down into the shoe's opening (the cloth there is inside the upper, out of sight); what mustn't happen is the cloth
 * that hangs clear of the shoe at rest sinking into it as he moves, so the shoe shows through. When the separates came
 * in it went up to 0.034 at the ankle as the foot flexed, in the pairings the clothes were built in too; since the
 * cuff's last few centimetres ride partly with the foot (skeleton.ts, Phase 5) no pairing goes past `ANKLE` (the
 * worst, measured: the trousers over sneakers at a still crouch, 0.0082). Only the legs' lowest part is looked at.
 */
const ANKLE = 0.009;
for (const q of [2, 3] as const)
  for (const bottoms of [...BOTTOMS, 'coveralls'] as const)
    for (const shoeStyle of SHOE_STYLES)
      test(`clothes: the ${bottoms} over ${shoeStyle} shoes: no deeper into the shoe than the clothes were built (detail ${q})`, () => {
        // (the coveralls' own legs, as any bottoms)
        const d = dress(bottoms === 'coveralls' ? { ...PLAYER, kind: 'coveralls', shoeStyle } : { ...PLAYER, kind: 'hoodie', bottoms, shoeStyle }, q);
        const legs = d.worn.filter((w) => w.piece.shell === 'bottom');
        const shoes = d.worn.filter((w) => w.piece.shell === 'shoe');
        assert.ok(legs.length && shoes.length);
        const atRest = shells(shoes.map((w) => w.rest));
        // (the legs' points within 16 cm of the ground and clear of the shoe at rest)
        const clear = legs.map((w) => Array.from({ length: w.rest.length / 3 }, (_, i) => i).filter((i) => w.rest[i * 3 + 1] < 0.16 && !inside(atRest, w.rest[i * 3], w.rest[i * 3 + 1], w.rest[i * 3 + 2])));
        assert.ok(clear.some((l) => l.length), 'the legs reach down to the shoes');
        let worst = { d: 0, at: '' };
        each(d, (name) => {
          const sh = shells(shoes.map((w) => posed(d, w)));
          legs.forEach((w, k) => {
            const p = posed(d, w);
            for (const i of clear[k]) {
              const [x, y, z] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
              if (!inside(sh, x, y, z)) continue;
              const dd = distance(sh, x, y, z).d;
              if (dd > worst.d) worst = { d: dd, at: name };
            }
          });
        });
        if (report) console.log(`${bottoms} / ${shoeStyle} q${q}: deepest ${(worst.d * 1000).toFixed(1)} (thousandths) at ${worst.at}`);
        assert.ok(worst.d <= ANKLE, `the ${bottoms} go ${(worst.d * 1000).toFixed(1)} thousandths into the ${shoeStyle} shoes at ${worst.at}`);
      });

/*
 * The hood up (docs/wardrobe-plan.md Phase 3) rests on the hoodie's shoulders: through every pose, none of the hood's
 * cloth that's clear of the hoodie at rest sinks into it (the hood's foot rides the chest, its crown the head).
 */
for (const q of [2, 3] as const)
  test(`clothes: the hood up never sinks into the hoodie (detail ${q})`, () => {
    const d = dress({ ...PLAYER, kind: 'hoodie', hood: true, cap: undefined }, q);
    const hood = d.worn.filter((w) => w.item === 'hoodUp');
    const body = d.worn.filter((w) => w.piece.shell === 'top');
    assert.ok(hood.length && body.length);
    const rest = shells(body.map((w) => w.rest));
    const clear = hood.map((w) => Array.from({ length: w.rest.length / 3 }, (_, i) => i).filter((i) => !inside(rest, w.rest[i * 3], w.rest[i * 3 + 1], w.rest[i * 3 + 2])));
    let worst = { d: 0, at: '' };
    each(d, (name) => {
      const sh = shells(body.map((w) => posed(d, w)));
      hood.forEach((w, k) => {
        const p = posed(d, w);
        for (const i of clear[k]) {
          const [x, y, z] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
          if (!inside(sh, x, y, z)) continue;
          const dd = distance(sh, x, y, z).d;
          if (dd > worst.d) worst = { d: dd, at: name };
        }
      });
    });
    if (report) console.log(`hood q${q}: deepest into the hoodie ${(worst.d * 1000).toFixed(1)} (thousandths) at ${worst.at}`);
    assert.ok(worst.d <= TOL, `the hood goes ${(worst.d * 1000).toFixed(1)} thousandths into the hoodie at ${worst.at}`);
  });

/*
 * The headphones round the neck rest on each top's collar (docs/wardrobe-plan.md Phase 5, `fitPhones()`): at rest none
 * of them is in the top's body (its closed shell); the high collars (the puffer's, the vest's, the shell's) cover them.
 */
for (const q of [2, 3] as const)
  test(`clothes: the headphones rest on every top's collar, none in its cloth (detail ${q})`, () => {
    for (const o of OUTFITS.filter((x) => x.kind !== 'soldier' && (x.bottoms === 'joggers' || x.kind === 'coveralls'))) {
      const d = dress({ ...o, headphones: '#ff0000', chain: false }, q);
      const hp = d.worn.filter((w) => w.item.startsWith('headphones'));
      if (['puffer', 'vest', 'shell'].includes(o.kind)) {
        assert.equal(hp.length, 0, `${o.kind}: under its collar`);
        continue;
      }
      assert.ok(hp.length, `${o.kind}: headphones worn`);
      const body = shells(d.worn.filter((w) => w.piece.shell === 'top').map((w) => w.rest));
      let worst = 0;
      for (const w of hp)
        for (let i = 0; i < w.rest.length; i += 3) {
          const [x, y, z] = [w.rest[i], w.rest[i + 1], w.rest[i + 2]];
          if (inside(body, x, y, z)) worst = Math.max(worst, distance(body, x, y, z).d);
        }
      assert.ok(worst <= 0.001, `${o.kind}: the headphones are ${(worst * 1000).toFixed(1)} thousandths into it`);
    }
  });
