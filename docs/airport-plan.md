# Sector 7 Airport: the plan

The owner asked for an airport with aircraft that fly, and for players to fly
one themselves. Built in two phases, each signed off by the owner before the
next starts.

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

Each phase gets the owner's sign-off before the next one starts.
