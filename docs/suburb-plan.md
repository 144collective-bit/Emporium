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
   `tests/sunhouses.test.ts`): a house on 99 of the 101 lots (all 101 since Phase 6) (`HOUSES`), each
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
5. **Life, night and sound** (built): `sunlife.ts` (DOM-free, the chunk's,
   tested in `tests/sunlife.test.ts`). **On the sidewalks** (`SUN_PEOPLE`, the
   park's kind of crowd person): walkers and dog walkers round Sunridge
   Parkway and joggers along Mesa Drive, each street a lane out along one
   kerb and back along the other (`LANES`, `KERB_IN` off the asphalt, inside
   the lamps, clear of the junctions' mouths), everyone in a lane at its pace
   and evenly spread; joggers one way round the park's walk and walkers the
   other; kids (`KID` size) running loops on the park's lawn (`LAWN_LOOP`)
   and the school's field (`FIELD_LOOP`) and two on the swings
   (`SWING_SEATS`); a dog on its lead ahead of each dog walker (`SUN_DOGS`,
   `LEAD`). **Standing about** (`SUN_IDLE`, about 90): at the club the
   sunbathers on the loungers, the lifeguard in the chair, a pair at the
   splash pool, the pickleball players; in the park people on the benches
   and at the ramada's tables, parents by the playground, a kid at the
   slide's foot, someone at the drinking fountain; at the school kids by its
   playground's tower and someone at the flagpole; the residents on every
   other porch (behind the posts, off a tower or wing), at every fifth grill
   (`cook`), at every eighth patio table (two eating) and on every other
   pool's first lounger. **The residents' cars** (`DRIVEWAY_CARS`): a family
   car on about one driveway in three, the longest that fits nosed up to the
   garage door (`NOSE_GAP`), solid (`DRIVEWAY_SOLIDS`, joined when the chunk
   loads). Since the houses, yards and amenities are the chunk's, the crowd
   keeps spare slots for a district's people (life.ts `LifeOpts.reserve`:
   128, 64 on phones; `addPeople()` fills them when the chunk loads, or
   queues them if the crowd isn't built yet) and the chunk trims its lists
   for phones (every other idle person, the movers' trimmed half). **The
   traffic:** life.ts's home cars are per district now (`Home`: a land, the
   spots on routes that keep to it half the way round, its bus's livery, its
   cars in turn): Sunridge's school bus (`SCHOOL_BUS_PAINT`, yellow; the one
   parked at the school stays) and its family cars (`SUN_MIX` in sunridge.ts,
   `opts.sun`: 3 / 2 / 1 by tier), put back on its streets when they wander
   off; bus stops round the collector (transit.ts `SUN_STOP_GAP`, 95: a few
   each way; the school bus serves them, the shelters are transit3d.ts's).
   **Night:** the coach lamps, half the windows and the pools already glow;
   lamps at the boot round the park's walk, in the club's pool yard and by
   its courts, and by the school's front (`SUN_PLACE_LAMPS` in sunplaces.ts).
   **Sound:** ambience.ts `suburb` (all of its land, fading over 30 past the
   wall; the town's hum hushed to `SUN_HUM` 0.3 there, little wind) and
   sound.ts: the sprinklers by day and the crickets at night as Crestmont's,
   its birds as the park's (a little fewer), and a lawnmower a few gardens
   off now and then by day (`mower()`: a low two-stroke drone through a
   low-pass, wavering, up and down over a quarter minute), no arcade beat.
   Drawn by `sunlife3d.ts` (`registerLife()` from sunridge3d.ts's
   `register()`, main thread only: the people into the crowd, the dogs and
   their leads with the city's tick while the camera's near, the cars through
   `parkedCars()`). Kids on bikes and scooters were left out (they'd need a
   ridden bike of their own); the school bus parked by day and gone in the
   morning waits on a timetable.
6. **Polish and performance** (built, signed off by the owner,
   2026-11-20):
   - `?bench` has three more Sunridge views (bench.ts `BENCH_VIEWS`):
     `sun-street` at street level down Sunridge Parkway's west side,
     `sun-court` over Palo Verde Court's turning circle (houses all round it;
     Ocotillo Court's had two lots with no house, below), and `sun-pools` over
     the back yards' pools along the west wall (four of the nineteen pools
     are in that row). With `sunridge`, over the loop, it has four.
   - Measured headless (swiftshader, so draws and triangles count, not frame
     rates; the counts swing by about a fifth from run to run with the
     traffic and crowds). On the phone tier Sunridge is among the lightest
     views: 119-190 draws and 0.27-0.53M triangles (the street 155 and
     0.34M, the court 119 and 0.27M, the pools 190 and 0.35M, over the loop
     170 and 0.53M), against downtown's street at 321 and 0.58M and
     Crestmont's Coral Drive at 156 and 0.56M. On the desktop (medium tier)
     it's 191-266 draws and 0.95-1.96M triangles (its court measured at
     Ocotillo Court's, before the view moved), against downtown's 536 and
     2.13M and Crestmont's 204-258. Its slowest CPU frames were 28-40 ms on
     the phone and 58-133 ms on the desktop, all under memcheck's 250 ms. So no more phone trims and no far
     forms: the phone trims Phases 2-5 put in (no fine house details, half
     the small plants, no back-yard furniture, the trimmed crowd) are
     enough.
   - Every width (320, 375, 768, 1024, 1440, and a phone on its side):
     the club's, the park's and the school's panels on screen, nothing wider
     than the panel, no sideways scroll.
   - The boot: Sunridge's share is about 5.3 KB gzipped (sunridge.ts 4.7,
     sunplaces.ts 0.6). Nearly all of it is what the boot needs (the
     streets, blocks, walls and monuments feed `SOLIDS` and the street
     plan); the few constants only the chunk reads are too small to be
     worth moving. It stays.
   - **Ocotillo Court's two empty lots** (found while choosing the views; the
     owner's pick: a smaller house that fits, the lots where they are). Its
     turning circle stood in open ground: `sun-lot-87` (west of the circle,
     wide but under 10 deep) was too short for any plan, and `sun-lot-88`
     (east of it) was a bow tie, its back corners crossed where the street
     turns hard from the circle into its stem (sunridgelots.ts `fit()`:
     their normals crossed), so its yard walls crossed too. Now the lot
     fitter puts a back the right way round (no lot moved: only 88's back
     corners swapped, every other lot the same), and both lots have a
     **shallow ranch** (`lay(..., shallow)`: the rooms flush with the garage,
     4 deep), laid after every other house from their own numbers
     (`LAID_LAST`), so the 99 houses before keep their ids, yards and
     residents exactly. 101 houses on 101 lots; one more driveway car.
     The circle's north end and the stem's east side still have no lots
     (the lots round them were laid first).
7. **The loose ends** (built, signed off 2026-11-21; the owner's
   picks, 2026-11-21, from the audit after Phase 6):
   - **The panels:** the club's and the school's describe the place
     instead of "coming soon" (draft copy, the owner's to change).
   - **Sprinklers you can see:** `SPRINKLERS` in sunyards.ts (DOM-free,
     tested in `tests/sunyards.test.ts`): a pop-up rotor on every front
     lawn (one a lawn, on its biggest piece, the spot furthest from its
     edges and plants, `HEAD_CLEAR`; its spray's reach `r`, `REACH`), each
     on for three minutes in every nine on the clock (`SPRINKLE`,
     `sprinklerOn()`, about a third at once), its spray round once in six
     seconds (`sprayAt()`). Drawn by sunyards3d.ts's `registerSprinklers()`:
     one instanced mesh of thin arching sprays in the FX layer, by day and
     not in the rain (as the sprinklers are heard), set each frame only
     near Sunridge; under reduced motion the ticks run once, so they stand.
     One draw call.
   - **The school bell:** `sunbell.ts` (DOM-free, tested in
     `tests/sunbell.test.ts`): weekdays at eight, the break (10:30, 10:45),
     lunch (12:00, 12:45) and home time (three), by the visitor's clock in
     step with the school's live line; sound.ts rings it (`schoolBell()`, an
     electric bell's chopped tone), heard across Sunridge (`suburb`).
   - **The edges** (the owner: "fix the edges. this is still rough",
     after the shots; the yards', the streets' and Sunridge's outer edge):
     - *The lawns:* each lawn's turf is an island in its gravel
       (sunyards.ts `islandOf()`, `Yard.islands`): its piece moved in from
       the sidewalk, the lot lines, the driveway and the house
       (`ISLAND_IN`), its edges wandering a little further in (`WANDER`) and
       its corners rounded, so neighbouring yards meet across gravel, not
       lawn against gravel in a straight line; a sliver too narrow keeps its
       gravel. Drawn over the piece's gravel (sunyards3d.ts). The
       sprinklers stand on the turf.
     - *The driveways* stop at the sidewalk, which runs on unbroken (the
       owner's call: an apron across it was tried and taken out); the kerb
       is a rolled one, driven over. Their ends finished (the owner: "please
       ensure all driveway ends are clean"): each driveway is the yard's
       (sunyards.ts `drive`, `driveOf()`, drawn by sunyards3d.ts), from the
       garage door to the sidewalk's edge exactly (`streetV()`: round a
       turning circle the lot's front is a chord and the sidewalk's edge an
       arc, so a gap of bare ground showed), flared out to it each side in
       a quarter round (`FLARE`, never past the lot's sides). The front
       yards' pieces are carried to the same edge, and their turf moved in
       where the edge bows into the lot. Tested: every driveway's end on
       the sidewalk's edge, nothing on the sidewalk, the flares inside the
       lot; the fronts to the edge with no sliver.
     - *The kerbs:* a rolled kerb in pale stone (`STONE.kerb`) along the
       sidewalk's edge beside every street and round every turning circle
       (sunridge3d.ts `kerbAlong()`), only where there's sidewalk
       (`onSlab()`), so it breaks at junctions, crossings and a stem's
       mouth.
     - *The outer edge:* the fringe's dry wash meanders in bends a few
       tiles long (fringes.ts, its range 9.7 to 14.8 in from the highway as
       its test allows) and its path wanders between the wash and its old
       line (never further in, where the highway's bend brings Sunridge's
       sidewalk close), so the bands outside the wall no longer run ruler
       straight. The wall itself stays where it is (nothing moves).
     - *The ground between the yards:* Sunridge's blocks lie in dry desert
       grass (world.ts's `dryGrass` lot, `COVER.dryGrass`) instead of the
       city's lawn green, so the wedges between the turning circles' lots,
       the strips behind the yards and the bare corners read as ground, and
       the watered turf stands out from it (the park's lawn and the
       school's field draw their own grass over it).
     - *The back yards' lawns* soft-edged as the front's (`islandOf()`).
     - *Left:* the sidewalk's square corners at the junctions (the street
       plan's blocks), the wide bare lawn by the school, and the strip up
       Palm Court's back (too narrow to bend).
   - **Left for later** (the audit's other items, each the owner's call):
     driveway cars leaving in the morning and back in the evening with
     their garage doors, kids on bikes and scooters and hoops over the
     garages, the ice-cream van at the park, swimmers, seasonal porch
     decorations, the rest of Ocotillo Court's lots.
8. **The gardens and the land behind** (built, signed off 2026-11-21; the owner, 2026-11-21: "do them all then lets work fixing the
   garden fences. i want the fences to be moved to suit the existing wasted
   space. scan the entire area of sunridge ... extend some gardens to use the
   wasted space"):
   - **The last rough spots of Phase 7:** the blocks' street corners rounded
     (sunridge.ts `roundCorners()`, `KERB_RETURNS`: every junction and each
     cul-de-sac's stem into its circle; sunridge3d.ts fills the asphalt into
     each and lays the kerb round it; the lots, laid from the runs, don't
     move); the strip of slab outside the perimeter wall a gravel verge
     spilling onto the ground in a wandering line, with clumps of boulders
     and shrubs, where the land outside is open.
   - **The scan:** Sunridge's blocks rasterised, every bit of land on no
     lot, amenity or footpath found: 75 patches, about 4,800 square tiles
     (the lots: about 9,000), the biggest the band along the east and north
     walls and round the school, the loop's middle between back-to-back
     rows, the strip by the club, park and school, the south avenue's
     strip, the wedges round the turning circles and the north-west and
     south-west corners.
   - **The gardens, each block divided among its lots** (the owner, after the
     first growth pass: "close the pockets ... do another pass to optimise
     and balance the arrangement of the garden fences. take full creative
     control and do what is needed to make it a realistic design and
     layout"). A first pass grew each lot's four corners into the land
     behind; it left bent gaps and long strips four corners couldn't close.
     It was replaced by dividing the land as a subdivision is
     (sunridgelots.ts `divide()`, `GARDENS`, baked as `sun-gardens`): every
     bit of a block goes to the row of the street it's nearest (so
     back-to-back rows meet on one rear fence along the block's middle, and
     a corner's two rows on its diagonal), only where that row has houses
     (`ROW_REACH` past its first and last), and in the row to the nearest
     lot (side fences straight back from the street, fanned round a curve,
     the land behind the inside of a bend shared out). Kept off: the
     amenities' land in the lot's own block (`KEEP_CLEAR`, where the lot
     wasn't laid within it), the footpath, every other street's sidewalk
     and its own past the row's ends (`STREET_CLEAR`), the land's edge
     nearer than the perimeter wall's line (a garden reaching it backs onto
     that wall); no deeper than `DEEP`. Each garden is the outline round
     its cells on a quarter-tile grid (`RES`, `contour()`), smoothed into
     fence lines (`dp()`, `simplify()`, spikes out), holding its whole lot
     (`holding()`), brought back inside its block (`pullIn()`): a `Garden`,
     its `outline`. The houses keep their lots (`LOTS`); the yards read the
     gardens in the house's frame (sunyards.ts `gardenFrame()`, `acrossG()`,
     `depthG()`): the walls on every garden edge but the open front yard
     (the lot's own ground in front of the return walls) and the first
     tile back from the street, so a garden reaching along a side street
     beside its house is walled along it, as a corner lot's is; shared
     fences once (trimmed where another wall stands), one return a side;
     the whole garden in gravel under the front's ground (`Yard.inner`), so
     no land beside a house is left bare; the back lawn grown out to the
     garden's walls where it spreads behind the house (`Yard.lawn`, the
     biggest quad that keeps a path's width in, never smaller than the old
     back yard's patch); a pool no further from the house than in a lot's
     own yard. Tested: each garden holds its lot and stays in its block,
     none overlaps another, over 90% of the free land is in a garden, and
     every back lawn is inside its garden.
   - **More houses** (the owner's call for the field east of the school):
     the amenities' land is drawn as rough rectangles, and the school's
     and the club's reached across the loop into the blocks outside it, so
     no lots were laid there. A late pass (sunridgelots.ts `late()`,
     `LATE_FROM`) lays lots there, kept off only the amenity land whose
     middle is in that block: six along the loop's outer side east of the
     school and two in the gap on the south row; their houses are built
     after every other (sunhouses.ts, `rng(8823)`), so every house, yard
     and resident before keeps its id.
   - **What's left:** about 540 square tiles of the 4,800 the scan found,
     nearly all the thin margins kept round the amenities and the streets
     and a few slivers where three gardens meet.
9. *(Optional)* **A home of your own** for Dorras, with the owner's say.

## Constraints

- The boot was at 661.1 of 680 KB after Phase 5 (761.8 of 765 at Phase 6, the city grown round it) (the start-up pass made room,
  docs/performance-plan.md): what the boot needs (the streets, blocks and
  solids, the places' lamps) is kept small and packed; everything drawn, and
  its life, is the chunk's. The budget is raised only with the owner's say.
- Made-up names only; nothing for sale on any sign.
- Everything under the Emporium's height.
