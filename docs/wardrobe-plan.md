# Degen's wardrobe: three ranges, every colour, premium streetwear

The owner's call (14 November 2026), after a review of every piece in the
animation lab (`?anim`, desktop detail). This is the plan and its phases;
build it one phase at a time with the owner's sign-off, and keep this file
up to date as each one lands. It follows `docs/clothing-plan.md` (no
clipping, smoother shapes) and `docs/tailoring-plan.md` (the suit's
detail), which stay the record of how the clothes were built.

## What the owner asked for

- **Remove the wacky and the held things:** the Gold Crown, the Neon Halo,
  the Neon Wings, the Top Hat, the Cowboy Hat, and everything in the hand
  that isn't a weapon (the Iced Coffee, the Boombox, the Phone, the
  Briefcase). The Gold and Holo colour packs go too.
- **Clothing in categories:** streetwear, business wear and work wear.
- **No limits on colour:** a full colour picker on every piece.
- **No limits on buying:** every clothing piece and every merch mark and
  print is free and open to everyone at any level, with no Buy step.
- **Full testing:** every phase is tested in code and checked by eye.
- **More clothes that look premium, streetwear first.**
- **The hood up looks realistic.**
- **The shades look realistic:** thinner frames, and more styles.
- **Face gear, nothing wacky:** a full gas mask, a half respirator and
  goggles (the owner's picks; not the plain dust mask).
- **Player first:** your Degen, other players, the fitting room and the
  character screen get everything. The crowds keep what they wear today
  (`crowdlook.ts`) until the owner asks, so phones stay light.

## Where it stands (seen in the lab, 14 November 2026)

- **Good:** the suit and its tailoring, the track suit's stripes, the
  varsity, the caps, the beanie, the sneakers, the necklace, the skate
  deck.
- **Weak:** the hood up (`hoodUp`: a cut sphere that reads like a bike
  helmet, the one head piece the clothing plan's Phase 5 didn't rebuild);
  the shades (`frames` / `lenses` in `head`: thick frames, one style, only
  the lens colour changes); the backpack and duffel (plain boxes and
  tubes); the headphones round the neck (they bunch at the collar). Dark
  outfits read as one silhouette, and the puffer's quilting all but
  disappears in black.
- **Structure:** the top decides everything under it. The suit always
  gets trousers and dress shoes, and every other top gets joggers and
  sneakers (`suit` / `casual` in `items()`). There's no choice of bottoms
  or shoe style, and only one shape of shades.
- **Colours** are fixed lists (`PALETTE` in `profile-data.ts`), checked by
  `cleanLook()` on the browser and on the game server; the varsity, the
  puffer, the premium hats, bags and held things, the watch, the packs,
  the marks and the prints are sold at Drop 001 (`WARDROBE_CATALOG` in
  `catalog.ts`) behind levels.

## How it's built

- **The look stays one record** (`Look` in `profile-data.ts`, DOM-free,
  bundled by the game server). New fields carry the separates and the new
  gear; `cleanLook()` upgrades every saved look (a removed piece becomes
  none, a pack colour stays as the colour it was), and the server checks
  the same rules.
- **Any colour, held in range:** a colour is any `#rrggbb`, passed
  through `safeColour()` (DOM-free, tested): the brightest a colour can be
  is a shade under white (`SHIRT`), so nothing blooms at night, as the
  visual rules ask. The neon pieces go with the halo and wings; the
  lenses keep their own glow.
- **Categories are a way to browse, not a rule:** every piece has a range
  (streetwear, business, work), the fitting room shows one range at a
  time, and any piece can be worn with any other.
- **Separates:** a top, bottoms and shoes are chosen on their own. Every
  top is held clear of every bottom by the clipping test
  (`tests/clothing.test.ts`), which runs each pair through the keyed
  poses, the emotes, the fight's clips and the animator.
- **Premium means detail where it shows:** seams and topstitching, ribbed
  trims, zip pulls, pocket welts, contrast panels and real drape, built
  the way the suit's tailoring is (`crisp` laid-on pieces, `stitches()`,
  `tape()`), on desktop single figures only (detail 3). Phones keep a
  lighter build (detail 2); every cloth stays one flat colour (the
  owner's earlier call).
- **The budget:** a single figure stays 3-5 draw calls (colours are per
  vertex, so the picker costs nothing extra), and about 23-26k triangles
  on desktop and 14-17k on phones (`character.md`). A new piece swaps for
  the one it replaces; nothing is worn on top of everything.

## Phases

### Phase 1: clear out and open up

- Remove the crown, halo, wings, top hat, cowboy hat, coffee, boombox,
  phone and briefcase from `Look`, `items()`, the fitting room, the
  character screen (`describe()`), the lab and the catalog. The Hand tab
  goes. `heldpose.ts` and its tests retire, along with the gun's put-away
  of a held thing (`Degen.held`). The crowd's own shopping bags (Crestmont's
  Drive) stay, and so does the coffee in the inventory (a game item, not
  clothing).
