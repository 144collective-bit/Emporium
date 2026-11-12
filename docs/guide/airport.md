# Sector 7 Airport

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Sector 7 Airport (`docs/airport-plan.md`)

- The plan and its phases are `docs/airport-plan.md`; keep it up to date,
  one phase at a time with the owner's sign-off. Phase 1 (the airport and
  its flying traffic), Phase 2 (fly it yourself, from the hangar) and
  Phase 3's steps 1 (the owner's call: expanded, more realistic, moved out
  to the world's south edge), 2 (landside and the metro to the terminal)
  and 3 (the cargo area) are built.
- **Where:** on the south side (the world's south edge until growth plan
  Phase 10 moved the edge out), outside the ring highway (it no
  longer goes round the airport): the airside south of the highway's south
  side, the landside east of the highway south of the river. Its old site
  inside the highway is open land, kept for later. `airfield.ts` (DOM-free,
  tested in `tests/airfield.test.ts`) holds it all, in fixed numbers:
  `AIRPORT_AREAS` (`AIRSIDE` in its `FENCE` with a crew gate by the hall
  and the GA gate, `GA_GATE`; `LANDSIDE`, for step 2; the forecourt;
  `GA_LANDSIDE`), `SITE` the box round them, the runway (`RUNWAY`, 300
  long, east-west, take-offs and landings eastwards), the parallel
  taxiway, connectors A-D (`CONNECTORS`) and the taxilane, the aprons
  (`APRON`, `GA_APRON`), `TERMINAL` (the `HALL` and two `CONCOURSES`),
  eight `STANDS` (nose-in, facing north) with `AIRBRIDGES`, `TOWER` (under
  the Emporium's height), `HANGAR` (Hangar 1, its east office the hangar
  menu's), `PROP_STAND`, `HELIPAD`, `EXEC_PAD`, the maintenance hangar
  (`MRO`), the fire station (`FIRE`), the fuel farm (`FUEL_TANKS`), the
  localizer and PAPI, masts, the windsock, apron vehicles (`APRON_KIT`),
  the parked cars, and `AIRPORT_SOLIDS` (in `SOLIDS`; the ground itself is
  open, at ground level, not a slab). Airport Drive off the south bank
  avenue, the front road and the one-way loop past the kerb round the
  short-stay car park are `AIRPORT_STREETS`; general aviation's road off
  the east ring avenue and its loop are `GA_STREETS` (`GA_ROAD`), both in
  the street plan with traffic, reached under the raised highway. You arrive (taxi, fast
  travel, `PLACES`) at the GA car park by the gate (`AIR_ARRIVE`).
- **Landside** (Phase 3 step 2): the forecourt's one-way loop
  (`LOOP`, street `airport-forecourt`) up over **the departures deck**
  (`DEPARTURES`, in front of the hall's upper storey, 3.3 up: its ramps,
  lanes, kerb and parapets) and back; walking, driving, the traffic and
  taxis all ride it (`departuresY()` / `departuresWall()` in walk.ts by
  your height, as Liberty Bridge's decks; `groundAt(x, z, y)` and
  `DECK_WALLS` for your car; `departuresRoadY()` / `departuresSlope()` in
  life.ts and taxi.ts; `DECK_CAMERA`); under it the arrivals level (the
  taxi rank `RANK`, the bus bay `BUS_BAY`, the hall's lower doors); the
  short-stay car park in the loop, the multi-storey (`MSCP`, its cars
  `MSCP_CARS`) and the hotel by the drive (`HOTEL`, RUNWAY HOTEL, made up).
  What's solid under the deck (`DECK_SOLIDS`) is lower than anything up
  on it; anything new on the deck goes through these.
- **Cargo** (Phase 3 step 3), at the airside's east end: the cargo shed
  and its office standing in the fence's line as the hall does
  (`CARGO_SHED`, `CARGO_OFFICE`: docks landside, `DOCKS`; big doors
  airside, SECTOR 7 CARGO), the cargo apron (`CARGO_APRON`) with two
  stands (`CARGO_STANDS`: the freighter on the timetable flies from the
  first, `freighter()` (pushed back onto a lane across the apron, its taxi
  brisker, `FREIGHT_TAXI`, the airliners' way round, `jetFlight()`), the
  second's parked, `PARKED_FREIGHTERS`), the loader and dollies
  (`CARGO_KIT`), people at work (`CARGO_PEOPLE`); landside Cargo Road off
  Airport Drive and the one-way loop round the truck yard (`CARGO_ROAD`,
  streets `airport-cargo` and `airport-cargo-loop`, traffic drives them),
  the yard (`YARD`) and its trucks (`RIGS`, `RIG`, `rigRect()`: backed up to
  the docks, in rows inside the loop, solid). Making room moved the
  multi-storey a block north (its drive off Cargo Road), the fire station
  to the cargo apron's corner and the fuel farm landside (its north-east
  corner); the taxiway and taxilane reach on to the freighter's stand. The
  freighters are the airliner in cargo trim (`aircraft.ts` model
  `freighter`: no cabin windows, a main deck door, DEGEN CARGO titles (made
  up), DEGEN CARGO's orange), a fleet of their own (`Flight.freight`).
- **Night lighting and the roadside** (the detail pass, the owner's picks):
  flush centreline lights on the runway and the taxiway, the connectors'
  green and amber and red stop bars (`CENTRE_LIGHTS`, `flush()` in
  `airportgrounds3d.ts`); a stand guidance board for every stand (`VDGS`,
  `guidance()` in `airport.ts`: amber while a jet closes in, green parked,
  one instanced screen); the masts' pools on the side each faces
  (`MAST_POOLS`); the approach's rabbit at night (`RABBIT`, `rabbit()`, not
  under reduced motion); road signs from one atlas (`ROAD_SIGNS`, fixed
  copy), the SECTOR 7 AIRPORT gateway wall and its flags (`GATEWAY`,
  `FLAGS`, solid), flower beds, hedges, shrubs (`BEDS`, `HEDGES`, `SHRUBS`;
  `roadside()`, a site) and trees along Cargo Road (`CARGO_TREES`).
- **The flying traffic:** four airliners (from `FLYING_STANDS`; the other
  stands and the maintenance hangar's apron have airliners parked,
  `PARKED_JETS`), the freighter (step 3 gave it stand 5's slot), a prop plane, a helicopter and the executive helicopter
  (Uptown's Phase 6: `exec()`, `heli-x`, from `EXEC_PAD` to Uptown's
  rooftop helipad `ROOF_PAD` and back, gold) on one timetable (`PERIOD`,
  four minutes; `timetable()`, `FLIGHTS`). A flight is a loop of acts (fly
  along waypoints with rounded corners, eased altitude and speed; hold;
  turn on the spot; lift); `poseAt()` turns the time into a pose, the same
  for everyone (the clock is `Date.now()`). Airliners push back, taxi out
  to A, take off east, turn north past the runway's east end, cross the
  city high over downtown (above 38; 46 to 48 over Uptown's towers,
  highrise.ts), come round the west and land over the fence and the
  threshold, the prop plane flies a lower loop along the river, the
  helicopter circles the Emporium (above the hologram and the blimp). The
  tests check they stay in the world, high over the town, on the ground
  only airside, never near each other (`REACH`) or the parked airliners,
  and clear of the solids. Change a route or a take-off time only with the
  tests passing.
- **Drawn by** `airport.ts` at the boot (the hall, the place's spot: glass
  front, wave roof and kerb canopy, the SECTOR 7 AIRPORT sign, doors on both
  levels; the taxi rank, the bus and the multi-storey's cars; Hangar 1
  and the tower in the `airport` group, the windsock, the roadside's
  parked cars, lamps and trees, the aircraft; shared paint and glazing in
  `airportkit.ts`) and as a district loaded as you approach
  (`airportgrounds3d.ts`, `LAZY_DISTRICTS` id `airport`: the field in
  strips 30 across (runway markings and lights, approach lights, PAPI,
  localizer, taxiways and their signs, aprons, stands, the fence with its
  chain-link in the FX layer, pads, apron vehicles, masts), the concourses
  and airbridges, the maintenance hangar, the fire station and its crash
  tender, the fuel farm, the forecourt, the departures deck and the
  arrivals level, the multi-storey, the hotel, the GA road, the cargo shed
  and its office, Cargo Road, the truck yard and its trucks a site a tile;
  one atlas of fixed copy), and `aircraft.ts` (the models: a cartoon airliner in DEGEN AIR
  colours, a made-up airline, never a real one, maker or badge; a
  high-wing prop plane; a helicopter). Each model is a few parts by role
  (body, accent livery colour, neon nav lights, blinking strobe, gear that
  folds away, decal, spinning props and rotors with blur discs);
  `createFleet()` makes one instanced mesh per part for each kind, culled
  as a fleet. Under reduced motion every aircraft stands parked.
- The outskirts' trees keep off the airport's land and the low end of the
  approach, and the woods keep clear of it (`WOODS_OFF` in outskirts.ts).
- **Flying it yourself** (Phase 2): the airport is a place (spot
  `airport`, its pin over the hall (`spot.group` is the hall), directory
  entry, a panel with **Walk in** to `AIR_SPAWN`, by Hangar 1's office). The hangar office's door (`HANGAR_DOOR`, the office
  `HANGAR_OFFICE` is solid) opens the hangar menu (`hangar-ui.ts`, markup
  `data-hangar` in `CityMap.astro` on the garage's `.shop` panel and
  styles): the Sky Hopper (`prop`), the Neon Dart (`bizjet`, a small jet
  model in `aircraft.ts`) and the Whirlybird (`heli`), twelve paints; free
  and only for the city, never sold, priced or tied to the store or the
  token (`myplane.ts`, saved as `degen-city-plane-v1`). While it's open
  the camera looks into the hangar (`HANGAR_VIEW` in `walk.ts`, the
  garage's `frameShowroom()`). Your aircraft stands at `HANGAR_SPOT` (the
  hangar's east half; the airport's prop plane's stand is in front of the
  west half) and stays wherever you land it.
  - The rules are `flight-sim.ts` (DOM-free, tested in
    `tests/flight.test.ts`): `TUNES` per aircraft, `stepFly()`, `HULLS`
    (spheres for every kind, the airport's too), `floorAt()` (the ground or
    a roof under the wheels), `canLeave()`, `CEILING`, `EDGE_TURN`. Arcade
    and forgiving: it levels itself, can't stall, eases a hard descent
    near the ground and lands wherever it touches down; collisions are soft
    (it slides off, nothing is damaged). New handling goes in the sim
    first.
  - `fly.ts` is the view: your aircraft is a fleet of one
    (`createFleet()`, repainted with `paint()`), chase and nose cameras
    (V), the readout (`data-fly-hud`: speed, height, throttle, state), the
    engine (`aero()` in `sound.ts`), getting out only on the ground and
    stopped (`exit()`), `abandon()` home to the hangar when walk mode ends
    in the air. Flying sets `is-flying` on top of `is-driving` (the touch
    layout is the car's: the stick turns and climbs, the pedals read
    Faster / Slower) and `data-plane` (the header reads "Flying ·
    <aircraft>"); styles in `src/styles/fly.css`. Controls: W / S throttle,
    A / D turn, arrows or Space / Shift climb and dive, V camera (near, far,
    the cockpit; views.ts), F get out; gamepad left stick, RT / LT, Y, the
    right stick pressed the camera, View the world map. Check the readout, stick, pedals
    and prompt at phone widths, upright and on their side.
