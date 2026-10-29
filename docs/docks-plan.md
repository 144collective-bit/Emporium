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

### Phase 1: the land, the streets and the quays

- `docks.ts` (DOM-free, tested in `tests/docks.test.ts`): `DOCKS_RECT` /
  `inDocks()`; the docks' streets in the street plan (`DOCK_STREETS`,
  `DOCK_CROSSINGS`, `DOCK_BLOCKS`, joined in `cityPlan()`): the south bank
  avenue carried on as the docks' main road with traffic, a lit junction
  where it meets the highway's west side (slip lanes on its outer corners,
  as the stadium's and the airport's: `OUTER_SLIPS`), Dock Road down the
  middle, the gate road to the terminal; the basin (`BASIN`: its outline,
  mouth and quay walls; river.ts's `inWater()`, `edgesAt()` and the
  channel grow it, so walking, driving, the boats and the world map read
  it); the quay line along the frontage (`BANKS` split); the woods and the
  outskirts' trees kept off (`WOODS_OFF`, `keepTreesOff()`).
- Drawn as a district loaded as you approach (`LAZY_DISTRICTS` id `docks`,
  `docks3d.ts`): the streets, the quay walls, the basin's water (the
  river's `waterMat`), the paving and cobbles, lamps; the world map draws
  its blocks and the basin.
- Tests: the streets join the plan and carry traffic, nothing on a road,
  the basin open to the river and clear of the boat lanes, the snapshot
  unchanged (nothing that exists moves), both world sizes.

### Phase 2: the metro via the docks, the red arch moved

- metro.ts: the main track runs on west along Trench Avenue's median past
  West Street, over row W and the highway's west side on a span (as the
  Kart Park line crosses its north side), into the docks to **Docks
  station** (a platform, a stair tower, the M roundel, a totem; a place:
  `STATIONS`, `PLACES`); a bend north; over the river on the red arch
  (`ARCH` moved: its ribs springing from the docks' quay and the north
  bank, its crown kept as it is, nothing in the water, clear of the boat
  lanes and the tall ship's line); a bend east onto the north bank
  avenue's median; over the highway's junction on a span; along Uptown's
  waterfront avenue's median (the planted median, `MEDIAN_RUNS`, broken
  round the pillars); a bend north at x -150 onto Uptown's portals as they
  are, to Uptown station, unchanged.
- What goes: the bend into the cross street at x -150 (`WEST_END`,
  `UP_R`), the portals on The Trenches' side and the arch there (the cross
  street stays a street). The Trenches' station stays where it is.
- The timetable grows (`LEGS`, `ROUND_TRIP`): out through The Trenches and
  the Docks to Uptown and back; the run past The Trenches is the express
  (`speedOf()`); the longest ride (`rideAt()`'s cap) is measured and
  written here.
- Tests (`tests/metro.test.ts`): every pillar clear of every road and
  sidewalk, the spans over the highway high enough, the arch clear of the
  water's lanes and the tall ship, every station's door on a sidewalk, the
  rides and the timetable; the world map's metro line; the el's rumble
  where it now runs (`rumbleAt()`).

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

## Open questions for the owner

- **The name:** "The Docks", "Sector 7 Docks", "West Docks", or another
  made-up name?
- **The cranes' height:** real container cranes stand 25 to 40 tiles; the
  rule outside Uptown is "under the Emporium" (12.5). Allow the cranes (and
  only the cranes) over it, as Uptown's towers are, or keep them low?
- **The el along Uptown's waterfront:** the line comes back east along the
  north bank avenue's median through Uptown, past the Sky Wheel, its
  planted median broken round the pillars. Is that the look you want, or
  should it run another way into Uptown?
- **No freight trains:** Sector 7 Central was retired and the rule is no
  mainline tracks west of the ring highway, so the docks have rails in the
  cobbles but no trains. Keep it so?
- **Later, Dorras:** container yards, warehouses or a shipping desk to run
  for Dorras, once the docks are built?