- **Every clothing piece, mark and print is free and open:** no prices, no
  levels and no Buy step in the fitting room. The clothing and merch leave
  `WARDROBE_CATALOG`, while `wardrobe` in the save is kept and still read,
  so old saves load.
- **Dorras already paid for removed pieces:** no refund (the owner's
  call); the save's `wardrobe` stays as a record.
- **The colour picker** on every colour row: a row of quick swatches and a
  picker in the arcade kit (`.mk`), sized for touch, at every width.
  `cleanLook()` and the server take any colour through `safeColour()`.
- Tests: `cleanLook()` upgrades every old look (each removed piece, each
  pack colour, odd and bad colours), `safeColour()`, the fitting room's
  cards, and a fuzz test that builds the figure for random looks at both
  detail levels.
- **As built (14 November 2026):**
  - `profile-data.ts`: `Hat` and `Bag` without the retired pieces, `Held`,
    `HELD` and `held` gone from `Look`; `PACKS`, `packOf()` and the gold
    and holo lists gone; `safeColour()` (any `#rrggbb`, lower case, dimmed
    to `BRIGHTEST`, the palette's white, if brighter, hue kept) on every
    colour in `cleanLook()`, the headphones' too; a retired hat comes back
    bare-headed (`RETIRED_HATS`), the wings as no bag.
  - `wardrobe.ts`: the crown, halo, cowboy hat, top hat, wings, coffee,
    boombox and briefcase items and their shapes gone (with the helpers
    only they used); the crowd keeps its phone (`held: 'phone'`, the
    `neon` screen) and shopping bag. `heldpose.ts` and its test retired;
    walk.ts, the lab and `animator.ts` (`addCarry()`) lose the held
    things' behaviour.
  - The inventory (`inventory-save.ts`, `inventory.ts`, `inventory-ui.ts`):
    no hand slot, no `held:` grid spaces, no "Hold it"; a saved one is
    dropped by `cleanInventory()`.
  - `catalog.ts` / `tycoon.ts`: `WARDROBE_CATALOG`, `markItem()`,
    `patternItem()`, `wardrobeEntry()`, `buyWardrobe()` and
    `ownsWardrobe()` gone; the save's `wardrobe` cleaned to short plain
    ids, read by nothing, out of the net worth.
  - `fitting.ts`: no prices, levels, locks, Premium header, confirm row or
    balance; every colour row ends in the picker (`.sw-pick` in
    `fitting.css`), worn at most every `PICK_EVERY` (120 ms) while dragged
    and at once when it closes; the rows built again only when they change,
    so an open picker stays open. A worn swatch keeps its colour in the
    arcade kit (a coin frame), where before it lit solid coin and hid it.
  - Tests: `profile.test.ts` (any colour, `safeColour()`, the retired
    pieces dropped), `accessories.test.ts` (no retired item drawn),
    `inventory.test.ts`, `game.test.ts`, `merch.test.ts` and the new
    `wardrobe.test.ts` (60 random looks a level, cleaned as the server
    cleans them, dressed at detail 3 and 2: numbers only, nothing retired,
    nothing in the hand, the colours as picked, under `BUDGET`: 40k
    triangles on the desktop, 18k on phones; the worst measured 38.2k and
    16.8k).

### Phase 2: the three ranges and the separates

- New `Look` fields: `bottoms` (trousers, joggers, more in later phases)
  and `shoeStyle` (dress shoe, sneaker, more later), and a shirt colour
  for the suit.
- **The fitting room by range:** Streetwear, Business and Work across the
  top, then the slots: Tops, Bottoms, Shoes, Head, Eyewear, Face, Bags,
  Extras and Merch. Existing pieces sorted into ranges: the hoodie, track
  suit, varsity, puffer, caps, beanie, bucket hat, backpack, crossbody and
  skate deck as streetwear; the suit, trousers and dress shoes as
  business. Work wear fills in at Phase 6.
- The clipping test runs every top over every bottom, and every bottom
  over every shoe, at both detail levels.
- **The owner's calls:** ranges first, then slots; any piece goes with
  any other (the ranges are only for browsing).
- **As built (14 November 2026):**
  - `profile-data.ts`: `Bottoms` / `BOTTOMS` (trousers, joggers, track
    pants), `ShoeStyle` / `SHOE_STYLES` (dress, sneaker), `bottoms`,
    `shoeStyle` and `shirt` on `Look` (swatches `PALETTE.shirt`); a look from
    before wears what its top came with (`bottomsFor()`, `shoesFor()`).
    `Range` / `RANGES` for the fitting room.
  - `wardrobe.ts`: `trousers`, `joggers`, `trackStripes` (the track top's
    leg stripes moved to the track pants), `dressShoes` and `sneakers` as
    items of their own, picked by `bottomsOf()` / `shoesOf()` (the crowd's
    by its top, as before); the suit's shirt, collar and cuffs in the
    `shirt` colour (`ColorKey` and the crowd's columns gain it, the crowd's
    the shirt white). The kart's race suit wears its track pants.
  - `fitting.ts`: the range row (`[data-fit-ranges]`) over eight slots in
    two rows of four (Tops, Bottoms, Shoes, Head, Shades, Bags, Extras,
    Merch); each card `in` its ranges; a slot with nothing of a range's own
    says so ("Work wear is coming soon."); it opens on his top's range. The
    character screen lists Top, Bottoms and Shoes.
  - Tests: `clothing.test.ts` holds every top over every bottoms (15
    pairings and the soldier, both levels: all within 2 mm) and every
    bottoms over every shoe; `profile.test.ts` the separates and the
    upgrade of older looks; `wardrobe.test.ts` random separates.
  - **Found on the way:** at the ankle, as the foot flexes mid-step, the
    legs' cloth goes up to `ANKLE` (0.034, about 3% of his height) into the
    shoe, in the pairings the clothes were built in too (the clothing plan
    never held the shoes to the legs); and the sneaker's laces stand out
    past its sides. The new pairings are no worse; the test holds them
    there, and Phase 5's shoes are the place to fix both.

### Phase 3: the hood up, rebuilt

- The hood as cloth over the head: a shell carried out from the head's
  own outline (`headShell()`, as the beanie is) with a gap held, a
  slightly peaked crown, the opening framing the face with a rolled,
  doubled edge, and side panels falling into the hoodie's neck with a
  soft fold at the back. The drawstrings come out of the opening's
  channel and hang down the chest.
- Weighted across the head and neck so it turns with the head and stays
  on the shoulders, clear of the head, the shades and the face gear in
  every pose (`tests/accessories.test.ts`).
- **As built (14 November 2026):** `hoodUp` in `wardrobe.ts`, replacing the
  cut sphere: sections from `headShell()` (`HOOD_SIDE` 0.02 at the sides,
  fuller behind, a little closer over the crown, closed to a point on top),
  falling under the jaw to `HOOD_NECK`. The opening (`hoodOpen()`) is an
  angle round each row either side of the front: `HOOD_FACE` behind the
  shades' frames, narrowing smoothly to a point over the brow (a flat cut
  there left a stretched sliver of cloth across the forehead) and to
  `HOOD_THROAT` at the throat. A rolled edge round the opening, a shade
  darker. The shades' chain with the hood up is its own item (`chain-hood`),
  out through the opening. The cloth is drawn both sides, as before: no new
  draw calls.
