# Northgate Air Base

Part of the project guide (`CLAUDE.md` is its index); keep it up to date when what it describes changes. The plan,
with the owner's answers and every phase, is `docs/military-plan.md`; the signed-off map is `docs/military-map.png`.

- **Northgate Air Base** (the owner's call, 2026-11: a very large military base and airfield across the whole north,
  from the west wall to Crestmont's hills; made up; nothing threatening: no weapons on show, nothing attacks you, a
  guarded gate and the rest seen through the fence). Built a phase at a time, each with the owner's sign-off. All five
  phases are built (the land, the fence and the gates; the airfield; the base itself; its life, night and sound; the
  polish); what's next is the plan's "Later" list, each in a plan of its own.
- **`airbase.ts`** (DOM-free, on `DOM_FREE`, the boot's; tested in `tests/airbase.test.ts`): the plan's lines in fixed
  world numbers, but where the base meets the wall (worked out from `WALL_INNER`, `FLOODS` and `CAMERAS`, so it holds
  under `npm run test:wide`).
  - `FENCE`: the fence's closed line, clockwise from the south-west corner (-730, -330), wandering (no run square to
    the axes but the wall gate's yard's three), 44 or more north of the stadium, west of the hills (x 285), with grass
    to the wall's foot all round but at the yard; `inAirbase()` (even-odd), `AIRBASE_RECT`, `southFenceZ()`,
    `fromFence()`. `FENCE_RUNS` is its straight runs, without the yard's face along the wall (the wall closes it),
    broken at the gates. `FENCE_H` 2.6 (above the climb), `runBoxes()` makes a run thin boxes (Lot 9's way).
  - `GATES`: the main gate on `ns0-n` (x -4.5) and the service gate on `ns3-n` (x 64.5), on the fence's south side
    (z where it crosses: -307.5 and -310.3), both shut (a box across each opening at the fence's height). Each has a
    guardhouse inside on its east (`guardhouseOf()`) and a barrier down outside (`barrierOf()`, `BARRIER_Y`).
    `GATE_ROAD_ENDS` is where each country road ends (rural.ts), its loop's centre `LOOP_SHORT` (16) short of its gate:
    (-4.5, -291.5) and (64.5, -294.3).
  - `VISITORS` (the car park, x -90 to -20, z -298 to -262), `VISITORS_DRIVE` (its drive across to `ns0-n`, south of
    the loop), `VISITOR_CENTRE` (on the car park's north edge, `VISITOR_CENTRE_H` 4.4, its roof a terrace),
    `VISITOR_SPAWN` (Walk in: in the car park, facing the door). `SIGN_WALL`: the base's name on a low wall outside the
    main gate, east of the road.
  - `AVENUE`: the parade avenue, north from the main gate in line with the road to z -700, then bending to the wall gate.
    `WALL_GATE`: in the gap between two of the wall's floodlights with no camera in it, nearest x -34 (on the site's own
    world x -49 to -19, between the floodlights at -52 and -16), 12 deep; the yard 21 either side. The wall stays solid.
  - `KEPT`: the lots for Phases 2 and 3 (the airfield, the fuel farm, the parade ground, the HQ, the barracks, the mess
    and its neighbours, the motor pool, the heliport, the range), all inside the fence.
  - `airbaseKeep()`: the land kept clear of trees (`KEEPS`, landuse.ts, `since`): the fence's line (`FENCE_CLEAR`), the
    gates, the avenue, the visitors' area and the kept lots. The rest keeps its woods (they cleared none of the woods'
    trees: the woods test's count holds).
  - `AIRBASE_SOLIDS` (in `SOLIDS`, excused from the slab and grid checks in `tests/solids.test.ts`: airbase.test.ts holds
    them off every road there is): the fence, the shut gates, the guardhouses, the barriers' posts, the visitors' centre
    and the sign wall.
  - `AIRBASE_LAMPS` (the city's own lamps, `addLamp()` in index.ts, in `tests/lampfacing.test.ts`): along the inside of
    the south fence every `FENCE_LAMP_GAP` (90) reaching to it, one outside each gate, three round the car park. The
    town's post (`lampStyle()` unchanged).
- **The country roads** (rural.ts): `ruralSplit()` ends `ns0-n` and `ns3-n` at `GATE_ROAD_ENDS` (their runs `gated`,
  however short: `ns0-n` is 45 long), not the world's edge. ruralfence.ts opens a gated run's loop's fence on its gate's
  side too (two arcs), and breaks a road's fence where a drive crosses it (`DRIVES`: the visitors'). The snapshot writes
  the two gated roads and their loops whole (they're fixed), the rest as before.
- **Its ground** (ground.ts `INFLUENCES`): mown lawn inside the fence and 6 past it (`airbase`), worn round the car park.
- **The drawing, `airbase3d.ts`** (its chunk `airbase-camp` in `LAZY_DISTRICTS`, over the fence's box to the car park;
  tested in `tests/airbase3d.test.ts`), as sites:
  - the fence, 30 a site: galvanised posts every 3.5 and a top rail; the chain-link's mesh (grime.ts `chainMesh()`) in
    the FX layer, see-through; near only (not on phones), the arms leaning out from each post's top and three strands of
    wire along them;
  - each gate: its posts, its shut sliding gate, the barrier in red and white, the guardhouse (a band of windows, a door
    to the road, its roof), the apron from the loop to the barrier and on in;
  - the parade avenue's asphalt, its edges lined, 40 a site (no traffic till Phase 4: it isn't in the street plan);
  - the visitors' car park, its kerb, bays and drive, and the centre (concrete, glass to the car park, its name over the
    door, the terrace's rail near only);
  - the base's name on its wall, and the service gate's board. The signs are one atlas (`canvasTex()`, baked).
- **The place**: `northgate` (src/lib/city.ts `SpotId`, places.ts `PLACES`, live.ts `LIVE_PLACES`, livelines.ts), its
  pin over the visitors' centre (index.ts `pickSpot`), its panel in CityMap.astro (kicker 51, coming soon, Walk in). A
  taxi there gets the far places' 18 s (tests/travel.test.ts).
- **The world map** (worldmap.ts) draws its fence, the avenue, the car park, the centre and the guardhouses.
- **The views**: `BENCH_VIEWS` has `north-stadium`, `airbase-overview`, `airbase-gate` and `airbase-runway` since
  Phase 0; each phase is measured against them (the plan's baseline and allowances).
- **The airfield (Phase 2)**, in `airbase.ts`: `RUNWAY` (x -620 to -120 at z -540, half 6), `APPROACH`, `TAXIWAY`
  and its `CONNECTORS`, `NORTH_TAXI` and its `NORTH_LINKS`, `SHELTER` / `SHELTERS` (nine, in threes, their doors south
  on stubs), `APRON`, `HANGARS` (`HANGAR_H` 11, `OPEN_HANGAR` the middle one), `TOWER` (`TOWER_TOP` 11.6,
  `TOWER_BASE`, `TOWER_SHAFT`), `FIRE_STATION` (`FIRE_H`), `FUEL_FARM` (`FUEL_TANKS`, `BUND_H`), `APRON_ROAD` (from the
  avenue along z -470), `PARKED` (the aircraft: kind, livery, x, z, yaw), `APRON_VEHICLES`, `WINDSOCK`,
  `AIRFIELD_RECT` (the chunk's land) and `AIRFIELD_SOLIDS` (the buildings, in `SOLIDS`). `airbaseKeep()` keeps trees off
  the apron's road and the approach lights past the runway's east end too. Tested in `tests/airbase.test.ts`.
- **The airfield drawn, `airbasefield3d.ts`** (its chunk `airbase-field`; tested in `tests/airbase3d.test.ts`): strips
  30 across (`airbase field <x>`): the runway (shoulders, edge lines, dashes, threshold and touchdown bars: no numbers;
  edge lights white, the ends' green and red, `light()`), the approach lights, the taxiways (yellow centre lines, blue
  edge lights near only), the apron (concrete, joints) and its road, in the airport's colours and kit (`airportkit.ts`).
  A site each for the hangars (a shut one a block; the open one a shell, dark inside, the doors stacked at its ends), the
  tower, the fire station, the fuel farm, the shelters in their threes (a flattened half-cylinder, doors south) and the
  apron's kit (the tug, the bowser, the windsock). On the main thread only (`register()` with a scene), the parked
  aircraft: `createFleet()` per kind (aircraft.ts), the titles' meshes hidden, set once (parked, nothing turns).
- **The base itself (Phase 3)**, in `airbase.ts`: `PARADE`, `FLAGPOLES` (`FLAG_H`), `MONUMENT`, `HQ` (`HQ_H`),
  `BARRACKS` (twelve, `BARRACKS_H`), `SERVICES` (the mess hall, the gym, the medical centre: id, rect, height),
  `MOTOR_POOL`, `MOTOR_SHED`, `SERVICE_ROAD` (from the service gate), `HELI_PADS`, `HELI_HUT`, `RADAR` (its mound,
  plinth and dome), `WATER_TOWER` (its top 12.1), `RANGE`, `BERM`, `RANGE_HOUSE`, `RANGE_LANES` (scenery: no targets),
  `GATEHOUSE_H` (the wall gate's), `WATCHTOWERS` (every `TOWER_GAP` round the fence, 6 inside it, clear of the gates and
  the yard), `AVENUE_LAMPS` (both sides of the avenue every `AVENUE_LAMP_GAP`, added to the city's lamps in index.ts)
  and `BASE_SOLIDS` (in `SOLIDS`). `airbaseKeep()` keeps trees off the radar's mound, the water tower, the watchtowers
  and the service road too.
- **Drawn** in `airbase3d.ts` (the camp chunk), a site each (the barracks a row a site): the parade ground's paving,
  kerb, flags (magenta and cyan, the city's) and monument; flat-roofed blocks (`building()`: walls, parapet, a window
  band a storey, a door south, a canopy near only) for the HQ (its portico), the barracks, the services (the medical
  centre's green band), the heliport's hut and the range house; the motor pool's yard, shed and trucks; the heliport's
  pads; the radar's mound and dome; the water tower; the range's lanes and berm; the watchtowers (legs, cabin, roof,
  searchlight); the gatehouse with its blast doors and hazard band (near only).
- **Its life, night and sound (Phase 4)**:
  - **At night** (airbase.ts): `APRON_MASTS` (three floodlight masts between the hangars, `MAST_H` 10.5, drawn in the
    airfield's chunk) and `BASE_POOLS` (their pools, added at the boot in index.ts, as the airport's); the watchtowers'
    searchlights (airbase3d.ts `searchlights()`: one instanced additive beam each, down to the ground, sweeping `SWEEP`
    either side of `searchRest()`, in towards the base, at night only; still under reduced motion: the Strip's way).
  - **Its people** (`airbaselife.ts`, DOM-free, on `DOM_FREE`, tested in `tests/airbaselife.test.ts`; the camp's chunk
    hands them to the crowd, life.ts `addPeople()`, every other one on phones): `BASE_IDLE` (pairs chatting, a queue at the
    mess, people at the motor pool and the heliport; never acting `guard`: that's the crowd's bouncers; no sentries at
    the gates since Phase 4's trim), `BASE_MOVERS` (the drill squad's column round `DRILL_LOOP`, walkers round `ROW_LOOPS`, the
    patrols on `BEATS` along the south fence, `beatAt()`: back and forth, never stopping or chasing). Their look is
    crowdlook.ts `STYLES.airbase` (`districtAt()` inside the fence).
  - **Its vehicles** (`airbaselife.ts` `BASE_VEHICLES`, `vehicleAt()`, `loopPoint()`): a jeep up the avenue on its
    right, along the apron's road and back (the motor pool's moving truck trimmed in Phase 4); the city's own off-road
    model (cars.ts `carGeometry`), its paint olive in its vertex colours merged with its detail into one mesh, drawn and
    moved by airbase3d.ts `vehicles()` as the Docks' truck (still under reduced motion).
  - **Its flying** (`airbaseflights.ts`, DOM-free, the airfield's chunk's only, tested in `tests/airbaseflights.test.ts`):
    `TRAINER` (circuits: off east from the runway's west end, round the north of the base, landing west from the east,
    back to `TRAINER_HOLD`) and `ROUNDER` (the helicopter's round of the base from the heliport), built with airfield.ts's
    own `flight()` / `fly()` / `w()`; `BASE_FLIGHTS` (not in `FLIGHTS`: the airport's tests are the airport's). They fly
    as more instances of the base's parked fleets (airbasefield3d.ts: no more draw calls), on the clock near the field,
    at their stands under reduced motion; on phones only the trainer. Tested over the base only (inside the fence, west
    of the hills), clear of the airport's flights, each other, the parked aircraft and over everything built.
  - **Its sound** (ambience.ts `airbase`, sound.ts): far engines across the field (two low saws through a low-pass,
    swelling slowly), off till the visitor turns sound on.
- **The review views** (Phase 5): `airbase-gate`, `airbase-runway`, `airbase-overview` in `BLEND_VIEWS` (blendviews.ts),
  as in `BENCH_VIEWS` since Phase 0; their shots in `docs/blend-shots/airbase-phase5/`.

