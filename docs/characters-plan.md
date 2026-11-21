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
- **The look** (built, Phase 2): `Look.character` (`null` for Degen, or a
  character's id: `CHARACTERS` in profile-data.ts names them, `CHARACTER_IDS`
  in heads.ts the heads it draws, the tests hold them alike; the outfit's is
  `Outfit.character`). `cleanLook()` keeps looks saved before it as Degen
  and anything unknown as Degen (the game server cleans with the same).
  `lookOutfit()` passes it on, and the hair colour with it (his buzz);
  the hat, hood up, eyewear, face gear, shades and chain stay saved but
  aren't drawn (`headless()`), so going back to Degen brings them back.
  `CHARACTER_LOOKS` is each character's whole look (SlimeWhale's: his head,
  the navy hoodie, hood down, black joggers, sneakers, the peach tone
  `#efc4ae` and grey-brown buzz `#8c7b6b`, both new swatches in `PALETTE`
  for the players only: the crowd keeps its own twelve tones,
  `SKIN_TONES` in crowdlook.ts, so nobody in it changed).
- **Built before his head is in:** every place a figure is built from a
  look asks `headsReady()` (character.ts) and builds again when
  `loadHeads()` settles: the walker (`setLook` in index.ts waits for the
  chunk, so he never comes up as Degen first; Degen if it won't load), the
  fitting room's and character screen's stage (`dress()` in stage.ts) and
  other players (`refigure()` in remote.ts). The car, boat, kart and the
  Fight Club take the walker's outfit, built after it's in.
- **The fitting room** (`fitting.ts`, built, Phase 2):
  - the Face tab's **Full look** row (`data-char-look`, a chip a
    character: one tap puts on `CHARACTER_LOOKS`, pressed while all of it is
    worn as it comes);
  - a **SlimeWhale** card on the Face tab (`char-slimewhale`: the head
    alone, the clothes kept), with the Skin and Hair rows; the Balaclava
    and the cuts take a character's head off; no Shape row on one;
  - the Head, Eyewear and Gear tabs (`OVER_HEAD`) show no cards and no
    colours while it's on, only "Nothing goes over SlimeWhale's head."
    (`[data-fit-empty]`); Extras' Shades Chain isn't offered; the Merch
    tab's hat says "No hats on SlimeWhale".
  - The character screen's list (`describe()`, moved to DOM-free
    `lookrows.ts`): Face "SlimeWhale" with his skin and hair, Head
    "Nothing", Eyewear "None", Gear "Nothing", whatever's saved.
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
  triangle budget at both levels. Phase 2: the two lists of characters
  alike; `cleanLook()`'s migration (no `character`, an unknown one, a
  character with a hat saved, kept); every whole look surviving cleaning
  as it is; the crowd's twelve tones unchanged; `lookOutfit()` wearing the
  head, the clothes and nothing over it, and back as Degen his hat and
  gear again; the character screen's rows.

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
2. **Wearing him** (built and signed off by the owner, 2026-11-21).
   `Look.character`, `cleanLook()` and its migration, `lookOutfit()`, the
   Full look row and the Face tab's card, the Head / Eyewear / Gear notes,
   the character screen, every figure built once his head's chunk is in.
   The boot grew 0.3 KB more (0.9 KB in all since Phase 0: 768.7 of
   770 KB). Shots of the fitting room and the character screen at 1440
   and 375 wide: `docs/characters-shots/slimewhale-phase2.png`.
