# The characters plan: new heads on Degen's body

The owner's call (2026-11-21): "add a new character. same model we are
using but a different image." New characters are Degen's one shared body
(`character.ts`, `skeleton.ts`) with a head of their own, sculpted after a
piece of art the owner supplies, worn as a ready-made look in Drop 001's
fitting room. One at a time, each with the owner's sign-off; keep this plan
up to date.

## The owner's answers

- **Where:** fitting room looks. Not the crowd, the Fight Club or named
  people in the city (yet).
- **Likeness:** a new head per character, sculpted to match the art (not
  a stretch of Degen's head: `HEAD_SCALE` can't make these shapes).
- **First round:** one character, from the owner's picture.
- **Nothing over the head:** no hats, no hood up, no shades, no face gear
  on a character's head. The head is the whole look.
- **Free**, like the rest of the wardrobe (`docs/wardrobe-plan.md` Phase 1).

## The first character: SlimeWhale

The name is made up (the owner confirmed, 2026-11-21). From the owner's
picture (kept out of the repo: it's a photo with a cartoon head drawn over
it):

- **The head:** tall and boxy, a flat top and a flat back, a square jaw,
  big ears. Skin a pale peach (a `PALETTE.tone` swatch); the Skin row still
  works on him.
- **Hair:** a buzz, short and grey-brown, over the crown and back only (the
  face's front bare). The Hair row still colours it; no other cuts.
- **Three eyes:** sculpted domes in a row across the brow, lime green,
  bulging past the head's outline at the sides as in the art, each with a
  flat black ink pupil and a white glint (the owner's call: domes, not flat
  ink).
- **The mouth:** wide lime-green lips as a raised rim standing off the face,
  closed on a dark slit (the owner's call: a rim, not flat ink), and a short
  ink smirk stroke above one corner.
- **The look:** a navy hoodie, hood down (as in the art); the legs aren't
  in the art, so joggers and sneakers to start (any can be changed after).
- **Left out:** the phone in his hand (the owner's call: hands hold only
  weapons; the phone stays retired) and the green caps in the picture's
  corners (another company's character; not part of him).
- **Colour:** the lime is held a shade under the bloom threshold (through
  `safeColour()`'s `BRIGHTEST`), so the eyes and lips never glow or wash
  out (`visual-rules.md`).

## How it's built

- **A head is data** (built, Phase 1). `body.ts`'s head builder takes any
  head (`headModel(def)`: a `HeadDef` is its rows (height, half-width,
  front, back, centre, superellipse power: the `Row` of `HEAD_ROWS`), the
  features pushed out of its front and the heights of its rings by detail
  level); Degen's is `DEGEN_HEAD`, and `headFront()`, `headRow()`,
  `inHead()` and `headGeometry()` are his as before. A new DOM-free file,
  `heads.ts` (on `DOM_FREE`), holds the characters (`CHARACTER_IDS`) and
  their heads, in a chunk of its own loaded the first time a character is
  worn (`loadHeads()` in character.ts: it hands the chunk body.ts's
  `headModel()`, `setHeadModel()`, and the wardrobe its parts, `useHeads()`;
  the chunk imports nothing of the boot's but three.js, so the bundler
  leaves the boot's chunks alone: the boot grew 0.6 KB, the chunk is
  2.5 KB; until it's in, a figure asked for a character is Degen as he is): SlimeWhale's `SLIME_HEAD` (`SLIME` its model), the neck
  rows Degen's, so every collar fits it as it fits his; then a square jaw
  whose underside is as slim as Degen's under the chin (a nod clears the
  hood rolled down), straight sides (power 4), a flat face with a muzzle a
  touch forward round the mouth, a flat top.
- **The parts** (`slimeWhale(q)` in heads.ts, by what colours them) are one
  item, `character-slimewhale`, in `items()` in wardrobe.ts (single figures
  only), on the `head` joint and weighted as Degen's head is (`weigh()`):
  the skull and the big ears in the `skin` key (the ears' folds a shade
  darker); the three eyes (squashed spheres sunk into the brow, the outer
  two turned to follow the face round, `slimeEyes()`) and the lips (a
  capsule across the muzzle, bent round the face at every height,
  `alongFace()`) in `SLIME_LIME`; the pupils (small dots a little up and in,
  as in the art), the slit along the lips' front and the smirk in
  `SLIME_INK`; glints in white (`detail`); the buzz (a shell over the crown
  and back from its own hairline, from the head's own outline) in the
  `hair` key.
- **Nothing over the head:** with `Outfit.character` set, every item is
  asked about the outfit as `headless()` makes it (no hat, helmet, face
  gear, shades or chain, the hood down, unmasked) and Degen's own head
  items (`head`, `mask`, `features`, `hair-<cut>`) are off. The outfit
  itself (what's saved) is untouched.
- **No new draw calls.** Every part is on the plain material, coloured per
  vertex, on the figure's one `SkinnedMesh` (`createDegen()`).
- **Detail:** level 3 (desktop single figures) and 2 (phones) only; the
  crowd never wears a character's head (levels 0 and 1 aren't built). The
  domes and the lip rim take fewer segments on phones. The figure stays
  under `BUDGET` in `tests/wardrobe.test.ts` (40k / 18k triangles).
- **The look:** a new field `Look.character` (`null` for Degen, or a
  character's id from `CHARACTER_IDS`; the outfit's is `Outfit.character`). `cleanLook()` keeps looks saved before it
  as Degen and anything unknown as Degen (the game server checks the same).
  With a character's head on, `lookOutfit()` leaves the hat, hood up,
  eyewear, face gear, shades and chain off **without changing what's
  saved**, so going back to Degen brings his old hat and shades back.
- **The fitting room** (`fitting.ts`):
  - a **Looks** row (one tap dresses him as the character: the head, the
    navy hoodie, joggers, sneakers, the peach tone and grey-brown buzz);
  - a **SlimeWhale** card on the Face tab (the head alone, keeping the
    clothes he has on), with the Skin and Hair rows (no Shape, Cut or Shades
    rows on a character);
  - the Head, Eyewear and Gear tabs say nothing fits over his head
    (`[data-fit-empty]`-style note), and the hoodie's Hood Up is off.
  - Menu copy stays 1-3 words; checked at every width, upright and on its
    side.
- **Everywhere else he's drawn** (all single figures, so all free once
  `createDegen()` builds him): your Degen on foot and at the wheel, the
  fitting room's stage, the character screen (`describe()` names him; its
  Face zoom aims at his head) and the hologram. The first-person hands take
  the tone as they do now. Other players would see him through their
  profile's look (multiplayer is off on degenemporium.com).
- **Tests** (`tests/heads.test.ts`, Phase 1): his item on single figures
  only, nothing of Degen's head or over a head while it's on (the outfit
  untouched); Degen's head built as it was; the neck rows Degen's; the eyes
  seated and bulging, wider together than the face; the lips touching the
  face, no deeper than their thickness; the ink never inside the head; the
  buzz clear of the head, close over the crown; his jaw clear of six tops'
  collars at rest, nodding, looking up and turning; in the hood rolled
  down, no higher up his head than Degen's own chin goes there (Degen's chin
  tucks into it on a deep nod too: both heads sampled on one grid); the
  triangle budget at both levels. Phase 2 adds `cleanLook()`'s migration
  (no `character`, an unknown one, a character with a hat saved) and
  `lookOutfit()`. `npm run smoke` before and after.

## The phases

Each with the owner's sign-off.

1. **The head, in the lab** (built, 2026-11-21; waiting on the owner's
   sign-off). `heads.ts`, `headModel()`, the SlimeWhale item, seen only in
   the lab:
   `?anim&prog=idle&cam=free&orbit=0.6,0.08,0.55&at=0,0.8,0&outfit=hoodie&wear=character:slimewhale,skin:%23efc4ae,hair:%238c7b6b,top:%231f2436`
   (`detail=2` the phone's). Shots front, three-quarter, side, back, the
   phone's detail, the whole figure and running:
   `docs/characters-shots/slimewhale-phase1.png` (the owner's picture is
   left out of the repo). Tests for the geometry and the budget.
2. **Wearing him.** `Look.character`, `cleanLook()` and its migration,
   `lookOutfit()`, the Looks row and the Face tab's card, the Head /
   Eyewear / Gear notes, the hood held down, the character screen.
   Shots of the fitting room and the character screen at the widths.
3. **Checked and written up.** Every width, upright and on its side, both
   tiers, by day and at night (the lime under bloom), `?fps` and `?bench`
   before and after, `npm run smoke`; the guide files (`character.md`,
   `fitting-room.md`) updated.

## Adding the next character (once SlimeWhale's done)

The owner posts the art; we go through it (head, face, hair, clothes,
real brands to swap for made-up marks, phones); a made-up name; then a
`heads.ts` entry (its `HeadDef` and parts, an id in `CHARACTER_IDS`, its item), a Looks entry and a Face tab card, its line in
the tests, shots for sign-off. No new draw calls and no change to the
crowd unless the owner asks.

## Settled (the owner's answers, 2026-11-21)

- **The eyes' and lips' colour:** fixed lime, no colour row.
- **On the neck and body:** the headphones and the necklace (on the
  collar, not the head) stay available with a character's head. Bags, the
  watch and the merch marks are unaffected.
- **The reference picture** stays out of the repo (it's a photo); it's used
  only for the side-by-side sign-off shots.

## Status

Planned and signed off (2026-11-21). Phase 1 built (2026-11-21), waiting
on the owner's sign-off of the likeness before Phase 2.
