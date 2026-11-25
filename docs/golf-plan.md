# The golf course: 18 holes in the north-east corner (a plan)

The owner's call (2026-11-21): "delete the old club and let's build a new functional golf course. We will need to make
elevation changes and hills. Make bunkers, fairways, greens, rough, and once this is built we will make a golf game
dynamic so we can play actual golf on the course. Can you help plan its design first, then later we make it a game in
the game."

A full 18-hole course on the open land in the north-east corner, past Crestmont's hills, with its own hills and
hollows, lakes, bunkers, fairways, greens and rough. Scenery first, then a place, then the golf game on it. Crestmont's
six-hole Hills Club is retired when the new clubhouse opens (Phase 4).

Nothing is built until the owner signs off a phase; keep this plan up to date. The design maps are in
`docs/golf-shots/` (`npm run golfmap -- <label>` draws one from the data).

## The owner's answers (2026-11-21)

| Question | Answer |
| --- | --- |
| Where | The north-east: the open land past Crestmont's hills (the owner's screenshot, 2026-11-21) |
| The old club | Delete Crestmont Hills Club (its six holes on the hills) and build the new course instead |
| How big | 18 holes |
| Playable? | Scenery first (the course, clubhouse, carts and golfers as a place); the golf game later, its own phase |
| The ground | Elevation changes and hills, made for the course |
| What's on it | Bunkers, fairways, greens, rough (and the water, the tees, the fringe and first cut with them) |
| Start | Plan and Phase 1 now |
| Phase 1's layout (2026-11-21) | Signed off as drawn (`docs/golf-shots/phase-1-layout.png`) |
| The club's name | **Knob Hill Golf Club** (for the Knob, the course's big hill in the corner) |
| The practice range | By the clubhouse: a short range and a putting green on the grounds (Phase 4) |
| Phase 2 | Go (2026-11-21) |

## The land

The open corner (the data map, `npm run golfmap`): an L of open land and pine woods between Northgate Air Base's east
fence (x 258 to 276), the wall (x 800, z -760), Crestmont's hills (x 285 to 490, z -450 to -75) and the country road
east (`ew0-e`, z -4.5). Nothing stands there today; the air base plan keeps it as "open land and woods" (its Phase 1).

- **The north arm:** x 304 to 776, z -736 to -458, across the top of the hills, the air base's fence to its west.
- **The east arm:** x 512 to 776, z -458 to -36, down the east side of Crestmont to the country road.
- **The clubhouse** where the arms meet (about x 500 to 572, z -520 to -470), on a low rise, reached by its own drive
  (Clubhouse Drive) up from the country road along the hills' east foot (x about 500).
- The club's edge wanders (no ruler-straight edge): 18 or more from the air base's fence and the wall, clear of the
  hills' land, every street and every keep (`tests/golf.test.ts`).

## The design (Phase 1's map: `docs/golf-shots/phase-1-layout.png`)

