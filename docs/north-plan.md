# The north side (the owner's call)

The owner wants the stadium and the kart park further north, past the ring
highway, and Westlake Park's paths improved with kerbs, low walls and
gardens. Built in stages, each a PR for the owner's sign-off.

## The owner's answers

- **Where:** north of the ring highway, onto the open land past its north
  side, each roughly north of where it was.
- **Getting there:** the north roads (the arterials past the highway turned
  into real streets with traffic and lamps), slip lanes at the highway, and
  a footbridge from Westlake Park's Mall over the highway to the stadium.
- **The land left behind:** the stadium's old site becomes park (the formal
  garden at the end of the Mall); the kart park's old land goes back to open
  land, kept clear for a district later.
- **The kart park:** the same circuit (lap records, ghosts and boards stay
  valid), with a much better facility round it: proper trackside (tyre
  walls, barriers, catch fencing, gravel traps, marshal posts, a timing
  tower), spectator areas (a bigger covered grandstand, grass banks, a
  viewing terrace), a paddock and entrance (a gate arch with its name, a
  ticket kiosk, team tents, karts on stands, a car park) and night lighting
  (floodlight towers, lit signs). The metro's line is extended north over
  the highway to a new Kart Park station.
- **The stadium's car park:** beside the stadium; the old one on the first
  strip goes back to park.
- **The park:** the main walks (the Mall, the lake loop, the ring walk)
  paved with raised stone kerbs, the small paths gravel with a flush stone
  edge; the formal garden by the Mall (low hedges, flower beds, low stone
  walls, benches); flower beds in low stone-walled planters along the main
  walks and at their junctions; a low stone wall round the park's edge,
  broken at the gates; lakeside terraces stepping down to the water.

## Stages

1. **The stadium moves north** (built): `stadium.ts`, `stadium3d.ts`,
   `stadiumgrounds3d.ts`. Its own block north of the highway in line with
   the Mall (`BLOCK`, `CENTRE`); Stadium Road west off the north road (ns0)
   past its front, the car park in a one-way loop off it (`ROAD`, `LOOP`,
   `CAR_PARK`, `STADIUM_STREETS`, `STADIUM_CROSSINGS`), traffic on them
   from the highway, whose junction with ns0 gets slip lanes on its outer
   corners too (`OUTER_SLIPS`); the footbridge from the Mall up over the
   ring walk, the park's edge, the highway and the road down to the
   forecourt, walkable (`BRIDGE`, `bridgeY()`, `bridgeWall()`); lamps along
   the road and round the loop; the outskirts' trees off it all. Its
   grounds load with the park's chunk as you approach (`LAZY_DISTRICTS`).
   The boot's code had no room left for it: the benchmark (`?bench`), Drop
   001's fitting room and the world map are chunks loaded when first used
   now, which made the room (638.5 of 640 KB with main's animation rebuild).
   Stage 2 loads the kart park's drawing, race and menus as you approach
   (below). The old
   site is kept clear (`GARDEN_SITE`) with the Mall running on through it
   to the footbridge (`BRIDGE_FOOT`); the old car park went back to park.
2. **The kart park moves north and grows up** (built): the same circuit
   to the last sample (`kartcircuit.ts` is untouched: records, ghosts and
   boards stay valid), its local frame moved north of the highway east of
   the east ring avenue (`kartpark.ts`: `KART_PARK` x 113-225, z -311.5 to
   -191.5), the site grown round it on every side for the facility
   (`kartfacility.ts`): armco, tyre walls and catch fencing (none solid),
   marshal posts with flags, the timing tower, the covered grandstand over
   the hill and the jump, three grass banks you can walk up, a viewing
   terrace on the hut's roof, the plaza inside the gate with the ticket
   kiosk and the gate's arch, the paddock's team tents with karts on
   stands, floodlight towers, lit signs, and over a hundred people. Kart
   Road runs east off ns3 past the gate, the car park in a one-way loop off
   it like the stadium's (`ROAD`, `LOOP`, `KART_STREETS`); ns3's junction
   with the highway gets outer slip lanes (`OUTER_SLIPS`). The metro's main
   line runs on north over the highway to a new Kart Park station at the
   corner of Kart Road (`NORTH_END`, the train a little faster so the
   longest ride stays about 40 s). The old land outside the Parkway is
   open again, kept clear for a later district.
   The place (hut, garages, tower, stands, gate, kiosk) is built at the
   boot (`kartpark3d.ts`); everything else round the circuit is a district
   loaded as you approach (`kartgrounds3d.ts`, `LAZY_DISTRICTS` id
   `karts`), and the hut's menu and the race are a chunk loaded near the
   park (`kartgame.ts`): the boot's code went from 638.5 to 628.9 KB of
   640 with the facility added.
3. **The park:** paved main walks with stone kerbs, edged gravel paths,
   the formal garden on the stadium's old site, flower beds, the low wall
   round the park, the lakeside terraces.
