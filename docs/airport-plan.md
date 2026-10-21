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
2. **Fly it yourself** (Phase 2).
   - The hangar menu (like the garage): prop plane, small jet, helicopter,
     paints; free and cosmetic.
   - `flight-sim.ts` (DOM-free, like `drive-sim.ts`): arcade handling for
     each kind, soft collisions with `SOLIDS`, the ground and the world's
     edge, take-off and landing.
   - `fly.ts`: getting in at the hangar, a chase camera, the throttle and
     stick on keyboard, touch and gamepad, a speed and height readout,
     synthesised engine sound through the sound switch, getting out on the
     ground.
   - Tests for the handling and the collisions.

Each phase gets the owner's sign-off before the next one starts.