The holes are about half real length (the city's scale: a tile is about 1.8 m): par 3s 80 to 115, par 4s 145 to 185,
par 5s 210 to 260. Par 72, 2,772 tiles (about 5 km at the city's scale). Each nine goes out from the clubhouse and
comes home to it.

| Hole | Name | Par | Length | Tee to green (tiles) | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | First Light | 4 | 147 | -0.4 | West off the clubhouse's rise along the hills' top, a gentle dogleg |
| 2 | Fence Line | 4 | 160 | +4.2 | North up the air base side, climbing to a green cut into Beacon Hill |
| 3 | Long Wall | 5 | 211 | -4.9 | Off Beacon Hill east along the wall, a double dogleg |
| 4 | The Climb | 4 | 149 | +5.5 | Up the Knob's shoulder to a high green in the corner |
| 5 | Knob Drop | 3 | 83 | -10.1 | The signature hole: from the Knob's top down to a green guarded by three bunkers |
| 6 | Mid Run | 5 | 236 | -1.0 | West the length of the arm below the middle swell |
| 7 | Fen Turn | 4 | 161 | 0 | Past Fen Pond, a dogleg right along the west swell |
| 8 | The Pond | 3 | 85 | -1.1 | Over the Pond to a green with a bunker behind |
| 9 | Homeward | 4 | 153 | +0.4 | Back down to the clubhouse, a dogleg left |
| 10 | Hillside | 4 | 160 | -0.5 | South off the rise along the hills' east foot |
| 11 | Heron | 3 | 86 | +0.9 | Along Heron Lake |
| 12 | Country Mile | 5 | 218 | -0.1 | South then a sharp dogleg east along the country road |
| 13 | East Wall | 4 | 160 | +0.8 | North up the wall's side |
| 14 | Long Watch | 4 | 162 | -1.3 | On north under the east bank |
| 15 | The Spine | 5 | 213 | -1.1 | South down the Spine's east flank past Clubhouse Lake |
| 16 | Reed Carry | 3 | 84 | -0.4 | Across the Hollow by Reed Water |
| 17 | The Hollow | 4 | 150 | +0.4 | North up the Spine's west flank past Heron Lake |
| 18 | Clubhouse | 4 | 152 | +0.6 | North, a dogleg left up to the clubhouse past Clubhouse Lake |

- **The ground** (`golfground.ts`): the Knob (13 tiles, about 23 m, in the north-east corner), Beacon Hill (8, the
  north-west), the Spine (a long ridge down the east arm between 15 and 17), the middle swell, the west swell, the east
  and south banks, the clubhouse's rise, the Hollow and a hollow under each lake; low waves over all of it; today's
  ground (0) at the club's edge. The course stands from 2.8 under (the lake beds) to 13.6 over.
- **The holes on it:** each fairway held to its line, smoothed along it and no steeper than 9% (`GRADE`), keeping a
  quarter of its hillside's fall across it; a par 3's carry the land as it lies. The tees level (raised a little, the
  Knob's cut and filled evenly), the greens planes tilted 1.8% up to the back, their fronts meeting their approaches.
- **The hazards:** 50 bunkers (greenside pairs, fairway bunkers biting the fairways' edges at the landing zones, a pot
  behind 5 and 8), dug a third of a tile in (a shallow bowl, Phase 2); five lakes (Fen Pond, the Pond, Heron Lake, Reed Water, Clubhouse Lake), each
  held under its lowest shore.
- **What's underfoot** (`surfaceAt()`): water, bunker, green, fringe, tee, fairway, first cut, rough, native grass (past
  34 from any hole's line: the woods' land), the grounds: the lie the golf game reads.

## The phases

### Phase 1: the layout and the ground, as data (built)

**What's built:**

- `golf.ts` (DOM-free, on `DOM_FREE`, tested in `tests/golf.test.ts`): `COURSE` (the club's land, `wander()` round
  `COURSE_BASE`), `inCourse()`, `insetOf()`; `HOLES` (each hole's line, par, fairway, tee's raise, green, bunkers in its
  own frame), `along()`, `framePt()`, `nearestOn()`, `fairwayHalf()` / `fairwayIn()`, `teeOf()`, `greenOf()`,
  `onGreen()`, `onTee()`, `bunkersOf()`; `LAKES`, `lakeAt()`, `inLake()`; `CLUB_GROUNDS`, `CLUB_CENTRE`, `DRIVE`;
  `surfaceAt()`; `holesApart()`.
- `golfground.ts` (DOM-free, on `DOM_FREE`, tested in `tests/golfground.test.ts`): `FEATURES`, `landAt()`, `lineAt()`,
  `teeLevel()`, `greenLevel()`, `groundsLevel()`, `lakeWater()`, `golfHeightAt()`.
- `scripts/golfmap.mjs` (`npm run golfmap -- <label>`): the design map from the data, to `docs/golf-shots/`.
- Not in the city yet: nothing drawn, walked or driven on changes. The snapshot is untouched.

### Phase 2: the ground in the city (built)

**What's built:**

- **The ground, baked** (`golflift.ts`, DOM-free, on `DOM_FREE`, tested in `tests/golflift.test.ts`): golfground.ts's
  heights and golf.ts's land on a grid every 2 tiles over a fixed box (`GOLF_RECT`, x 296 to 784, z -744 to -30), worked
  out when the site is built (`baked()` key `golf-ground`, about 29 KB gzipped) and read back: `golfLift()` (each square
  two triangles from its low corner to its high one, as drawn), `golfLand()` (off the course, native grass, or in play),
  `golfShare()` (the land blurred, for the paint), `golfWater()`, `golfIn()`, `onGolf()`. The boot never imports
  golf.ts or golfground.ts (they'd have come into the boot's code, 3.5 KB, with the boot at 770 of its 775): the grid is
  worked out by `golfbake.ts`, which only the bake (first in `scripts/bake.mjs`), the tests (each test file's entry,
  `scripts/test.mjs`) and the seam map's script load. The boot grew 1.5 KB.
- **Walked, driven and seen round:** terrain.ts's `heightAt()` adds `golfLift()`, `onHills()` takes the course's land,
  `hillsAlong()` its box, so walking, driving, flying, the cameras, shots and the outskirts' trees follow the course.
- **The grass** (world.ts `golfPlane()`): every ground piece the course's land comes into, on the course's grid near
  (`GOLF_STEP`, exactly what's walked on) and far a middle every third point with its edges still on the grid
  (`golfMesh()`: a band zips the two, so a tile drawn far meets one drawn near with no gap; skirts were tried first and
  their ink showed through the gaps); painted from the ground's cover (`paintGolf()`), a little lighter up the hills.
- **The land rules:** the course's play is in `KEEPS` (`golf`, `since`), so the outskirts' trees keep off it and its
  native grass keeps its woods; the rolls keep off the course (rolls.ts `kept()`); the ground's paint eases into the
  course's rough and native grass (`INFLUENCES` `golf-native`, `golf`; new covers in `palette.ts`: `courseRough`,
  `courseNative`, `fairway`, `fairwayStripe`, `firstCut`, `green`, `greenStripe`, `fringe`, `tee`, `sand`,
  `sandLip`). No block edges (`BY_CHARACTER`), lamps, crowd or open patch (`GAP_NAMES`: it's outside the highway).
- **The turf and the water** (`golf3d.ts`, the district `golf` in `LAZY_DISTRICTS`, its own chunk, about 10 KB): what's
  mown in one texture (`drawTurf()`: the first cut, the fairways in stripes, the tees, the fringes, the greens in fine
  stripes, the bunkers' sand with its lip; clear over the water and everywhere else), 2 pixels a tile (phones half), made
  at build time; laid on the grass's own triangles a hair over it (`turfMesh()`: only where it shows, `mownNear()`, near
  and far as the grass), a site a tile, alpha-tested so its edges are the texture's,
  one draw. The lakes' water at their levels (`shoreOf()`, the city's water shader) in one mesh, one draw, on the main thread.
- The shots: `docs/golf-shots/phase-2-*.webp` (desktop and phone, by day; taken before the bunkers were made shallower and the turf laid at one height near and far, the last two fixes for ink lines). Measured with `?bench`: the views `golf` and `golf-green` (bench.ts).
- **What it costs** (counted from the same meshes, `golfMesh()` and `turfMesh()`, over the 307 tiles the course comes
  into: the headless `?bench` takes over an hour a tier, longer than the run allowed): 558 triangles a tile drawn near
  (the grass and the turf), 120 drawn far; the whole course far about 37k, a view of it with the tiles round the camera
  near about 50k (Crestmont's hills' grass is about 47k). Two draws more where it's in view (the turf, the water). The
  boot 1.5 KB more (772.5 of 775), its chunk about 10 KB, the baked data 29 KB more (gzipped). The turf's texture 968 x
  1428 (phones half), made at build time with the rest.
- Not yet: the drive, paths, woods planted between the holes, the clubhouse, flags (Phases 3 to 5).

### Phase 3: the drive, the paths and the woods (built)

The owner's go: 2026-11-21 ("1": the drive, the paths and the woods). The map: `docs/golf-shots/phase-3-layout.png`.

**What's built:**

- **Clubhouse Drive** (golflift.ts `DRIVE`, the boot's: the clearing rule and the country road's fence read it): off
  the country road east (`ew0-e`, its north edge, x 502) north along the hills' east foot, over the club's edge once
  (about z -380) into its land and up to the clubhouse's grounds. A private drive, as Northgate's visitors' drive is:
  not a street of the plan (no traffic, no new crossing), its gap in the road's fence (`CLUB_GAPS`, ruralfence.ts
  `DRIVES`). On the course it rides a bed (golfground.ts `driveBed()`, `DRIVE_BED`): today's ground till it's `BED_IN`
  in from the edge, then up evenly (under 4%) to the grounds' level, level across. Drawn by golf3d.ts (`driveMesh()`:
  asphalt a hair over the ground), three lamps on its course side (`DRIVE_LAMPS`, sodium heads; no pools of light) and
  stone pillars where it comes onto the course.
