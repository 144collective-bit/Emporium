# Drop 001's fitting room and the wardrobe

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Drop 001's fitting room

- Drop 001's panel (`data-panel-tpl="shop"` in `CityMap.astro`) has the
  fitting room (`fitting.ts`): item cards by tab (Fit, Head, Shades, Bags,
  Extras, Kicks, Merch), colours, and a turning preview of the player's Degen drawn by a
  small second renderer with the same ink outlines (`stage.ts`), only while the panel is
  open (still under reduced motion; drag turns him); its idle and walk
  are the crowd pack's captured takes on his bones (`captureplay.ts`:
  the three idles in turn, crossfaded, the looped walk on the spot; the
  formula poses until the pack is in). The **Merch** tab
  (`merchItems()`, `[data-fit-merch]`) dresses the top, the hat or the
  kicks with a mark, or the top with a print; where the top's mark goes
  and the ink are rows of their own; a note says when it won't show (no
  cap or beanie, a suit's dress shoes).
- **The character screen** (`charscreen.ts`, markup `[data-char]` in
  `CityMap.astro`, styles in `fitting.css`), from the hub's Profile tab's "See
  your Degen": an overlay under the header with the same stage
  (`createStage(..., { zoom: true })`): drag turns him, scroll, pinch or
  Full / Face zoom to his face, poses (idle, walk, the fighter's guard and
  the emotes, `StagePose`), lights (studio, day, night, `StageLight`), what
  he's wearing (`describe()`) and the way to Drop 001. × or Esc closes it;
  while it's open no other key handler hears the keyboard (Esc never
  stops walking). Check it upright and on its side at phone widths.
- The look belongs to `profile-ui.ts` (browser and player profile); the
  fitting room only calls `wear()`. Everything is cosmetic and only for the
  city: never tied to the Shopify store or the token, never real money.
- **The whole wardrobe is free** (`docs/wardrobe-plan.md` Phase 1, the
  owner's call, 2026-11): every piece, colour, mark and print, at any
  level, with no Buy step, no prices, no locks and no Premium header (the
  premium wardrobe, `WARDROBE_CATALOG`, `buyWardrobe()` and the Dorras in
  the fitting room's head are gone). The save's `wardrobe` (what was bought
  before) is kept as a record only, cleaned to short plain ids; nothing
  reads it, and there were no refunds (the owner's call).
- **Any colour** (the wardrobe plan's Phase 1): a look's colours are any
  `#rrggbb`, made safe by `safeColour()` in `profile-data.ts` (lower case;
  anything brighter than the palette's white, `BRIGHTEST`, dimmed to it
  with its hue kept, so nothing blooms; every swatch passes as it is), on
  the browser and the game server alike. `PALETTE` is only the quick
  swatches. Each colour row ends in a picker (`.sw-pick`, the browser's own
  `<input type="color">` under a rainbow-edged swatch with a dropper; lit in
  the colour once it's one off the list); dragging round it changes the
  look at most every `PICK_EVERY` ms, and at once when it closes. The rows
  are built again only when they change (another item or tab), so an open
  picker stays open while the colour goes on him. A worn swatch keeps its
  own colour in the arcade kit, framed in coin. Styles in
  `src/styles/fitting.css`.
- **Retired** (the wardrobe plan's Phase 1, the owner's call): the crown,
  the halo, the top hat, the cowboy hat, the wings, the Gold and Holo
  colour packs, and every thing in the hand (the coffee, boombox, phone and
  briefcase: the Hand tab, the inventory's hand slot and `heldpose.ts`).
  `cleanLook()` drops them from saved looks (a retired hat is bare-headed,
  the wings no bag, a pack colour stays the colour it was). His hands hold
  only weapons; the crowd keeps its phones and shopping bags.
- A new item needs a `Look` field with its rules in `profile-data.ts`
  `cleanLook()` (the server checks it too; a colour goes through
  `safeColour()`, with quick swatches in `PALETTE`), the mapping in
  `lookOutfit()`, an item in `items()` in `wardrobe.ts` and an entry in
  `fitting.ts` `TABS`. One hat (`hat`) and one bag (`bag`) at a time;
  `cleanLook()` also upgrades looks saved in older formats, so keep its
  migration when fields change. `tests/wardrobe.test.ts` builds random looks
  at both detail levels and holds the figure to its triangle budget
  (`BUDGET`): a new piece that would make him heavier says so.
