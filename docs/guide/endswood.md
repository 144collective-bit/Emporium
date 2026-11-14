# Endswood Estate and the south of The Trenches

Part of the project guide (`CLAUDE.md` is its index); keep it up to date when what it describes changes.

- **The south re-laid** (the owner's calls, 2026-11-14, `docs/south-plan.md`): Endswood, "the Ends", and the land
  round it are being rebuilt as one place that grew: an old village (Aldwyn's Green) on winding lanes with the estate
  dropped into part of it, tall along the ring road, low to the hedged fields, the Circus the heart, Lot 9 shrunk to
  the south-east. Built a phase at a time with the owner's sign-off. **Phase 1b is built: the streets are in and the
  old estate is taken up.** What stands on the blocks comes back in Phases 2 (the blocks: the Wall, the twin towers,
  the stairwell blocks, the sky network) and 3 (the village's terraces, the High Road's places, St Aldwyn's).
- **The street web** is `south.ts` (DOM-free, the boot's, tested in `tests/south.test.ts`), built on `streetfaces.ts`
  (DOM-free: `smooth()` lines through control points, `node()` putting a shared point wherever lines meet or cross,
  `faces()` tracing the blocks between them, Sunridge's way made general). In it:
  - **The Circus** (`CIRCUS`, at (-82, 418), one way round, `CIRCUS_STREET`) and its five spokes: the High Road
    (`HIGH_ROAD`) west to Degen's gates, Underhill Lane (`UNDERHILL`) north to the tunnel's mouth, Church Road
    (`CHURCH_ROAD`) over the village's hill and on west to the fields, Southfold Lane (`SOUTHFOLD`) south past Lot 9 to
    the country, and Endswood Road (`ENDSWOOD_ROAD`): ns1s bent in off its line. ns2s bends into Marsh Lane
    (`MARSH_LANE`) down to Southfold Lane; the street plan ends both avenues where they bend (`NS_BENDS`). The south
    avenue (ns0s, its buses and Lot 9's road) and ns3 (the airport's edge) stay straight.
  - Gate Lane (`GATE_LANE`) past Degen's compound (`COMPOUND`, endsfar.ts `PLOT`: it never moved), Field Lane out west,
    the links (`FENNEL_WAY`, `RUNWAY_VIEW`, `LOT_LANE` in through Lot 9's west gate onto its lane, `BRAMBLE_LANE`,
    `BROOKSIDE`), the village's streets (Bell Street, Yew Walk, Chapel Row round the churchyard, Orchard, Lark, Hill,
    Mill, Thorn).
  - **The closes and crescents**, grown off them (seeded, the same every time: crescents first, then closes), every
    one in a council, village or bungalow zone, clear of the other streets by `CLEAR`, with **a footpath through**
    (`FOOTPATHS`, the owner's rule: nowhere is a dead end on foot), on ahead past the close's end or out from the
    crescent's back, never back to the street it grew off. A new street joins `MAIN` (and `GROWS` decides where
    closes may grow).
  - `SOUTH_CROSSINGS` (where two or more meet; the avenues by their plan ids), `SOUTH_BLOCKS` (the faces, each with
    its `zone`: tall, estate, council, village, bungalow; too thin to stand on, a sliver is left as grass,
    `SOUTH_GREENS`), `zoneAt()`.
  - The brook (`BROOK`, `BROOK_HALF`) from the fields along the village's south edge, under Southfold Lane (its bridge,
    `BRIDGES`) and on past Lot 9's west side; the rec ground's land on its south bank (`REC`), St Aldwyn's
    churchyard on the hill (`CHURCHYARD`), the hedges round the fields (`HEDGES`), Lot 9's fence's agreed bounds
    (`LOT9_BOUNDS`, `LOT9_EDGE`: lot9.ts owns the fence).
- **`endswood.ts`** (DOM-free, the boot's, tested in `tests/endswood.test.ts`) is what the city asks of the estate:
  its land as a grid of cells over the blocks and the streets with their sidewalks (`inEndswood()`, `ENDSWOOD_RECT`:
  the fields round it are the country's, not the estate's), sodium lamps along every street's sidewalk and round the
  Circus (`ENDS_LAMPS`, lampmix.ts, lampposts.ts), and the bollards at each end of every footpath (`PATH_BOLLARDS`,
  `ENDS_SOLIDS` in `SOLIDS`).
- **The street plan** (`streetplan.ts`) takes `SOUTH_STREETS`, `SOUTH_CROSSINGS` and `SOUTH_BLOCKS` (the estate's and
  the tall band's ref `endswood`, paved as the Docks'; the village's, the rows' and the bungalows' ref `south`,
  grassed; areas.ts reads both as Endswood's), and Lot Lane joins Lot 9's `lot9-w` crossing.
- **Drawn** by `south3d.ts` (`LAZY_DISTRICTS` id `south`, `SOUTH_DRAWN`), all sites: the asphalt along each street
  (roads3d.ts's `ribbon()`, the Circus a hair over its spokes), a dashed centre line down the main roads and links,
  the turning circles, the Circus's planted island, the footpaths (paved, over the blocks) and their bollards, the
  brook between its banks and the bridge's parapets, the hedges, the rec ground's and the churchyard's grass, the
  compound's paved plot and the compound itself (`registerHome()`, home3d.ts), and Lot 9's tunnel under the ring road
  (`tunnel3d.ts`, the estate's subway dressing it always had).
- **The ground** (ground.ts): worn grass and bare patches round the estate (`ESTATE_LAND`), a worn lawn through the
  village and the rows (`VILLAGE_LAND`), the brook's banks lush. **Trees keep off** (landuse.ts `KEEPS`) the estate's
  land, the brook and the rec ground; the fields keep theirs.
- **Its places** (`endsplaces.ts`, tested in `tests/endsplaces.test.ts`): the estate (pin over the Circus), St
  Aldwyn's (over its churchyard) and Bunker Sound (by Endswood Road), still "coming soon", their pins where they're to
  be built, no doors until their buildings stand (the owner's call), `ENDS_SPAWNS` on a sidewalk by each.
- **Its sound** (ambience.ts `ends`): on its land and 25 past it. Bunker Sound's beat and St Aldwyn's bell are off
  until their buildings come back (`studio`, `bell` are 0).
- **Below ground**: Lot 9's tunnel only (groundheight.ts `UNDER`, underground.ts); the Circus's well and its subways
  are Phase 4's.
- **`?bench` views**: `south-circus`, `south-high`, `south-village`, and `ends-home` (the compound from the High Road's
  end).
- **Degen's home** is the compound (`docs/home-plan.md`, `docs/ends-far-west-plan.md`): `home.ts` on `endsfar.ts`'s
  `PLOT` and `GATES` (all that file is now), its gates on Gate Lane at `HEAD`; the wall and gates, the double garage
  (`CAR_HOME`, `BIKE_HOME`, `HOME_GARAGE_DOOR`), the workshop (`HOME_WORKSHOP_DOOR`), the house with its room
  (`ROOM`, `FURNITURE`, `HOME_PORTALS`, `HOME_USES`: the wardrobe and the stash) and its roof terrace (`ROOF_Y`,
  `TERRACE`, `ROOF_THINGS`, `onRoof()`, `roofWall()`, groundheight.ts's `homeroof` layer), drawn by `home3d.ts`
  (registered by `south3d.ts`). A new thing in the room goes in `FURNITURE`, on the terrace in `ROOF_THINGS`.
- **What was here before** (the estate's brutalist blocks with their decks, lifts and stair towers, the church, the
  parade, the subways and well, the common, the west rows, the far west's bungalows and allotments) was taken up for
  the re-laying, the owner's call: its plans (`docs/estate-plan.md`, `docs/ends-west-plan.md`,
  `docs/ends-far-west-plan.md`) are the history of how it was, not what stands now.
