# The Docks (growth plan Phase 9c)

The owner's call: a working port on the south bank, west of The Trenches past
the ring highway, scenery first; the metro runs on through it and crosses
the river there on the red arch, moved from The Trenches. Built in phases,
each with the owner's sign-off. Keep this plan up to date as it's built.

## What the owner asked

- **Where:** "Docks to the west past The Trenches": the south bank of the
  river west of the ring highway's west side. The north bank west of the
  highway stays open land and woods (the owner's pick: south bank only).
- **The red bridge:** "Move the red bridge to the docks area": the metro's
  crimson steel arch (`ARCH` in metro.ts, today over the river at x -150
  from The Trenches up to Uptown) moves to the docks, and the metro goes
  with it (the owner's pick: "Metro via the docks"). The line runs on west
  along Trench Avenue, over the highway, to a Docks station, crosses the
  river on the arch, and comes back east along the north bank avenue's
  median into Uptown and up to Uptown station as now.
- **Gameplay:** scenery first (the owner's pick), as Westlake Park and
  Uptown were: its places pinned with "coming soon"; things to buy and run
  with Dorras come in a later step, if the owner wants them.

## The land (measured from the street plan)

- The ring highway's west side runs down x -215 (`HIGHWAY_BOX`), its
  carriageway out to about x -224 (`HIGHWAY_HALF`); its south-west bend
  starts at about z 250 (`HIGHWAY_R` 70 from the corner at z 320).
- The river is z 71 to 131 (`RIVER`); west of the highway its banks wander
  freely today (`BANKS` in river.ts: the south bank from the world's edge to
  `HW_WEST - HW_CLEAR`, pulled back up to 9 off the quay line).
- The south bank avenue (`SOUTH_ROAD`, about z 137) already runs on past
  the highway to the world's edge as a plain continuation with no traffic
  (layout.ts `EW_ROADS`); Trench Avenue (`AVENUE_Z`, z 175) ends at West
  Street (x -188) inside the highway.
- Open land: roughly x -400 to -235 and z 131 to 300, about 165 x 170
  tiles, a little smaller than The Trenches. The pine woods (`WOODS`,
  outskirts.ts) stand on parts of it today; they'll keep off it.
- **Fixed numbers, not the edge:** the docks stop well short of `EXT`'s
  west edge (x -420 today, -680 in `npm run test:wide`), so nothing reads
  the edge and both sizes pass.

## What the Docks are

A working port in Degen's style: big, busy, lit at night, made-up names
only, nothing threatening.

- **The basin:** ships berth in a dock basin cut into the south bank, its
  mouth on the river (a pair of lock gates or an open mouth), quay walls
  all round it down to the water (`WATER_Y`). The river's boat lanes run
  past untouched (`BOAT_LANES`, the south lane at about z 121: a ship
  moored on the river itself would sit in it). The south bank along the
  docks' frontage is a straight stone quay, not a wandering bank (its
  `BANKS` stretch split round it).
- **The container terminal:** a container ship at the basin's main berth,
  ship-to-shore gantry cranes on rails along the quay, container stacks in
  the colours of made-up shipping lines, straddle carriers and reach
  stackers, the gate house with its truck lanes and a truck park.
- **The old docks:** transit sheds and brick warehouses along the river
  quay, numbered (SHED 3, WAREHOUSE 7: made-up), a dry dock with a ship on
  its blocks, a slipway, the tug berth with two tugs and a pilot boat,
  bollards, rails set in the cobbles (no trains: below), bitts, ladders and
  life rings.
- **Landmarks:** the Harbour Master's office (a place: pin, panel "coming
  soon", Walk in), a lighthouse at the basin's mouth, the red arch itself,
  floodlight masts with sodium pools, fuel tanks, a gantry sign over the
  gate (made-up name, fixed copy).
- **People:** dock workers in hi-vis (the crowd's own outfits recoloured),
  drivers, a few at the harbour master's door and the canteen; the docks'
  canteen as a snack bar (`SNACK_BARS`) later, if the owner wants.
- **Sound:** gulls, ship horns now and then, the cranes' clank and the
  straddle carriers' reversing beeps (ambience.ts `docks`).

## The phases

### Phase 1: the land, the streets and the quays (built)

What was built, in `docks.ts` (DOM-free, tested in `tests/docks.test.ts`),
in today's world numbers (no `SOUTH_SHIFT` / `WIDEN` to add), the docks
x -400 to -244, z 131 to 290 (`DOCKS_RECT`, `inDocks()`), 20 short of the
world's west edge today:

- **The streets** (`DOCK_STREETS`, `DOCK_CROSSINGS`, joined in
  `cityPlan()`; one lane each way, `HALF`): the south bank avenue carries
  traffic on west of the highway now (the junction's south-west corner got
  a slip lane: `OUTER_SLIPS` takes a single turn, `highway-ew4-1-0`; its
  north-west corner is the river); the docks' ring off it, `docks-ring`
  (Dock Road south at `DOCK_X` -248, Yard Road west at `YARD_Z` 286, West
  Road north at `WEST_X` -396 back to the avenue, both its ends lit
  junctions), and Quay Road across it (`QUAY_Z` 202.5) along the basin's
  south side. Traffic drives them all (routes.ts), the avenue's median and
  lines break at the junctions (world.ts `highwayGaps()`).
- **The basin** (`BASIN`, x -345 to -275, z 148 to 200) and its mouth
  (`CHANNEL`, x -316 to -302) open to the river at the quay line; the avenue
  and its promenade cross the mouth on a flat bridge at the street's
  height (`DOCK_BRIDGE`: a concrete deck under the asphalt, railings both
  sides). The water is at the river's height (`WATER_Y`) between stone
  quay walls all round (world.ts `basinWater()`, `basinWalls()`, at the
  boot, the grass cut round it: `minusRects()`); the river's own quay wall
  is open across the mouth (`riverBanks()`). Not part of river.ts's
  `inWater()` (the river's tests and the boats read that): walking stops at
  its edge (`inBasin()` in walk.ts's `blocked()`), cars at `BASIN_WALLS`
  (drive-sim.ts, near the docks). The south boat lane passes the mouth
  about 10 out in the river.
- **The frontage** is a straight quay: river.ts's south bank wandering
  stretch west of the highway now ends at `DOCKS_QUAY[0]` (x -404) and
  wanders on west of it.
- **The blocks** (`DOCK_BLOCKS`, ref `docks` in the plan): the west quay
  (round the basin's west side and the mouth's, to West Road: the container
  terminal in Phase 3), the east quay (its mirror, to Dock Road: the old
  docks), the basin's south quay and the bridge's sidewalk (strips all
  sidewalk, `walk` 0), the yards south of Quay Road. Grey sidewalks over worn
  concrete, as The Trenches' (world.ts; the big blocks a piece a tile, their
  walls facing out round the notch: `tiledSlab()` reads which way an outline
  runs from its area now).
- **Lamps** (`DOCK_LAMPS`, placed at the boot in index.ts): sodium
  (world.ts `buildLamps()`), along the sidewalks, none on the basin's south
  quay (kept clear for a berth).
- **Drawn as you approach** (`LAZY_DISTRICTS` id `docks`, `docks3d.ts`):
  the streets (asphalt, a dashed yellow centre line, zebras on every arm of
  the avenue's lit junctions), the bridge's railings, a pale stone coping
  along the water's edge and, near only, mooring bollards every 8 and iron
  ladders down the walls every 24 (none on phones). The world map draws the
  basin.
- **The trees** keep off the docks (outskirts.ts `treeSpot()`, `inDocks()`;
  the woods with them, through the same check: not `WOODS_OFF`, whose 120
  of clearance would have thinned the woods west of the highway).
- **Tests:** the docks inside the world and off the highway and The
  Trenches; the streets in the plan with traffic on every one; the blocks on
  no street, over no water, none over another, their edges at the water's;
  the basin open to the river under the bridge, the frontage straight, the
  boats' lane well out; the walls over the open water and nothing solid in
  it; the lamps on sidewalks; no trees. Both world sizes pass; the
  snapshot gained the new streets and the slip lane (nothing that existed
  moved). The boot grew 2 KB (662.6 to 664.6 of 670).

### Phase 2: the metro via the docks, the red arch moved (built)

What was built, in metro.ts (DOM-free, tested in `tests/metro.test.ts`):

- **The route west of The Trenches:** the main track carries on west along
  Trench Avenue's line (z 175) past West Street, over row W and the
  highway's west side (no pillar on the highway: a span of about 9.5), over
  Dock Road and onto the docks' east quay to **Southbank Docks station**
  (`docks` in `STATIONS`, named `DOCKS_NAME`; its middle `EL_STATION`
  x -258, its platform south of the track, its stair tower on the quay with
  its door facing north; a `PLACES` entry, `metro-docks`, through
  places.ts); round a bend north (`WEST_R` 8, `WEST_END`) onto the docks'
  line (`EL_X` x -272, docks.ts); over the south bank avenue and the river
  on **the red arch** (`ARCH` moved: its south feet on the east quay at the
  avenue's sidewalk, z 142, its north feet on the north bank's promenade,
  z 70.3, its crown 16 over the ground as before, nothing in the water, clear
  of the basin's mouth and the boats' lanes; its hangers every 4); round a
  bend east (`NORTH_R` 5.5) onto the north bank avenue's median (`RING_HI`);
  east along it, over the highway's junction on a span, into Uptown; round a
  bend north (`UP_R` 6, was 8) into the one-way pair's northbound street and
  up it on the portal frames to Uptown station, unchanged.
- **What went:** the bend into the cross street at x -150 in The Trenches,
  the portal frames there and the arch over the river at x -150 (the cross
  street stays a street, The Trenches' station where it was).
- **The pillars** follow from the street plan as before (`PILLARS`): the
  avenues' medians clear of their junctions, open land, the docks' quay,
  never under the arch; the spans between are at most 18 (the highway's
  are about 9.5). Through the docks the el is dark steel like The Trenches'
  (metro3d.ts `grim()`: flanged columns on plinths, plate girders).
- **Uptown's waterfront avenue:** the el runs over the bank avenue's
  planted median from the highway to the bend at x -156: the hedge is
  broken round each pillar and no columnar tree stands under the deck
  (boulevarddress.ts `MEDIAN_RUNS`, `MEDIAN_TREES`, `UNDER_EL`); the
  esplanade's keep-out for the old arch's north feet is gone
  (boulevard.ts), so its trees, benches and lamps carry on there.
- **Trees** keep off the line west of The Trenches and the arch's land
  (index.ts `keepTreesOff()`; row W's trees along the highway skip the el,
  streetwall3d.ts); the docks' lamps keep off the arch's feet (docks.ts
  `DOCK_LAMPS`).
- **The timetable** (`LEGS`, 14 with Crestmont's spur, merged from
  docs/crestmont-plan.md Phase 9): from Crestmont to Kart Park, down to
  South Bank, out through The Trenches and the Docks to Uptown and back,
  out to the Airport and back, up again; `ROUND_TRIP` about 392 s. The run west of The Trenches is the
  express (`speedOf()`, unchanged at 24: a faster express hardly helps,
  the runs are mostly speeding up and slowing down). The longest ride,
  Uptown to the Airport turning round at South Bank, is about 60.7 s
  (`rideAt()`; it was about 50.8), and out to Crestmont, Uptown's is about
  75.4 s (from The Trenches it was about 70).
- **Tests:** the main line's length from its straights and bends, smooth
  all the way, over nothing taller than 4.5; every pillar in a median clear
  of the junctions or on open ground, the spans at most 18; the stations'
  platforms between junctions and their towers off every road and solid;
  the portals' legs off the streets and their sidewalks; the arch's feet
  off the water and the basin's mouth, the boats' lanes under it, the tall
  ship east of it, every flight well over its crown; Southbank Docks'
  station on the east quay and the deck never over the basin; the Uptown
  median broken round the pillars with no tree under the el. Both world
  sizes pass. The boot grew 0.2 KB (664.6 to 664.8 of 670).

### Phase 3: the port

- The container terminal, the old docks, the landmarks and the Harbour
  Master's office as a place (above), from data in `docks.ts`
  (`CRANES`, `STACKS`, `SHEDS`, `DRY_DOCK`, `LIGHTHOUSE`, `MASTS`,
  `DOCKS_SOLIDS` in `SOLIDS`), drawn as sites in the docks' chunk (one sign
  atlas of fixed made-up copy; containers instanced or batched by tile;
  far forms for the cranes and the ships), near-only details, phones
  leaving out the finest.

### Phase 4: the docks' life and sound

- The cranes' trolleys lifting containers, straddle carriers on their
  loops, trucks through the gate (the traffic's Box Runners and Heavy Haul
  rigs on the docks' roads), the tugs and the pilot boat at work in the
  basin, the dock workers; all functions of the clock, the same for
  everyone, still under reduced motion. The sound (`docks` in
  ambience.ts).

## The owner's answers

- **The name:** **Southbank Docks** (`DOCKS_NAME` in docks.ts): the
  district, its signs and gantry, and its metro station in Phase 2 (named
  in full, Southbank Docks, so it reads apart from the South Bank station by
  the south row).
- **The cranes:** tall, as real ones (the owner's call: "yes tall cranes").
  The ship-to-shore gantry cranes (and only they) may rise over the
  Emporium, as Uptown's towers do, to about real height (25 to 35 tiles to
  the top of a raised boom), each kept well under every flight's path over
  them and clear of the prop plane's river loop (the tests in Phase 3, as
  highrise.ts's are). Everything else in the docks stays under the
  Emporium (the sheds, warehouses, lighthouse, floodlight masts).

## Open questions for the owner

- **The el along Uptown's waterfront:** the line comes back east along the
  north bank avenue's median through Uptown, past the Sky Wheel, its
  planted median broken round the pillars. Is that the look you want, or
  should it run another way into Uptown?
- **No freight trains:** Sector 7 Central was retired and the rule is no
  mainline tracks west of the ring highway, so the docks have rails in the
  cobbles but no trains. Keep it so?
- **Later, Dorras:** container yards, warehouses or a shipping desk to run
  for Dorras, once the docks are built?
