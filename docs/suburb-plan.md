# Sunridge, the suburb (plan)

The owner's call (2026-10): a suburb for the middle class inside the ring
highway, after a picture of an Arizona tract-home suburb: curving streets and
cul-de-sacs, stucco houses with tile hip roofs, block-walled back yards with
pools, desert and green front yards. Built one phase at a time, each with the
owner's sign-off; keep this file up to date.

## Decided (the owner's answers)

- **Where:** the north-east inside the ring highway (the owner moved it from
  the north-west, which Westlake Park, Uptown and Uptown North fill): the open
  land east of Palm Court and the east districts, north of the east road at
  z -4.5, up to the highway's north side and its north-east bend. The kart
  park's old land, kept clear since the north side's stage 2.
- **Name:** **Sunridge** (made up).
- **Size:** about 120 houses at real lot sizes (a lot about 13 x 23 m, 7 x 13
  tiles; a house about 10-12 m wide). The land is about 160 x 150 tiles: 120
  lots, their streets, the amenities and the set-back from the highway.
- **Style:** Southwest stucco: sand, adobe, cream and sage-grey render,
  concrete tile hip roofs (terracotta, brown, slate grey), deep eaves,
  two-car garages facing the street.
- **Yards:** a desert-and-green mix: some fronts gravel with agave, cactus,
  palo verde and boulders, some lawn with a palm or a shade tree; every back
  yard behind a block wall.
- **Amenities:** a park with a playground; a school; a community pool and
  clubhouse. No shopping plaza (Palm Court and the mall are next door).
- **Streets:** curving loops and cul-de-sacs, a collector through the
  middle, no through traffic.

## Proposed (the owner to confirm or change before Phase 1)

These are my recommendations, made so the plan is complete; any can change.

1. **The boundary:** x about 104 to 262, z about -160 to -12 (`SUNRIDGE_RECT`):
   clear of Palm Court's east row (x 101.75), the east districts' blocks
   (north edge z -36.7 west of x 116) and the Parkway's kerb, the east road
   (z -4.5), and set back from the highway far enough for the raised
   highway's ramps (docs/highway-plan.md). The three strips between the east
   roads south of it (z 0-60) stay open land for now.
2. **The ways in:** the main entrance off the east road (z -4.5) at the
   collector, **Sunridge Parkway** (made up), with a monument wall each side
   (SUNRIDGE in bronze letters on stucco, palms and uplights); a second
   entrance off the east ring avenue's side through Palm Court's east gap
   (`EAST_GAP`, a walk and a street), so you can walk from the shops. A
   perimeter block wall round the rest, a sound wall where it faces the
   highway.
3. **The street plan:** the collector as a soft loop with a planted median
   at the entrance, local streets bending off it, about eight cul-de-sacs
   with turning circles, sidewalks both sides, street lamps, mailbox clusters,
   a few speed humps. Streets join the street plan (`cityPlan()`), so
   traffic, taxis, walking and the world map read them, as Crestmont's did.
4. **The houses:** four plans (a one-storey ranch, a one-storey L, a
   two-storey, a two-storey with a front porch), each with three elevations
   (arched entry, stone wainscot, a tower entry), about 70% one-storey; the
   colour schemes picked so no two neighbours match. A new building kit,
   `tract` (kits.ts / recipes.ts), laid lot by lot, under `KIT_TALLEST`.
5. **The yards:** fronts: a driveway, a walk to the door, desert or lawn
   (about half each), a tree or palm, a bin by the garage; backs: a patio
   under a ramada, a grill, a pool in about one in three (with its deck and
   loungers), a trampoline, swing set or shed in some, the block wall round
   with a gate.
6. **The amenities:** **Sunridge Park** (a playground with shade sails,
   a ramada with picnic tables, a grass field, a walking loop); **Sunridge
   Elementary** (made up: a low stucco school, its field, a drop-off loop, a
   yellow school bus); the **community centre** (the clubhouse, the pool with
   its deck and umbrellas, two pickleball courts). Each a place with a pin,
   a directory entry and a panel with Walk in, as Crestmont's landmarks.
