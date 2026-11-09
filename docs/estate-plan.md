# Endswood Estate (plan)

The owner's call (2026-11): a rough London council estate, **Endswood Estate**,
known as **the Ends** ("TheEnds"): a concrete jungle of brutalist blocks with
subways, underpasses and abandoned buildings, corner shops, an old but large
church and a DIY recording studio. It goes on Lot 9's land, south of the ring
highway under The Trenches, and Lot 9 moves further south, so the three run
north to south as one blend: The Trenches (inside the highway) → the highway on
its viaduct → Endswood → Lot 9 furthest south.

Rough but never threatening (as The Trenches and Lot 9): worn, lived-in,
tagged, emptied flats and boarded buildings, no violence or crime shown.
Made-up names only (never a real estate's, block's, brand's or person's), no
real logos (no TfL roundel, no phone company's), every sign fixed copy. Under
the Emporium (`EMPORIUM_ROOF`, 12.5) unless the owner says otherwise (below).

Built one phase at a time, each with the owner's sign-off. Keep this up to date.

## What makes it London, not Brooklyn

| The Trenches (Brooklyn) | Endswood (London) |
|---|---|
| Red brick, fire escapes, stoops, water tanks | Raw concrete, deck access, no fire escapes or tanks, lift motor rooms on flat roofs |
| Towers each on its own block | Long slabs and a point tower joined by bridges, "streets in the sky" |
| Shops along the street wall | A parade of shops under a block, set back behind a forecourt |
| Chain-link courts on asphalt | Grass with desire lines, low brick walls, green council railings, garages under the blocks |
| Fire escapes and stoops to sit on | Deck railings to lean on, the bin store, the subway |

## The land (proposed)

- **Endswood:** from the highway's south edge (after exit 6's outside slip
  ramp, which runs along it west of the avenue) to about z 430, from Lot 9's
  west fence (x -128) east to the north avenue's line (ns3, x 64.5). Lot 9's
  land today is the west half (x -128 to the south avenue); the south avenue
  (ns0s, x -4.5), ns1s (x 17) and ns2s (x 43) already run straight through to
  the world's edge, so the east half is three strips between them, ready made.
  General aviation's road and landside start east of ns3: untouched.
- **The common** (the blend strip, about z 430 to 470): rough grass and a dirt
  path from the estate to Lot 9. The airliners' final approach runs along
  z 442 here (airfield.ts `jetFlight()`: about 15 tiles up at the west end
  coming down to 9 by the avenue), so jets come in low over the common: very
  real for an estate on the edge of town, and why nothing tall goes south of
  the estate.
- **Lot 9**, moved south: the same layout, homes and fence, shifted about 130
  south (the fence at about z 472 to 542), its lane in off the south avenue
  further down, the hole in its fence now on the north side facing the common.
- The tunnel from The Trenches (`TUNNEL`, lot9.ts) stays where it is and lands
  in Endswood: it becomes the estate's first subway.

## The look

