# Sector 7 Airport: the plan

The owner asked for an airport with aircraft that fly, and for players to fly
one themselves (Phases 1 and 2), then for it to be expanded, given a more
realistic design and placed properly in the map (Phase 3). Each phase, and
each of Phase 3's steps, is signed off by the owner before the next starts.

Phases 1 and 2 below describe the first airport, inside the ring highway
south-east of the Southside Loop. Phase 3 moved it (its section, at the end,
is how it stands today; the numbers in Phases 1 and 2 are history).

## What the owner asked for

- **Where:** south, past the Southside Loop. The four north-south roads run
  on through the land straight south of the loop, so the airport sits just
  south-east of it, east of the x = 64.5 avenue, where the land is clear.
- **What flies:** a mix: cartoon airliners, a small prop plane and a
  helicopter, all flying on their own.
- **Flying yourself:** a pick at the hangar (a prop plane, a small jet and a
  helicopter, each with its own handling and paint), free and only for the
  city: never sold, priced or tied to the store or the token.
- **Handling:** arcade. Easy on a phone: it levels itself, can't stall,
  banks into turns, and take-off and landing are forgiving.
- **Crashes:** soft and safe, like your car: it bumps off buildings, the
  ground and the edge of the world. No damage, no crash.
- **Scale:** cartoon-compact. Aircraft in proportion with Degen and the
  cars (an airliner about 20 tiles long), a runway of about 145 tiles.

## Layout (world numbers, south-east of the Southside Loop)

- The access road leaves the x = 64.5 avenue eastwards at z = 125 and runs
  along the front of the terminal to a turning circle by the tower. Traffic
  comes down the avenue from the north, goes round it and heads back.
- The car park is north of the access road; the terminal (glass front, wave
  roof, "SECTOR 7 AIRPORT" sign) is south of it, with three stands and
  airbridges on its airside.