- **One with the hoodie** (the owner's call, after a first look: "the hood
  should be connected to the garment", no line between them): the rolled
  hem the hood first rested on is gone; its lowest rows lie on the hoodie's
  own sections, 5 thousandths inside rising to 3 outside (`HOOD_INTO`), so
  it grows out of the neckline at a shallow angle and the ink draws no line;
  there it takes the sweater's weights (a `hood` region in `weigh()`,
  skeleton.ts: the trunk's, collarbones and all, handed to the neck's and
  the head's past the jaw), so the two move as one (the cheer's raised
  shoulders had pushed the sweater 4 thousandths into the first hood's
  foot). The V at the throat closes where it meets the sweater; the
  drawstrings come out of it. The headphones go under the hood (not drawn
  with it up, as under the puffer's collar).
- **Slimmer at the neck** (the owner's call, after a second look: "reduce
  the bulge around his neck"): `HOOD_NECK` brought in to about the jaw's
  width (the room once made for the headphones wasn't needed once they went
  under the hood), so it tapers from the shoulders to the jaw; and its back
  hangs straight from the back of the head to the upper back (`drape` in
  `hoodSecs`) instead of dipping in round the nape.
  - Tests: `accessories.test.ts` (every level: the head, ears, frames and
    arms inside the cloth, the ears, back and top covered, nothing in front
    of the lenses; the chain out of the cloth; no headphones over it) and
    `clothing.test.ts` (the hood never into the hoodie through every pose,
    both single-figure levels).

### Phase 4: eyewear and face gear

- **The shades rebuilt to real proportions:** thin frames (a few
  millimetres at his scale, against today's heavy ones), lenses set into
  the rims with a slight curve, hinges, and arms that run back along the
  head to the ear (`armPath()`). The shades chain hooks onto every style.
- **Styles:** the classic (the art's shape, slimmer), aviator, round,
  slim rectangle and sport wrap. Frame colour and lens colour each take
  the picker; the lenses can be dark, tinted or clear.
- **Face gear** (new slot `face`): a **full gas mask** (a moulded face
  piece, two side filters, clear eye lenses and head straps; it replaces
  the shades while worn), a **half respirator** (nose and mouth, two
  filter pads, straps behind the head; worn with any shades) and
  **goggles** (safety and ski styles, a strap round the head or the hat).
  Each sits on the balaclava's own outline, never through it, and the
  tests hold it clear with every hat and the hood.
- **As built, the shades (Phase 4a, 14 November 2026):** `EYES` in
  `wardrobe.ts`, a recipe a style (its right lens's outline, the left its
  mirror; the rim's width; each lens's middle; the toe round the face; the
  lens's curve; the aviator's double bridge): the rim is the outline pushed
  out along its normals (`outset()`), 1.4 to 3.2 thousandths wide (the old
  frames were 7), the lens set into it, both curved round the eye
  (`bend`); a bridge tube, small hinge blocks, and arms of 2 thousandths
  (the old 3.2) sampled along the side of the head every centimetre, so
  they keep off its curve (a narrow pair's arms swing round the temple
  first). Every style's hinges are at one height (`HINGE_DY`), so past the
  temples the arms, and the chain hooked under them (`ARM_EAR`), are alike.
  Items `shades-<style>` (the crowd's the classic; far off a plain bar).
  The look's `eyewear` (`EYE_STYLES`) and `frame` colour (swatches
  `PALETTE.frame`, the picker); the fitting room's Eyewear slot (cards by
  range, the frames' and the lenses' colours). The lenses stay one glowing
  colour (the picker reaches any tint); a clear lens would need a see-
  through material, a draw call more a figure, so it isn't offered.
  - Tests: `accessories.test.ts` (every style, three levels: no point of
    the frames, lenses or arms in the head, all of it close round the head,
    the lenses ahead of the eyes; with the hood up, every style's frames and
    arms inside its cloth and its lenses clear), `profile.test.ts`,
    `wardrobe.test.ts` (one pair, the look's).
- **As built, the face gear (Phase 4b, 14 November 2026):** the look's
  `face` (`FACE_GEAR`: gas mask, respirator, safety goggles, ski goggles, or
  none) and `gear` colour (swatches `PALETTE.gear`, the picker);
  `coversEyes()` (the gas mask and goggles): the shades and their chain
  come off while they're worn (`eyesOf()` null), and picking shades in the
  fitting room takes them off again. In `wardrobe.ts`: `moulded()`, a shell
  over the face's smooth oval (`smoothFace()`), pushed out from the head's
  middle (the sides stand off the face as well as the front), domed at its
  middle, never nearer the real face (nose and all) than 4 thousandths, its
  edge standing off by its rolled rim's thickness; `headStrap()`, a strap
  laid on the head's measured surface (`headR()`) from one side of the
  face round the back. The gas mask: brow to under the chin, eye windows
  proud in their rings, two filters low on the cheeks, a valve, two straps.
  The respirator: nose and mouth, two pads, a valve, straps under the ears
  and round the neck. The goggles: one curved lens across both eyes
  (`lens` material, the lens colour) in a frame, a strap round the head over
  the ears; the ski pair taller, the frame padded. Items `face-<id>`
  (single figures; the crowd wears none). The fitting room's Face slot (by
  range: the masks in Work and Streetwear, the safety goggles in Work, the
  ski goggles in Streetwear); the slots in two rows of five. The hood's
  opening is a touch wider (`HOOD_FACE` 1.2) so a goggle strap leaves the
  frame inside it.
  - Budget: the gear and the shades were thinned until the heaviest random
    look fits the unchanged 40k (39.9k): the frames lost their bevel (at
    3.6 thousandths deep it didn't show), the lens outlines take 24 points,
    the straps and rims fewer segments. The budget wasn't raised.
  - Tests: `accessories.test.ts` (each piece of gear at both single-figure
    levels: none of it in the head, under every hat, out of the hood's
    cloth; the respirator clear of all five shades by 2 thousandths; the
    shades and chain off under the gas mask and goggles),
    `profile.test.ts`, `wardrobe.test.ts` (random face gear).

### Phase 5: premium streetwear (first)

A proposed first set; the owner picks what goes in:

- **Tops:** a bomber jacket (ribbed collar, cuffs and hem, a sleeve
  pocket), a coach jacket (snap front, drawcord hem), a heavyweight
  hoodie refreshed (dropped shoulder, thick ribbing, flat-felled seams),
  a puffer vest, a technical shell (taped seams, storm flap, a hood that
  packs into the collar), a trucker jacket (yokes, chest pockets,
  topstitching), and a heavyweight tee.
- **Bottoms:** cargo pants (bellows pockets, cuffed or stacked hem),
  relaxed denim, and shorts.
- **Shoes:** high-top sneakers, chunky runners and slides.
- **Head:** a fitted cap (flat brim) and a skully beanie.
- **Bags:** a sling bag, a chest rig bag and a waist bag; the backpack and
  duffel rebuilt with panels, zips and straps. Headphones fixed at the
  collar.
- Short sleeves and shorts need his arms and legs drawn under them (the
  body is the clothes today): that's built here, in the skin colour.
- **The dark-outfit fix:** rims and seams a shade lighter so a black fit
  still reads, every piece, both tiers.

- **The owner's pick for the first set:** the bomber jacket, cargo pants and
  high-top sneakers, with the shoe fixes found in Phase 2 (the ankle and the
  laces).
- **As built, the shoes (Phase 5a, 18 November 2026):**
  - The ankle: the legs' last few centimetres ride partly with the foot
    (`weigh()` in skeleton.ts: up to 0.85 of the foot from `ANKLE_H` + 0.11
    down, as a hem resting on the shoe does), so the shoe's collar no longer
    swings into the cloth as the ankle bends: the deepest any bottoms goes
    into any shoe fell from 0.034 to 0.0082 (the trousers over sneakers at a
    still crouch); `clothing.test.ts` holds every pairing to `ANKLE` 0.009.
  - The laces lie on the shoe as arcs following its rounded top
    (`laceArcs()`), and the side stripe (`swoop`) runs along the side's own
    curve: the old flat bar and plate stood off the rounded top and the
    curving sides (the "laces sticking out" was mostly the stripe).
  - High-tops (`hightops`, `ShoeStyle` `hightop`): the sneaker's own lower
    half (its stripe and mark fit as they are), the collar carried up round
    the ankle, a padded rim round the opening, laces up to the collar.
    Streetwear; `kicks()` takes the stripe and the shoe's mark on both.
  - The budget held at 40k: the new laces and stripe are lean tubes.

### Phase 6: work wear

- A hi-vis vest and a hi-vis jacket (reflective tape), a chore coat,
  coveralls, work trousers (knee panels, a hammer loop), work boots and a
  hard hat. Goggles and the half respirator from Phase 4 belong to this
  range too. Nothing is a real brand or logo.

### Phase 7: business wear

- The suit refined (cuts: single- and double-breasted), a blazer with an
  open-collar shirt, a shirt alone, a waistcoat, an overcoat, chinos, and
  loafers and derbies.

## Testing (every phase)

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:wide`,
  `npm run build` then `npm run budget`, and `npm run smoke` (it plays
  walk mode, and the held things leave walk.ts).
- In code: `cleanLook()`'s upgrade of old looks; the clipping test for
  every top over every bottom and every bottom over every shoe; hats, the
  hood, the shades and face gear clear of the head and of each other
  (`accessories.test.ts`); triangles per piece and per figure held to the
  budget; the fuzz build of random looks; the server's copy of the rules.
- By eye: every new piece in the lab from front, side and back, standing,
  walking, running, crouching and fighting, at both detail levels; the
  fitting room and the character screen at 320, 375, 768, 1024 and
  1440px, phones upright and on their side; by day and at night (no
  bloom).

## The owner's answers

1. **Dorras paid for pieces that went or went free:** no refund.
2. **The Gold Watch and the Diamond Chain:** kept, as extras.
3. **Building:** Phase 1 first, shown to the owner before Phase 2.
4. **Still open:** the Phase 5 list (which pieces first).

## Status

- Planned, 14 November 2026.
- **Phase 1 (clear out and open up): built**, 14 November 2026.
- **Phase 2 (the three ranges and the separates): built**, 14 November
  2026.
- **Phase 3 (the hood up, rebuilt): built**, 14 November 2026.
- **Phase 4 (eyewear and face gear): built**, 14 November 2026, waiting for
  the owner's look before Phase 5.