7. **Life:** kids on bikes and scooters, dog walkers and joggers on the
   sidewalks, people at the pool and in the park, residents' cars in the
   driveways and on the streets (the traffic's own mix, kept to Sunridge's
   streets as Crestmont's are), the school bus at the school in the morning,
   sprinklers by day, crickets at night, porch lights and pools lit after
   dark. Nothing threatening.
8. **Scenery first:** the houses are scenery; buying a house for Dorras (a
   home with a garage spot) is an optional later phase, only with the
   owner's say.
9. **Getting there:** bus stops on the collector (transit.ts), its places on
   the world map, taxis and fast travel; no metro station (Kart Park's is
   across the highway).
10. **Phones:** a district loaded as you approach (`LAZY_DISTRICTS` id
    `sunridge`); phones draw fewer yard details, every other tree, the pools
    as plain water, the back yards' furniture near only.

## Phases

1. **The land and the streets** (built): `sunridge.ts` (DOM-free, tested in
   `tests/sunridge.test.ts`): the land (`LAND`, x 106 to 255, z -150 to the
   north ring avenue's sidewalk, its south-west corner cut along the
   Parkway's bend, its north-east corner rounded round the highway's bend,
   20 clear of the highway's centre line for the ramps), **Sunridge
   Parkway** (`PARKWAY_LOOP`, a soft loop a lot's depth in from the edge, in
   the plan as a two-way `loop` street), its two entrances off the avenue
   (`ENTRIES`: the main one at x 150 with a planted median and lights, the
   other, Desert Bloom Way, at x 228), **Mesa Drive** across the loop
   (`MESA`) and three cul-de-sacs north off it (`COURTS`: Saguaro, Ocotillo
   and Palo Verde Courts, each ending in a turning circle, `BULB`; no
   traffic, as Crestmont's spurs); the amenities' land kept south of Mesa
   Drive (`ZONES`: club, park, school); the footpath from Palm Court's way
   out east (`PATH`). The blocks (`SUN_BLOCKS`, ref `sunridge`) are worked
   out from the streets (`faces()`: the streets and the land's edge as a
   graph, each face's outline the kerb lines round it and round the turning
   circles), each with its runs (a street's kerb, where lots face; the
   land's edge, where the wall stands). The lots are `sunridgelots.ts` (the
   chunk's): 110 of them, 6.6 wide (about 12 m) and 13 deep (23 m), pie
   shaped round the turning circles. The block wall round the land
   (`WALL_RUNS`, `WALL`) and the monument walls at the entrances
   (`MONUMENTS`) are solid (`SUN_SOLIDS` in `SOLIDS`); lamps along every
   sidewalk (`SUN_LAMPS`, at the boot). Drawn by `sunridge3d.ts`
   (`LAZY_DISTRICTS` id `sunridge`): the asphalt, a dashed centre line on the
   loop and Mesa Drive, stop bars, the median, the turning circles, zebras at
   the main entrance's lights, the wall (stucco, a cap, pilasters near
   only), the monuments (stone base, stepped stucco, SUNRIDGE in bronze,
   uplights) and the footpath. The road helpers Crestmont's streets used are
   shared in `roads3d.ts`. The outskirts' trees keep off (`inSunridge()`);
   the north ring avenue's median breaks at both entrances.
2. **The houses** (built): `sunhouses.ts` (DOM-free, the chunk's, tested in
   `tests/sunhouses.test.ts`): a house on 99 of the 101 lots (`HOUSES`), each
   in its lot's frame (`toWorld()`), set back until the lot is wide enough
   (pie-shaped lots widen as they go back) with side yards and a back yard;
   four plans (`Plan`: a one-storey ranch with its garage stepped forward and
   a bedroom wing, a one-storey L round an entry court, a two-storey, a
   two-storey with a porch), about three in ten two storeys; three entries
   (`Elevation`: an arched recess, a stone wainscot with a pier, an entry
   tower); six render colours with their trims (`SCHEMES`) and three tile
   roofs (`ROOFS`), no two neighbours the same colour; a two-car garage
   (narrower on a narrow lot), its driveway and the walk to the door; solar
   panels on some back slopes, a chimney on a few. Drawn by `sunhouses3d.ts`
   (a site a house, from `register()` in sunridge3d.ts): walls on a
   foundation, hipped roofs in concrete tile (a tiled texture a colour, its
   rows along each slope's eave), soffits and fascias, windows in foam
   surrounds about half lit at night, the panelled garage door and coach
   lamps, the front door, the two-storey's band, the porch on posts; near
   only the side and back windows, the fascias, the lamps and the air
   conditioner (none on phones). Their solids (`HOUSE_SOLIDS`: a box where a
   house is square to the axes, small cells where it's turned) join the grids
   when the chunk comes in (`addSolids()`). The lots tightened with it
   (`sunridgelots.ts`: none narrowing to under 4.4 at the back or swung
   sideways round a turning circle's stem; Palo Verde Court's laid first), so
   101 lots, not 120: the amenities' land keeps its room.
   The hipped-roof helpers Crestmont's estates used are shared in `roofs3d.ts`.
3. **The yards** (built): `sunyards.ts` (DOM-free, the chunk's, tested in
   `tests/sunyards.test.ts`): a yard a house (`YARDS`). The front desert
   (decomposed granite in tan, rose or gold, `GROUNDS`: a palo verde or a
   saguaro, agave, barrel cactus, prickly pear, ocotillo, boulders) or lawn (a
   queen palm or a shade tree, shrubs along the house, a flower bed), about
   half each and never three alike in a row; the bins by the garage. The back
   yard behind block walls (`WALLS`, world numbers: along every lot's sides
   from a little behind the house's front, one wall where two lots meet,
   along its back unless the perimeter wall or a neighbour's wall is there,
   and a return from the house to each side line with a gate); its ground
   decomposed granite with a lawn patch, a patio, a ramada on about half, a
   grill, a table and chairs, a pool with its coping, deck and loungers on
   about one in five (where the yard is deep enough), a shed, a trampoline or
   a swing set on some. `YARD_SOLIDS` (the walls in cells along them, the
   sheds) join the grids when the chunk loads. Drawn by `sunyards3d.ts`: a site
   a yard and the walls a site a tile; the trees, walls, pools and ground at
   every distance, the small plants and the back yards' things near only,
   fewer on phones (half the small plants, no furniture, trampolines or swings).
4. **The amenities and places** (built): `sunplaces.ts` (DOM-free, the boot's:
   each place's land on the amenities' block south of Mesa Drive, `CLUB_LAND`,
   `PARK_LAND`, `SCHOOL_LAND`; the clubhouse and the school's two wings and hall,
   `CLUBHOUSE`, `SCHOOL`, solid in `SOLIDS`, `SUNPLACE_SOLIDS`; the front doors,
   `SUN_DOORS`, whose walk prompts open the panels; where you arrive, `SUN_SPAWNS`,
   on the loop's inner sidewalk facing each) and `sunamenities.ts` (DOM-free, the
   chunk's, tested in `tests/sunamenities.test.ts`). **Sunridge Club** (spot
   `sunclub`): the clubhouse with its portico, glass front and tile roof; the pool
   yard behind it in a black iron fence (the lap pool with its lanes, the splash pool
   under a shade sail, umbrellas, loungers, the lifeguard's chair); two pickleball
   courts in a windscreened fence; the car park with its drive off the loop and three
   cars; SUNRIDGE CLUB on a low wall. **Sunridge Park** (spot `sunpark`): the lawn, a
   walk round it and its way in, the playground on red rubber (two towers, a bridge, a
   slide, swings) under two shade sails, the ramada with its picnic tables, shade
   trees, benches, a drinking fountain. **Sunridge Elementary** (spot `sunschool`):
   stucco wings under flat roofs with parapets and air conditioners, classroom
   windows in surrounds (about half lit at night), the hall with its clerestory, blue
   covered walks round the courtyard, the main door under a canopy, the field with its
   lines and goals, the playground under a sail, the bus bay with the yellow bus, the
   flagpole (a made-up flag in Sector 7's colours), SUNRIDGE ELEMENTARY on a low wall.
   Each a place: pin, directory entry, panel with Walk in (`data-sun-walkin`),
   `PLACES` and `LIVE_PLACES` entries. Drawn by `sunamenities3d.ts` (a site each); the
   cars and the bus through `parkedCars()`, `AMENITY_SOLIDS` (the fences, the
   ramada's posts, the play towers, the goals, the cars) joined when the chunk loads.
   The houses' tile roofs are shared (`roofOf()`, `ROOF_MATS` in sunhouses3d.ts).
5. **Life, night and sound:** the people, kids and dogs, the residents'
   cars, the school bus, the bus stops; porch lights and pools at night;
   `ambience.ts` `suburb` (sprinklers, a lawnmower now and then, crickets).
6. **Polish and performance:** `?bench` views (the street, the cul-de-sac,
   the pool), phone checks, the boot budget.
7. *(Optional)* **A home of your own** for Dorras, with the owner's say.

## Constraints

- The boot is at 668.9 of 670 KB: what the boot needs (the streets, blocks
  and solids) is kept small and packed; everything drawn is the chunk's. If
  Phase 1 can't fit, the budget is raised only with the owner's say.
- Made-up names only; nothing for sale on any sign.
- Everything under the Emporium's height.
