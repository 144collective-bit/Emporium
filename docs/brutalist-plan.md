# Brutalist plan: Endswood's blocks, brutalist and lived in

The owner's picks made (2026-11-21, below); the plan itself for the owner's sign-off. Each phase with the owner's
sign-off; keep this plan up to date.

## What the owner asked (2026-11-21)

The blocks of flats more functional and more brutalist, after the owner's reference pictures: raw concrete slabs and
towers, a separate service tower joined to its block by bridges every few floors, twin towers joined high up with a
pod between them, ducts and pipes snaking up a facade, and grit at street level (cables over the lanes, shutters,
neon, washing, a train overhead in the rain). The owner's picks:

- **Which:** the south estate only (Endswood's blocks: the Rampart, Harrier and Kite Points, The Core, Linnet, Marten
  and Wren Courts, Sorrel, Fennel and Teasel Houses). The Trenches' brick projects stay as they are.
- **Functional:** lobbies you can walk into; flats and shops to run; a rooftop hangout.
- **Landmarks:** separate lift towers; the twin towers joined at the top; pipes up the walls; street-level grit.

The pictures are for the feel only: no real building is copied, and every name is made up.

## What's there today

`southblocks.ts` (the data) and `southblocks3d.ts` (the drawing), docs/guide/endswood.md. Much of the bones are
already brutalist: slabs and towers of 5 to 18 storeys, galleries (streets in the sky) every third floor, stair cores
standing out of the slabs, The Core between the twin towers joined to both by bridges every third floor, covered
bridges between the cores, a podium deck over a parking court, the lifts (a card at each core). What isn't: the skin.
It's a soft retro-future dress: beige render with rounded corners (`CORNER_R`), smooth walls, bright mustard, teal and
orange bands along every gallery, the towers' ledge rings and flared plant rooms.

## What stays fixed

- Every block's footprint, height (about 20 at most, the plant rooms' and The Core's: the owner's call, 2026-11-14),
  door and place stays where it is (`tests/snapshot.test.ts`); the sky network keeps its levels (`SKY_FLOORS`).
- Made-up names on every sign and shop; no prices or numbers on signs.
- Phones stay light: the estate is a lazy district (`south-blocks`); new detail goes in the wall atlas (no new draws)
  or instanced and near only; far off it's in the far forms (docs/phone-far-plan.md). Measured before and after with
  `__draws()` at the estate's bench views (`south-blocks`, `south-rampart`).
- Rules apart from the view (DOM-free data, tested); a save change keeps its migration and its key in `BACKUP_KEYS`;
  new places go in `PLACES` and `LIVE_PLACES`, new ways in through `live.closed()`.

## Phases

