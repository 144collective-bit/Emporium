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
3. **The park** (built): `gardens.ts` (DOM-free, tested in
   `tests/gardens.test.ts`), drawn by `gardens3d.ts` in the park's chunk.
   The main walks (`MAIN_WALKS`: the ring walk, the lake loop, the Mall)
   are paved, a stone kerb along both sides (`KERBS`, `KERB`), cut where
   another path joins, at the jetty, the round places and the terraces;
   the gravel paths keep a flush stone edge (`EDGES`). A low stone wall
   with a coping runs round the park (`WALLS`, `WALL`; round the strips
   too until they became Uptown, `docs/finance-plan.md`), broken at the
   gates and wherever a path goes through. The formal
   garden fills the stadium's old site (`GARDEN_SITE`) inside its own
   low wall (`GARDEN_WALLS`, open at the Mall, the cross walk and the
   garden walks): a cross walk (`garden-cross`) and two garden walks
   (`garden-w`, `garden-e`) from the ring walk, two round gravel places
   on the cross walk with a fountain in each (`ROUNDS`, `FOUNTAIN`),
   eight parterres (`PARTERRES`: a clipped hedge open towards a walk, a
   gravel border, a bed of flowers in bands, a topiary cone), urns on
   plinths at the corners (`URNS`), benches round the places and along
   the Mall (`GARDEN_BENCHES`), lamps and a few people. Flower beds in
   low stone-walled planters: oblongs along the Mall between its trees
   (`MALL_BEDS`), round ones in pairs at the main walks' junctions and
   along the ring walk and the loop (`PLANTERS`). Three lakeside terraces
   (`TERRACES`, `TERRACE_STEPS` in westlake.ts) step down off the loop to
   just over the water, a platform with low walls and lantern posts at
   the water: walkable (`onTerrace()`, `terraceY()` in walk.ts, as the
   jetty), nothing on them solid, the boats' rings and the jetty clear of
   them. `GARDEN_SOLIDS` (in `SOLIDS`): the walls, hedges, fountains,
   urns and planters. Kerbs, edges and walls are a site per tile, the
   garden a site, the planters a site per tile, each terrace a site;
   flowers, benches and lanterns near only.