- **Concrete that reads in toon shading** (new bands in the wall atlas,
  infill.ts): board-marked concrete (the timber shuttering's grain), rain
  streaks under every ledge, sill and parapet, precast panel joints in a grid,
  exposed aggregate panels, dark engineering brick at the plinths and bin
  stores, and faded 70s colour panels under the windows (burnt orange, teal,
  mustard): the only colour on the blocks.
- **The blocks:**
  - the **barrier block** along the highway: a long deck-access slab, small
    windows on the highway side, its decks facing into the estate (a door,
    mat, plants and a bike along every deck, each door its own colour);
  - the **point tower** with its lift and stair tower standing apart, joined
    by bridges every few floors, the lift motor room and an aerial on top;
  - **maisonette blocks** round the green, garages underneath (roll-up doors,
    some tagged, some scorched);
  - a **stepped terrace** on the south edge, stepping down towards the common;
  - **abandoned buildings:** a block emptied for demolition (every window
    behind grey perforated steel screens, hoardings round its base reading
    REGENERATION · COMING SOON with made-up developer copy), a boarded-up pub
    and a derelict community centre, all shut.
- **The subways and underpasses:** the estate's walks pass under its roads.
  The centrepiece: the estate road meets the south avenue at a roundabout with
  a **sunken subway hub** in its middle, open to the sky, ramps down from the
  pavements and a subway under each arm (tiled walls, murals, flickering
  tubes, tags). Built on Lot 9's tunnel's kit (`tunnelY()`, `tunnelWall()`,
  `tunnelRoom()`, holes cut in the ground): anything new below ground goes
  through the same three, made general for many tunnels.
- **The corner shops** on the street corners and the **parade** under a
  block: off-licence, chicken shop, launderette, barber, chippy, newsagent,
  phone repair (made-up names), shutters on some, a tenants' hall.
- **The church:** old but large, older than the estate round it: a Victorian
  Gothic church in soot-darkened stone, a tall tower and spire, a big west
  window lit at night, its churchyard behind railings with yews and old
  headstones, the concrete pressing in on every side.
- **The recording studio** (the owner's "ghetto recording studio"): a DIY
  studio in a converted garage and lock-up under a block: foam on the walls
  seen through the open door, a red ON AIR light, cables, a battered sofa
  outside, a few people about, a pirate-radio aerial on the tower's roof, the
  beat leaking out (its own sound, as Club PULSE's).
- **Street level:** zebra crossings with orange-globe beacons, double yellow
  lines, speed bumps, concrete lamp columns with sodium lamps (lampmix.ts
  `SODIUM_AREAS`), green railings, concrete bollards, CCTV on poles, intercom
  panels, the communal bin store, a NO BALL GAMES sign on the green, a
  games pitch (green fence, red surface), the estate board with the blocks'
  names. Traffic keeps the city's side of the road.
- **Night:** a strip of light up each stairwell, fluorescent tubes along the
  decks (some flickering), TVs glowing, the church's window, sodium orange
  below.
- **Life and sound:** kids doing wheelies, mopeds, tracksuits, neighbours on
  the deck railings, an old lady with her shopping trolley, dogs on leads;
  pigeons, mopeds, the two-tone siren far off, an ice-cream van's chime now
  and then, the church's bell on the hour, the studio's beat.

## The blend

- **The Trenches → Endswood:** the highway is the seam. The tunnel under it is
  Endswood's subway (dressed to match: tiles, murals); under the viaduct, where
  viadress.ts already has half courts and murals by The Trenches and Lot 9, a
  skate spot and lock-ups; the sound walls on the parapet stay (homes behind).
- **Endswood → Lot 9:** the estate's garage court and the stepped terrace on
  its south edge, then the common: rough grass, a worn dirt path, a dumped
  mattress, a burnt-out moped, a ditch with a plank bridge, the jets coming in
  low; brick walls and green railings giving way to broken chain-link, concrete
  to grass to gravel (ground.ts's influences). Sodium lamps all the way.

## The phases (proposed)

1. **Lot 9 moves south.** Nothing else changes: its land, fence, lanes,
   homes, people, lamps and bus stops shifted; its path now from the common.
   The layout snapshot is rewritten (the owner's go). The tunnel stays.
2. **The land, streets and subways.** `endswood.ts` (DOM-free, tested): the
   land, the estate road and the roundabout, the blocks in the street plan,
   the subway network (the tunnel kit made general), the trees, rolls and
   ground kept off and blended, sodium lamps, exit 6's signs renamed
   ("Endswood · The Trenches"), bus stops at the entrance.
3. **The blocks.** The concrete bands in the wall atlas; the barrier block,
   the tower and its lift tower, the maisonettes, the terrace and the
   condemned block as data, drawn by `endswood3d.ts` (a district loaded as
   you approach), details near only.
4. **Street level.** The parade, the corner shops, the church and its
   churchyard, the recording studio, the green, garages, bin stores, the
   pitch, the street furniture, the abandoned pub and community centre.
5. **The decks and bridges walked on** (the barrier block's decks and the
   bridge to the tower, as Liberty Bridge's high level).
6. **The blend.** The common, the path, Lot 9's fence; the viaduct's
   underside; the tunnel dressed.
7. **Life, night and sound.**
8. **Places and polish.** Pins and panels, bench views, phones.

## The owner's answers (2026-11-05: "go with your suggestions")

1. **The land:** Lot 9's old land plus the three strips east of the south
   avenue to ns3.
2. **Height:** the blocks under the Emporium; the church's spire may rise
   over it (the owner's exception, as Uptown's towers).
3. **The church:** a made-up name (St Aldwyn's, unless the owner names it);
   scenery first, walking in later.
4. **The recording studio:** a made-up name (Bunker Sound, unless the owner
   names it); a place with a pin and panel, "coming soon".
5. **The corner shops:** scenery now; run for Dorras like The Trenches' four
   in a later phase.
6. **The abandoned buildings:** boarded, with one way in round the back for
   the storyline.
7. **Places:** the estate (its spot on the tenants' hall), the church and the
   studio, tied to Lot 9's storyline.
8. **The roundabout's sunken subway hub:** in, the centrepiece.
9. **Walkable decks:** in (Phase 5).
10. **Blocks' names:** made up, "___ House", "___ Court", "___ Point" (Fennel
    House, Linnet Court, Harrier Point, ...).
11. **Signs:** the estate board reads ENDSWOOD ESTATE; tags and murals say
    THE ENDS.

## Built

- **Phase 1 (Lot 9 moved south):** `MOVED` (130) in lot9.ts: its fence, lanes,
  lots, homes, office, laundry, fire pit, junk corner, lamps, trees, people,
  dogs, cars, bus stops and spawn all moved with it; `LOT9_RECT` is its own
  land now (the fence and the lane to the avenue). The tunnel stays where it
  was; its footpath runs south from the ramp's top over the open land to the
  hole in Lot 9's north fence (`FOOTPATH`, a point every `PATH_STEP`, drawn a
  few stretches a site; `PATH_RECT`). `endswood.ts` holds the estate's land,
  for now exactly Lot 9's old land (`ENDSWOOD_RECT`), so what stood by it
  stays: the highway's sound walls and the courts and murals under its deck
  (viadress.ts), the trees and the rolls kept off (`KEEPS`: `endswood`,
  `lot9`, `lot9-path`), sodium lamps (`SODIUM_AREAS`) and the hood's sound
  (ambience.ts). Exit 6 still reads "Lot 9 · The Trenches" until Phase 2.
- **Phase 2 (the land, streets and subways):** `endswood.ts` (DOM-free, the
  boot's, tested in `tests/endswood.test.ts`):
  - **The land** (`ENDSWOOD_RECT`) widened from Lot 9's old land east across
    the south avenue to the east avenue's west kerb; the blocks from `WEST_X`
    (the path down to Lot 9 runs west of them) between `NORTH_Z` (clear of
    exit 6's ramp and its piers) and `SOUTH_Z` (the common south of it).
  - **The streets** (`ENDS_STREETS` / `ENDS_CROSSINGS`): Endswood Road from
    the Circus east over the south avenue (lit), ns1s and ns2s to the east
    avenue (lit); **Endswood Circus** (`CIRCUS`: one way round, anticlockwise
    as Uptown Circle, its traffic giving way where the road joins); and the
    Close west off it, a dead end with concrete bollards across its end
    (`CLOSE_BOLLARDS`: a walker gets through, no car does). The traffic drives
    the road both ways and round the Circus. **A change from the plan:** the
    Circus is on the estate's own road a block in from the south avenue, not
    on the avenue itself (cutting the avenue would have meant re-laying its
    asphalt, median and lines through the junction); the well and its
    subways are as planned.
  - **The blocks** (`ENDS_BLOCKS`, ref `endswood`, grit: grey sidewalks over
    worn concrete as the Docks', world.ts): four round the Circus, cut round
    it (`cutCorner()`), either side of **the spine** (`SPINE`: the walk north
    and south of the Circus, narrower than a verge needs so the blocks' edges
    stay square), and two in each strip east of the avenue.
  - **The subways and the well** (`SUBWAYS`, `WELL`): the Circus's middle sunk
    to a round place open to the sky, a subway north and south from it under
    the island and the carriageway, each up a ramp into the spine; the only
    way into the middle on foot. Solid (`ENDS_SOLIDS`, in `SOLIDS`): the
    parapets along the cuttings, the headwalls over the portals, the bollards
    at the ramps' tops, the well's railing round its rim.
  - **The underground kit** (`underground.ts`, DOM-free): passages (along x or
    z, ramps, roofed stretches) and wells, and `underworld()`: `y()`,
    `wall()`, `room()`, `roofed()`, `inZone()` for any set of them; Lot 9's
    tunnel is one passage of it (`LOT9_PASSAGE`, its own functions now
    wrappers, tested the same), and walk.ts asks one underworld of the tunnel,
    the subways and the well (the camera held low only under a roof).
    `holesOf()` / `wellHole()` are the ground cut away (world.ts).
  - Sodium lamps (`ENDS_LAMPS`) along the road and the Close, round the Circus,
    round the well and at the spine's ramps; the trees and the rolls kept off
    (`KEEPS` `endswood`), its ground worn round it (ground.ts); its area in
    the seam map (areas.ts, grit); a bus stop each way on the south avenue
    (transit.ts); exit 6's signs read "Endswood · The Trenches".
  - Drawn by `endswood3d.ts` (`LAZY_DISTRICTS` id `endswood`): the roads
    (worn asphalt, a dashed centre line, patches, give-way lines into the
    Circus, the Close's bollards), the Circus's carriageway, the island's kerb
    and paving, the well (its floor, drain and puddle, its wall tiled at the
    foot, THE ENDS painted big round the east and west walls, tags and bills,
    the coping and the council-green railing), the subways (the cuttings with
    their parapets, headwalls, SUBWAY plates, caged lamps and bollards; under
    the roofs tiled walls, fluorescent strips, some tired and one dead, tags, a
    puddle) and the spine's paving. One sign atlas (`ends-sign`).
  - **Fixed in passing:** a crossing on an avenue's south piece past the river
    (`ns0s`) never broke the avenue's median and lines (world.ts
    `highwayGaps()` matched `ns0` only), so The Trenches' junctions on the west
    ring avenue and exit 6's ramp feet had an unbroken median through them;
    they break now, Lot 9's lane's and Endswood's too.
  - The boot's code is 723.1 of 730 KB with it (mostly the traffic's routes
    along the new streets): the next phases will need the budget raised.
- **Phase 3 (the blocks):** `endsblocks.ts` (DOM-free, the boot's for what's
  solid, tested in `tests/endsblocks.test.ts`): `BLOCKS`, eleven buildings in
  shells (`Shell`: a footprint, its storeys and each side's face, `Face`:
  flats, stair slits, deck, blank or void; the ground floor `Ground`: garages,
  brick or the entrance), every top under the Emporium (`TALLEST`):
  - **Fennel House**, the barrier block along the north edge in two halves
    either side of the spine, a deck (`Deck`) on every other floor along its
    south face (`DECK`: a slab out over the yard, a solid parapet, concrete
    cross walls, `finsOf()`), its stair cores standing proud, the halves joined
    over the spine by a bridge (`Bridge`) on floors 2 and 3, the "street in
    the sky" (walked on in Phase 5); the first gallery over a walker's head
    (`GROUND` 1.5).
  - **Harrier Point**, the nine-storey tower by the Circus, its lift and stair
    tower beside it joined to it by bridges every third floor.
  - **Linnet Court** (maisonettes with a deck), **Hawthorn Terrace** (low
    brick terraces stepping down the slope), the **Endswood Close garages**
    (lock-ups), **Sorrel**, **Teasel** and **Wren Court** and **Marten House**
    (walk-ups and a slab east of the avenue).
  - **Kite House**, the condemned block: every face void or blank, shut behind
    plywood hoardings (`HOARD`, `hoardingRuns()`), the way in for later.
  - `BLOCK_SOLIDS` (in `SOLIDS`): the shells, the decks' cross walls and the
    hoardings; every entrance (`door`) clear of them on the slab. All made-up
    names.
  - Drawn by `endsblocks3d.ts` (`registerBlocks()`, from endswood3d.ts's
    `register()`, a site a shell): its own concrete atlas (`ends-concrete`:
    board-marked bands of flats with their windows lit at night, stair slits,
    deck fronts, blank and boarded-out walls; the ground floor's garages,
    brick and entrances), walls in pieces no longer than a tile, roofs with
    coping, lift houses with louvres, the decks' slabs, soffits and parapets,
    the bridges, the hoardings; near only dishes, plants and bikes on the
    decks.
  - The boot's code is 722.9 of 730 KB with it (only the solids are in it).
- **Phase 4 (street level):** `endsstreet.ts` (DOM-free, the boot's for what's
  solid and the trees, tested in `tests/endsstreet.test.ts`), drawn by
  `endsstreet3d.ts` and `endschurch3d.ts` in the estate's chunk:
  - **St Aldwyn's** (`CHURCH`, `CHURCH_PARTS`) on the block east of ns1s: the
    nave with its big window over the west door facing Endswood Road, the
    aisles under lean-tos, the chancel, buttresses and lancets, the tower at
    the south-east corner (clock, belfry, battlements, pinnacles) and its
    spire (`SPIRE_TOP` 22.5, the owner's exception over the Emporium; the test
    holds every flight well over it). Soot-dark stone, slate; the windows'
    stained glass dark by day and lit at night (`ends-church`). The
    churchyard (`CHURCHYARD`): iron railings on a dwarf wall with stone gate
    piers, the lychgate on the road in line with the zebra, a side gate on
    ns1s, yews, 45 old headstones leaning every way, two chest
    tombs, the cross and the noticeboard.
  - **Endswood Parade** (endsblocks.ts `parade`: maisonettes over shops, a
    `shops` ground floor) on the road opposite Harrier Point: the off-licence,
    WINGZ PALACE, the launderette, the barber, the fish bar, the newsagent,
    PHONE DOC shuttered and the tenants' hall (`PARADE_UNITS`), under a
    concrete canopy, bollards along the forecourt.
  - **The corner shops** (`CORNER_SHOPS`: LUCKY STAR on ns1s, NIGHT & DAY on
    ns2s; scenery now, run for Dorras later): a flat over each, fascias round
    the corner, crates of fruit out front.
  - **The abandoned buildings**: the Duke of Endswood (`PUB`), a corner pub
    on the avenue in green tiles, boarded, its hanging sign faded; the
    community centre (`CENTRE`), derelict, its sign missing letters, its
    shuttered front on the avenue's side. Each has its way in round the back
    (`back`), shut until the storyline.
  - **Bunker Sound** (`STUDIO`) in two of Linnet Court's garages on its north
    face: the roller door half up on foam, the steel door with ON AIR over
    it, a sofa, an amp, a crate; the pirate aerial on Harrier Point's roof
    (`AERIAL`).
  - **The green** (`GREEN`: worn grass behind low green railings, desire
    lines through its gaps, trees, benches, NO BALL GAMES), **the pitch**
    (`PITCH`: red, lines, goals and hoops, a tall green fence with its mesh
    in the FX layer), **the playground** (`PLAYGROUND`: swings, a slide,
    springers, a roundabout) south of the pub, the garage court behind
    Hawthorn Terrace (endsblocks.ts `court-n`, `court-s`).
  - **Street furniture**: bin stores, CCTV on poles, the estate boards
    (ENDSWOOD ESTATE and the blocks' names), intercoms by the blocks' doors;
    on Endswood Road two zebras with their beacons (the globes flash on the
    main thread, steady under reduced motion) and zigzags, double yellow
    lines, speed humps. `STREET_SOLIDS` (in `SOLIDS`), `ENDS_TREES` at the
    boot.
  - The boot's code is 725.8 of 730 KB with it (the solids and the trees);
    Phase 5 will likely need the budget raised.
- **Phase 5 (the decks and bridges walked on):** `endsdecks.ts` (DOM-free, the
  boot's: walk.ts and index.ts read it; tested in `tests/endsdecks.test.ts`),
  as Liberty Bridge's high level.
  - **Room overhead.** The city's storeys are a tile and Degen about 1.1, so a
    gallery every storey left no room to walk under the next one. Fennel
    House's galleries are now every second storey (floors 1, 3, 5 and 7:
    maisonettes, their front doors on the gallery and their upstairs windows
    between, as the great deck-access slabs had them) and wider (`out` 1.5);
    Marten House's every second storey too. The 'deck' band draws doors on
    the gallery rows only.
  - **The galleries' cross walls** are open from each gallery's floor
    (`OPENING` 1.55, `finSpans()`): a concrete frame walked through, shut at
    the galleries' far ends; their solids stop at the first gallery's floor
    and their lintels are the walk camera's.
  - **The street in the sky** moved onto the galleries' line on the third
    floor, joining the two halves over the spine; it and Harrier Point's
    bridges (now floors 2, 5 and 8, its lift tower nudged west to give them
    length) are walkways `WALK_H` (1.6) tall: a beam under the floor, a solid
    parapet each side, posts, a roof with strip lights, open between.
  - **Walking up there:** `ENDS_FLOORS` (each floor's slab and where his body
    may be inside its parapets), `endsDeckY()` (the floor under him by his
    height, never from the ground or a jump), `upOnEnds()` and
    `endsDeckWall()` (only the parapets, end walls and faces stop him), first
    in walk.ts's `groundAt()` and `blocked()` (over the subways' ramps too);
    `ENDS_CAMERA` (every gallery's slab, the lintels, the bridges' floors and
    roofs: boxes with a bottom, in `CAMERA_GRID`).
  - **The lifts** (`ENDS_LIFTS`): one in each of Fennel House's four cores
    (ground, floors 1, 3, 5, 7) and Harrier Point's lift tower (ground, floors
    2, 5, 8). Up and Down doors side by side at each floor (steel, an arrow lit
    over each, drawn by endsblocks3d.ts), walk prompts "Lift up · Floor 3"
    (`endsLiftDoors()` by his height; the nearest door's prompt when two are in
    reach), the walk-in and the fade (`endsLiftRide()`, index.ts `rideTo()`:
    not a place, so never closed), "Fennel House · Floor 3" on arrival.
  - The boot's code is 728.8 KB; the budget raised to 740 under the owner's
    standing call, for Phases 6-8.
