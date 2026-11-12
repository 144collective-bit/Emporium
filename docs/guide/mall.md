# Palm Court and Starlight Mall

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Palm Court and Starlight Mall** (the owner's call): a shopping plaza and
  a mall on the land between the Parkway and the ring highway's north side,
  the mall east of Uptown North and Palm Court across the east ring avenue
  from it, planned in `docs/mall-plan.md` in steps, each with
  the owner's sign-off (1 both from outside, built; 2 the mall's walk-in
  interior, built; 3 maybe shops run with Dorras); keep it up to date. A
  modern mall (the redesign, the owner's call; it was retro neon 80s):
  white and light-grey cladding, glass curtain walls in black steel, timber
  slats and soffits, stone paving, warm white light, inside and out;
  made-up names only, no prices on any sign; under the Emporium (`TALLEST`).
  - The two small north-south streets stop at the Parkway (`SHORT_NS`,
    `nsRuns()` in layout.ts: streetplan.ts ends each at its crossing, their
    junctions on the highway's north side and their slips went; world.ts,
    outer.ts's kerbs and the outskirts' trees honour it).
  - `mall.ts` (DOM-free, tested in `tests/mall.test.ts`): Palm Court
    (`COURT`, block `palm-court`, east of the mall across the east ring
    avenue (ns3; moved there from the park's side, the owner's call, its old
    land Uptown North's, below), as wide as it was (`COURT_W`): the promenade
    `PROM`, two rows of shops facing across it, `SHOPS` from `SHOP_NAMES`, each its `style` (`ShopStyle`: glass, render,
    clad, timber), a third two storeys,
    the west row open to the zebra over the avenue to the mall's forecourt
    `ZEBRA`, the east row across from it to the open land `EAST_GAP`
    (`TOWER_ZEBRA` crosses the north avenue from Uptown North's square to
    the forecourt's other end; both avenues' medians break at their zebras,
    `highwayGaps()`), festoon lights across the promenade (in the FX layer),
    Paradise Cinema across the north end `CINEMA`, the
    `FOUNTAIN`, `BENCHES`, the trees' planters `COURT_TREES`, the PALM COURT
    `ARCH`); Starlight Mall
    (`MALL_BLOCK`, block `mall`: the `HALL`, its `PORCH`, the `ANCHORS`
    Maxwell's (light) and Bright & Co. (dark), the totem `PYLON`, the bus
    `SHELTER`, the forecourt's `PLANTERS` and `PAY_STATIONS`); the
    two-way loop off the north avenue (`LOOP`, `MALL_STREETS` /
    `MALL_CROSSINGS`: traffic drives it) round the car parks (`PARK_BLOCK`,
    block `mall-park`: `CAR_PARK`, `BAYS` in groups of four with planted
    `ISLANDS` between (a stone kerb, a paved walk down the middle,
    `ISLAND_WALK`, with light bollards, beds with hedges, flowering shrubs and
    grasses, four trees each from `islandTrees()`, a lamp by the walk; EV
    chargers with their bays painted green on every other one, a trolley
    shelter on the rest), `PARKED`, the zebra to the porch `LOOP_ZEBRA`, the taxi rank
    `RANK_CABS`, the multi-storey `MSCP` and its cars `MSCP_CARS`);
    `MALL_SOLIDS` (in `SOLIDS`), `MALL_LAMPS`, `MALL_TREES` (placed at the
    boot with the town's, on the planters and islands), `MALL_PEOPLE`, `COURT_SPAWN`,
    `MALL_SPAWN`, `MALL_AREA` (Uptown North's block to Palm Court: the outskirts' trees keep off, `treeSpot()`).
  - `mall3d.ts` draws them, a district loaded as you approach
    (`LAZY_DISTRICTS` id `mall`): sites (the shops by style, lit windows,
    signs, canopies with LED edges, rooftop plant; festoon lights across the
    promenade; the cinema, dark-clad with a glazed lobby, a canopy and
    poster lightboxes for made-up films (uptownsites.ts `FILMS`); the water
    feature, benches, planters, the gateway; the anchors with their fronts,
    side signs and loading docks; the hall's curtain wall, its glass vault
    on black ribs; the porch's feature wall, canopy and open doors; the
    totem, the shelter, the forecourt; the loop, its zebras, the bays,
    islands and trolley shelters, the TAXI board, the multi-storey behind
    perforated screens), one sign atlas (`mall-signs`), and on the main thread the parked cars and cabs. The
    places are `mallspot.ts` (spots `palmcourt` and `mall`: pins, directory
    entries, panels `data-panel-tpl="palmcourt"` / `"mall"` with Walk in,
    `PLACES` and `LIVE_PLACES` entries); the world map draws their
    footprints. The shared paint, the surfaces laid on in world units
    (`worldUV`: `CURTAIN`, `CLAD`, `CLAD_DARK`, `RENDER`, `TIMBER`, `PAVING`,
    `FLOOR`, `PERF`; `face()`, `flat()`), the sign atlases (`signAtlas()`,
    32 cells, a `light` set in charcoal on white) and the helpers are
    `mallkit.ts`.
  - **Inside the mall** (step 2, built) is `mallinside.ts` (DOM-free,
    tested in `tests/mallinside.test.ts`): the hall is hollow (`WALLS`, the
    doors open behind the porch, `DOOR`, with `BOLLARDS` across them: a
    walker gets through, no car does); two floors (`UP` apart; `UPPER`: the
    galleries and the terrace across the north end) round the atrium
    (`VOID`) under the vault; sixteen units, four a side on each floor
    (`UNITS`, made-up `UNIT_NAMES`); two escalators side by side up to the
    terrace (`ESCALATORS`, `escalatorY()`); the food court on the terrace
    (`FOOD_STALLS`, `TABLES`); the fountain, benches, trees and columns;
    two kiosks in the atrium (`KIOSKS`); the glass lift by the east gallery
    (`LIFT_SHAFT`, `MALL_LIFT`: walk prompts "Lift · Upper floor" / "Lift ·
    Ground floor", `mall-lift:up` / `:down`, a fade through `rideTo()` in
    index.ts, closed with the place);
    downstairs under the terrace the kiddie rides, the information desk and
    the photo booth (`GROUND_THINGS`), the anchors' doors; the directory
    boards in the lobby. Walking: `mallFloor()` (the floor by Degen's
    height) in walk.ts's `groundAt()`, `mallWall()` (the upper floor's
    edges, an escalator's side, what stands on his floor, `LEVEL_SOLIDS`)
    in `blocked()`, `MALL_CAMERA` (the roof and the upper floor's slabs)
    for the walk camera; `MALL_INSIDE_SOLIDS` (in `SOLIDS`),
    `MALL_INSIDE_PEOPLE`, `INSIDE_SPAWN` (the panel's Walk in). Drawn by
    `mallinside3d.ts` (`registerInside()`, from mall3d.ts's `register()`;
    near only, no shadows: the hall's shell casts none, so the day comes
    in as through the skylight): pale stone floors, white slabs with warm
    LED edges and timber soffits with slots of light, white and black-steel
    shopfronts, glass balustrades, the escalators (their steps run on the
    main thread's tick, still under reduced motion), the timber food court,
    the kiosks, the glass lift, a ring of light over the fountain, one sign
    atlas (`mall-signs-in`).
