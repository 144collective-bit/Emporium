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
  - **The Skywalk** (docs/mall-plan.md "One mall" Phase 1, built; the
    owner's call, 2026-11-18: the mall and Palm Court made one, the metro
    through it): `malllink.ts` (DOM-free, tested in
    `tests/malllink.test.ts`). It is made of three parts:
    - **The bridge** (`LINK`) over the east ring avenue from Bright & Co.'s
      east face to the pavilion, with traffic under it (`CLEAR`). It has two
      floors:
      - the lower floor (`L1`, the hall's upper floor's height): benches,
        trees, the BRISK COFFEE kiosk (`KIOSK`, the café from the shops the
        pavilion took), the el's pillar a white column (`COLUMNS`);
      - the platform floor (`L2`, the train's floor over the el's deck,
        metro.ts `PLATFORM_UP`: `needAt()` raises the el through `LINK_Z`,
        mall.ts) east of the track behind a glass screen (`SCREEN_X`), with
        benches: since Phase 2 the metro's **Starlight Mall station**
        (metro.ts `inside`; `docs/guide/getting-about.md`). It has:
        - the screen's doors and a yellow line along the platform, the
          station's name and the metro's M over it;
        - the fare gates (`GATES`, for the look: rides are free) between
          the platform and the platform floor's mezzanine, METRO and the M
          over them (`BOARD`);
        - the next-train boards (`NEXT_BOARDS`): words from metro.ts
          `nextTrain()`, no numbers; drawn on the main thread on a `liveTex()`
          as the timetable goes (`METRO_CLOCK`), held still under reduced
          motion;
        - the glass lift in the pavilion's north-west corner (mall.ts
          `LINK_LIFT`, the station's `tower`; `STATION_LIFT`: Street, Mall,
          Metro; its prompt `stationLiftDoors()` on the floor you're on, the
          floor picker skylift-ui.ts `openStation()`);
        - the Metro prompt (the station's door) on the platform, and the
          metro's M with the station's name on the bridge's glazed ends and
          the pavilion's south pier.
    - **The corridor** (`CORRIDOR`): from the hall's east gallery, where
      the east upper unit third from the north was (mallinside.ts
      `CORRIDOR_Z`, `CORRIDOR_IN` in `UPPER`; `UNITS` is fifteen), through
      Bright & Co.'s upper floor between its windows.
    - **The pavilion** (mall.ts `PAVILION`, in place of the west row's two
      northern shops: `SHOPS` leaves them out). It has a triple-height
      atrium, the lower floor's mezzanine across its north end (`MEZZ_L1`)
      and the platform floor's across its south end (`MEZZ_L2`). Two pairs
      of escalators cross the atrium (`FLIGHTS`: `ESC_G` up from the street
      rising north, `ESC_UP` from the lower floor rising south, each with
      `flightY()`). Its doors (`PAV_DOORS`) are on the promenade and the
      avenue's sidewalk.

    Walking:
    - `linkFloorAt()` is groundheight.ts's `link` layer: under the bridge
      the avenue is the street.
    - walk.ts asks `linkUp()`, then only `linkWall()` up there (off every
      floor is an edge; `LINK_SOLIDS` between heights). In the pavilion's
      street floor, `linkWall()` keeps you from the escalators' sides and
      from under them.
    - `LINK_WALLS` (in `SOLIDS`) are its walls at street level; `LINK_CAMERA`
      is for the walk camera; `LINK_PEOPLE` are in the crowd.

    Drawn by `malllink3d.ts` (`registerLink()`, from mall3d.ts's
    `register()`):
    - Outside: the slab and its lit soffit, the glazed ends with the el's
      portals, one roof with a glass barrel vault, and the pavilion's front
      with the mall's name and gold star.
    - Inside (near only): the floors, timber soffits, balustrades, the
      platform screen, the escalators (on the hall's running steps,
      mallinside3d.ts `STEPS_UP` / `STEPS_DOWN`), the corridor, the
      furniture and the signs.
    - Its words are in the outside's atlas (mall3d.ts `CELLS`, all 32).
    - Bright & Co.'s box and avenue face, the hall's east wall and the units'
      east strip are drawn open round the corridor.
  - **Palm Court indoors** (docs/mall-plan.md "One mall" Phase 3, built; the
    owner's picks: a glass barrel vault, shops on both floors, bridges
    across, an upstairs food hall, the cinema's upstairs entry):
    `courtinside.ts` (DOM-free, tested in `tests/courtinside.test.ts`).
    - **The rows** (mall.ts `SHOPS`, `ROW_H`) are two storeys: the shops
      downstairs, more upstairs (`UPPER_UNITS`, `UPPER_NAMES`). The
      promenade is under a glass barrel vault (`VAULT_RISE`).
    - **Upstairs** (`UPPER`, at `L1`, the hall's and the Skywalk's height):
      - the galleries (`GALLERY_W`);
      - the food hall's terrace across the north end (`TERRACE`, `TABLES`;
        its stalls in the east row's north end, `FOOD_STALLS`), with
        Paradise Cinema's doors up there (`CINEMA_DOORS`);
      - three glass bridges over the void (`BRIDGES`);
      - the way into the Skywalk's pavilion (`CONNECTOR`, where its
        promenade door is: malllink.ts `PAV_DOORS`, `L1_FLOORS`).
    - **The void** (`VOID`): the fountain, its benches, trees in white
      planters (`COURT_PLANTERS`; the city's trees and the promenade's
      lamps and festoons went, mall.ts), and the escalators by the south
      entrance up to the south bridge (`ESCALATORS`, `escalatorY()`).
    - **The entrances** (`ENTRANCES`): the south end (where the PALM COURT
      gateway was, `ARCH.z`), the west passage from the avenue's zebra, and
      the east one. `COURT_INSIDE_SOLIDS` (in `SOLIDS`) are their walls, the
      cinema's corners and the escalators' balustrades.
    - **Walking:** groundheight.ts's `court` layer is `courtFloor()`;
      walk.ts asks `courtWall()` (off the upper floor's edges, under an
      escalator, `LEVEL_SOLIDS`). `COURT_CAMERA` is for the walk camera,
      and `COURT_INSIDE_PEOPLE` are in the crowd.
    - **Drawn by `courtinside3d.ts`** (`registerCourt()`, from mall3d.ts,
      which keeps the cinema without its canopy and the fountain):
      - Outside: the rows' cladding with a ribbon of glass upstairs, the
        vault on its curbs with ribs and gables, the entrances under PALM
        COURT, the stone floor.
      - Inside (near only): the shopfronts on both floors (downstairs
        names from the outside's atlas, upstairs from `court-signs`), the
        food hall, the slabs and soffits, the balustrades, the escalators
        (malllink3d.ts `escalator()`), the trees.
    - The Skywalk's pavilion front is open upstairs at the `CONNECTOR`, and
      its door canopies went (the gallery is over them).

