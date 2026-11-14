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
- **Phase 1 (clear out and open up): built**, 14 November 2026, waiting
  for the owner's look before Phase 2.