3. **Checked and written up** (built and signed off by the owner, 2026-11-21). With SlimeWhale's
   look saved, the city booted at 320, 375, 768, 1024 and 1440 wide and a
   phone on its side (812 x 375): the walker, the fitting room's Face and
   closed Gear tabs and the character screen, no sideways scroll, nothing
   overlapping, no page errors. At night (the character screen's Night
   light) the lime dims with him and nothing blooms. The figure: 27.5k
   triangles on the desktop and 14.2k on phones (Degen in the same clothes
   26.1k and 13.5k; in the art's suit, cap and shades 34.5k and 14.9k), and
   no draw call of its own (two fewer than Degen: no lenses, no cap patch).
   `?fps` in walk mode as Degen and as SlimeWhale, both tiers: the whole
   scene's draws and triangles move about 10% either way from run to run
   (the city streaming in), more than the figure could. `?bench` measures
   the city's fixed views, where the default look is unchanged. `npm run
   smoke` after: every scene passed (150 steps). Shots: `docs/characters-shots/slimewhale-phase3.png`. The
   guide files (`character.md`, `fitting-room.md`, `tests.md`) are up to
   date.

## The second character: Smilex

From the owner's art (2026-11-21; the picture kept out of the repo, as
SlimeWhale's). The owner's answers:

- **The name:** Smilex. A real name the owner approved for this character
  (the owner's call, 2026-11-21: an exception to "made-up names only").
- **The head:** a thick hexagon, flat on top and bottom, pointed at the
  sides, bright yellow (`SMILEX_YELLOW`, under the bloom threshold), a bit
  bigger than Degen's head as in the art (27 cm point to point), a slab
  8.4 cm deep (the owner's call after the second reference: thinner;
  centred on his neck, which tapers inside it); two tall
  oval eyes and a wide smile with a tick across each end, flat ink on its
  flat front. No nose, ears or hair. Nothing worn over it, as SlimeWhale.
- **The gloves:** always white cartoon gloves (the owner's call): his hands
  in `SMILEX_GLOVES`, a rolled cuff round each wrist.
- **The pendant:** the PulseChain symbol on his gold chain, in the
  Diamond Chain's diamond's place (the owner's call, 2026-11-21: "the
  PulseChain symbol is public domain ... it can be used", an exception to
  "never another company's logo"). Drawn after the logo in
  `src/assets/pulsechain.png`, never the picture's version: a flat-topped
  hexagon in a gold rim, its gradient in four bands (cyan, violet, magenta,
  red), the white pulse line across. PulseChain's symbol only, never the
  token's; nothing about it says PulseChain endorses the game.
- **The clothes:** a plain brown leather bomber (the art's monogram print
  is like a real brand's: left off; the owner skipped the question, so the
  suggestion stands), the art's green chest patch as the city's own made-up
  Sector 7 mark in green, the necklace, relaxed denim, grey-white
  sneakers (`CHARACTER_LOOKS.smilex`). The art's jacket is worn open over
  a white tee; ours zips up (an open bomber is a new piece: later, if the
  owner wants it).

How he's built (Phase 1 for him, in the lab): his `HeadDef` in heads.ts
(`SMILEX_HEAD`: Degen's neck rows, then the hexagon as rows whose
half-width runs straight from the flats to the points, every row a ring
so the points stay sharp, its edges rounded a few millimetres), his ink
(`smilex()`, `inkOn()`, the edges `hexEdges()`, `inSmilexBlock()` for the
checks), the pendant (`pulsePendant()`, handed to the
wardrobe as `characterPendant()`: the `necklace-smilex-<top>` items in
place of `necklace-<top>`) and the gloves (`characterGloves()`: the
`gloves-smilex` item in place of `fingers`). All in the heads' chunk (now
4.6 KB with the detail); the boot grew 0.5 KB in all for him (769.2 of
770 KB). Phase 2 (built,
2026-11-21): he's in `CHARACTERS` (`chain: 'Gold Chain'`, no `hair`), so
the Face tab offers his card (the head alone, a Skin row only) and his
Full look chip (`CHARACTER_LOOKS.smilex`: the bomber, denim, sneakers, the
necklace and the Sector 7 mark in green on the chest); the character
screen names him, his necklace the Gold Chain; the first-person hands and
fists wear his gloves (`gloveColour()` in wardrobe.ts, in viewmodel.ts
and fistsview.ts). Shots: `docs/characters-shots/smilex-phase2.png`.
Lab:
`?anim&prog=idle&cam=free&orbit=0.6,0.08,0.7&at=0,0.78,0&outfit=bomber&wear=character:smilex,necklace,top:%236b4428,bottoms:denim,bottom:%233f5f8f,shoeStyle:sneaker,shoes:%23c9c7cf,mark:seven,ink:%231f9d6a,cap:`.
Tests: the collar, hood-down and budget checks run for every character;
his hexagon's flats, points and straight sides; his ink on the flat of his
face; the gloves and pendant on him only (the diamond and bare hands on
everyone else); the pendant clear of five tops and centred. Shots:
`docs/characters-shots/smilex-phase1.png`.

**More detail** (the owner's answers, 2026-11-21, after the first shots):
- **The head's edges inked:** thin black lines along the block's own
  edges, as in the owner's second reference, meeting exactly at the
  corners (the owner's calls: a ring drawn inside the face was tried first
  and taken out; then thinner lines, "aligned correctly at the
  intersections"). The block is a bevelled hexagon (`smilex()`: a flat-top
  hexagon extruded front to back, every edge rounded `HEX_BEVEL`, on
  Degen's neck), so its rounded edges are one exact curve; the lines
  (`hexEdges()`, `EDGE_R` 2.4 mm) run straight between exact corner points
  along the middle of that curve (round the face, round the back, and down
  each of the six corners over the edge, along the walls' corner and back
  over the edge), with a ball of the same width at every corner. The block,
  its ink and its edges ride the head bone as one (`rigid`: weighted by
  height, the big flat face bent under the smile when he nodded and buried
  it); the neck bends as Degen's. One flat yellow, no darker sides (the
  owner's call).
- **The pendant set like a jewel:** a gold back plate and a bezel standing
  round the edge, the four colour facets bevelled and set into it, the
  pulse line thicker with rounded joins, edge to edge, a chunkier bail. Its
  size as it was (6 cm across).
- **A chunky curb chain:** oval gold links every centimetre, each turned a
  quarter from the last (`curbChain()`, along the necklace cord's own path:
  `characterChain()`).
- **Cartoon gloves:** three black stitch lines down the back of each glove
  and puffier rolled cuffs.
- Not changed: his head's size.

Smilex's phases are SlimeWhale's: 1, the head in the lab (built; the
detail passes and the thinner slab, 2026-11-21), 2, wearing him (built,
2026-11-21, the owner's go-ahead; waiting on the owner's sign-off), 3,
checked.

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

Planned and signed off (2026-11-21). Phase 1 built and signed off
(2026-11-21: the likeness as it is). Phase 2 built and signed off
(2026-11-21). Phase 3 built and signed off
(2026-11-21): SlimeWhale is done. Smilex (the second): Phases 1 and 2 built
(2026-11-21), waiting on the owner's sign-off before his Phase 3.