- **The cart paths** (golf.ts `PATHS`): beside each hole `PATH_OFF` out (past the first cut and the fairway bunkers),
  on the side and in the shape (round behind the green or not) that crosses no play with its way on to the next tee
  (`pathCost()`; `SIDES` where it's chosen: the 12th's on the road's side, for the footpath), each green's on to the
  next tee bent round what's in the way, the grounds out to the 1st and 10th and back from the 9th and 18th. Painted
  on the turf, under what's mown (golf3d.ts); the lie `path` (`surfaceAt()`, `fromPaths()`).
- **The footpath** (golflift.ts `FOOTPATH`): from the 12th's path out over the club's edge to the country road (x
  688), its own gap in the road's fence: the course is a way through on foot, drive to footpath (nowhere a dead end).
- **The woods** (golflift.ts `golfTrees()`): the baked land now in four (`LAND`: off, native, rough well clear of the
  holes, play; golfbake.ts `landAt()`, `TREES_CLEAR`); a tree on most native grid points' share (`WOODS_CHANCE`), a few
  in the far rough, none in play, none with a neighbour in play or off the course; the city's own trees, near and far
  (world.ts `scatterOutskirts()`, phones half: the trim). The outskirts' trees keep off the club's land, its drive and
  its footpath (`KEEPS` `golf`, `golf-drive`, `golf-footpath`). 1,393 trees.
- **The club's edge** (golf3d.ts, near only): a white post-and-rail fence along it (`FENCE_RUNS`, `FENCE`), open where
  the drive and the footpath come in (`FENCE_GAPS`); not solid (a low rail, as a field's). Reeds round the lakes where
  the bank isn't in play (`reedsOf()`).
- The ground's paint: the drive's and footpath's verges worn (`INFLUENCES` `golf-drive`, `golf-footpath`).
- Changed on the way: the 6th's tee 9 back (its par 5 227 long), so the 5th's path passes it; the bunkers a shallow
  bowl (Phase 2).
- The shots: `docs/golf-shots/phase-3-*.webp` (the drive, its way onto the course, the woods; taken before the drive's corners were rounded, `DRIVE_CORNERS`). The drive's corners rounded (Chaikin's, two passes): it bends, it doesn't kink.
- **Not done** (the owner's to choose, later): bridges over the water (the paths keep off it instead), the cart path a
  street for the carts (Phase 5's carts ride it).

### Phase 4: the clubhouse, and the old club retired (built)

The owner's go: 2026-11-21 ("2": slim the boot first rather than raise its budget).

**The boot's room** (option 2): tried first was taking the guns' shapes out of the boot (character.ts imported guns.ts
only for a parading soldier's rifle: 18.5 KB minified). Undone: with that import gone the bundler still filed guns.ts
in a chunk the boot loads (every chunk that uses it loads after the boot), and the bundler's way to keep it apart
(`includeDependenciesRecursively: false`) needs `strictExecutionOrder` and `preserveEntrySignatures` across the whole
site, too big a change for a few KB. What made the room instead: the old club's data left the boot (crestsites.ts)
and the new one is small (golflift.ts `GOLF_CLUBHOUSE`), so the boot stays under its 775 KB (the number below).

**What's built:**

- **Knob Hill Golf Club's clubhouse** (golflift.ts `GOLF_CLUBHOUSE`, the boot's: the place, its door, its solids;
  `CLUB_NAME`; golf.ts `CLUB_GROUNDS` is its grounds): on the grounds where the arms meet, level at the rise's top
  (`clubLevel()`): two storeys, white with trim and a green hipped roof (`GOLF_CLUBHOUSE_H` 7.2, under the Emporium), a
  porch of four columns south over the car park with the club's name over it (a sign board, gold on green, lit at
  night), glass doors onto a terrace north over the course (a rail, tables under umbrellas, near only), the car park
  where the drive comes in (its bays' lines), the cart shed with four carts, the putting green on the east (in the turf,
  its three flags) and the practice nets on the west (three bays, mats: the short range, the owner's call). Drawn by
  golf3d.ts (`drawClubhouse()`, the site `golf clubhouse`); its solids (`golfSolids()`) in solids.ts.
- **The place `golfclub` moved here** (the owner's call, 2026-11-21: "delete the old club"): its spot and pin over the
  clubhouse (crestspots.ts), its door in the porch (walk.ts `ALL_DOORS`), Walk in in the car park facing it (places.ts,
  index.ts `data-golf-walkin`), its panel (CityMap.astro: "Knob Hill Golf Club", "Eighteen holes over the hills past
  Crestmont. Golf coming soon.", draft copy), its live name (live.ts), its square on the world map (worldmap.ts). The
  snapshot holds no door or spawn of it, so it needed no rewrite.
- The tests: `tests/golflift.test.ts` (the clubhouse, its door, Walk in, the place moved); solids.test.ts, terrain.test.ts
  and travel.test.ts take the club as they take Crestmont's landmarks up the hills (its solids and its arrival on the
  course's ground; a taxi's ride to it, which stopped at Ridge Road's top till the drive became a street: below).
- The shots: `docs/golf-shots/phase-4-*.webp` (the clubhouse from over the putting green, its porch and name, the phone tier).
- **Crestmont Hills Club retired**: its six holes, clubhouse, carts, terrace, garden, bank, people and level pad gone
  from crestsites.ts, crestbanks.ts, crestgardens.ts, crestlife.ts, crestsites3d.ts and their tests; the land back to
  the hills' own cover (the drifts, oaks and scrub now reach it; a drift the paths cut down to under three clumps is
  left out, crestcover.ts).

### Clubhouse Drive a street (built)

The owner's go: 2026-11-22 ("1": make Clubhouse Drive a real street, so taxis and a little traffic drive up to the club;
found in Phase 4: a taxi to the club stopped at the top of Ridge Road, about 175 tiles over the hills' shoulder).

- **The drive a street of the plan** (golflift.ts `golfStreets()`, pushed by streetplan.ts after the country roads are
  split): `golf-drive` (one lane each way, `DRIVE_HALF`) off the country road east (`ew0-e`) at the crossing
  `golf-drive-gate` (no lights; not a `-join`, which routes.ts would take as a road carrying straight on) up `DRIVE`
  to the car park, and `golf-drive-turn` there: a one-way turning loop (`DRIVE_TURN` round, at `golf-drive-end`) so a
  car turns round without a U-turn. The car park reaches down to it (`GOLF_CLUBHOUSE.carpark` to z -470). Its kind
  `rural`, but not one of rural3d.ts's runs: golf3d.ts still draws it (`driveMesh()`, on its bed), and the street's own
  keep and verge take over the old `golf-drive` ones (landuse.ts, ground.ts).
- **Taxis** drive up it to the car park (from the emporium about 82 s; the longest, from the tube's Aldwyn's Green
  station in the far south-west, about 143 s); every other place's taxi keeps to the streets it had (routes.ts
  `project()` leaves the club's streets to the club: `inClub()`). **A little traffic**: the drive and its loop are
  stretches like any other, so the traffic's routes take them.
- Fixed on the way (routes.ts `joinLegs()`): a leg's way in and out read over a stretch long enough to have one (the
  country road's short piece by the gate), and two legs in line with no corner between them joined straight (they
  used to meet nowhere: a route that never ended).
- The tests: golf.test.ts (no street on the course but the club's own), terrain.test.ts (the club's streets on the
  course's ground), travel.test.ts (the club's rides; the nearest kerb leaves the club's streets to it); the snapshot
  rewritten for the two new streets (the owner's call: nothing that was there moved).

### Phase 5: its life, night and sound

The owner's go: 2026-11-22 ("Phase 5: course life", and for the golfers' swing and putt, which the crowd's rows put in
the boot, "Slim start-up first" rather than raise its budget).

**The boot's room first** (773.6 of 775 KB): flying's step (`stepFly()` and its handling, collisions and edge) moved
to `flight-step.ts`, fetched when you're near your aircraft or climb in (fly.ts `loadStep()`, `FETCH_NEAR`): 1.7 KB;
the guns' list and the dummies' places moved to `weapons.ts` (combat-sim.ts re-exports them), so target practice's
rules leave the boot with it: 3.5 KB. The boot 768.4 KB. (Looked at and left: the gun builder, which the Armoury's
counter and the parading soldiers' rifle need at the boot, baked it'd be as big as data; the missions' card, which
paints the level pill at once; the kart park's and the metro's drawing, which the boot shows.)

**What's built** (golflife.ts the rules and data, golflife3d.ts the drawing; `docs/guide/golf.md`):

- **What stands on the course**, a hole each (`FURNITURE`): the flag in the cup somewhere on the green (the front
  nine's red, the back's yellow), streaming in the wind and fluttering; the tee markers at the tee's front; a ball
  washer, a bench facing the tee and the hole's sign (its name: "FIRST LIGHT", never a number) on the grass beside it,
  clear of the cart path (the first clear of a few spots: on some holes the path hugs the tee); a rake by every
  bunker, on its far side from the line. Near only, a site for each tee and each green.
- **The golfers**: three groups on each nine (two to four in each: `GROUPS`), spread round it, each playing its nine
  for ever, the same round every time (`roundOf()`): off the tee in turn, out to their balls, the furthest from the pin
  first while the rest stand and watch, onto the green, a putt and a tap-in each, a step back off the line, then on to
  the next tee by the cart paths (round the water by the hole's path where a straight walk would cross it: the 8th's
  carry over The Pond), walking abreast; a nine takes an hour and a half or so. They're the crowd's (the spare
  slots: phones half of them), in the `golfer` look (a light zip top, chinos or shorts, white shoes, mostly a cap) with
  a club in the right hand; their swing and putt are two new crowd rows (`golf`, `putt`: right-handed, the shoulders
  and hips turned away and through, the head down till after the ball), each played from its start
  (`Moment.since`).
- **The carts**: two round each nine's cart paths end to end (phones one), a driver on each (the crowd's, seated).
  **The mower**: the greenkeeper up and down the 10th's fairway in its stripes. **The ducks**: two to four on every
  lake, paddling slow rounds. One instanced mesh each, moved on the tick while the camera's near the course.
- **Night**: the clubhouse's windows lit warm (`golf-window`); the course stays dark (the drive's lamps as they were).
- **Sound**: over the course the park's birds by day and owl at night, Crestmont's sprinklers by day and crickets at
  night, the wind softened (ambience.ts `GOLF_BIRDS`, `GOLF_LAWNS`, from golflift.ts `golfShare()`).
- Still under reduced motion: everything holds its first frame.
- Fixed on the way: ink zig-zags across the rough by the tees and greens (the turf's triangles, drawn solid in the
  ink's pre-pass, its clear parts and all): the turf's now out of it (golf3d.ts, kit.ts `fx()`), paint on the grass.
- The boot: 769.1 KB (the rows, the look, the club and the sound: 0.7 KB of the room made first).
- The shots: `docs/golf-shots/phase-5-*.webp` (a group on the 1st tee with their clubs, a tee's bench and sign, a flag,
  a cart, the mower, ducks on Fen Pond, the clubhouse at night, the phone tier).
- Learnt on the way: a spare crowd slot shows only the pieces its kind's meshes carried at the boot, so the first spare
  slot of each kind holds a club till the course's chunk fills it (life.ts), and the golfers' trousers are left to
  their slot's kind (crowdlook.ts).
- The tests: `tests/golflife.test.ts` (what stands where and on what, the golfers' rounds closing on themselves, on the
  course and out of the water, a drive off every tee and two putts on every green, standing apart, the groups apart,
  the carts on their paths at their pace and apart, the mower on its fairway, the ducks on the water, the look, the
  swing's and the putt's shape and length, the sound).

### Phase 6: the golf game (its own plan, `docs/golf-game-plan.md`: written 2026-11-22, the owner's "1"; answered and Phase 1 under way)

- Rules DOM-free and seeded (a ball's flight with the wind, its lie from `surfaceAt()`, its roll on the greens from the
  ground's slope, the clubs, strokes, the card), the view only drawing them (aim, a power swing, the camera).
- Play a hole, nine or eighteen; rewards Dorras and XP only. Its save (`degen-city-golf-v1`) with its migration and its
  key in `BACKUP_KEYS`; in through `live.closed()`; touch controls.

### The design pass (the owner's call, 2026-11-24: "do a design pass across the golf course"; D1 first, go 2026-11-24; the lakes stay where they are; D1 signed off 2026-11-24, D2 next, go 2026-11-24; D2 merged with the pines past the fence, 2026-11-25; D3 signed off 2026-11-25, D4 next, go 2026-11-25)

The survey (2026-11-24): every hole from behind its tee and from short of its green, the lakes, the clubhouse, on the
desktop by day (`docs/golf-shots/design-0-*.webp`: `greens-a` holes 1 to 6's greens, `greens-b` 7 to 12's, `tees-a`
1 to 6 from the tee, `east` 13 to 18, `wide` the course from above, the clubhouse and four lakes). What it shows:

1. **Every green alike**: the same oval, a matching pair of bunkers either side a touch short (golf.ts `sides()`), the
   fairway ending the same way into it. Nothing tells one hole from the next close up.
2. **Soft edges, no ink**: green, fringe, fairway, cut and bunker fade into each other (the turf texture's blur), where
   the rest of the city is flat colour inside a black line; a few bunkers smear into the fringe (holes 8, 10, 11).
3. **Flat rough and thin woods**: wide plain dark green; the trees small, single and evenly spread, few clumps; the
   east arm's six holes side by side with almost nothing between them.
4. **The wall looms**: on 2 to 5 and 13 to 15 the world's wall fills the sky over the north and east fences with
   nothing in front of it.
5. **Reeds in a ring**: each lake's reeds stand evenly round its whole shore, reading as a fence of black sticks.
6. **Water mostly out of play**: only the Pond (8) crosses a hole; Reed Carry (16) doesn't carry over Reed Water.
7. **Small things**: stray thin ink arcs across the turf by greens 9, 11 and 12; the cart paths a cold lilac, cutting
   straight past the tees; the tees plain square slabs.

Proposed, a phase at a time with the owner's sign-off (each keeps the game's tests and lies right, the draw budget, the
phone tier and the boot):

- **D1, the greens and bunkers**: each green its own shape (round, pear, kidney, long and narrow, tiered by the
  ground), each hole its own bunkers (one to four, sized and placed for that hole, no mirrored pairs; a few fairway
  bunkers where the drive lands; a waste bunker on a par 5), crisp turf edges with an ink line round greens and
  bunkers, the smears and stray arcs fixed.
  **Built and signed off (2026-11-24, the owner).** Seven green shapes (`Lobes` in golf.ts: pear, front-heavy,
  peanut, kidney either way, round, long), no two greens alike in size and shape; every hole's bunkers placed by
  hand (two to four, fairway bunkers where the drive lands on most par 4s and 5s, each with its own seeded outline and
  turn), greenside ones pushed out to `BUNKER_CLEAR` from the fringe, which ends the smears; an ink line round every
  green and bunker (`INK_LOOPS`, ribbons on the turf, near only, in the turf's batch: no new draw calls); the stray
  arcs gone with the old matching pairs. The ground holds each green to its plane over its new shape; the rakes sit
  by the new lips. Greens fitted to their ground after the reshaping: 2 and 17 smaller, 9 front-heavy (it reached the
  clubhouse's level grounds). The waste bunker on a par 5 isn't built yet. Checks: `npm test` and `npm run test:wide` (2388 each), typecheck,
  lint, the budget (boot 769.8 of 775 KB); the shots `docs/golf-shots/design-d1-greens.webp` (desktop, holes 1, 3, 5,
  6, 8, 12, 16 and 18) and `docs/blend-shots/golf-d1-low/` (the phone tier, 6 and 16); the map
  `docs/golf-shots/design-d1.png`. `?bench` headless closed the browser here (as before D1), so no draw table; the
  ink adds none.
- **D2, the woods and the rough**: clumps of trees between the holes (the east arm most), a deep belt of tall pines
  along the north and east fences to hide the wall's foot, the rough in two tones (a longer band and the native
  beyond), wildflower patches in the native.
  **Built (2026-11-24), waiting for the owner's sign-off.** The woods in copses and glades (golflift.ts `copseAt()`,
  seeded value noise; 2467 trees, was 1393; phones keep half), bigger trees in a copse's heart; a belt of tall pines
  six grid points deep along the north and east edges (`PINE_BELT`, `inPineBelt()`), where there's land clear of
  play (the north edge is mostly play, so the belt's thin there); the second cut (`SECOND_CUT`, `COVER.secondCut`) a
  lighter band past each first cut, fringe and tee, painted under the paths; wildflowers in the glades' native grass
  (golf3d.ts `flowersIn()`, three palette colours, about 2600 heads, near only, in the edge's sites: no new draw
  calls). The ball meets the new trees as it did the old (`inTree()`). Checks: typecheck, lint, `npm test` and
  `npm run test:wide` (2411 each), the budget (boot 774.4 of 775 KB before the pines past the fence); the shots `docs/blend-shots/golf-d2-a/` (desktop and phone: holes 3, 4, 6, 7, 13, 14 from the
  tee, a glade of wildflowers) and the map `docs/golf-shots/design-d2-a.png`. The pines past the fence (the owner's
  call, 2026-11-25, on seeing the first shots: "plant pines past the fence"): outskirts.ts `wallPines()`
  (`WALL_PINES`), 1311 tall pines (phones 665) on the open strip between the course's north and east fences and the
  wall, clear of the fence, placed with the outskirts' trees; now the woods stand to the wall's foot on 3, 4, 13 and
  14 (`docs/blend-shots/golf-d2-b/`). With them the boot is 774.8 of 775 KB: the boot's slimming is next after D2
  goes to main (the owner's call, 2026-11-25).
- **D3, the water**: reeds in clumps on the shallow shores, lily pads; Reed Water and Clubhouse Lake brought into play
  (a carry on 16, the 18th's green over its edge) where the owner wants it.
  **Built and signed off (2026-11-25, the owner).** The lakes stay where they are (the owner's call); the reeds
  in two to four clumps a lake (golf3d.ts `reedClumps()`), thick in a clump's middle and thinning to its ends, open
  bank between, standing in the shallows at the water's real edge (a bank higher than the water stands it in from
  the shore: the first shots had reeds on dry bank there), as tall again over the water as it's deep; lily pads in a
  patch or two a lake off the clumps (`liliesOf()`, 12 to 19 a lake, a few in flower, palette `lilyPad`,
  `lilyFlower`), near only, in the edge's sites: no new draw calls. Reed Water and Clubhouse Lake aren't brought into
  play (the lakes stay where they are). Shots `docs/blend-shots/golf-d3-a/` (every lake, desktop and phone, and Fen
  Pond close); the boot unchanged (771.9 of 775 KB: the water's all in the course's chunk).
- **D4, the paths and tees**: the cart paths a warm gravel from the palette, bent round the tees rather than past them;
  tees with rounded corners, a darker cut edge and the tee's markers clear.

## Open questions (for the owner, later)

- How long the golf game's rounds should be on a phone (a hole, nine, or eighteen).