- The control tower stands east of the terminal (under the Emporium's height).
  The hangar is east of the tower, with the prop plane's stand in front, and
  the helipad is at the apron's east end.
- The apron is south of the terminal and the parallel taxiway south of the
  apron. The runway runs east-west, further south, with connectors at both
  ends and approach lights at its west end.
- Runway, taxiway and apron lights, floodlight masts, a windsock, ground
  vehicles and people at the terminal complete it.
- Everything is at ground level (not a slab); the buildings, masts and
  parked vehicles are solid for walking and driving (`AIRPORT_SOLIDS`).

## The flying traffic

- `airfield.ts` (DOM-free, tested) holds the layout and every aircraft's
  schedule. A flight is a loop of acts: rolling or flying along waypoints
  (corners rounded off, altitude and speed eased between them), holding
  still, turning on the spot, or lifting straight up or down. `poseAt()`
  turns the time into a position, heading, pitch, bank, gear and power. It's
  a function of the time only, the same for everyone, ready for a server.
- Airliners push back from their stands, taxi out, take off eastwards,
  climb round to the north, cross the city high over downtown, come round
  the west and land eastwards, then taxi back to their stands.
- The prop plane takes off from the same runway, flies a lower loop along
  the river and comes back to the hangar. The helicopter lifts off from its
  pad, circles the Emporium high above the hologram and the blimp, and
  comes back.
- Tested: everyone stays inside the world, high over the town (never
  near the Emporium, the blimp or the drones), apart from each other at all
  times, and on the ground only at the airport.
- Under reduced motion every aircraft stands parked.

## Build order

1. **The airport and the flying traffic** (Phase 1, built).
   - This plan; `airfield.ts` and its tests (`tests/airfield.test.ts`: the
     site on clear land, the road, the timetable smooth and inside the
     world, heights over the town, separation, taxiing clear of solids).
   - Aircraft models in `aircraft.ts` (cartoon airliner, prop plane,
     helicopter; Degen's style, made-up livery "DEGEN AIR", never a real
     airline, maker or badge), reusable for Phase 2. One instanced mesh
     per part per kind, culled as a fleet.
   - The airport in 3D (`airport.ts`), the access road with traffic, trees
     kept off the airfield and the approach, solids for walking and
     driving. The skyline ring leaves out the towers by the airport.
   - Result (`?fps`, desktop / phone tier): at the home view about 638 /
     571 draw calls and 1.04M / 0.50M triangles, the same as before (the
     airport is behind the home camera); looking at the airport itself
     about 185-260 draw calls.
2. **Fly it yourself** (Phase 2, built).
   - The airport is a place: its pin over Hangar 1, a directory entry and a
     panel with **Walk in** (walk mode starts at the hangar office,
     `AIR_SPAWN`). The hangar has an office on its east side
     (`HANGAR_OFFICE`, solid) whose door (`HANGAR_DOOR`) opens the hangar
     menu (`hangar-ui.ts`, on the garage's panel): the Sky Hopper (prop
     plane), the Neon Dart (a new small-jet model, `bizjet` in
     `aircraft.ts`) and the Whirlybird (helicopter), stat bars from their
     handling, twelve paints; free and only for the city (`myplane.ts`,
     saved as `degen-city-plane-v1`). The camera looks into the hangar
     while it's open. The airport's prop plane stand moved to the hangar's
     west half (`PROP_STAND`) so yours (`HANGAR_SPOT`, the east half) rolls
     straight out.
   - `flight-sim.ts` (DOM-free, like `drive-sim.ts`): planes have a
     throttle lever, roll and steer on the ground, lift off at their
     rotate speed when the stick comes back (or a little faster on their
     own), bank into turns, level themselves, can't stall (never under
     their slowest flying speed; slow, they sink gently), ease off a hard
     descent near the ground and land wherever they touch down; the
     helicopter climbs and descends on the stick, holds its height, flies
     forward and back on the throttle and turns on the spot. Collisions are
     spheres per aircraft (`HULLS`): they slide off `SOLIDS` and placed
     buildings, land on roofs, bump softly off the airport's own aircraft,
     keep under the hangar's roof (`HANGAR_ROOF`), turn back at the world's
     edge (`EDGE_TURN`) and level off at the ceiling (`CEILING`, 72).
   - `fly.ts`: getting in at your aircraft ("Fly the ...", wherever it
     stands), a chase camera and a nose camera (V), the throttle and stick
     on keyboard (W / S, A / D, the arrows or Space / Shift), touch (the
     stick turns and climbs, the pedals read Faster and Slower) and
     gamepad (left stick, RT / LT), a readout (speed, height over the
     ground, throttle, what it's doing), the engine (`aero()` in
     `sound.ts`: a prop's buzz, a jet's whine, a rotor's thump) and getting
     out on the ground once stopped. Leaving walk mode in the air sends it
     home to the hangar.
   - Tests (`tests/flight.test.ts`): take-off within the runway, climbing
     away, no stall and a soft landing, self-levelling, the helicopter's
     hover, turn and landing (on the ground and on a roof), sliding off a
     building, the world's edge and the ceiling, a fuzz of random stick
     input that never leaves the world or enters a building, the hangar
     (fits, rolls out clear, the helicopter under the roof) and getting
     out.

3. **Expanded and moved** (Phase 3, the owner's call: "expand the airport
   and give it a more realistic design ... place it correctly in the map").
   The owner's picks: south-east, outside the ring highway, on the world's
   south edge; about twice the size (a runway of about 300 tiles, eight
   gates); a realistic airside and landside; the metro to the terminal; a
   cargo area; the old site left as open land for later. In three steps:

   - **Step 1 (built): the airport moved, the airside.** `airfield.ts` in
     fixed numbers (nothing reads the edge, so both world sizes hold):
     - **The land** (`AIRPORT_AREAS`): the airside (`AIRSIDE`, x 96-452,
       z 331-451) south of the highway's south side, fenced (`FENCE`, the
       crew gate west of the hall, the GA gate in the west side); the
       landside (`LANDSIDE`, east of the highway, south of the river, kept
       for step 2); the forecourt in front of the hall; general aviation's
       way in west of the fence (`GA_LANDSIDE`). `SITE` is the box round
       them. The highway no longer goes round the airport; the tests hold
       all of it outside the highway and clear of it.
     - **The runway** (`RUNWAY`, 300 long, 09/27, x 100-400 at z 442):
       shoulders, edge lines, centre line, threshold bars, its numbers, the
       touchdown zone and aiming points, edge, threshold and end lights,
       approach lights past its west end, the PAPI, the localizer's aerials
       past its east end. The parallel taxiway (`TAXIWAY`) and four
       connectors (A-D, `CONNECTORS`) with hold-short bars and signs, the
       taxilane across the aprons (`TAXILANE`), blue edge lights.
     - **The terminal** (`TERMINAL`): the hall (`HALL`: two storeys of
       glass, a wave roof with a canopy over the kerb, SECTOR 7 AIRPORT) and
       two concourses (`CONCOURSES`), eight stands (`STANDS`) with an
       airbridge each (`AIRBRIDGES`), lead-in lines, stop bars and numbers;
       the control tower (`TOWER`); floodlight masts; apron vehicles.
     - **General aviation** at the runway's west end: Hangar 1 and its
       office (your aircraft and the hangar menu, as in Phase 2), the prop
       plane's stand, the helipad and the executive helicopter's pad on the
       GA apron (`GA_APRON`). Its road (`GA_ROAD`, off the east ring avenue
       south of the highway, a one-way loop round a little car park) ends
       by the fence's gate (`GA_GATE`); taxis and fast travel arrive there
       (`AIR_ARRIVE`); the panel's Walk in starts at the hangar office.
     - **The maintenance hangar** (`MRO`) with an airliner on its apron,
       **the fire station** (`FIRE`) with its crash tender by the runway's
       east end, **the fuel farm** (`FUEL_TANKS`) in its bund.
     - **Landside:** Airport Drive (`ROAD`, south off the south bank avenue
       east of the highway), the front road (one way, west) and the one-way
       loop past the kerb round the short-stay car park (`CAR_PARK`). The
       highway's junctions with the south bank avenue (east) and the east
       ring avenue (south) got slip lanes on their outer corners
       (`OUTER_SLIPS`); traffic drives it all.
     - **The flights** (`FLIGHTS`): five airliners from five of the stands
       (four since step 3, below, the freighter taking one's slot;
       `FLYING_STANDS`; the other three and one at the maintenance hangar
       stand parked, `PARKED_JETS`) push back, taxi to A, take off east,
       turn north past the runway's east end, cross the city high, come
       round the west and land over the threshold, off at C and back along
       the taxiway; the prop plane and both helicopters as before from
       their new spots. The tests hold them apart, clear of the parked
       airliners, over the fence when low, and on the ground only airside.
     - **Drawn:** the boot draws the hall (the place's spot), Hangar 1, the
       tower, the windsock, the roadside and the aircraft (`airport.ts`,
       shared paint in `airportkit.ts`); everything else is a district
       loaded as you approach (`airportgrounds3d.ts`, `LAZY_DISTRICTS` id
       `airport`): the field in strips 30 across, the concourses and
       airbridges, the maintenance hangar, the fire station, the fuel farm,
       landside and the GA road.
     - **Round it:** the outskirts' trees keep off its land and the low end
       of its approach (`treeSpot()`), the woods keep `WOODS.clear` from its
       parts and from the land the old airport stood on (`WOODS_OFF`); the
       skyline ring leaves out the towers within 80 of the runway's line;
       the world map draws its land, aprons, taxiways, terminal and runway;
       the benchmark's airport view looks over the apron.
     - **The old site** (x 70-234, z 170-279, inside the highway) is open
       land again, for later; the metro's Airport station still stands at
       its edge until step 2.
     - The traffic's routes are kept to the millimetre now (`mm()` in
       routes.ts): the baked copy in the page is a third of its size, so the
       boot's download went down (629.7 KB of 666 gzipped, from 665.9).
   - **Step 2 (built): landside and the metro.** In `airfield.ts` unless
     said:
     - **The forecourt's loop** (`LOOP`, `airport-forecourt`, one way): off
       Airport Drive's end east past the short-stay car park, down its east
       side, west up the departures ramp onto the deck, round the hairpin by
       the hall's west end, east along the hall's upper doors (the drop-off
       on its right), down the other ramp, north and back west to the drive.
       Traffic and taxis drive it, up and over the deck.
     - **The departures deck** (`DEPARTURES`, 3.3 up, at the hall's upper
       storey): its slab on piers (`PIERS`, off the lanes over them), two
       lanes and a planted median, the kerb's paving up to the hall under
       the wave roof's canopy, parapets, lamps, its two ramps (`RAMP_HALF`
       bands, under 0.11 steep) on embankments. Walked on (walk.ts
       `departuresY()` / `departuresWall()`, as Liberty Bridge's decks: by
       your height, so you walk under it too), driven on (your car keeps to
       its parapets, `DECK_WALLS`, while it's up, and its height through
       `groundAt(x, z, y)`), the traffic and taxis riding it
       (`departuresRoadY()`, `departuresSlope()`). The walk camera can't
       pass up through its slab (`DECK_CAMERA`). Its solids
       (`DECK_SOLIDS`: the piers, the embankments as low as a step) are
       below anything up on it.
     - **The arrivals level** under the deck: the hall's lower doors, the
       taxi rank (`RANK`, Cruisers in taxi yellow and a queue), the airport
       bus in its bay (`BUS_BAY`) with a shelter, ARRIVALS hung under the
       deck's edge, lit soffit.
     - **The multi-storey car park** (`MSCP`: four decks and a roof,
       spandrels with a cyan band, two glazed stair towers, PARKING; cars on
       every deck, `MSCP_CARS`), **the hotel** by the drive (`HOTEL`: a glass
       lobby and nine floors of rooms, its canopy over the sidewalk, RUNWAY
       HOTEL on its roof; made-up name), the short-stay car park in the
       loop.
     - **The metro to the terminal** (`metro.ts`): the Airport branch now
       carries on south down the east ring avenue's median, bends east
       (`BRANCH`) over the airport's old land and the highway's bend and
       ends just past Airport Station by the drive north of the forecourt
       (`AIRPORT_END`; its tower's door faces the track, a short walk to the
       deck, and taxis stop for it on the drive). Runs on the branch go
       faster (`TRAIN.express`, `speedOf()`): every ride stays under 45 s.
       The old Airport station on the avenue is gone.
     - Tests: the deck (its surface, ramps, edges, piers, what fits under
       it), the loop in the plan, the multi-storey and the hotel off every
       road, the cars' models, the metro's branch and station, the taxis'
       longest drives (to the airport's metro station from the stadium,
       about 72 s), the layout snapshot.
   - **Step 3 (built): the cargo area.** At the airside's east end, past
     the passenger apron (the only airside land the taxiways reach); in
     `airfield.ts` unless said:
     - **The cargo shed** (`CARGO_SHED`) and its office (`CARGO_OFFICE`)
       stand in the fence's line, as the hall does: six docks on the
       landside (`DOCKS`: shutters over raised sills, seals, bumpers, lamps,
       their numbers, a canopy along them), three big doors on the airside,
       SECTOR 7 CARGO on both faces (made up), the office glazed.
     - **The cargo apron** (`CARGO_APRON`) with two stands (`CARGO_STANDS`,
       C1 and C2), a high loader at the parked freighter's door and tugs
       with dollies of containers (`CARGO_KIT`), people at work
       (`CARGO_PEOPLE`).
     - **The freighters**: the airliner in cargo trim (`aircraft.ts` model
       `freighter`: no cabin windows, a main deck door forward, DEGEN CARGO
       titles, orange), a fleet of their own. One flies on the timetable
       (`freighter()`: pushed back 24 onto a lane across the apron, round
       onto the taxilane, the airliners' way round (`jetFlight()`), back
       along the taxiway; its taxi brisker, `FREIGHT_TAXI` 9, to fit the
       period), taking stand 5's airliner's slot (now four airliners fly and
       stand 5 has one parked); the other parked (`PARKED_FREIGHTERS`). The
       taxiway and taxilane reach on to its stand.
     - **Landside**: Cargo Road (`CARGO_ROAD`, `airport-cargo`) east off
       Airport Drive, a one-way loop round the truck yard
       (`airport-cargo-loop`, in at the road's end, west past the docks);
       the yard (`YARD`) and its trucks (`RIGS`: tractors and trailers backed
       up to the docks, rows of trailers inside the loop; solid), lamps.
     - **Moved to make room**: the multi-storey a block north (`MSCP`, its
       drive off Cargo Road), the fire station to the cargo apron's corner,
       the fuel farm landside in its north-east corner.
     - Tests: the shed in the fence's line between the yard and the apron,
       the stands, the freighter's flight and the parked one, the trucks in
       the yard off the lanes, Cargo Road in the plan (traffic drives it),
       the timetable's separations, the layout snapshot.
   - **Detail (built): night lighting, signs and planting** (the owner's
     picks, one PR; in `airfield.ts` unless said):
     - **Night lighting**: centreline lights set flush in the runway (white,
       red and white towards the far end, red over the last 30:
       `CENTRE_LIGHTS`) and the taxiway (green), green and amber down the
       connectors with a red stop bar before the runway
       (`airportgrounds3d.ts`); a stand guidance board (`VDGS`) on the
       building's face in line with every stand, dim with nothing there,
       amber while a jet closes on it, green once it's stopped (one
       instanced screen tinted per board, `guidance()` in `airport.ts`); the
       apron masts' pools of light on the side each mast faces
       (`MASTS` carry their facing, `MAST_POOLS`); the approach lights'
       "rabbit", a strobe running in along the crossbars twice a second at
       night (`RABBIT`, `rabbit()`; not under reduced motion).
     - **Signs and planting**: blue road signs with white arrows and a
       plane from one small atlas (`ROAD_SIGNS`: AIRPORT both ways on the
       south bank avenue's verge, gantries over the drive for CARGO · P /
       TERMINAL and DEPARTURES · ARRIVALS, P on Cargo Road, HANGAR 1 · GA on
       the GA road), the SECTOR 7 AIRPORT gateway wall at the drive's way in
       in a planted bed with uplights (`GATEWAY`) and five flags across from
       it (`FLAGS`), flower beds between the drive's trees (`BEDS`), hedges
       along the short-stay car park (`HEDGES`), shrubs round the hotel and
       the multi-storey (`SHRUBS`), trees along Cargo Road (`CARGO_TREES`).
       Drawn as one site (`roadside()` in `airportgrounds3d.ts`).
     - Not done: roundabouts on the drive (they'd change its junctions and
       the traffic's routes; a later step if wanted).
     - Tests: everything on the roadside off every street, its sidewalk and
       the highway, out of the car parks and buildings; a board for every
       stand on the face it noses up to; the masts' pools on the airside.

Each phase (and each of Phase 3's steps) gets the owner's sign-off before the
next one starts.