1. **The concrete skin.** Done (2026-11-21, below). The same blocks, re-dressed: raw grey concrete with board-mark grain and rain streaks under
   every ledge (the wall atlas, `infill.ts`'s bands); the flats' fronts a deep grid of recessed balconies, each with
   its own bit of life (a plant, a bike, a dish, washing); hard chamfered corners for the rounded ones; the galleries'
   fronts plain concrete upstands; the concrete a cool grey, each block's own accent (mustard, teal, orange) kept bold
   as a stripe down its end so the blocks are told apart, and colour otherwise only in small doses (doors, balcony
   panels). Night: the patchy windows as now, the stair slots lit. No new draws.
2. **The service towers.** Done (2026-11-21, below). The slabs' stair cores pulled out of the galleries into towers of their own, standing a
   bridge's length off the block, a bridge to each gallery (every third floor), a boiler house jutting from the top
   with its flue; the Rampart's along its estate side, the Courts' at their ends. The Core's flared top made the same.
   Walked as the cores are now (their lifts and stairs).
3. **The twins joined at the top.** Done (2026-11-21, below). A bridge from The Core to Harrier and to Kite at their top floor, and on The Core's
   top, the lookout: a hexagonal concrete drum wider than the Core (the owner's pick), a glass band all round, lit at
   night. It's the estate's landmark from across the city (and in its far form).
4. **Pipes and kit on the walls.** Done (2026-11-23, below). Bundles of ducts snaking up the ends of a few blocks (bends, joints, brackets),
   air-con units under windows, satellite dishes, water tanks and aerials on the roofs, rubbish chutes, washing lines
   along the galleries. Instanced, near only; phones a trimmed set.
5. **Street-level grit.** Done (2026-11-23, below). Cables strung over the estate's lanes and between the blocks, shuttered fronts under the
   podium deck, neon over the shops there (made-up names), bins, puddles that shine in the rain, the estate's
   noticeboards. The tube's trains already run under; nothing new overhead.
6. **The lobbies.** Each block's ground-floor hall walked into from its door: post boxes, a noticeboard, a bench, the
   lift doors (the lift card, as at the cores), the stairs; the towers' halls glazed and lit warm at night. A hall is
   its own inside (as the tube's halls are), near only.
7. **A flat of your own, and shops to run.** A flat for Degen in one of the blocks (the owner's pick: his own to
   live in, not flats let out): its door off a gallery, inside it a few rooms to walk (as his home's), and a choice
   to wake there instead of at home (docs/spawn-plan.md, a save setting with its migration). And the shops under the
   podium deck, a launderette and a corner shop (made-up names), each run as Makers' Row's units are (levels,
   upgrades, Dorras only; never an investment, no interest or returns wording), a save change with its migration.
8. **The rooftop hangout.** The lookout on The Core: up by its lift, a lounge round the glass band with seats, the view
   of the whole city, a terrace on the roof over it, people up there by day and night. A place of its own (its pin,
   its panel, `PLACES` and `LIVE_PLACES`).
9. **Measured and checked.** The estate's views on the phone tier before and after (`__draws()`), the widths and
   phones on their side for the new cards, the review shots by day and at night, the guides (endswood.md,
   economy.md) up to date.

## What Phase 1 did (2026-11-21)

- The wall atlas's `brutal` band (infill.ts `recessRow()`, its measures and the recesses' life in facade.ts): board-
  marked concrete, the slab's edge at each floor, a fin between each two-bay recess, the window and door at the back,
  a solid front over the recess's foot, life in them (mostly plain; a plant, a dish, an air-con unit, a bike, washing
  now and then, the odd front painted), soot under the slabs and heavy rain streaks. The Trenches' `panel` band left
  as it was.
- The concrete a dark, cool grey (the owner's pick after the first look: "darker, heavier"); the corners chamfered
  (45 degrees, tested); the galleries', balconies', ledges' and fascias' fronts concrete; each block's colour a stripe
  down its ends (a tower's down its face away from The Core); the towers' plant rooms plain concrete boxes; the
  bridges' glass and the stair slots a cool dark glass by day, lit warm at night.
- No new draws: on the phone tier at the estate (four headings) 139, 142, 180 and 416 against 144, 147, 184 and 386
  before (the north heading's difference all far city, the run-to-run spread).
- The boot: the band is painted with the atlas at the boot; the far aircraft moved to a chunk of their own to make
  room, and the budget raised from 770 to 775 KB (the owner's call, 2026-11-21).

## What Phase 2 did (2026-11-21)

- The slabs' and the Rampart's stair cores stand off their blocks as service towers (southblocks.ts `SERVICE_GAP`, 3,
  a bridge's length), each with a covered link from its gallery at every landing (`Core.link`, walked by southsky.ts
  `linkShapes()`, drawn as the estate's bridges are), a boiler house jutting from its top and its flue beside it.
- Where there wasn't the room (measured: a street, a parking court or the underpass's ramp near) a tower stands nearer
  (`CORE_GAPS`): Sorrel's west one 1.5 off, Fennel's east one and the Rampart's fourth 1, the Rampart's third and
  Linnet's south one against their blocks as before. 12 of the 17 stand a full bridge off.
- The bridges between the towers follow them (worked out from where they stand); the lifts' doors with them. Nothing
  held in place moved (the snapshot unchanged).

### Phase 2's polish (2026-11-21, the owner's picks)

- **Caged stairs outside the towers**, walkable (southblocks.ts `CAGES`, `CAGE`, `CAGE_FACES`; southsky.ts
  `cageShapes()`, `cageLevels()`): on the 12 towers with room, a steel cage on one face, a dog-leg flight up each
  storey pair between ground and every landing, its mesh, bars and strip lights drawn (`drawCage()`, the bars and
  treads near only). Their solids (`cageSolids()`) keep you out of the frame at street level.
- **The bridges:** inside, a ceiling strip light, mullions every 1.2, puddles and tags (near only); a portal where each
  link meets its gallery; piers under the spans of 10 or more (`PIERS`, six, clear of the paths, courts and blocks);
  each block's name stencilled at its bridges' ends (`SIGN_TEX`, near only, not on phones).
- **The grit** ("gritty, a ghetto", rough but never threatening): the gallery band's doors (`deckRow()`, the
  `brutalDeck` kind: painted, steel or boarded doors, meter cupboards, grilled kitchen windows, tags, grime);
  `RECESS_LIFE`'s boarded and burnt-out flats (dark at night); soot under the slabs and rain streaks; bin stores with
  bags, a dumped mattress, sofa or trolley; chained bikes in the sheds; pigeon netting under the links; dish clusters
  on the slab and tower roofs; a sodium lamp over each tower's door, a puddle and a tag at its foot; one link in four
  tired (`STRIP_TIRED`), one in seven dark. All the small mess near only and off on phones.

- **The boot:** merging main took it to 775.6 KB; trimmed, not raised (the owner's call): the memory measures
  (`perf.ts`) load only with `?fps`, `?bench` and `__mem()`. 774.6 KB after. Main's next merge took it to 775.6
  again: the readout's text moved to its own chunk too (`readout.ts`), 774.6 KB after.

## What Phase 3 did (2026-11-21)

- **The Perch** (the owner's name; southblocks.ts `PERCH`, `TOP_FLOOR`): a hexagonal concrete drum round The Core's top
  two floors (the owner's pick: wrapped, not set on top), 4.3 from its middle to a face against The Core's 3, a flat face
  to each tower. Its floor is the top floor (17); its roof is The Core's, so The Core is no taller (`topOf()` as it was,
  about 20). Drawn by southblocks3d.ts `drawPerch()`: its floor slab and soffit, a glass band all round (its outer face
  only, so from inside you see the city through it), dark by day and lit warm at night, the concrete band over it with
  its name stencilled on two faces, the ceiling and a strip light round it inside, the lift house on its roof; near, a
  glass lift in its middle and mullions.
- **The twins joined at the top:** a bridge from The Perch to Harrier and to Kite at the top floor (`core-harrier-17`,
  `core-kite-17`: a bridge's end at The Core is The Perch's face from that floor, `footOf()`), through doorways left in
  its glass; each tower's door where it lands.
- **Walked** (the owner's pick: now, not at Phase 8): its whole floor inside the glass (southsky.ts `PERCH_IN`), held in
  by it but for the bridges; The Core's lift up to it by name (`SkyLift.names`, `liftFloorName()`: "The Perch").
  Phase 8 brings its seats, lounge and pin.
- The fifteenth floor's bridges pass under its soffit (tested); the boot 774.9 KB of 775.

## What Phase 4 did (2026-11-23)

- **On the slabs' ends** (southblocks3d.ts `drawEndKit()`, picked by `hashOf()` the block's id): three ducts up one end
  of most blocks beside its stripe, jogging aside at a gallery floor, over the parapet and down onto the roof; steel
  brackets every other storey and joints every third (near only); on the other end the rubbish chute, a square duct
  down its gallery-side corner, a hopper at each sky floor and the bin hatch at its foot (near).
- **On the flats** (`drawFlatKit()`, near only, not on phones): an air-con unit on the odd balcony front (the wall where
  there are none), washing on lines along the galleries just inside the front, two water tanks on legs and an aerial
  in the middle of each roof. The dishes were the grit's (Phase 2's polish).
- Existing materials only (no new draws far off); phones keep the ducts and chutes, the rest is off. The stadium's
  removal (2026-11-22) made the room in the boot and the textures first.

## What Phase 5 did (2026-11-23)

- **The shops under the podium deck** (southblocks.ts `DECK_SHOPS`, `DECK_SHOP_NAMES`, tested): ten units on Teasel's
  and Fennel's gallery-side ground floors facing the court under the deck. The owner's names: **The Wash House** (the
  launderette) and **Deck Stores** (the corner shop), each a glazed front lit warm at night, a door, a dark fascia and
  its neon (southblocks3d.ts `drawShops()`, `SHOP_TEX`: pink and cyan tubes, minimal bloom); the other eight roller
  shutters down (the owner's pick: tagged), one with a To Let board. Tired strip lights under the deck's soffit, the
  odd one dead. They become places to run in Phase 7.
- **Cables** strung between neighbouring blocks (`CABLES`, a sagging pair between each two blocks 6 to 28 apart), not
  on phones.
- **Puddles** in the courts that catch the sodium lamps at night (`courtPuddles()`, `PUDDLE_SHINE`), near only.
- **The noticeboards**: a cork board in a steel frame on two posts by every core's lift door, notices pinned up, near.
- Bins were the grit's already (Phase 2's polish).

## The owner's decisions (2026-11-21)

- **The concrete:** a cool grey, each block's own accent kept bold as a stripe on its end; after the first look, darker
  and heavier (2026-11-21).
- **The lookout:** a hexagonal drum on The Core, wrapped round its top two floors, walked from Phase 3; named The Perch.
- **The flats:** a flat of Degen's own to live in (and wake in, if chosen); no flats let out.
- **The shops under the deck:** a launderette and a corner shop.
- **The order:** the look first (phases 1 to 5), then the places (6 to 8).
- The shops' names (2026-11-23): The Wash House and Deck Stores; the empty units shuttered and tagged.
- Still to pick, at its phase: which block the flat is in (Claude to suggest a block when Phase 7 starts).
