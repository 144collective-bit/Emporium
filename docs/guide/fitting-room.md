# Drop 001's fitting room and the wardrobe

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Drop 001's fitting room

- Drop 001's panel (`data-panel-tpl="shop"` in `CityMap.astro`) has the
  fitting room (`fitting.ts`): item cards by tab (Fit, Head, Shades, Bags,
  Hand, Extras, Kicks, Merch), colours, and a turning preview of the player's Degen drawn by a
  small second renderer with the same ink outlines (`stage.ts`), only while the panel is
  open (still under reduced motion; drag turns him); 15 s after the panel
  closes (`RELEASE_AFTER`) that renderer, a GPU context of its own, is let go
  and made again on the next open (the stability plan's Phase 4.2); its idle and walk
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
  fitting room only calls `wear()`. The original wardrobe is free; the
  premium wardrobe (`WARDROBE_CATALOG` in `catalog.ts`) costs Dorras and
  needs a level (`buyWardrobe()` in `tycoon.ts`). Everything is cosmetic
  and only for the city: never tied to the Shopify store or the token, never
  real money.
- **The premium wardrobe** (the city's game): Drop 001 also sells
  `WARDROBE_CATALOG` (catalog.ts) for Dorras earned in the city, each piece
  with a price and a level: the varsity and puffer fits, the cowboy hat, top
  hat and neon halo, the duffel bag and neon wings, the phone and briefcase,
  the gold watch, the Gold and Holo colour packs for tops and bottoms
  (`PALETTE.gold` / `PALETTE.holo`, `PACKS`, `packOf()`), and the merch:
  the marks but the diamond and the Sector 7 badge (`markItem()`, ids
  `mark-<id>`) and the prints (`patternItem()`, `pattern-<id>`), tab
  `merch`. The look carries
  them as ordinary values (`cleanLook()` validates, it never checks
  ownership); owning them is `wardrobe` in the save (`buyWardrobe()` /
  `ownsWardrobe()`), and the fitting room (`fitting.ts`, with
  `game: GameDeps`) is what enforces it: cards show the price and `Lv n`,
  "Buy · 4,000" opens an inline confirm, locked pieces say the level, pack
  colours sit under a lock in the colour rows, and the head shows your
  Dorras and level. Styles in `src/styles/fitting.css`. In `character.ts`
  the pieces are items like any other; neon pieces (the halo, the wings'
  edges, the phone's screen) share one `neon()` material coloured per
  vertex in the lens colour, dim by day so they never bloom out of control.
- A new item needs a `Look` field with its palette and rules in
  `profile-data.ts` `cleanLook()` (the server checks it too), the mapping in
  `lookOutfit()`, an item in `items()` in `wardrobe.ts` and an entry in `fitting.ts`
  `TABS`. One hat (`hat`), one bag (`bag`) and one thing in the hand
  (`held`) at a time; `cleanLook()` also upgrades looks saved in older
  formats, so keep its migration when fields change. Held items are put
  away while Degen carries a gun (`Degen.held`).
